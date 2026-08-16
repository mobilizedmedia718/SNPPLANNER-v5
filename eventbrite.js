/* Eventbrite integration for SNP Planner.
 * Secure connector routes used:
 *   GET {connectorUrl}/ticket-classes?event_id=...
 *   GET {connectorUrl}/sales?event_id=...
 *   GET {connectorUrl}/attendees?event_id=...
 *   GET {connectorUrl}/attendees?event_id=...&status=attending
 */
const Eventbrite = {
    data: {
        connectorUrl: "",
        events: {}
    },

    load() {
        const saved = Utils.load("eventbrite", {});
        this.data = {
            connectorUrl: "",
            events: {},
            ...saved,
            events: saved?.events && typeof saved.events === "object" ? saved.events : {}
        };
    },

    save() {
        Utils.save("eventbrite", this.data);
    },

    link(eventId) {
        if (!this.data.events[eventId]) {
            this.data.events[eventId] = {
                eventbriteEventId: "",
                lastSync: "",
                ticketClasses: [],
                sales: [],
                attendees: [],
                checkedIn: [],
                manualTicketsSold: null,
                manualRevenue: null
            };
        }
        const link = this.data.events[eventId];
        if (!Array.isArray(link.attendees)) link.attendees = [];
        if (!Array.isArray(link.checkedIn)) link.checkedIn = [];
        if (!String(link.publicUrl || "").trim()) link.publicUrl = "";
        return link;
    },

    setConnectorUrl(value) {
        this.data.connectorUrl = String(value || "").trim().replace(/\/$/, "");
        this.save();
    },

    setEventbriteEventId(eventId, value) {
        this.link(eventId).eventbriteEventId = String(value || "").trim();
        this.save();
    },

    setPublicUrl(eventId, value) {
        this.link(eventId).publicUrl = String(value || "").trim();
        this.save();
    },

    async connectorRequest(path, plannerEventId, params = {}) {
        const connectorUrl = String(this.data.connectorUrl || "").trim().replace(/\/$/, "");
        const link = this.link(plannerEventId);
        const eventbriteEventId = String(link.eventbriteEventId || "").trim();

        if (!connectorUrl) throw new Error("Enter the Secure Connector URL in Eventbrite settings.");
        if (!eventbriteEventId) throw new Error("Enter the Eventbrite Event ID for this event.");

        const query = new URLSearchParams({ event_id: eventbriteEventId });
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && String(value) !== "") query.set(key, String(value));
        });

        const headers = {};
        const token = window.SNPDatabase?.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
        if (typeof SNP_SUPABASE_PUBLISHABLE_KEY !== "undefined" && connectorUrl.includes("supabase.co/functions/v1/")) {
            headers.apikey = SNP_SUPABASE_PUBLISHABLE_KEY;
        }

        const response = await fetch(`${connectorUrl}${path}?${query.toString()}`, { headers });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Eventbrite connection failed (${response.status}).`);
        return data;
    },

    normalizeAttendee(item = {}) {
        const profile = item.profile || {};
        const barcodes = Array.isArray(item.barcodes) ? item.barcodes : [];
        return {
            id: String(item.id || ""),
            eventId: String(item.event_id || ""),
            orderId: String(item.order_id || ""),
            firstName: profile.first_name || item.first_name || "",
            lastName: profile.last_name || item.last_name || "",
            name: profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || item.name || "",
            email: profile.email || item.email || "",
            ticketClassName: item.ticket_class_name || "",
            checkedIn: Boolean(item.checked_in) || String(item.status || "").toLowerCase() === "checked in",
            status: item.status || "",
            barcode: String(barcodes[0]?.barcode || item.barcode || ""),
            barcodeStatus: barcodes[0]?.status || ""
        };
    },

    upsertCustomerFromAttendee(attendee) {
        const email = String(attendee.email || "").trim().toLowerCase();
        let customer = email ? CRM.all().find(c => String(c.email || "").trim().toLowerCase() === email) : null;
        if (!customer && attendee.id) {
            customer = CRM.all().find(c => String(c.eventbriteAttendeeId || "") === String(attendee.id));
        }

        const updates = {
            firstName: attendee.firstName || customer?.firstName || "",
            lastName: attendee.lastName || customer?.lastName || "",
            email: attendee.email || customer?.email || "",
            eventbriteAttendeeId: attendee.id,
            eventbriteOrderId: attendee.orderId,
            lastVisit: attendee.checkedIn ? new Date().toISOString() : (customer?.lastVisit || ""),
            tags: [...new Set([...(customer?.tags || []), "Eventbrite", ...(attendee.checkedIn ? ["Checked In"] : [])])]
        };

        if (!customer) customer = CRM.create(updates);
        else CRM.update(customer.id, updates);
        return CRM.get(customer.id);
    },

    attachPatron(plannerEventId, customerId) {
        const event = Events.get(plannerEventId);
        if (!event || !customerId) return;
        const patronIds = [...new Set([...(Array.isArray(event.patronIds) ? event.patronIds : []), customerId])];
        Events.update(plannerEventId, { patronIds });
    },

    async loadAttendees(plannerEventId) {
        const data = await this.connectorRequest("/attendees", plannerEventId);
        const link = this.link(plannerEventId);
        link.attendees = (data.attendees || []).map(item => this.normalizeAttendee(item));
        link.checkedIn = link.attendees.filter(a => a.checkedIn);
        link.lastSync = new Date().toISOString();
        this.save();
        return link.attendees;
    },

    async syncCheckedIn(plannerEventId) {
        let rows = [];
        try {
            const data = await this.connectorRequest("/attendees", plannerEventId, { status: "attending" });
            rows = (data.attendees || []).map(item => this.normalizeAttendee(item));
        } catch (error) {
            const all = await this.loadAttendees(plannerEventId);
            rows = all.filter(a => a.checkedIn);
        }

        const link = this.link(plannerEventId);
        link.checkedIn = rows;
        link.lastSync = new Date().toISOString();

        const patrons = rows.map(attendee => {
            const customer = this.upsertCustomerFromAttendee({ ...attendee, checkedIn: true });
            this.attachPatron(plannerEventId, customer.id);
            return customer;
        });

        this.save();
        return patrons;
    },

    findAttendeeByBarcode(plannerEventId, barcode) {
        const value = String(barcode || "").trim();
        const link = this.link(plannerEventId);
        return [...(link.attendees || []), ...(link.checkedIn || [])].find(a => String(a.barcode || "") === value) || null;
    },

    async registerScannedPatron(plannerEventId, barcode) {
        if (!this.link(plannerEventId).attendees.length) await this.loadAttendees(plannerEventId);
        const attendee = this.findAttendeeByBarcode(plannerEventId, barcode);
        if (!attendee) throw new Error("This ticket barcode was not found on the Eventbrite attendee list for this event.");

        const customer = this.upsertCustomerFromAttendee({ ...attendee, checkedIn: true });
        this.attachPatron(plannerEventId, customer.id);

        const link = this.link(plannerEventId);
        if (!link.checkedIn.some(a => a.id === attendee.id)) link.checkedIn.push({ ...attendee, checkedIn: true, status: "Checked In" });
        this.save();

        return { attendee, customer };
    },

    async loadTicketClasses(plannerEventId) {
        const data = await this.connectorRequest("/ticket-classes", plannerEventId);
        const link = this.link(plannerEventId);
        link.ticketClasses = (data.ticket_classes || data.ticketClasses || []).map(item => ({
            id: String(item.id),
            name: item.name || "",
            category: item.category || "admission",
            quantityTotal: Number(item.quantity_total ?? item.capacity ?? 0),
            quantitySold: Number(item.quantity_sold || 0),
            price: Number(item.cost?.major_value || 0),
            hidden: Boolean(item.hidden || item.hidden_currently),
            salesChannels: Array.isArray(item.sales_channels) ? item.sales_channels : [],
            minimumQuantity: Math.max(1, Number(item.minimum_quantity || 1)),
            maximumQuantity: Math.max(1, Number(item.maximum_quantity_per_order || item.maximum_quantity || 1)),
            inventoryTierId: String(item.inventory_tier_id || "")
        }));

        const event = Events.get(plannerEventId);
        if (event) {
            const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes.map(item => ({ ...item })) : [];
            const menuItems = Array.isArray(event.menuItems) ? event.menuItems.map(item => ({ ...item })) : [];
            let changed = false;
            for (const ticketClass of link.ticketClasses) {
                const normalizedName = String(ticketClass.name || "").trim().toLowerCase();
                const targetCollection = ticketClass.category === "add_on" ? menuItems : ticketTypes;
                const target = targetCollection.find(item =>
                    String(item.eventbriteTicketClassId || "") === ticketClass.id ||
                    (!item.eventbriteTicketClassId && String(item.name || "").trim().toLowerCase() === normalizedName)
                );
                if (!target) continue;
                target.eventbriteTicketClassId = ticketClass.id;
                target.eventbriteQuantityTotal = ticketClass.quantityTotal;
                target.eventbriteQuantitySold = ticketClass.quantitySold;
                target.eventbritePrice = ticketClass.price;
                target.eventbriteCategory = ticketClass.category;
                target.eventbriteMinimumQuantity = ticketClass.minimumQuantity;
                target.eventbriteMaximumQuantity = ticketClass.maximumQuantity;
                target.eventbriteInventoryTierId = ticketClass.inventoryTierId || target.eventbriteInventoryTierId || "";
                changed = true;
            }
            if (changed) Events.update(plannerEventId, { ticketTypes, menuItems });
        }
        link.lastSync = new Date().toISOString();
        this.save();
        return link.ticketClasses;
    },

    async syncSales(plannerEventId) {
        const event = Events.get(plannerEventId);
        if (!event) throw new Error("Choose an SNP Planner event first.");

        const data = await this.connectorRequest("/sales", plannerEventId);
        const link = this.link(plannerEventId);

        link.sales = (data.sales || []).map(row => ({
            ticketClassId: String(row.ticketClassId || row.ticket_class_id || ""),
            name: row.name || "",
            quantity: Number(row.quantity || 0),
            revenue: Number(row.revenue || 0),
            category: row.category || "admission"
        }));

        const priorEventbriteTickets = Number(event.eventbriteTicketsSold || 0);
        const priorEventbriteRevenue = Number(event.eventbriteRevenue || 0);

        if (link.manualTicketsSold === null || link.manualTicketsSold === undefined) {
            link.manualTicketsSold = Math.max(0, Number(event.ticketsSold || 0) - priorEventbriteTickets);
        }
        if (link.manualRevenue === null || link.manualRevenue === undefined) {
            link.manualRevenue = Math.max(0, Number(event.actualRevenue || 0) - priorEventbriteRevenue);
        }

        const eventbriteTicketsSold = link.sales
            .filter(row => String(row.category || "admission") === "admission")
            .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const eventbriteRevenue = link.sales.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
        const eventbriteAdmissionRevenue = link.sales
            .filter(row => String(row.category || "admission") === "admission")
            .reduce((sum, row) => sum + Number(row.revenue || 0), 0);
        const eventbriteAddonRevenue = Math.max(0, eventbriteRevenue - eventbriteAdmissionRevenue);

        const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes.map(item => ({ ...item })) : [];
        const menuItems = Array.isArray(event.menuItems) ? event.menuItems.map(item => ({ ...item })) : [];
        const salesByClass = new Map(link.sales.map(row => [String(row.ticketClassId || ""), row]));
        for (const item of [...ticketTypes, ...menuItems]) {
            const row = salesByClass.get(String(item.eventbriteTicketClassId || ""));
            item.eventbriteQuantitySold = Number(row?.quantity || 0);
            item.eventbriteRevenue = Number(row?.revenue || 0);
            const groupSize = Math.max(1, Number(item.groupSize || item.seatMultiplier || 1));
            item.eventbritePackagesSold = Number(row?.quantity || 0) / groupSize;
        }
        const paintClassIds = new Set(ticketTypes
            .filter(item => item.includesPainting === true || item.kind === "paint")
            .map(item => String(item.eventbriteTicketClassId || ""))
            .filter(Boolean));
        const exhibitClassIds = new Set(ticketTypes
            .filter(item => item.kind === "exhibit" || item.accessLevel === "gallery_only")
            .map(item => String(item.eventbriteTicketClassId || ""))
            .filter(Boolean));
        const eventbritePaintTicketsSold = link.sales
            .filter(row => paintClassIds.has(String(row.ticketClassId || "")))
            .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const eventbriteExhibitTicketsSold = link.sales
            .filter(row => exhibitClassIds.has(String(row.ticketClassId || "")))
            .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

        link.lastSync = new Date().toISOString();
        this.save();

        Events.update(plannerEventId, {
            eventbriteEventId: link.eventbriteEventId,
            eventbriteTicketsSold,
            eventbriteRevenue,
            eventbriteAdmissionRevenue,
            eventbriteAddonRevenue,
            eventbritePaintTicketsSold,
            eventbriteExhibitTicketsSold,
            ticketTypes,
            menuItems,
            ticketsSold: Number(link.manualTicketsSold || 0) + eventbriteTicketsSold,
            actualRevenue: Number(link.manualRevenue || 0) + eventbriteRevenue
        });

        return { eventbriteTicketsSold, eventbritePaintTicketsSold, eventbriteExhibitTicketsSold, eventbriteRevenue, eventbriteAdmissionRevenue, eventbriteAddonRevenue, sales: link.sales };
    }
};

Eventbrite.load();
