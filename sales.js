/* Event point-of-sale flow for SNP Planner */
const SalesUI = {
    cart: {},
    selectedCustomerId: "",
    selectedEventId: "",
    syncingPatrons: false,

    install() {
        const originalSidebar = UI.renderSidebar;
        UI.renderSidebar = function(...args) {
            const result = originalSidebar.apply(this, args);
            const sidebar = document.getElementById("sidebar");
            if (sidebar && !document.getElementById("salesNavButton")) {
                const btn = document.createElement("button");
                btn.id = "salesNavButton";
                btn.textContent = "Sales";
                btn.onclick = () => SalesUI.open();
                sidebar.appendChild(btn);
            }
            return result;
        };
    },

    activeEventId() {
        return window.LiveEvent?.activeId || this.selectedEventId || "";
    },

    inventoryForSale() {
        return Inventory.all().filter(item =>
            item.status !== "Inactive" &&
            Number(item.sellPrice || 0) > 0 &&
            String(item.category || "").trim().toLowerCase() === "event sales"
        );
    },

    patronsForEvent(eventId) {
        const event = Events.get(eventId);
        if (!event) return [];
        const ids = new Set();
        (Array.isArray(event.checkIns) ? event.checkIns : []).forEach(x => { if (x?.customerId) ids.add(String(x.customerId)); });
        (Array.isArray(event.guestList) ? event.guestList : []).forEach(g => { if (g?.checkedIn && g?.customerId) ids.add(String(g.customerId)); });
        return [...ids].map(id => CRM.get(id)).filter(Boolean);
    },

    async refreshCloudState() {
        try {
            if (SNPDatabase.session?.access_token) {
                await SNPDatabase.syncCloudToLocal();
                CRM.load();
                Events.load();
                Inventory.load();
                Eventbrite.load();
            }
        } catch (error) {
            console.warn("Sales cloud refresh skipped:", error);
        }
    },

    async open() {
        const liveId = window.LiveEvent?.activeId || "";
        if (liveId) this.selectedEventId = liveId;
        this.selectedCustomerId = "";
        this.cart = {};
        await this.refreshCloudState();
        const eventId = this.activeEventId();
        if (eventId && Eventbrite.link(eventId).eventbriteEventId) {
            try { await Eventbrite.syncCheckedIn(eventId); } catch (error) { console.warn("Eventbrite auto check-in sync skipped:", error); }
        }
        await this.renderPatronPicker();
    },

    async renderPatronPicker() {
        const events = Events.all().filter(e => e.status !== "Cancelled" && e.status !== "Completed");
        const eventId = this.activeEventId();
        const workspace = document.getElementById("workspace");
        if (!workspace) return;
        if (!eventId) {
            workspace.innerHTML = `<h2>Sales</h2><div class="card"><h3>Choose Event</h3><p>Sales starts with the event so SNP Planner can show only people actually present.</p>${events.length ? events.map(e => `<button type="button" style="margin:6px;" onclick="SalesUI.chooseEvent('${UI.esc(e.id)}')">${UI.esc(e.name || "Untitled Event")}${e.date ? ` — ${UI.esc(e.date)}` : ""}</button>`).join("") : `<p>No active events found.</p>`}</div>`;
            return;
        }
        const event = Events.get(eventId);
        const patrons = this.patronsForEvent(eventId);
        workspace.innerHTML = `
            <h2>Sales — ${UI.esc(event?.name || "Event")}</h2>
            <div class="card">
                <h3>Who are you charging?</h3>
                <p>Only people actually checked in or manually admitted appear here. A purchase alone does not count as attendance.</p>
                <button type="button" onclick="SalesUI.syncPatrons()">Refresh Checked-In Patrons</button>
                <button type="button" onclick="CheckInUI.open('${UI.esc(eventId)}')">Check In / Scan Ticket</button>
                ${window.LiveEvent?.activeId ? "" : `<button type="button" onclick="SalesUI.changeEvent()">Change Event</button>`}
                <br><br>
                <div id="salesPatronButtons">
                    ${patrons.length ? patrons.map(c => `<button type="button" style="display:block;width:100%;margin:8px 0;padding:14px;text-align:left;" onclick="SalesUI.selectPatron('${UI.esc(c.id)}')"><strong>${UI.esc(CRM.fullName(c) || c.email || "Patron")}</strong>${c.email ? `<br><small>${UI.esc(c.email)}</small>` : ""}</button>`).join("") : `<p>No one is checked in yet. Scan a ticket or admit a walk-in/non-ticket guest.</p>`}
                    <button type="button" style="display:block;width:100%;margin:8px 0;padding:14px;text-align:left;" onclick="SalesUI.selectPatron('')"><strong>Walk-in / No Patron</strong></button>
                </div>
            </div>`;
    },

    chooseEvent(eventId) { this.selectedEventId = eventId; this.open(); },
    changeEvent() { this.selectedEventId = ""; this.renderPatronPicker(); },
    async syncPatrons() {
        const eventId = this.activeEventId();
        if (!eventId || this.syncingPatrons) return;
        this.syncingPatrons = true;
        try { await Eventbrite.syncCheckedIn(eventId); await this.renderPatronPicker(); }
        catch (error) { alert(error?.message || "Unable to sync Eventbrite check-ins."); }
        finally { this.syncingPatrons = false; }
    },
    selectPatron(customerId) { this.selectedCustomerId = customerId || ""; this.cart = {}; this.renderMenu(); },
    selectedItems() {
        return this.inventoryForSale().map(item => {
            const qty = Number(this.cart[item.id] || 0);
            return qty > 0 ? { inventoryId:item.id, name:item.name, quantity:qty, price:Number(item.sellPrice || 0) } : null;
        }).filter(Boolean);
    },
    total() { return this.selectedItems().reduce((sum,item)=>sum+Number(item.price||0)*Number(item.quantity||0),0); },
    addItem(id) {
        const item = Inventory.get(id); if (!item) return;
        const current = Number(this.cart[id] || 0); const available = Math.max(0, Number(item.quantity || 0));
        if (current >= available) return alert(`${item.name} is out of stock for this sale.`);
        this.cart[id] = current + 1; this.renderMenu();
    },
    subtractItem(id) { this.cart[id] = Math.max(0, Number(this.cart[id] || 0) - 1); this.renderMenu(); },
    renderMenu() {
        const items = this.inventoryForSale();
        const eventId = this.activeEventId();
        const event = Events.get(eventId);
        const customer = this.selectedCustomerId ? CRM.get(this.selectedCustomerId) : null;
        const workspace = document.getElementById("workspace"); if (!workspace) return;
        workspace.innerHTML = `<h2>Event Sales Menu</h2><div class="card"><p><strong>Event:</strong> ${UI.esc(event?.name || "General")}</p><p><strong>Patron:</strong> ${UI.esc(customer ? (CRM.fullName(customer) || customer.email || "Patron") : "Walk-in")}</p><button type="button" onclick="SalesUI.renderPatronPicker()">Change Patron</button></div><div class="card"><h3>Menu</h3>${items.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">${items.map(item => `<button type="button" onclick="SalesUI.addItem('${UI.esc(item.id)}')" style="padding:16px;text-align:left;min-height:100px;"><strong>${UI.esc(item.name || "Item")}</strong><br><span>${Utils.money(item.sellPrice)}</span><br><small>Stock: ${Number(item.quantity || 0)}</small></button>`).join("")}</div>` : `<p>No Event Sales inventory is available. In Inventory, set an item's Category to <strong>Event Sales</strong> and give it a Sell Price.</p>`}</div><div class="card"><h3>Current Ticket</h3>${this.selectedItems().length ? this.selectedItems().map(item => `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eee;"><span>${UI.esc(item.name)}</span><span><button type="button" onclick="SalesUI.subtractItem('${UI.esc(item.inventoryId)}')">−</button><strong style="padding:0 10px;">${item.quantity}</strong><button type="button" onclick="SalesUI.addItem('${UI.esc(item.inventoryId)}')">+</button></span><strong>${Utils.money(item.price * item.quantity)}</strong></div>`).join("") : `<p>No items added yet.</p>`}<br><p style="font-size:1.3em;"><strong>Total: ${Utils.money(this.total())}</strong></p><button type="button" onclick="SalesUI.checkout()" ${this.selectedItems().length ? "" : "disabled"}>Charge with Stripe</button><button type="button" onclick="SalesUI.clearCart()">Clear Ticket</button></div>`;
    },
    clearCart() { this.cart = {}; this.renderMenu(); },
    async checkout() {
        const items = this.selectedItems(); if (!items.length) return alert("Add at least one item.");
        for (const sold of items) { const item = Inventory.get(sold.inventoryId); if (!item || Number(sold.quantity) > Number(item.quantity || 0)) return alert(`${sold.name} does not have enough stock for this sale.`); }
        const eventId = this.activeEventId(); const customer = this.selectedCustomerId ? CRM.get(this.selectedCustomerId) : null;
        try { await SNPStripePayments.startCheckout(items, { eventId, customerId:this.selectedCustomerId, customerEmail:customer?.email || "" }); }
        catch (error) { alert(error?.message || "Unable to start checkout."); }
    },
    render() { return this.open(); }
};
window.SalesUI = SalesUI;
SalesUI.install();
