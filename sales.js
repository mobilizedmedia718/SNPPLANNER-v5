/* Sales / Point-of-Sale flow for SNP Planner */
const SalesUI = {
    cart: {},

    install() {
        const originalSidebar = UI.renderSidebar;
        UI.renderSidebar = function(...args) {
            const result = originalSidebar.apply(this, args);
            const sidebar = document.getElementById("sidebar");
            if (sidebar && !document.getElementById("salesNavButton")) {
                const btn = document.createElement("button");
                btn.id = "salesNavButton";
                btn.textContent = "Sales";
                btn.onclick = () => SalesUI.render();
                sidebar.appendChild(btn);
            }
            return result;
        };
    },

    inventoryForSale() {
        return Inventory.all().filter(item => item.status !== "Inactive" && Number(item.sellPrice || 0) > 0);
    },

    selectedItems() {
        return this.inventoryForSale().map(item => {
            const qty = Number(this.cart[item.id] || 0);
            return qty > 0 ? {
                inventoryId: item.id,
                name: item.name,
                quantity: qty,
                price: Number(item.sellPrice || 0)
            } : null;
        }).filter(Boolean);
    },

    total() {
        return this.selectedItems().reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    },

    changeQty(id, value) {
        const item = Inventory.get(id);
        const available = Math.max(0, Number(item?.quantity || 0));
        let qty = Math.max(0, Math.floor(Number(value || 0)));
        qty = Math.min(qty, available);
        this.cart[id] = qty;
        this.render();
    },

    render() {
        const items = this.inventoryForSale();
        const events = Events.all().filter(e => e.status !== "Cancelled" && e.status !== "Completed");
        const customers = CRM.all();
        const workspace = document.getElementById("workspace");
        if (!workspace) return;

        workspace.innerHTML = `
            <h2>Sales</h2>
            <div class="card">
                <h3>Sale Details</h3>
                <label>Event</label>
                <select id="salesEventId">
                    <option value="">General / No Event</option>
                    ${events.map(e => `<option value="${UI.esc(e.id)}">${UI.esc(e.name || "Untitled Event")}${e.date ? ` — ${UI.esc(e.date)}` : ""}</option>`).join("")}
                </select>

                <label>Customer</label>
                <select id="salesCustomerId" onchange="SalesUI.fillCustomerEmail()">
                    <option value="">Walk-in / No Customer</option>
                    ${customers.map(c => `<option value="${UI.esc(c.id)}">${UI.esc([c.firstName,c.lastName].filter(Boolean).join(" ") || c.email || "Customer")}</option>`).join("")}
                </select>

                <label>Receipt Email</label>
                <input id="salesCustomerEmail" type="email" placeholder="Optional customer email">
            </div>

            <div class="card">
                <h3>Products</h3>
                ${items.length ? items.map(item => `
                    <div style="display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eee;">
                        <div>
                            <strong>${UI.esc(item.name)}</strong><br>
                            <small>${UI.esc(item.category || "")} • In stock: ${Number(item.quantity || 0)} • ${Utils.money(item.sellPrice)}</small>
                        </div>
                        <input type="number" min="0" max="${Number(item.quantity || 0)}" step="1" value="${Number(this.cart[item.id] || 0)}" style="width:90px;" onchange="SalesUI.changeQty('${UI.esc(item.id)}', this.value)">
                        <strong>${Utils.money(Number(item.sellPrice || 0) * Number(this.cart[item.id] || 0))}</strong>
                    </div>
                `).join("") : `<p>No sellable inventory found. Add Inventory items with a Sell Price greater than $0 first.</p>`}
            </div>

            <div class="card">
                <h3>Checkout</h3>
                <p><strong>Total:</strong> ${Utils.money(this.total())}</p>
                <p>After Stripe confirms payment, SNP Planner records the sale in Finance, updates linked Event revenue and Customer spending, and subtracts purchased quantities from Inventory automatically.</p>
                <button type="button" onclick="SalesUI.checkout()" ${this.selectedItems().length ? "" : "disabled"}>Charge with Stripe</button>
                <button type="button" onclick="SalesUI.clearCart()">Clear Sale</button>
            </div>
        `;
    },

    fillCustomerEmail() {
        const id = document.getElementById("salesCustomerId")?.value || "";
        const customer = id ? CRM.get(id) : null;
        const input = document.getElementById("salesCustomerEmail");
        if (input) input.value = customer?.email || "";
    },

    clearCart() {
        this.cart = {};
        this.render();
    },

    async checkout() {
        const items = this.selectedItems();
        if (!items.length) return alert("Choose at least one item.");

        for (const sold of items) {
            const item = Inventory.get(sold.inventoryId);
            if (!item || Number(sold.quantity) > Number(item.quantity || 0)) {
                return alert(`${sold.name} does not have enough stock for this sale.`);
            }
        }

        const eventId = document.getElementById("salesEventId")?.value || "";
        const customerId = document.getElementById("salesCustomerId")?.value || "";
        const customerEmail = document.getElementById("salesCustomerEmail")?.value.trim() || "";

        try {
            await SNPStripePayments.startCheckout(items, { eventId, customerId, customerEmail });
        } catch (error) {
            alert(error?.message || "Unable to start checkout.");
        }
    }
};

window.SalesUI = SalesUI;
SalesUI.install();
