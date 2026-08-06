const SNPPlanner = {
    version: "5.0",
    initialized: false,

    init() {
        console.log("SNP Planner V5 Starting...");

        this.initialized = true;

        UI.renderLayout();

        console.log("SNP Planner Ready");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    SNPPlanner.init();
});
