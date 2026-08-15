/* SNP Planner Stripe checkout */
const SNPStripePayments = {
    async validAccessToken() {
        let session = await SNPDatabase.getSession();
        if (!session?.access_token) throw new Error("Please sign in before starting checkout.");

        const expiresAt = Number(session.expires_at || 0);
        const needsRefresh = expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 60;
        if (needsRefresh && session.refresh_token) {
            const response = await fetch(`${SNP_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: "POST",
                headers: SNPDatabase.headers(),
                body: JSON.stringify({ refresh_token: session.refresh_token })
            });
            const refreshed = await response.json();
            if (!response.ok || !refreshed?.access_token) {
                SNPDatabase.saveSession(null);
                throw new Error("Your SNP Planner session expired. Please sign out, sign back in, then try the ticket again.");
            }
            SNPDatabase.saveSession(refreshed);
            session = refreshed;
        }
        return session.access_token;
    },

    async startCheckout(items, options = {}) {
        const token = await this.validAccessToken();

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

        let data = {};
        try { data = await response.json(); } catch (_) {}
        if (!response.ok || !data?.checkoutUrl) {
            if (response.status === 401) {
                throw new Error("Your SNP Planner login expired. Sign out, sign back in, then try the ticket again.");
            }
            throw new Error(data?.error || "Unable to start Stripe checkout.");
        }
        if (options.navigate === false) return data;
        window.location.href = data.checkoutUrl;
        return data;
    },

    async startTicketCheckout(items, options = {}) {
        const ticketItems = (items || []).map(item => ({ ...item, saleType: "ticket" }));
        return this.startCheckout(ticketItems, { ...options, purchaseType: "ticket" });
    },

    async copyCheckoutLink(items, options = {}) {
        const data = options.purchaseType === "ticket"
            ? await this.startTicketCheckout(items, { ...options, navigate:false })
            : await this.startCheckout(items, { ...options, navigate:false });
        const url = String(data?.checkoutUrl || "");
        if (!url) throw new Error("Stripe did not return a checkout link.");
        try {
            await navigator.clipboard.writeText(url);
            alert("Customer checkout link copied. Send this link to the customer so they can enter their own information and pay.");
        } catch (_) {
            window.prompt("Copy this customer checkout link:", url);
        }
        return data;
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
                    <p>Sandbox mode is connected. Stripe purchasers are tied to CRM/event patron records after payment, and ticket purchases can be marked as confirmed guests.</p>
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
