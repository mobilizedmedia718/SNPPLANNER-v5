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

    renderBusiness(){

    const b = Business.data;

    document.getElementById("workspace").innerHTML = `

    <h2>Business Profile</h2>

    <div class="card">

        <label>Business Name</label>
        <input id="businessName" value="${b.name}">

        <label>Owner</label>
        <input id="businessOwner" value="${b.owner}">

        <label>Phone</label>
        <input id="businessPhone" value="${b.phone}">

        <label>Email</label>
        <input id="businessEmail" value="${b.email}">

        <label>Website</label>
        <input id="businessWebsite" value="${b.website}">

        <label>Address</label>
        <input id="businessAddress" value="${b.address}">

        <label>City</label>
        <input id="businessCity" value="${b.city}">

        <label>State</label>
        <input id="businessState" value="${b.state}">

        <label>ZIP Code</label>
        <input id="businessZip" value="${b.zip}">

        <label>Tax Rate (%)</label>
        <input id="businessTax" type="number" value="${b.taxRate}">

        <label>Notes</label>
        <textarea id="businessNotes">${b.notes}</textarea>

        <br><br>

        <button onclick="Business.update('name',document.getElementById('businessName').value);
        Business.update('owner',document.getElementById('businessOwner').value);
        Business.update('phone',document.getElementById('businessPhone').value);
        Business.update('email',document.getElementById('businessEmail').value);
        Business.update('website',document.getElementById('businessWebsite').value);
        Business.update('address',document.getElementById('businessAddress').value);
        Business.update('city',document.getElementById('businessCity').value);
        Business.update('state',document.getElementById('businessState').value);
        Business.update('zip',document.getElementById('businessZip').value);
        Business.update('taxRate',document.getElementById('businessTax').value);
        Business.update('notes',document.getElementById('businessNotes').value);
        alert('Business Profile Saved');">

        Save Business Profile

        </button>

    </div>

    `;

},
    renderEvents(){

    const events = Events.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Events</h2>

    <button onclick="Events.create(); UI.renderEvents();">
        + New Event
    </button>

    <br><br>

    ${
        events.length === 0
        ? "<p>No events created yet.</p>"
        : events.map(event => `

            <div class="card">

                <label>Event Name</label>
                <input
                    value="${event.name}"
                    onchange="Events.update('${event.id}',{name:this.value})">

                <label>Date</label>
                <input
                    type="date"
                    value="${event.date}"
                    onchange="Events.update('${event.id}',{date:this.value})">

                <label>Time</label>
                <input
                    type="time"
                    value="${event.time}"
                    onchange="Events.update('${event.id}',{time:this.value})">

                <label>Status</label>

                <select
                    onchange="Events.update('${event.id}',{status:this.value})">

                    <option ${event.status==="Draft"?"selected":""}>Draft</option>
                    <option ${event.status==="Scheduled"?"selected":""}>Scheduled</option>
                    <option ${event.status==="Completed"?"selected":""}>Completed</option>
                    <option ${event.status==="Cancelled"?"selected":""}>Cancelled</option>

                </select>

                <br><br>

                <button onclick="
                    if(confirm('Delete this event?')){
                        Events.remove('${event.id}');
                        UI.renderEvents();
                    }">
                    Delete Event
                </button>

            </div>

            <br>

        `).join("")
    }

    `;

    },
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
