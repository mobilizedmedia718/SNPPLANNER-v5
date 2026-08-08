const SNPPlanner = {

    version: "5.0",

    initialized: false,

    init() {

        console.log(
            `Starting SNP Planner V${this.version}...`
        );

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

            console.log(
                "SNP Planner Ready"
            );

        } catch (error) {

            console.error(
                "SNP Planner failed to initialize:",
                error
            );

            const app =
                document.getElementById("app");

            if (app) {

                app.innerHTML = `

                    <div style="
                        padding:20px;
                        font-family:Arial,sans-serif;
                    ">

                        <h2>
                            SNP Planner could not start
                        </h2>

                        <p>
                            An application error occurred.
                        </p>

                        <pre style="
                            white-space:pre-wrap;
                            background:#f3f4f6;
                            padding:12px;
                            border-radius:8px;
                        ">${String(error.message || error)}</pre>

                    </div>
                `;
            }
        }
    }

};

document.addEventListener(
    "DOMContentLoaded",
    () => {
        SNPPlanner.init();
    }
);
