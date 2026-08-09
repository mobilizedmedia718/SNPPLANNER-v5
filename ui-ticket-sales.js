/* Stripe ticket sales for SNP Planner */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined" || typeof SNPStripePayments === "undefined") return;

    const TicketSalesUI = {
        eventId: "",
        selectedTicketTypeId: "",

        activeTicketTypes(event) {
            const types = Array.isArray(event?.ticketTypes) ? event.ticketTypes.filter(t => t.active !== false && Number(t.price || 0) >= 0) : [];
            if (types.length) return types;
            if (Number(event?.ticketPrice || 0) > 0) return [{ id:"legacy-ticket", name:`${event.name || "Event"} Ticket`, description:"", price:Number(event.ticketPrice || 0), quantity:Math.max(0, Number(event.capacity || 0) - Number(event.ticketsSold || 0)), kind:"paint", includesPainting:true, active:true }];
            return [];
        },

        open(eventId) {
            const event = Events.get(eventId);
            if (!event) return UI.renderEvents();
            this.eventId = eventId;
            const types = this.activeTicketTypes(event);
            if (!this.selectedTicketTypeId || !types.some(t => String(t.id) === String(this.selectedTicketTypeId))) this.selectedTicketTypeId = types[0]?.id || "";
            const selected = types.find(t => String(t.id) === String(this.selectedTicketTypeId)) || types[0] || null;
            const workspace = document.getElementById("workspace");
            if (!workspace) return;
            workspace.innerHTML = `
                <button type="button" onclick="UI.renderEventDetail('${UI.esc(eventId)}')">← Back to Event</button>
                <br><br>
                <div class="card">
                    <h2>Sell Tickets — ${UI.esc(event.name || "Event")}</h2>
                    ${types.length ? `
                        <label>Ticket Type</label>
                        <select id="ticketTypeSelect" onchange="TicketSalesUI.selectTicketType(this.value)">
                            ${types.map(t => `<option value="${UI.esc(t.id)}" ${String(t.id) === String(this.selectedTicketTypeId) ? "selected" : ""}>${UI.esc(t.name || "Ticket")} — ${Utils.money(t.price)}</option>`).join("")}
                        </select>
                        <div id="ticketTypeDetails">${this.ticketTypeDetails(selected)}</div>

                        <label>Purchaser Email</label>
                        <input id="ticketBuyerEmail" type="email" placeholder="customer@example.com" autocomplete="off">

                        <label>Number of Tickets</label>
                        <input id="ticketQuantity" type="number" min="1" step="1" value="1" oninput="TicketSalesUI.updateTotal()">

                        <p style="font-size:1.25em;"><strong>Total: <span id="ticketTotal">${Utils.money(Number(selected?.price || 0))}</span></strong></p>
                        <button type="button" onclick="TicketSalesUI.checkout()">Continue to Stripe</button>
                    ` : `
                        <p>This event does not have any active ticket types yet.</p>
                        <button type="button" onclick="UI.renderEvents()">Set Up Ticket Types</button>
                    `}
                </div>
            `;
        },

        ticketTypeDetails(t) {
            if (!t) return "";
            return `<div class="card" style="margin-top:10px;">
                <strong>${UI.esc(t.name || "Ticket")}</strong>
                ${t.description ? `<p>${UI.esc(t.description)}</p>` : ""}
                <p><strong>Price:</strong> ${Utils.money(Number(t.price || 0))}</p>
                <p><strong>Admission:</strong> ${t.kind === "observer" ? "Observer / Gallery" : t.kind === "vip" ? "VIP" : t.kind === "comp" ? "Complimentary / Guest" : "Paint Admission"}</p>
                ${Number(t.quantity || 0) > 0 ? `<p><strong>Capacity for this type:</strong> ${Number(t.quantity || 0)}</p>` : ""}
            </div>`;
        },

        selectTicketType(id) {
            this.selectedTicketTypeId = id;
            const event = Events.get(this.eventId);
            const t = this.activeTicketTypes(event).find(x => String(x.id) === String(id));
            const details = document.getElementById("ticketTypeDetails");
            if (details) details.innerHTML = this.ticketTypeDetails(t);
            this.updateTotal();
        },

        updateTotal() {
            const event = Events.get(this.eventId);
            if (!event) return;
            const t = this.activeTicketTypes(event).find(x => String(x.id) === String(this.selectedTicketTypeId));
            const qty = Math.max(1, Math.floor(Number(document.getElementById("ticketQuantity")?.value || 1)));
            const total = document.getElementById("ticketTotal");
            if (total) total.textContent = Utils.money(Number(t?.price || 0) * qty);
        },

        soldByType(event, ticketTypeId) {
            return (Array.isArray(event?.ticketPasses) ? event.ticketPasses : []).filter(p => String(p.ticketTypeId || "") === String(ticketTypeId)).length;
        },

        async checkout() {
            const event = Events.get(this.eventId);
            if (!event) return;
            const t = this.activeTicketTypes(event).find(x => String(x.id) === String(this.selectedTicketTypeId));
            if (!t) return alert("Choose a ticket type first.");
            const price = Number(t.price || 0);
            if (price < 0) return alert("This ticket type has an invalid price.");
            const qty = Math.max(1, Math.floor(Number(document.getElementById("ticketQuantity")?.value || 1)));
            const email = String(document.getElementById("ticketBuyerEmail")?.value || "").trim();
            const sold = this.soldByType(event, t.id);
            const typeCapacity = Number(t.quantity || 0);
            if (typeCapacity > 0 && sold + qty > typeCapacity) return alert(`Only ${Math.max(0, typeCapacity - sold)} ${t.name || "tickets"} remain.`);
            try {
                await SNPStripePayments.startTicketCheckout([
                    {
                        name: t.name || `${event.name || "Event"} Ticket`,
                        description: t.description || "",
                        quantity: qty,
                        price,
                        category: "Tickets",
                        saleType: "ticket",
                        ticketTypeId: t.id,
                        ticketKind: t.kind || "paint"
                    }
                ], {
                    eventId: event.id,
                    customerEmail: email
                });
            } catch (error) {
                alert(error?.message || "Unable to start ticket checkout.");
            }
        }
    };

    window.TicketSalesUI = TicketSalesUI;

    const originalRenderEventDetail = UI.renderEventDetail;
    UI.renderEventDetail = function (id) {
        const result = originalRenderEventDetail.call(UI, id);
        const event = Events.get(id);
        const workspace = document.getElementById("workspace");
        if (!event || !workspace || document.getElementById("ticketSalesActions")) return result;

        const actionCard = document.createElement("div");
        actionCard.className = "card";
        actionCard.id = "ticketSalesActions";
        const types = TicketSalesUI.activeTicketTypes(event);
        actionCard.innerHTML = `
            <h3>Ticket Sales</h3>
            <button type="button" onclick="TicketSalesUI.open('${UI.esc(id)}')">Sell Ticket with Stripe</button>
            <button type="button" onclick="CheckInUI.open('${UI.esc(id)}')">Check In / Scan Ticket</button>
            <p><strong>Stripe tickets sold:</strong> ${Number(event.stripeTicketsSold || 0)}</p>
            ${types.length ? `<p><strong>Active ticket types:</strong> ${types.map(t => UI.esc(t.name || "Ticket")).join(", ")}</p>` : ""}
        `;
        workspace.appendChild(actionCard);
        return result;
    };
})();
