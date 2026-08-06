const SNPPlanner = {
    version: "5.0",
    initialized: false,

    init() {

        console.log(`Starting SNP Planner V${this.version}...`);

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

    }
};

document.addEventListener("DOMContentLoaded", () => {
    SNPPlanner.init();
});
