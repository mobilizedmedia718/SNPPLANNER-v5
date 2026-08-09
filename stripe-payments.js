/* SNP Planner Stripe checkout */
const SNPStripePayments = {
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
                customerEmail: options.customerEmail || "",
                purchaseType: options.purchaseType || "sale"
            })
        });

        const data = await response.json();
        if (!response.ok || !data?.checkoutUrl) {
            throw new Error(data?.error || "Unable to start Stripe checkout.");
        }
        window.location.href = data.checkoutUrl;
    },

    async startTicketCheckout(items, options = {}) {
        const ticketItems = (items || []).map(item => ({ ...item, saleType: "ticket" }));
        return this.startCheckout(ticketItems, { ...options, purchaseType: "ticket" });
    },

    async sandboxTest() {
        try {
            await this.startCheckout([
                { name: "SNP Planner Sandbox Test Beverage", quantity: 1, price: 1.00, saleType: "sale", category: "Event Sales" }
            ], { eventId: "sandbox-test", purchaseType: "sale" });
        } catch (error) {
            alert(error?.message || "Unable to start sandbox checkout.");
        }
    },

    installButton() {
        const oldRenderSettings = UI.renderSettings;
        if (typeof oldRenderSettings !== "function") return;
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
                    <p>Sandbox mode is connected. Stripe purchasers are now tied to CRM/event patron records, and ticket purchases can be marked as confirmed guests.</p>
                    <button type="button" onclick="SNPStripePayments.sandboxTest()">Run $1 Sandbox Payment Test</button>
                `;
                workspace.appendChild(card);
            }, 0);
            return result;
        };
    }
};

window.SNPStripePayments = SNPStripePayments;
SNPStripePayments.installButton();
