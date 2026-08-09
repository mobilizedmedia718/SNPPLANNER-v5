/* Stripe ticket sales for SNP Planner */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined" || typeof SNPStripePayments === "undefined") return;

    const TicketSalesUI = {
        eventId: "",

        open(eventId) {
            const event = Events.get(eventId);
            if (!event) return UI.renderEvents();
            this.eventId = eventId;
            const workspace = document.getElementById("workspace");
            if (!workspace) return;
            const price = Number(event.ticketPrice || 0);
            workspace.innerHTML = `
                <button type="button" onclick="UI.renderEventDetail('${UI.esc(eventId)}')">← Back to Event</button>
                <br><br>
                <div class="card">
                    <h2>Sell Tickets — ${UI.esc(event.name || "Event")}</h2>
                    <p><strong>Ticket price:</strong> ${Utils.money(price)}</p>
                    ${price > 0 ? `
                        <label>Purchaser Email</label>
                        <input id="ticketBuyerEmail" type="email" placeholder="customer@example.com" autocomplete="off">

                        <label>Number of Tickets</label>
                        <input id="ticketQuantity" type="number" min="1" step="1" value="1" oninput="TicketSalesUI.updateTotal()">

                        <p style="font-size:1.25em;"><strong>Total: <span id="ticketTotal">${Utils.money(price)}</span></strong></p>
                        <button type="button" onclick="TicketSalesUI.checkout()">Continue to Stripe</button>
                    ` : `
                        <p>This event does not have a ticket price yet. Edit the event and enter a Ticket Price before selling tickets.</p>
                        <button type="button" onclick="UI.renderEventEdit('${UI.esc(eventId)}')">Edit Ticket Price</button>
                    `}
                </div>
            `;
        },

        updateTotal() {
            const event = Events.get(this.eventId);
            if (!event) return;
            const qty = Math.max(1, Math.floor(Number(document.getElementById("ticketQuantity")?.value || 1)));
            const total = document.getElementById("ticketTotal");
            if (total) total.textContent = Utils.money(Number(event.ticketPrice || 0) * qty);
        },

        async checkout() {
            const event = Events.get(this.eventId);
            if (!event) return;
            const price = Number(event.ticketPrice || 0);
            if (!(price > 0)) return alert("Set a ticket price for this event first.");
            const qty = Math.max(1, Math.floor(Number(document.getElementById("ticketQuantity")?.value || 1)));
            const email = String(document.getElementById("ticketBuyerEmail")?.value || "").trim();
            try {
                await SNPStripePayments.startTicketCheckout([
                    {
                        name: `${event.name || "Event"} Ticket`,
                        quantity: qty,
                        price,
                        category: "Tickets",
                        saleType: "ticket"
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
        actionCard.innerHTML = `
            <h3>Ticket Sales</h3>
            <button type="button" onclick="TicketSalesUI.open('${UI.esc(id)}')">Sell Ticket with Stripe</button>
            <button type="button" onclick="CheckInUI.open('${UI.esc(id)}')">Check In / Scan Ticket</button>
            <p><strong>Stripe tickets sold:</strong> ${Number(event.stripeTicketsSold || 0)}</p>
        `;
        workspace.appendChild(actionCard);
        return result;
    };
})();
