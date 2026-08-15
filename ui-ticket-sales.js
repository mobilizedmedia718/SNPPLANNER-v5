/* Stripe ticket sales for SNP Planner */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined" || typeof SNPStripePayments === "undefined") return;

    const TicketSalesUI = {
        eventId: "",
        selectedTicketTypeId: "",
        selectedCustomerId: "",
        customerMode: "new-self",

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
            this.selectedCustomerId = "";
            this.customerMode = "new-self";
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

                        <div class="card" style="margin-top:12px;">
                            <h3>Customer</h3>
                            <button type="button" onclick="TicketSalesUI.chooseExistingCustomer()">Existing Customer</button>
                            <button type="button" onclick="TicketSalesUI.chooseNewCustomer()">New Customer</button>
                            <div id="ticketCustomerSummary" style="margin-top:10px;">New customer — enters their own email in Stripe</div>
                        </div>

                        <label>Number of Tickets</label>
                        <input id="ticketQuantity" type="number" min="1" step="1" value="1" oninput="TicketSalesUI.updateTotal()">

                        <p style="font-size:1.25em;"><strong>Total: <span id="ticketTotal">${Utils.money(Number(selected?.price || 0))}</span></strong></p>
                        <button type="button" onclick="TicketSalesUI.checkout()">Open Stripe Checkout</button>
                        <button type="button" onclick="TicketSalesUI.copyCheckoutLink()">Copy Customer Checkout Link</button>
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

        chooseExistingCustomer() {
            this.customerMode = "existing";
            const customers = typeof CRM !== "undefined" ? CRM.all().slice().sort((a,b) => String(CRM.fullName(a) || a.email || "").localeCompare(String(CRM.fullName(b) || b.email || ""))) : [];
            const summary = document.getElementById("ticketCustomerSummary");
            if (!summary) return;
            summary.innerHTML = `
                <label>Select Registered Customer</label>
                <select id="ticketExistingCustomer" onchange="TicketSalesUI.setExistingCustomer(this.value)">
                    <option value="">Choose customer...</option>
                    ${customers.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(CRM.fullName(c) || c.email || "Customer")}${c.email ? ` — ${UI.esc(c.email)}` : ""}</option>`).join("")}
                </select>`;
        },

        setExistingCustomer(id) {
            this.selectedCustomerId = id || "";
            const customer = this.selectedCustomerId && typeof CRM !== "undefined" ? CRM.get(this.selectedCustomerId) : null;
            const summary = document.getElementById("ticketCustomerSummary");
            if (summary && customer) summary.innerHTML = `<strong>Existing customer:</strong> ${UI.esc(CRM.fullName(customer) || customer.email || "Customer")}${customer.email ? `<br><small>${UI.esc(customer.email)}</small>` : ""}<br><button type="button" onclick="TicketSalesUI.chooseExistingCustomer()">Change</button>`;
        },

        chooseNewCustomer() {
            this.selectedCustomerId = "";
            this.customerMode = "new";
            const summary = document.getElementById("ticketCustomerSummary");
            if (!summary) return;
            summary.innerHTML = `
                <button type="button" onclick="TicketSalesUI.manualNewCustomer()">Enter New Customer Manually</button>
                <button type="button" onclick="TicketSalesUI.customerEntersOwnDetails()">Customer Enters Details in Stripe</button>`;
        },

        manualNewCustomer() {
            this.selectedCustomerId = "";
            this.customerMode = "new-manual";
            const summary = document.getElementById("ticketCustomerSummary");
            if (!summary) return;
            summary.innerHTML = `
                <label>First Name</label><input id="ticketNewFirstName" autocomplete="given-name">
                <label>Last Name</label><input id="ticketNewLastName" autocomplete="family-name">
                <label>Email</label><input id="ticketNewEmail" type="email" autocomplete="email">
                <label>Phone</label><input id="ticketNewPhone" type="tel" autocomplete="tel">
                <button type="button" onclick="TicketSalesUI.saveManualCustomer()">Save New Customer</button>`;
        },

        saveManualCustomer() {
            if (typeof CRM === "undefined") return alert("Customer records are not available.");
            const firstName = String(document.getElementById("ticketNewFirstName")?.value || "").trim();
            const lastName = String(document.getElementById("ticketNewLastName")?.value || "").trim();
            const email = String(document.getElementById("ticketNewEmail")?.value || "").trim();
            const phone = String(document.getElementById("ticketNewPhone")?.value || "").trim();
            if (!firstName && !lastName && !email && !phone) return alert("Enter at least one customer detail.");
            const customer = CRM.create({ firstName, lastName, email, phone, tags:["Ticket Customer"] });
            this.selectedCustomerId = customer.id;
            this.customerMode = "new-manual";
            const summary = document.getElementById("ticketCustomerSummary");
            if (summary) summary.innerHTML = `<strong>New customer saved:</strong> ${UI.esc(CRM.fullName(customer) || customer.email || "Customer")}${customer.email ? `<br><small>${UI.esc(customer.email)}</small>` : ""}<br><button type="button" onclick="TicketSalesUI.chooseNewCustomer()">Change</button>`;
        },

        customerEntersOwnDetails() {
            this.selectedCustomerId = "";
            this.customerMode = "new-self";
            const summary = document.getElementById("ticketCustomerSummary");
            if (summary) summary.innerHTML = `<strong>New customer</strong><br><small>Stripe will collect the buyer's email during checkout. The completed purchase will create/match the customer record.</small><br><button type="button" onclick="TicketSalesUI.chooseNewCustomer()">Change</button>`;
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

        checkoutData() {
            const event = Events.get(this.eventId);
            if (!event) throw new Error("Event not found.");
            const t = this.activeTicketTypes(event).find(x => String(x.id) === String(this.selectedTicketTypeId));
            if (!t) throw new Error("Choose a ticket type first.");
            if (this.customerMode === "existing" && !this.selectedCustomerId) throw new Error("Choose an existing customer, or choose New Customer.");
            const price = Number(t.price || 0);
            if (price < 0) throw new Error("This ticket type has an invalid price.");
            const qty = Math.max(1, Math.floor(Number(document.getElementById("ticketQuantity")?.value || 1)));
            const sold = this.soldByType(event, t.id);
            const typeCapacity = Number(t.quantity || 0);
            if (typeCapacity > 0 && sold + qty > typeCapacity) throw new Error(`Only ${Math.max(0, typeCapacity - sold)} ${t.name || "tickets"} remain.`);
            const customer = this.selectedCustomerId && typeof CRM !== "undefined" ? CRM.get(this.selectedCustomerId) : null;
            return {
                items:[{
                    name: t.name || `${event.name || "Event"} Ticket`,
                    description: t.description || "",
                    quantity: qty,
                    price,
                    category: "Tickets",
                    saleType: "ticket",
                    ticketTypeId: t.id,
                    ticketKind: t.kind || "paint"
                }],
                options:{ eventId:event.id, customerId:this.selectedCustomerId || "", customerEmail:customer?.email || "" }
            };
        },

        async checkout() {
            try {
                const data = this.checkoutData();
                await SNPStripePayments.startTicketCheckout(data.items, data.options);
            } catch (error) {
                alert(error?.message || "Unable to start ticket checkout.");
            }
        },

        async copyCheckoutLink() {
            try {
                const data = this.checkoutData();
                await SNPStripePayments.copyCheckoutLink(data.items, { ...data.options, purchaseType:"ticket" });
            } catch (error) {
                alert(error?.message || "Unable to create customer checkout link.");
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
