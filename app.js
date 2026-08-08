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

            installUnsavedChangesGuard();

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

function installUnsavedChangesGuard() {

    if (window.__snpUnsavedGuardInstalled) return;
    window.__snpUnsavedGuardInstalled = true;

    let dirty = false;
    let bypass = false;
    let pendingNavigation = null;

    const guardedRenderNames = [
        "renderDashboard",
        "renderBusiness",
        "renderEvents",
        "renderEventDetail",
        "renderVenues",
        "renderVenueDetail",
        "renderVendors",
        "renderVendorDetail",
        "renderInventory",
        "renderInventoryDetail",
        "renderCRM",
        "renderCustomerDetail",
        "renderFinance",
        "renderFinanceDetail",
        "renderAssets",
        "renderAssetDetail",
        "renderCalendar",
        "renderCalendarDetail",
        "renderReports",
        "renderSettings"
    ];

    function workspace() {
        return document.getElementById("workspace");
    }

    function currentSaveButton() {
        const root = workspace();
        if (!root) return null;

        return Array.from(root.querySelectorAll("button")).find(button =>
            /^Save(?:\s|$)/i.test(String(button.textContent || "").trim())
        ) || null;
    }

    function isEditingScreen() {
        return !!currentSaveButton();
    }

    function markDirty(event) {
        const root = workspace();
        if (!root || !event.target || !root.contains(event.target)) return;
        if (!isEditingScreen()) return;
        dirty = true;
    }

    function removePrompt() {
        document.getElementById("unsavedChangesModal")?.remove();
    }

    function continueNavigation() {
        const action = pendingNavigation;
        pendingNavigation = null;
        removePrompt();

        if (!action) return;

        bypass = true;
        try {
            action();
        } finally {
            setTimeout(() => {
                bypass = false;
            }, 0);
        }
    }

    function showPrompt() {
        removePrompt();

        const overlay = document.createElement("div");
        overlay.id = "unsavedChangesModal";
        overlay.style.cssText = [
            "position:fixed",
            "inset:0",
            "background:rgba(0,0,0,.5)",
            "display:flex",
            "align-items:center",
            "justify-content:center",
            "z-index:999999",
            "padding:20px"
        ].join(";");

        overlay.innerHTML = `
            <div class="card" style="max-width:540px;width:100%;background:#fff;">
                <h3>Unsaved Changes</h3>
                <p>You changed information on this page and have not saved it yet.</p>
                <p>Choose what you want to do before leaving.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button type="button" id="unsavedSaveContinue">Save & Continue</button>
                    <button type="button" id="unsavedDiscardContinue">Cancel Changes & Continue</button>
                    <button type="button" id="unsavedStay">Stay Here</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById("unsavedSaveContinue").onclick = function () {
            const save = currentSaveButton();

            if (!save) {
                dirty = false;
                continueNavigation();
                return;
            }

            dirty = false;
            bypass = true;
            save.click();

            setTimeout(() => {
                bypass = false;
                continueNavigation();
            }, 50);
        };

        document.getElementById("unsavedDiscardContinue").onclick = function () {
            dirty = false;
            continueNavigation();
        };

        document.getElementById("unsavedStay").onclick = function () {
            pendingNavigation = null;
            removePrompt();
        };
    }

    guardedRenderNames.forEach(name => {
        const original = UI[name];
        if (typeof original !== "function") return;

        UI[name] = function (...args) {
            if (bypass || !dirty) {
                return original.apply(UI, args);
            }

            pendingNavigation = () => original.apply(UI, args);
            showPrompt();
            return undefined;
        };
    });

    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);

    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("button");
        if (!button) return;

        if (/^Save(?:\s|$)/i.test(String(button.textContent || "").trim())) {
            dirty = false;
        }
    }, true);

    window.addEventListener("beforeunload", function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    });

    UI.unsavedChanges = {
        mark() { dirty = true; },
        clear() { dirty = false; },
        isDirty() { return dirty; }
    };
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        SNPPlanner.init();
    }
);
