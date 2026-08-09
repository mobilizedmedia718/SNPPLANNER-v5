/* Unified event guest list for Eventbrite + Stripe patrons. */
(function () {
    if (typeof Events === "undefined" || typeof CRM === "undefined" || typeof UI === "undefined") return;

    function ensureGuest(event, data = {}) {
        if (!event) return null;
        event.guestList = Array.isArray(event.guestList) ? event.guestList : [];
        const customerId = String(data.customerId || "");
        const source = String(data.source || "Manual");
        const sourceId = String(data.sourceId || "");
        let guest = sourceId
            ? event.guestList.find(g => String(g.source || "") === source && String(g.sourceId || "") === sourceId)
            : event.guestList.find(g => String(g.customerId || "") === customerId && String(g.source || "") === source);

        if (!guest) {
            guest = {
                id: Utils.id(),
                customerId,
                source,
                sourceId,
                status: data.status || "Confirmed",
                checkedIn: Boolean(data.checkedIn),
                ticketQuantity: Number(data.ticketQuantity || 1),
                confirmedAt: data.confirmedAt || new Date().toISOString(),
                checkedInAt: data.checkedIn ? (data.checkedInAt || new Date().toISOString()) : "",
                createdAt: new Date().toISOString()
            };
            event.guestList.push(guest);
        } else {
            guest.customerId = customerId || guest.customerId;
            guest.status = data.status || guest.status;
            guest.checkedIn = Boolean(data.checkedIn || guest.checkedIn);
            guest.ticketQuantity = Math.max(Number(guest.ticketQuantity || 0), Number(data.ticketQuantity || 1));
            if (guest.checkedIn && !guest.checkedInAt) guest.checkedInAt = data.checkedInAt || new Date().toISOString();
        }
        return guest;
    }

    window.SNPGuestList = {
        add(eventId, data = {}) {
            const event = Events.get(eventId);
            if (!event) return null;
            const guest = ensureGuest(event, data);
            Events.save();
            return guest;
        },
        forEvent(eventId) {
            const event = Events.get(eventId);
            return Array.isArray(event?.guestList) ? event.guestList : [];
        }
    };

    /* Eventbrite patrons follow the same confirmed/check-in guest rules. */
    if (typeof Eventbrite !== "undefined" && typeof Eventbrite.attachPatron === "function") {
        const originalAttachPatron = Eventbrite.attachPatron.bind(Eventbrite);
        Eventbrite.attachPatron = function (plannerEventId, customerId) {
            originalAttachPatron(plannerEventId, customerId);
            const customer = CRM.get(customerId);
            SNPGuestList.add(plannerEventId, {
                customerId,
                source: "Eventbrite",
                sourceId: customer?.eventbriteAttendeeId || "",
                status: "Checked In",
                checkedIn: true,
                ticketQuantity: 1
            });
        };
    }

    const priorDetail = UI.renderEventDetail;
    if (typeof priorDetail === "function") {
        UI.renderEventDetail = function (id) {
            const result = priorDetail.call(UI, id);
            const event = Events.get(id);
            const workspace = document.getElementById("workspace");
            if (!event || !workspace) return result;

            const guests = Array.isArray(event.guestList) ? event.guestList : [];
            const patronIds = Array.isArray(event.patronIds) ? event.patronIds : [];
            const knownIds = new Set(guests.map(g => String(g.customerId || "")));
            patronIds.forEach(customerId => {
                if (!knownIds.has(String(customerId))) {
                    guests.push({ id:`patron-${customerId}`, customerId, source:"Patron", status:"Confirmed", checkedIn:false, ticketQuantity:0 });
                }
            });

            const card = document.createElement("div");
            card.className = "card";
            card.id = "eventGuestListCard";
            card.innerHTML = `
                <h3>Guest / Patron List</h3>
                <p>Confirmed ticket buyers and event patrons from Stripe and Eventbrite are combined here.</p>
                ${guests.length ? guests.map(g => {
                    const c = CRM.get(g.customerId);
                    const name = c ? (CRM.fullName(c) || c.email || "Guest") : "Guest";
                    return `<div style="padding:10px 0;border-bottom:1px solid #eee;">
                        <strong>${UI.esc(name)}</strong>
                        ${c?.email ? `<br><small>${UI.esc(c.email)}</small>` : ""}
                        <br><small>Source: ${UI.esc(g.source || "Unknown")} • Status: ${UI.esc(g.status || (g.checkedIn ? "Checked In" : "Confirmed"))}${Number(g.ticketQuantity || 0) > 0 ? ` • Tickets: ${Number(g.ticketQuantity)}` : ""}</small>
                    </div>`;
                }).join("") : `<p>No confirmed guests or patrons yet.</p>`}
            `;
            workspace.appendChild(card);
            return result;
        };
    }
})();
