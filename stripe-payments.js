/* SNP Planner Stripe checkout + sales register */
const SNPStripePayments = {
    cart: {},

    async startCheckout(items, options = {}) {
        const token = SNPDatabase.session?.access_token;
        if (!token) throw new Error("Please sign in before starting checkout.");

        const response = await fetch(`${SNP_SUPABASE_URL}/functions/v1/create-stripe-checkout`, {
            method: "POST",
            headers: {
                ...SNPDatabase.headers(token),
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                items,
                eventId: options.eventId || "",
                customerId: options.customerId || "",
                customerEmail: options.customerEmail || ""
            })
        });

        const data = await response.json();
        if (!response.ok || !data?.checkoutUrl) {
            throw new Error(data?.error || "Unable to start Stripe checkout.");
        }
        window.location.href = data.checkoutUrl;
    },

    async sandboxTest() {
        try {
            await this.startCheckout([
                { name: "SNP Planner Sandbox Test Beverage", quantity: 1, price: 1.00 }
            ], { eventId: "sandbox-test" });
        } catch (error) {
            alert(error?.message || "Unable to start sandbox checkout.");
        }
    },

    renderSales() {
        this.cart = {};
        const workspace = document.getElementById("workspace");
        const inventory = Inventory.all().filter(item => item.status !== "Inactive" && Number(item.sellPrice || 0) > 0);
        const events = Events.all().filter(event => event.status !== "Cancelled" && event.status !== "Completed");
        const customers = CRM.all();

        workspace.innerHTML = `
            <h2>Sales / Checkout</h2>
            <div class="card">
                <label>Event</label>
                <select id="saleEventId">
                    <option value="">General Sale / No Event</option>
                    ${events.map(e => `<option value="${UI.esc(e.id)}">${UI.esc(e.name || "Untitled Event")} ${e.date ? `— ${UI.esc(e.date)}` : ""}</option>`).join("")}
                </select>

                <label>Customer</label>
                <select id="saleCustomerId" onchange="SNPStripePayments.fillCustomerEmail()">
                    <option value="">Walk-in / No Customer</option>
                    ${customers.map(c => `<option value="${UI.esc(c.id)}">${UI.esc([c.firstName,c.lastName].filter(Boolean).join(" ") || c.email || "Unnamed Customer")}</option>`).join("")}
                </select>

                <label>Receipt Email (optional)</label>
                <input id="saleCustomerEmail" type="email" placeholder="customer@example.com">
            </div>

            <div class="card">
                <h3>Products</h3>
                ${inventory.length ? inventory.map(item => `
                    <div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #ddd;">
                        <div>
                            <strong>${UI.esc(item.name)}</strong><br>
                            <small>${UI.esc(item.category || "")} · In stock: ${Number(item.quantity || 0)} · ${Utils.money(item.sellPrice || 0)}</small>
                        </div>
                        <input type="number" min="0" max="${Math.max(0,Number(item.quantity||0))}" step="1" value="0" style="width:90px" oninput="SNPStripePayments.setQty('${UI.esc(item.id)}', this.value)">
                        <span>${Utils.money(item.sellPrice || 0)}</span>
                    </div>
                `).join("") : "<p>No sellable inventory yet. Add an inventory item with a selling price first.</p>"}
            </div>

            <div class="card">
                <h3>Current Sale</h3>
                <div id="saleCartSummary"><p>No items selected.</p></div>
                <button type="button" onclick="SNPStripePayments.checkoutCart()" ${inventory.length ? "" : "disabled"}>Checkout with Stripe</button>
            </div>
        `;
    },

    fillCustomerEmail() {
        const id = document.getElementById("saleCustomerId")?.value || "";
        const customer = CRM.get(id);
        const email = document.getElementById("saleCustomerEmail");
        if (email) email.value = customer?.email || "";
    },

    setQty(id, value) {
        const item = Inventory.get(id);
        if (!item) return;
        const max = Math.max(0, Number(item.quantity || 0));
        const qty = Math.min(max, Math.max(0, Math.floor(Number(value || 0))));
        if (qty > 0) this.cart[id] = qty; else delete this.cart[id];
        this.renderCartSummary();
    },

    renderCartSummary() {
        const box = document.getElementById("saleCartSummary");
        if (!box) return;
        const rows = Object.entries(this.cart).map(([id, qty]) => {
            const item = Inventory.get(id);
            return item ? { item, qty:Number(qty) } : null;
        }).filter(Boolean);
        if (!rows.length) {
            box.innerHTML = "<p>No items selected.</p>";
            return;
        }
        const total = rows.reduce((sum,row) => sum + Number(row.item.sellPrice||0) * row.qty, 0);
        box.innerHTML = `
            ${rows.map(row => `<p>${row.qty} × ${UI.esc(row.item.name)} — ${Utils.money(Number(row.item.sellPrice||0)*row.qty)}</p>`).join("")}
            <h3>Total: ${Utils.money(total)}</h3>
        `;
    },

    async checkoutCart() {
        try {
            const items = Object.entries(this.cart).map(([id, qty]) => {
                const item = Inventory.get(id);
                if (!item) return null;
                return {
                    inventoryId: item.id,
                    name: item.name,
                    quantity: Number(qty),
                    price: Number(item.sellPrice || 0)
                };
            }).filter(Boolean);
            if (!items.length) return alert("Select at least one item first.");

            const eventId = document.getElementById("saleEventId")?.value || "";
            const customerId = document.getElementById("saleCustomerId")?.value || "";
            const customerEmail = document.getElementById("saleCustomerEmail")?.value.trim() || "";
            await this.startCheckout(items, { eventId, customerId, customerEmail });
        } catch (error) {
            alert(error?.message || "Unable to start checkout.");
        }
    },

    install() {
        const originalSidebar = UI.renderSidebar;
        if (typeof originalSidebar === "function") {
            UI.renderSidebar = function(...args) {
                const result = originalSidebar.apply(this, args);
                const sidebar = document.getElementById("sidebar");
                if (sidebar && !document.getElementById("snpSalesNav")) {
                    const button = document.createElement("button");
                    button.id = "snpSalesNav";
                    button.textContent = "Sales / Checkout";
                    button.onclick = () => SNPStripePayments.renderSales();
                    sidebar.appendChild(button);
                }
                return result;
            };
        }

        const oldRenderSettings = UI.renderSettings;
        if (typeof oldRenderSettings === "function") {
            UI.renderSettings = function(...args) {
                const result = oldRenderSettings.apply(this, args);
                setTimeout(() => {
                    const workspace = document.getElementById("workspace");
                    if (!workspace || document.getElementById("stripeSandboxTest")) return;
                    const card = document.createElement("div");
                    card.className = "card";
                    card.id = "stripeSandboxTest";
                    card.innerHTML = `
                        <h3>Stripe Payments</h3>
                        <p>Sandbox mode is connected. Use Sales / Checkout for inventory sales.</p>
                        <button type="button" onclick="SNPStripePayments.sandboxTest()">Run $1 Sandbox Payment Test</button>
                    `;
                    workspace.appendChild(card);
                }, 0);
                return result;
            };
        }
    }
};

window.SNPStripePayments = SNPStripePayments;
SNPStripePayments.install();
