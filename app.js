const SNPPlanner = {

    version: "5.30",
    initialized: false,

    async init() {
        console.log(`Starting SNP Planner V${this.version}...`);
        try {
            if (!window.SNPDatabase || !SNPDatabase.client) {
                throw new Error("Supabase connection is not available.");
            }

            const redirect = await SNPDatabase.consumeAuthRedirect();
            if (redirect?.type === "recovery") {
                SNPDatabase.renderPasswordReset();
                return;
            }

            const session = await SNPDatabase.getSession();
            if (!session) {
                SNPDatabase.renderAuth();
                return;
            }

            await this.startApplication();
        } catch (error) {
            this.showStartupError(error);
        }
    },

    async startApplication() {
        try {
            await SNPDatabase.syncCloudToLocal();

            Settings.load();
            Business.load();
            Events.load();
            if (typeof Eventbrite !== "undefined" && typeof Eventbrite.load === "function") Eventbrite.load();
            Venues.load();
            Vendors.load();
            Inventory.load();
            CRM.load();
            Finance.load();
            Assets.load();
            Calendar.load();
            if (typeof PromoAgent !== "undefined" && typeof PromoAgent.load === "function") PromoAgent.load();

            UI.renderLayout();
            if (window.SNPHome && typeof SNPHome.home === "function") SNPHome.home();
            else UI.renderDashboard();

            this.initialized = true;
            console.log(`SNP Planner V${this.version} Ready`);
        } catch (error) {
            this.showStartupError(error);
        }
    },

    showStartupError(error) {
        console.error("SNP Planner failed to initialize:", error);
        const app = document.getElementById("app");
        if (!app) return;
        app.innerHTML = `<div style="padding:20px;font-family:Arial,sans-serif;"><h2>SNP Planner could not start</h2><p>An application error occurred.</p><pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:8px;">${String(error?.message || error)}</pre></div>`;
    }
};

document.addEventListener("DOMContentLoaded", () => { SNPPlanner.init(); });
