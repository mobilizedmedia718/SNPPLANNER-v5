const UI = {

    renderLayout() {

        document.getElementById("app").innerHTML = `

        <header class="topbar">

            <div class="logo">
                <h1>SNP Planner V5</h1>
            </div>

            <div class="topbar-right">
                <span>Version ${SNPPlanner.version}</span>
            </div>

        </header>

        <div class="layout">

            <aside id="sidebar"></aside>

            <main id="workspace"></main>

        </div>

        `;

        this.renderSidebar();

    },

    renderSidebar() {

        document.getElementById("sidebar").innerHTML = `

        <button onclick="UI.renderDashboard()">Dashboard</button>

        <button onclick="UI.renderBusiness()">Business</button>

        <button onclick="UI.renderEvents()">Events</button>

        <button onclick="UI.renderVenues()">Venues</button>

        <button onclick="UI.renderVendors()">Vendors</button>

        <button onclick="UI.renderInventory()">Inventory</button>

        <button onclick="UI.renderCRM()">CRM</button>

        <button onclick="UI.renderFinance()">Finance</button>

        <button onclick="UI.renderAssets()">Assets</button>

        <button onclick="UI.renderCalendar()">Calendar</button>

        <button onclick="UI.renderReports()">Reports</button>

        <button onclick="UI.renderSettings()">Settings</button>

        `;

    },

    renderDashboard() {

        const report = Reports.summary();

        document.getElementById("workspace").innerHTML = `

        <h2>Dashboard</h2>

        <div class="dashboard-grid">

            <div class="card">
                <h3>Events</h3>
                <p>${report.totalEvents}</p>
            </div>

            <div class="card">
                <h3>Customers</h3>
                <p>${report.totalCustomers}</p>
            </div>

            <div class="card">
                <h3>Income</h3>
                <p>${Utils.money(report.totalIncome)}</p>
            </div>

            <div class="card">
                <h3>Profit</h3>
                <p>${Utils.money(report.totalProfit)}</p>
            </div>

        </div>

        `;

    },

    renderBusiness(){},
    renderEvents(){},
    renderVenues(){},
    renderVendors(){},
    renderInventory(){},
    renderCRM(){},
    renderFinance(){},
    renderAssets(){},
    renderCalendar(){},
    renderReports(){},
    renderSettings(){}

};
