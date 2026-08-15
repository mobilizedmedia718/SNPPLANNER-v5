/* Event point-of-sale flow for SNP Planner */
const SalesUI = {
    cart: {},
    selectedCustomerId: "",
    selectedEventId: "",
    syncingPatrons: false,
    customerMode: "",

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
        this.customerMode = "";
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
            workspace.innerHTML = `<h2>Sales</h2><div class="card"><h3>Choose Event</h3><p>Choose the event for this sale.</p>${events.length ? events.map(e => `<button type="button" style="margin:6px;" onclick="SalesUI.chooseEvent('${UI.esc(e.id)}')">${UI.esc(e.name || "Untitled Event")}${e.date ? ` — ${UI.esc(e.date)}` : ""}</button>`).join("") : `<p>No active events found.</p>`}</div>`;
            return;
        }
        const event = Events.get(eventId);
        workspace.innerHTML = `
            <h2>Sales — ${UI.esc(event?.name || "Event")}</h2>
            <div class="card">
                <h3>Choose Customer Type</h3>
                <p>Start every sale by choosing whether this is an existing customer or a new customer.</p>
                <button type="button" onclick="SalesUI.showExistingCustomers()">Existing Customer</button>
                <button type="button" onclick="SalesUI.showNewCustomer()">New Customer</button>
                <button type="button" onclick="SalesUI.selectWalkIn()">Walk-in / No Customer Record</button>
                ${window.LiveEvent?.activeId ? "" : `<button type="button" onclick="SalesUI.changeEvent()">Change Event</button>`}
            </div>`;
    },

    showExistingCustomers() {
        this.customerMode = "existing";
        const workspace = document.getElementById("workspace");
        if (!workspace) return;
        const eventId = this.activeEventId();
        const event = Events.get(eventId);
        const checked = new Set(this.patronsForEvent(eventId).map(c => String(c.id)));
        const customers = CRM.all().slice().sort((a,b) => String(CRM.fullName(a) || a.email || "").localeCompare(String(CRM.fullName(b) || b.email || "")));
        workspace.innerHTML = `
            <h2>Existing Customer — ${UI.esc(event?.name || "Event")}</h2>
            <div class="card">
                <button type="button" onclick="SalesUI.renderPatronPicker()">← Customer Type</button>
                <h3>Select Registered Customer</h3>
                <input id="salesCustomerSearch" type="search" placeholder="Search name, email, phone" oninput="SalesUI.filterExistingCustomers(this.value)">
                <div id="salesExistingCustomerList">
                    ${this.customerButtons(customers, checked)}
                </div>
            </div>`;
    },

    customerButtons(customers, checkedSet = new Set()) {
        return customers.length ? customers.map(c => `<button type="button" style="display:block;width:100%;margin:8px 0;padding:14px;text-align:left;" onclick="SalesUI.selectPatron('${UI.esc(c.id)}')"><strong>${UI.esc(CRM.fullName(c) || c.email || "Customer")}</strong>${c.email ? `<br><small>${UI.esc(c.email)}</small>` : ""}${c.phone ? `<br><small>${UI.esc(c.phone)}</small>` : ""}${checkedSet.has(String(c.id)) ? `<br><small>Checked in to this event</small>` : ""}</button>`).join("") : `<p>No registered customers yet.</p>`;
    },

    filterExistingCustomers(term) {
        const eventId = this.activeEventId();
        const checked = new Set(this.patronsForEvent(eventId).map(c => String(c.id)));
        const list = document.getElementById("salesExistingCustomerList");
        if (!list) return;
        const customers = String(term || "").trim() ? CRM.search(term) : CRM.all();
        list.innerHTML = this.customerButtons(customers, checked);
    },

    showNewCustomer() {
        this.customerMode = "new";
        this.selectedCustomerId = "";
        const workspace = document.getElementById("workspace");
        if (!workspace) return;
        const event = Events.get(this.activeEventId());
        workspace.innerHTML = `
            <h2>New Customer — ${UI.esc(event?.name || "Event")}</h2>
            <div class="card">
                <button type="button" onclick="SalesUI.renderPatronPicker()">← Customer Type</button>
                <h3>How will the customer enter their information?</h3>
                <button type="button" onclick="SalesUI.showManualNewCustomer()">Enter Customer Information Manually</button>
                <button type="button" onclick="SalesUI.selectSelfCheckoutCustomer()">Customer Enters Information on Stripe Checkout</button>
                <p><small>The second option creates the sale without attaching an old customer. Stripe collects the new buyer's email during checkout.</small></p>
            </div>`;
    },

    showManualNewCustomer() {
        const workspace = document.getElementById("workspace");
        if (!workspace) return;
        workspace.innerHTML = `
            <h2>New Customer Information</h2>
            <div class="card">
                <button type="button" onclick="SalesUI.showNewCustomer()">← Back</button>
                <label>First Name</label><input id="salesNewFirstName" autocomplete="given-name">
                <label>Last Name</label><input id="salesNewLastName" autocomplete="family-name">
                <label>Email</label><input id="salesNewEmail" type="email" autocomplete="email">
                <label>Phone</label><input id="salesNewPhone" type="tel" autocomplete="tel">
                <button type="button" onclick="SalesUI.saveNewCustomerAndContinue()">Save New Customer & Continue</button>
            </div>`;
    },

    saveNewCustomerAndContinue() {
        const firstName = String(document.getElementById("salesNewFirstName")?.value || "").trim();
        const lastName = String(document.getElementById("salesNewLastName")?.value || "").trim();
        const email = String(document.getElementById("salesNewEmail")?.value || "").trim();
        const phone = String(document.getElementById("salesNewPhone")?.value || "").trim();
        if (!firstName && !lastName && !email && !phone) return alert("Enter at least one customer detail, or choose Customer Enters Information on Stripe Checkout.");
        const customer = CRM.create({ firstName, lastName, email, phone, tags:["New Customer"] });
        this.selectedCustomerId = customer.id;
        this.customerMode = "new-manual";
        this.cart = {};
        this.renderMenu();
    },

    selectSelfCheckoutCustomer() {
        this.selectedCustomerId = "";
        this.customerMode = "new-self";
        this.cart = {};
        this.renderMenu();
    },

    selectWalkIn() {
        this.selectedCustomerId = "";
        this.customerMode = "walkin";
        this.cart = {};
        this.renderMenu();
    },

    chooseEvent(eventId) { this.selectedEventId = eventId; this.open(); },
    changeEvent() { this.selectedEventId = ""; this.renderPatronPicker(); },
    async syncPatrons() {
        const eventId = this.activeEventId();
        if (!eventId || this.syncingPatrons) return;
        this.syncingPatrons = true;
        try { await Eventbrite.syncCheckedIn(eventId); await this.showExistingCustomers(); }
        catch (error) { alert(error?.message || "Unable to sync Eventbrite check-ins."); }
        finally { this.syncingPatrons = false; }
    },
    selectPatron(customerId) { this.selectedCustomerId = customerId || ""; this.customerMode = customerId ? "existing" : "walkin"; this.cart = {}; this.renderMenu(); },
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
        const customerLabel = customer ? (CRM.fullName(customer) || customer.email || "Customer") : this.customerMode === "new-self" ? "New customer — enters own details" : "Walk-in / no customer record";
        const workspace = document.getElementById("workspace"); if (!workspace) return;
        workspace.innerHTML = `<h2>Event Sales Menu</h2><div class="card"><p><strong>Event:</strong> ${UI.esc(event?.name || "General")}</p><p><strong>Customer:</strong> ${UI.esc(customerLabel)}</p><button type="button" onclick="SalesUI.renderPatronPicker()">Change Customer</button></div><div class="card"><h3>Menu</h3>${items.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">${items.map(item => `<button type="button" onclick="SalesUI.addItem('${UI.esc(item.id)}')" style="padding:16px;text-align:left;min-height:100px;"><strong>${UI.esc(item.name || "Item")}</strong><br><span>${Utils.money(item.sellPrice)}</span><br><small>Stock: ${Number(item.quantity || 0)}</small></button>`).join("")}</div>` : `<p>No Event Sales inventory is available. In Inventory, set an item's Category to <strong>Event Sales</strong> and give it a Sell Price.</p>`}</div><div class="card"><h3>Current Ticket</h3>${this.selectedItems().length ? this.selectedItems().map(item => `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eee;"><span>${UI.esc(item.name)}</span><span><button type="button" onclick="SalesUI.subtractItem('${UI.esc(item.inventoryId)}')">−</button><strong style="padding:0 10px;">${item.quantity}</strong><button type="button" onclick="SalesUI.addItem('${UI.esc(item.inventoryId)}')">+</button></span><strong>${Utils.money(item.price * item.quantity)}</strong></div>`).join("") : `<p>No items added yet.</p>`}<br><p style="font-size:1.3em;"><strong>Total: ${Utils.money(this.total())}</strong></p><button type="button" onclick="SalesUI.checkout()" ${this.selectedItems().length ? "" : "disabled"}>Open Stripe Checkout</button><button type="button" onclick="SalesUI.createPaymentLink()" ${this.selectedItems().length ? "" : "disabled"}>Copy Customer Payment Link</button><button type="button" onclick="SalesUI.clearCart()">Clear Ticket</button></div>`;
    },
    clearCart() { this.cart = {}; this.renderMenu(); },
    checkoutOptions() {
        const customer = this.selectedCustomerId ? CRM.get(this.selectedCustomerId) : null;
        return { eventId:this.activeEventId(), customerId:this.selectedCustomerId, customerEmail:customer?.email || "" };
    },
    async checkout() {
        const items = this.selectedItems(); if (!items.length) return alert("Add at least one item.");
        for (const sold of items) { const item = Inventory.get(sold.inventoryId); if (!item || Number(sold.quantity) > Number(item.quantity || 0)) return alert(`${sold.name} does not have enough stock for this sale.`); }
        try { await SNPStripePayments.startCheckout(items, this.checkoutOptions()); }
        catch (error) { alert(error?.message || "Unable to start checkout."); }
    },
    async createPaymentLink() {
        const items = this.selectedItems(); if (!items.length) return alert("Add at least one item.");
        try { await SNPStripePayments.copyCheckoutLink(items, this.checkoutOptions()); }
        catch (error) { alert(error?.message || "Unable to create customer payment link."); }
    },
    render() { return this.open(); }
};
window.SalesUI = SalesUI;
SalesUI.install();
