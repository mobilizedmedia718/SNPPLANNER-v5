import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const eventbriteToken = Deno.env.get("EVENTBRITE_PRIVATE_TOKEN") || ""
const db = createClient(supabaseUrl, serviceRole)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

function safeAttendeeApiUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""))
    if (url.protocol !== "https:" || url.hostname !== "www.eventbriteapi.com") return ""
    if (!/^\/v3\/events\/[^/]+\/attendees\/[^/]+\/?$/.test(url.pathname)) return ""
    return url.toString()
  } catch {
    return ""
  }
}

function normalizeAttendee(a: any) {
  const profile = a?.profile || {}
  const barcode = Array.isArray(a?.barcodes) ? a.barcodes[0]?.barcode || "" : ""
  const status = String(a?.status || "")
  const normalizedStatus = status.toLowerCase()
  return {
    attendeeId: String(a?.id || ""),
    eventbriteEventId: String(a?.event_id || ""),
    orderId: String(a?.order_id || ""),
    ticketClassId: String(a?.ticket_class_id || ""),
    ticketClassName: String(a?.ticket_class_name || ""),
    firstName: profile.first_name || "",
    lastName: profile.last_name || "",
    name: profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" "),
    email: profile.email || "",
    barcode: String(barcode || ""),
    checkedIn: Boolean(a?.checked_in) || normalizedStatus === "checked in",
    cancelled: Boolean(a?.cancelled) || ["cancelled", "canceled"].includes(normalizedStatus),
    refunded: Boolean(a?.refunded) || normalizedStatus === "refunded",
    status
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  try {
    if (!eventbriteToken) throw new Error("EVENTBRITE_PRIVATE_TOKEN is not configured.")
    const payload = await req.json()
    const apiUrl = safeAttendeeApiUrl(payload?.api_url)
    if (!apiUrl) throw new Error("Invalid Eventbrite attendee api_url.")

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${eventbriteToken}` }
    })
    const raw = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error("Unable to retrieve Eventbrite attendee.")
    const attendee = normalizeAttendee(raw)
    if (!attendee.eventbriteEventId || !attendee.attendeeId) {
      return json({ received: true, ignored: true })
    }

    const { data: link, error: linkError } = await db
      .from("eventbrite_event_links")
      .select("user_id,planner_event_id")
      .eq("eventbrite_event_id", attendee.eventbriteEventId)
      .maybeSingle()
    if (linkError) throw linkError
    if (!link) return json({ received: true, unlinked: true })

    const { data: rows, error: storageError } = await db
      .from("app_storage")
      .select("storage_key,storage_value")
      .eq("user_id", link.user_id)
      .in("storage_key", ["customers", "events"])
    if (storageError) throw storageError

    const map = new Map((rows || []).map((row: any) => [row.storage_key, row.storage_value]))
    const customers: any[] = Array.isArray(map.get("customers")) ? map.get("customers") : []
    const events: any[] = Array.isArray(map.get("events")) ? map.get("events") : []
    const event = events.find(item => String(item.id) === String(link.planner_event_id))
    if (!event) return json({ received: true, eventMissing: true })

    let customer = customers.find(item =>
      attendee.email && String(item.email || "").toLowerCase() === attendee.email.toLowerCase()
    ) || customers.find(item => String(item.eventbriteAttendeeId || "") === attendee.attendeeId)

    if (!customer) {
      customer = {
        id: crypto.randomUUID(),
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        company: "",
        jobTitle: "",
        offerings: [],
        phone: "",
        alternatePhone: "",
        birthday: "",
        address: "",
        address2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        website: "",
        instagram: "",
        facebook: "",
        loyaltyPoints: 0,
        totalSpent: 0,
        totalVisits: 0,
        tags: ["Eventbrite"],
        notes: "",
        lastVisit: "",
        created: new Date().toISOString()
      }
      customers.push(customer)
    }

    customer.firstName = attendee.firstName || customer.firstName || ""
    customer.lastName = attendee.lastName || customer.lastName || ""
    customer.email = attendee.email || customer.email || ""
    customer.eventbriteAttendeeId = attendee.attendeeId
    customer.eventbriteOrderId = attendee.orderId
    customer.eventbriteBarcode = attendee.barcode
    customer.tags = [...new Set([
      ...(customer.tags || []),
      "Eventbrite",
      ...(attendee.checkedIn ? ["Checked In"] : [])
    ])]

    event.guestList = Array.isArray(event.guestList) ? event.guestList : []
    const guestId = `eventbrite:${attendee.attendeeId}`
    const existingGuest = event.guestList.find((guest: any) =>
      String(guest.eventbriteAttendeeId || "") === attendee.attendeeId || String(guest.id || "") === guestId
    )
    const guest = existingGuest || { id: guestId, source: "Eventbrite" }
    Object.assign(guest, {
      source: "Eventbrite",
      eventbriteAttendeeId: attendee.attendeeId,
      eventbriteOrderId: attendee.orderId,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      name: attendee.name,
      email: attendee.email,
      ticketClassId: attendee.ticketClassId,
      ticketClassName: attendee.ticketClassName,
      barcode: attendee.barcode,
      status: attendee.checkedIn ? "Checked In" : (attendee.status || "Confirmed"),
      checkedIn: attendee.checkedIn,
      cancelled: attendee.cancelled,
      refunded: attendee.refunded,
      ticketQuantity: 1
    })
    if (!existingGuest) event.guestList.push(guest)

    if (attendee.checkedIn) {
      const patronIds = Array.isArray(event.patronIds) ? event.patronIds : []
      const alreadyVisited = patronIds.includes(customer.id)
      event.patronIds = [...new Set([...patronIds, customer.id])]
      event.checkIns = Array.isArray(event.checkIns) ? event.checkIns : []
      if (!event.checkIns.some((item: any) => item.attendeeId === attendee.attendeeId)) {
        event.checkIns.push({
          attendeeId: attendee.attendeeId,
          customerId: customer.id,
          barcode: attendee.barcode,
          checkedInAt: new Date().toISOString(),
          source: "Eventbrite"
        })
      }
      if (!alreadyVisited) customer.totalVisits = Number(customer.totalVisits || 0) + 1
      customer.lastVisit = new Date().toISOString()
    }

    const now = new Date().toISOString()
    const { error: saveError } = await db.from("app_storage").upsert([
      { user_id: link.user_id, storage_key: "customers", storage_value: customers, updated_at: now },
      { user_id: link.user_id, storage_key: "events", storage_value: events, updated_at: now }
    ], { onConflict: "user_id,storage_key" })
    if (saveError) throw saveError

    return json({ received: true, plannerEventId: link.planner_event_id })
  } catch (error) {
    return json({
      received: false,
      error: error instanceof Error ? error.message : "Webhook error"
    }, 400)
  }
})
