const SNPPlanner = {

    version: "5.0",

    initialized: false,

    async init() {

        console.log(`Starting SNP Planner V${this.version}...`);

        try {
            if (!window.SNPDatabase || !SNPDatabase.client) {
                throw new Error("Supabase connection is not available.");
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
            Settings.load();
            Business.load();
            Events.load();
            Venues.load();
            Vendors.load();
            Inventory.load();
            CRM.load();
            Finance.load();
            Assets.load();
            Calendar.load();

            UI.renderLayout();
            UI.renderDashboard();

            this.initialized = true;
            console.log("SNP Planner Ready");

        } catch (error) {
            this.showStartupError(error);
        }
    },

    showStartupError(error) {
        console.error("SNP Planner failed to initialize:", error);

        const app = document.getElementById("app");
        if (!app) return;

        app.innerHTML = `
            <div style="padding:20px;font-family:Arial,sans-serif;">
                <h2>SNP Planner could not start</h2>
                <p>An application error occurred.</p>
                <pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:8px;">${String(error?.message || error)}</pre>
            </div>
        `;
    }

};

document.addEventListener("DOMContentLoaded", () => {
    SNPPlanner.init();
});
