const UI = {

    esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    },

    renderLayout() {

        document.getElementById("app").innerHTML = `

            <header class="topbar">

                <div class="logo">
                    <h1>🎨 SNP Planner V5</h1>
                </div>

                <div class="topbar-right">

                    <input
                        id="globalSearch"
                        type="search"
                        placeholder="Search customers, events, vendors..."
                        oninput="UI.handleSearch(this.value)">

                    <button onclick="UI.renderDashboard()">Dashboard</button>
                    <button onclick="UI.renderSettings()">⚙️</button>

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

    handleSearch(term) {

        if (!term.trim()) {
            this.renderDashboard();
            return;
        }

        const results = Utils.searchAll(term);

        document.getElementById("workspace").innerHTML = `

            <h2>Search Results</h2>

            <div class="card">
                <h3>Customers (${results.customers.length})</h3>
                ${results.customers.map(c =>
                    `<p>${this.esc(c.firstName)} ${this.esc(c.lastName)} — ${this.esc(c.email)}</p>`
                ).join("") || "<p>No customers found.</p>"}
            </div>

            <div class="card">
                <h3>Events (${results.events.length})</h3>
                ${results.events.map(e =>
                    `<p>${this.esc(e.name)} — ${this.esc(e.status)}</p>`
                ).join("") || "<p>No events found.</p>"}
            </div>

            <div class="card">
                <h3>Vendors (${results.vendors.length})</h3>
                ${results.vendors.map(v =>
                    `<p>${this.esc(v.name)} — ${this.esc(v.category)}</p>`
                ).join("") || "<p>No vendors found.</p>"}
            </div>

            <div class="card">
                <h3>Venues (${results.venues.length})</h3>
                ${results.venues.map(v =>
                    `<p>${this.esc(v.name)} — ${this.esc(v.city)}, ${this.esc(v.state)}</p>`
                ).join("") || "<p>No venues found.</p>"}
            </div>

            <div class="card">
                <h3>Inventory (${results.inventory.length})</h3>
                ${results.inventory.map(i =>
                    `<p>${this.esc(i.name)} — ${this.esc(i.category)}</p>`
                ).join("") || "<p>No inventory found.</p>"}
            </div>

            <div class="card">
                <h3>Assets (${results.assets.length})</h3>
                ${results.assets.map(a =>
                    `<p>${this.esc(a.name)} — ${this.esc(a.category)}</p>`
                ).join("") || "<p>No assets found.</p>"}
            </div>
        `;
    },

    renderDashboard() {

        const report = Reports.summary();

        document.getElementById("workspace").innerHTML = `

            <h2>Executive Dashboard</h2>

            <div class="dashboard-grid">

                <div class="card"><h3>Events</h3><h1>${report.totalEvents}</h1></div>
                <div class="card"><h3>Customers</h3><h1>${report.totalCustomers}</h1></div>
                <div class="card"><h3>Vendors</h3><h1>${report.totalVendors}</h1></div>
                <div class="card"><h3>Venues</h3><h1>${report.totalVenues}</h1></div>
                <div class="card"><h3>Inventory</h3><h1>${report.totalInventoryItems}</h1></div>
                <div class="card"><h3>Assets</h3><h1>${report.totalAssets}</h1></div>
                <div class="card"><h3>Income</h3><h2>${Utils.money(report.totalIncome)}</h2></div>
                <div class="card"><h3>Expenses</h3><h2>${Utils.money(report.totalExpenses)}</h2></div>
                <div class="card"><h3>Net Profit</h3><h2>${Utils.money(report.totalProfit)}</h2></div>

            </div>
        `;
    },

    renderBusiness() {

        const b = Business.data;

        document.getElementById("workspace").innerHTML = `

            <h2>Business Profile</h2>

            <div class="card">

                <label>Business Name</label>
                <input id="businessName" value="${this.esc(b.name)}">

                <label>Owner</label>
                <input id="businessOwner" value="${this.esc(b.owner)}">

                <label>Phone</label>
                <input id="businessPhone" value="${this.esc(b.phone)}">

                <label>Email</label>
                <input id="businessEmail" value="${this.esc(b.email)}">

                <label>Website</label>
                <input id="businessWebsite" value="${this.esc(b.website)}">

                <label>Address</label>
                <input id="businessAddress" value="${this.esc(b.address)}">

                <label>City</label>
                <input id="businessCity" value="${this.esc(b.city)}">

                <label>State</label>
                <input id="businessState" value="${this.esc(b.state)}">

                <label>ZIP Code</label>
                <input id="businessZip" value="${this.esc(b.zip)}">

                <label>Tax Rate (%)</label>
                <input id="businessTax" type="number" value="${Number(b.taxRate || 0)}">

                <label>Notes</label>
                <textarea id="businessNotes">${this.esc(b.notes)}</textarea>

                <br><br>

                <button onclick="
                    Business.update('name',document.getElementById('businessName').value);
                    Business.update('owner',document.getElementById('businessOwner').value);
                    Business.update('phone',document.getElementById('businessPhone').value);
                    Business.update('email',document.getElementById('businessEmail').value);
                    Business.update('website',document.getElementById('businessWebsite').value);
                    Business.update('address',document.getElementById('businessAddress').value);
                    Business.update('city',document.getElementById('businessCity').value);
                    Business.update('state',document.getElementById('businessState').value);
                    Business.update('zip',document.getElementById('businessZip').value);
                    Business.update('taxRate',Number(document.getElementById('businessTax').value));
                    Business.update('notes',document.getElementById('businessNotes').value);
                    alert('Business Profile Saved');
                ">
                    Save Business Profile
                </button>

            </div>
        `;
    },

    renderEvents() {

        const events = Events.all();
        const venues = Venues.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Events</h2>

            <button onclick="Events.create();UI.renderEvents();">+ New Event</button>

            <br><br>

            ${events.length === 0 ? "<p>No events created yet.</p>" :

            events.map(event => `

                <div class="card">

                    <label>Event Name</label>
                    <input value="${this.esc(event.name)}"
                        onchange="Events.update('${event.id}',{name:this.value})">

                    <label>Date</label>
                    <input type="date" value="${this.esc(event.date)}"
                        onchange="Events.update('${event.id}',{date:this.value})">

                    <label>Time</label>
                    <input type="time" value="${this.esc(event.time)}"
                        onchange="Events.update('${event.id}',{time:this.value})">

                    <label>Venue</label>

                    <select onchange="Events.update('${event.id}',{venueId:this.value})">

                        <option value="">Select Venue</option>

                        ${venues.map(v => `
                            <option value="${v.id}"
                                ${event.venueId === v.id ? "selected" : ""}>
                                ${this.esc(v.name || "Unnamed Venue")}
                            </option>
                        `).join("")}

                    </select>

                    <label>Capacity</label>
                    <input type="number" value="${Number(event.capacity || 0)}"
                        onchange="Events.update('${event.id}',{capacity:Number(this.value)})">

                    <label>Tickets Sold</label>
                    <input type="number" value="${Number(event.ticketsSold || 0)}"
                        onchange="Events.update('${event.id}',{ticketsSold:Number(this.value)})">

                    <label>Status</label>

                    <select onchange="Events.update('${event.id}',{status:this.value})">
                        <option ${event.status==="Draft"?"selected":""}>Draft</option>
                        <option ${event.status==="Scheduled"?"selected":""}>Scheduled</option>
                        <option ${event.status==="Completed"?"selected":""}>Completed</option>
                        <option ${event.status==="Cancelled"?"selected":""}>Cancelled</option>
                    </select>

                    <label>Notes</label>
                    <textarea onchange="Events.update('${event.id}',{notes:this.value})">${this.esc(event.notes)}</textarea>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this event?')){
                            Events.remove('${event.id}');
                            UI.renderEvents();
                        }
                    ">
                        Delete Event
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderVenues() {

        const venues = Venues.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Venues</h2>

            <button onclick="Venues.create();UI.renderVenues();">+ Add Venue</button>

            <br><br>

            ${venues.length === 0 ? "<p>No venues added yet.</p>" :

            venues.map(v => `

                <div class="card">

                    <label>Venue Name</label>
                    <input value="${this.esc(v.name)}"
                        onchange="Venues.update('${v.id}',{name:this.value})">

                    <label>Address</label>
                    <input value="${this.esc(v.address)}"
                        onchange="Venues.update('${v.id}',{address:this.value})">

                    <label>City</label>
                    <input value="${this.esc(v.city)}"
                        onchange="Venues.update('${v.id}',{city:this.value})">

                    <label>State</label>
                    <input value="${this.esc(v.state)}"
                        onchange="Venues.update('${v.id}',{state:this.value})">

                    <label>ZIP Code</label>
                    <input value="${this.esc(v.zip)}"
                        onchange="Venues.update('${v.id}',{zip:this.value})">

                    <label>Phone</label>
                    <input value="${this.esc(v.phone)}"
                        onchange="Venues.update('${v.id}',{phone:this.value})">

                    <label>Email</label>
                    <input value="${this.esc(v.email)}"
                        onchange="Venues.update('${v.id}',{email:this.value})">

                    <label>Capacity</label>
                    <input type="number" value="${Number(v.capacity || 0)}"
                        onchange="Venues.update('${v.id}',{capacity:Number(this.value)})">

                    <label>Rental Cost</label>
                    <input type="number" step="0.01" value="${Number(v.rentalCost || 0)}"
                        onchange="Venues.update('${v.id}',{rentalCost:Number(this.value)})">

                    <label>Deposit</label>
                    <input type="number" step="0.01" value="${Number(v.deposit || 0)}"
                        onchange="Venues.update('${v.id}',{deposit:Number(this.value)})">

                    <label>
                        <input type="checkbox"
                            ${v.depositRefundable ? "checked" : ""}
                            onchange="Venues.update('${v.id}',{depositRefundable:this.checked})">
                        Deposit Refundable
                    </label>

                    <label>Parking</label>
                    <input value="${this.esc(v.parking)}"
                        onchange="Venues.update('${v.id}',{parking:this.value})">

                    <label>Indoor / Outdoor</label>

                    <select onchange="Venues.update('${v.id}',{indoorOutdoor:this.value})">
                        <option value="Indoor" ${v.indoorOutdoor==="Indoor"?"selected":""}>Indoor</option>
                        <option value="Outdoor" ${v.indoorOutdoor==="Outdoor"?"selected":""}>Outdoor</option>
                        <option value="Both" ${v.indoorOutdoor==="Both"?"selected":""}>Both</option>
                    </select>

                    <label>Notes</label>
                    <textarea onchange="Venues.update('${v.id}',{notes:this.value})">${this.esc(v.notes)}</textarea>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this venue?')){
                            Venues.remove('${v.id}');
                            UI.renderVenues();
                        }
                    ">
                        Delete Venue
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderVendors() {

        const vendors = Vendors.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Vendors</h2>

            <button onclick="Vendors.create();UI.renderVendors();">+ Add Vendor</button>

            <br><br>

            ${vendors.length === 0 ? "<p>No vendors added yet.</p>" :

            vendors.map(v => `

                <div class="card">

                    <label>Vendor Name</label>
                    <input value="${this.esc(v.name)}"
                        onchange="Vendors.update('${v.id}',{name:this.value})">

                    <label>Category</label>
                    <input value="${this.esc(v.category)}"
                        onchange="Vendors.update('${v.id}',{category:this.value})">

                    <label>Contact Person</label>
                    <input value="${this.esc(v.contact)}"
                        onchange="Vendors.update('${v.id}',{contact:this.value})">

                    <label>Phone</label>
                    <input value="${this.esc(v.phone)}"
                        onchange="Vendors.update('${v.id}',{phone:this.value})">

                    <label>Email</label>
                    <input value="${this.esc(v.email)}"
                        onchange="Vendors.update('${v.id}',{email:this.value})">

                    <label>Payment Type</label>

                    <select onchange="Vendors.update('${v.id}',{paymentType:this.value});UI.renderVendors();">
                        <option value="Flat Rate" ${v.paymentType==="Flat Rate"?"selected":""}>Flat Rate</option>
                        <option value="Percentage" ${v.paymentType==="Percentage"?"selected":""}>Percentage</option>
                    </select>

                    ${v.paymentType === "Percentage" ? `

                        <label>Percentage (%)</label>
                        <input type="number" step="0.01" value="${Number(v.percentage || 0)}"
                            onchange="Vendors.update('${v.id}',{percentage:Number(this.value)})">

                    ` : `

                        <label>Flat Rate</label>
                        <input type="number" step="0.01" value="${Number(v.flatRate || 0)}"
                            onchange="Vendors.update('${v.id}',{flatRate:Number(this.value)})">
                    `}

                    <label>Notes</label>
                    <textarea onchange="Vendors.update('${v.id}',{notes:this.value})">${this.esc(v.notes)}</textarea>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this vendor?')){
                            Vendors.remove('${v.id}');
                            UI.renderVendors();
                        }
                    ">
                        Delete Vendor
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderInventory() {

        const items = Inventory.all();
        const vendors = Vendors.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Inventory</h2>

            <button onclick="Inventory.create();UI.renderInventory();">+ Add Inventory Item</button>

            <br><br>

            ${items.length === 0 ? "<p>No inventory items added yet.</p>" :

            items.map(item => `

                <div class="card">

                    <label>Item Name</label>
                    <input value="${this.esc(item.name)}"
                        onchange="Inventory.update('${item.id}',{name:this.value})">

                    <label>Category</label>
                    <input value="${this.esc(item.category)}"
                        onchange="Inventory.update('${item.id}',{category:this.value})">

                    <label>Vendor</label>

                    <select onchange="Inventory.update('${item.id}',{vendorId:this.value})">

                        <option value="">Select Vendor</option>

                        ${vendors.map(v => `
                            <option value="${v.id}"
                                ${item.vendorId === v.id ? "selected" : ""}>
                                ${this.esc(v.name || "Unnamed Vendor")}
                            </option>
                        `).join("")}

                    </select>

                    <label>Quantity</label>
                    <input type="number" value="${Number(item.quantity || 0)}"
                        onchange="Inventory.update('${item.id}',{quantity:Number(this.value)})">

                    <label>Minimum Stock</label>
                    <input type="number" value="${Number(item.minimum || 0)}"
                        onchange="Inventory.update('${item.id}',{minimum:Number(this.value)})">

                    <label>Unit Cost</label>
                    <input type="number" step="0.01" value="${Number(item.cost || 0)}"
                        onchange="Inventory.update('${item.id}',{cost:Number(this.value)})">

                    <label>Selling Price</label>
                    <input type="number" step="0.01" value="${Number(item.sellPrice || 0)}"
                        onchange="Inventory.update('${item.id}',{sellPrice:Number(this.value)})">

                    <label>Storage Location</label>
                    <input value="${this.esc(item.storageLocation)}"
                        onchange="Inventory.update('${item.id}',{storageLocation:this.value})">

                    <label>Notes</label>
                    <textarea onchange="Inventory.update('${item.id}',{notes:this.value})">${this.esc(item.notes)}</textarea>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this inventory item?')){
                            Inventory.remove('${item.id}');
                            UI.renderInventory();
                        }
                    ">
                        Delete Item
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderCRM() {

        const customers = CRM.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Customer CRM</h2>

            <button onclick="CRM.create();UI.renderCRM();">+ Add Customer</button>

            <br><br>

            ${customers.length === 0 ? "<p>No customers added yet.</p>" :

            customers.map(c => `

                <div class="card">

                    <label>First Name</label>
                    <input value="${this.esc(c.firstName)}"
                        onchange="CRM.update('${c.id}',{firstName:this.value})">

                    <label>Last Name</label>
                    <input value="${this.esc(c.lastName)}"
                        onchange="CRM.update('${c.id}',{lastName:this.value})">

                    <label>Email</label>
                    <input type="email" value="${this.esc(c.email)}"
                        onchange="CRM.update('${c.id}',{email:this.value})">

                    <label>Phone</label>
                    <input value="${this.esc(c.phone)}"
                        onchange="CRM.update('${c.id}',{phone:this.value})">

                    <label>Birthday</label>
                    <input type="date" value="${this.esc(c.birthday)}"
                        onchange="CRM.update('${c.id}',{birthday:this.value})">

                    <label>Address</label>
                    <input value="${this.esc(c.address)}"
                        onchange="CRM.update('${c.id}',{address:this.value})">

                    <label>City</label>
                    <input value="${this.esc(c.city)}"
                        onchange="CRM.update('${c.id}',{city:this.value})">

                    <label>State</label>
                    <input value="${this.esc(c.state)}"
                        onchange="CRM.update('${c.id}',{state:this.value})">

                    <label>ZIP Code</label>
                    <input value="${this.esc(c.zip)}"
                        onchange="CRM.update('${c.id}',{zip:this.value})">

                    <label>Loyalty Points</label>
                    <input type="number" value="${Number(c.loyaltyPoints || 0)}"
                        onchange="CRM.update('${c.id}',{loyaltyPoints:Number(this.value)})">

                    <label>Total Spent</label>
                    <input type="number" step="0.01" value="${Number(c.totalSpent || 0)}"
                        onchange="CRM.update('${c.id}',{totalSpent:Number(this.value)})">

                    <label>Total Visits</label>
                    <input type="number" value="${Number(c.totalVisits || 0)}"
                        onchange="CRM.update('${c.id}',{totalVisits:Number(this.value)})">

                    <label>Notes</label>
                    <textarea onchange="CRM.update('${c.id}',{notes:this.value})">${this.esc(c.notes)}</textarea>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this customer?')){
                            CRM.remove('${c.id}');
                            UI.renderCRM();
                        }
                    ">
                        Delete Customer
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderFinance() {

        const transactions = Finance.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Finance</h2>

            <button onclick="Finance.create({type:'Expense'});UI.renderFinance();">
                + Add Transaction
            </button>

            <br><br>

            <div class="card">
                <strong>Total Income:</strong> ${Utils.money(Finance.income())}<br>
                <strong>Total Expenses:</strong> ${Utils.money(Finance.expenses())}<br>
                <strong>Net Profit:</strong> ${Utils.money(Finance.profit())}
            </div>

            ${transactions.map(t => `

                <div class="card">

                    <label>Type</label>

                    <select onchange="Finance.update('${t.id}',{type:this.value});UI.renderFinance();">
                        <option value="Income" ${t.type==="Income"?"selected":""}>Income</option>
                        <option value="Expense" ${t.type==="Expense"?"selected":""}>Expense</option>
                    </select>

                    <label>Description</label>
                    <input value="${this.esc(t.description)}"
                        onchange="Finance.update('${t.id}',{description:this.value})">

                    <label>Category</label>
                    <input value="${this.esc(t.category)}"
                        onchange="Finance.update('${t.id}',{category:this.value})">

                    <label>Amount</label>
                    <input type="number" step="0.01" value="${Number(t.amount || 0)}"
                        onchange="Finance.update('${t.id}',{amount:Number(this.value)});UI.renderFinance();">

                    <label>Payment Method</label>
                    <input value="${this.esc(t.paymentMethod)}"
                        onchange="Finance.update('${t.id}',{paymentMethod:this.value})">

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this transaction?')){
                            Finance.remove('${t.id}');
                            UI.renderFinance();
                        }
                    ">
                        Delete Transaction
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderAssets() {

        const assets = Assets.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Asset Management</h2>

            <button onclick="Assets.create();UI.renderAssets();">+ Add Asset</button>

            <br><br>

            ${assets.length === 0 ? "<p>No assets added yet.</p>" :

            assets.map(a => `

                <div class="card">

                    <label>Asset Name</label>
                    <input value="${this.esc(a.name)}"
                        onchange="Assets.update('${a.id}',{name:this.value})">

                    <label>Category</label>
                    <input value="${this.esc(a.category)}"
                        onchange="Assets.update('${a.id}',{category:this.value})">

                    <label>Serial Number</label>
                    <input value="${this.esc(a.serialNumber)}"
                        onchange="Assets.update('${a.id}',{serialNumber:this.value})">

                    <label>Current Value</label>
                    <input type="number" step="0.01" value="${Number(a.currentValue || 0)}"
                        onchange="Assets.update('${a.id}',{currentValue:Number(this.value)})">

                    <label>Location</label>
                    <input value="${this.esc(a.location)}"
                        onchange="Assets.update('${a.id}',{location:this.value})">

                    <label>Status</label>

                    <select onchange="Assets.update('${a.id}',{status:this.value})">
                        <option value="Available" ${a.status==="Available"?"selected":""}>Available</option>
                        <option value="Assigned" ${a.status==="Assigned"?"selected":""}>Assigned</option>
                        <option value="Maintenance" ${a.status==="Maintenance"?"selected":""}>Maintenance</option>
                        <option value="Retired" ${a.status==="Retired"?"selected":""}>Retired</option>
                    </select>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this asset?')){
                            Assets.remove('${a.id}');
                            UI.renderAssets();
                        }
                    ">
                        Delete Asset
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderCalendar() {

        const reminders = Calendar.all();

        document.getElementById("workspace").innerHTML = `

            <h2>Calendar & Reminders</h2>

            <button onclick="Calendar.create();UI.renderCalendar();">
                + Add Reminder
            </button>

            <br><br>

            ${reminders.length === 0 ? "<p>No reminders created yet.</p>" :

            reminders.map(r => `

                <div class="card">

                    <label>Title</label>
                    <input value="${this.esc(r.title)}"
                        onchange="Calendar.update('${r.id}',{title:this.value})">

                    <label>Date</label>
                    <input type="date" value="${this.esc(r.date)}"
                        onchange="Calendar.update('${r.id}',{date:this.value})">

                    <label>Time</label>
                    <input type="time" value="${this.esc(r.time)}"
                        onchange="Calendar.update('${r.id}',{time:this.value})">

                    <label>Category</label>
                    <input value="${this.esc(r.category)}"
                        onchange="Calendar.update('${r.id}',{category:this.value})">

                    <label>
                        <input type="checkbox"
                            ${r.completed ? "checked" : ""}
                            onchange="Calendar.update('${r.id}',{completed:this.checked})">
                        Completed
                    </label>

                    <br><br>

                    <button onclick="
                        if(confirm('Delete this reminder?')){
                            Calendar.remove('${r.id}');
                            UI.renderCalendar();
                        }
                    ">
                        Delete Reminder
                    </button>

                </div>

            `).join("")}
        `;
    },

    renderReports() {

        const report = Reports.summary();

        document.getElementById("workspace").innerHTML = `

            <h2>Business Reports</h2>

            <div class="card">

                <table>
                    <tr><td>Total Events</td><td>${report.totalEvents}</td></tr>
                    <tr><td>Total Customers</td><td>${report.totalCustomers}</td></tr>
                    <tr><td>Total Vendors</td><td>${report.totalVendors}</td></tr>
                    <tr><td>Total Venues</td><td>${report.totalVenues}</td></tr>
                    <tr><td>Total Inventory Items</td><td>${report.totalInventoryItems}</td></tr>
                    <tr><td>Total Assets</td><td>${report.totalAssets}</td></tr>
                    <tr><td>Total Income</td><td>${Utils.money(report.totalIncome)}</td></tr>
                    <tr><td>Total Expenses</td><td>${Utils.money(report.totalExpenses)}</td></tr>
                    <tr><td>Net Profit</td><td>${Utils.money(report.totalProfit)}</td></tr>
                </table>

            </div>
        `;
    },

    renderSettings() {

        const s = Settings.data;

        document.getElementById("workspace").innerHTML = `

            <h2>Settings</h2>

            <div class="card">

                <label>Theme</label>

                <select id="theme">
                    <option value="light" ${s.theme==="light"?"selected":""}>Light</option>
                    <option value="dark" ${s.theme==="dark"?"selected":""}>Dark</option>
                </select>

                <label>Currency</label>
                <input id="currency" value="${this.esc(s.currency)}">

                <label>Language</label>
                <input id="language" value="${this.esc(s.language)}">

                <br><br>

                <button onclick="
                    Settings.update('theme',document.getElementById('theme').value);
                    Settings.update('currency',document.getElementById('currency').value);
                    Settings.update('language',document.getElementById('language').value);
                    alert('Settings Saved');
                ">
                    Save Settings
                </button>

                <br><br>

                <button onclick="Utils.downloadBackup()">
                    Download Backup
                </button>

                <br><br>

                <label>Restore Backup</label>

                <input
                    type="file"
                    accept=".json,application/json"
                    onchange="Utils.restoreBackup(this.files[0])">

            </div>
        `;
    }

};
