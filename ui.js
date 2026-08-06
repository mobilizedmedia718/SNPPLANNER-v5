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
    renderVenues(){

    const venues = Venues.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Venues</h2>

    <button onclick="Venues.create(); UI.renderVenues();">
        + Add Venue
    </button>

    <br><br>

    ${
        venues.length===0
        ? "<p>No venues added yet.</p>"
        : venues.map(v=>`

        <div class="card">

            <label>Venue Name</label>
            <input
                value="${v.name}"
                onchange="Venues.update('${v.id}',{name:this.value})">

            <label>Address</label>
            <input
                value="${v.address}"
                onchange="Venues.update('${v.id}',{address:this.value})">

            <label>City</label>
            <input
                value="${v.city}"
                onchange="Venues.update('${v.id}',{city:this.value})">

            <label>State</label>
            <input
                value="${v.state}"
                onchange="Venues.update('${v.id}',{state:this.value})">

            <label>ZIP Code</label>
            <input
                value="${v.zip}"
                onchange="Venues.update('${v.id}',{zip:this.value})">

            <label>Capacity</label>
            <input
                type="number"
                value="${v.capacity}"
                onchange="Venues.update('${v.id}',{capacity:Number(this.value)})">

            <label>Rental Cost</label>
            <input
                type="number"
                value="${v.rentalCost}"
                onchange="Venues.update('${v.id}',{rentalCost:Number(this.value)})">

            <label>Deposit</label>
            <input
                type="number"
                value="${v.deposit}"
                onchange="Venues.update('${v.id}',{deposit:Number(this.value)})">

            <label>
                <input
                    type="checkbox"
                    ${v.depositRefundable ? "checked" : ""}
                    onchange="Venues.update('${v.id}',{depositRefundable:this.checked})">
                Deposit Refundable
            </label>

            <br><br>

            <button onclick="
                if(confirm('Delete this venue?')){
                    Venues.remove('${v.id}');
                    UI.renderVenues();
                }">
                Delete Venue
            </button>

        </div>

        <br>

        `).join("")
    }

    `;

    },
    renderVendors(){

    const vendors = Vendors.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Vendors</h2>

    <button onclick="Vendors.create(); UI.renderVendors();">
        + Add Vendor
    </button>

    <br><br>

    ${
        vendors.length===0
        ? "<p>No vendors added yet.</p>"
        : vendors.map(v=>`

        <div class="card">

            <label>Vendor Name</label>
            <input
                value="${v.name}"
                onchange="Vendors.update('${v.id}',{name:this.value})">

            <label>Category</label>
            <input
                value="${v.category}"
                onchange="Vendors.update('${v.id}',{category:this.value})">

            <label>Contact Person</label>
            <input
                value="${v.contact}"
                onchange="Vendors.update('${v.id}',{contact:this.value})">

            <label>Phone</label>
            <input
                value="${v.phone}"
                onchange="Vendors.update('${v.id}',{phone:this.value})">

            <label>Email</label>
            <input
                value="${v.email}"
                onchange="Vendors.update('${v.id}',{email:this.value})">

            <label>Payment Type</label>

            <select onchange="Vendors.update('${v.id}',{paymentType:this.value}); UI.renderVendors();">

                <option value="Flat Rate" ${v.paymentType==="Flat Rate"?"selected":""}>Flat Rate</option>

                <option value="Percentage" ${v.paymentType==="Percentage"?"selected":""}>Percentage</option>

            </select>

            ${
                v.paymentType==="Flat Rate"

                ?`

                <label>Flat Rate</label>

                <input
                    type="number"
                    value="${v.flatRate}"
                    onchange="Vendors.update('${v.id}',{flatRate:Number(this.value)})">

                `

                :`

                <label>Percentage (%)</label>

                <input
                    type="number"
                    value="${v.percentage}"
                    onchange="Vendors.update('${v.id}',{percentage:Number(this.value)})">

                `

            }

            <br><br>

            <button onclick="
                if(confirm('Delete this vendor?')){
                    Vendors.remove('${v.id}');
                    UI.renderVendors();
                }">
                Delete Vendor
            </button>

        </div>

        <br>

        `).join("")
    }

    `;

    },
    renderInventory(){

    const items = Inventory.all();
    const vendors = Vendors.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Inventory</h2>

    <button onclick="Inventory.create(); UI.renderInventory();">
        + Add Item
    </button>

    <br><br>

    ${
        items.length===0
        ? "<p>No inventory items added yet.</p>"
        : items.map(item=>`

        <div class="card">

            <label>Item Name</label>

            <input
                value="${item.name}"
                onchange="Inventory.update('${item.id}',{name:this.value})">

            <label>Category</label>

            <input
                value="${item.category}"
                onchange="Inventory.update('${item.id}',{category:this.value})">

            <label>Vendor</label>

            <select onchange="Inventory.update('${item.id}',{vendorId:this.value})">

                <option value="">Select Vendor</option>

                ${vendors.map(v=>`

                    <option
                        value="${v.id}"
                        ${item.vendorId===v.id?"selected":""}>

                        ${v.name}

                    </option>

                `).join("")}

            </select>

            <label>Quantity</label>

            <input
                type="number"
                value="${item.quantity}"
                onchange="Inventory.update('${item.id}',{quantity:Number(this.value)})">

            <label>Minimum Stock</label>

            <input
                type="number"
                value="${item.minimum}"
                onchange="Inventory.update('${item.id}',{minimum:Number(this.value)})">

            <label>Unit Cost</label>

            <input
                type="number"
                value="${item.cost}"
                onchange="Inventory.update('${item.id}',{cost:Number(this.value)})">

            <label>Selling Price</label>

            <input
                type="number"
                value="${item.sellPrice}"
                onchange="Inventory.update('${item.id}',{sellPrice:Number(this.value)})">

            <br><br>

            <button onclick="
                if(confirm('Delete this item?')){
                    Inventory.remove('${item.id}');
                    UI.renderInventory();
                }">

                Delete Item

            </button>

        </div>

        <br>

        `).join("")
    }

    `;

    },
    renderCRM(){

    const customers = CRM.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Customer CRM</h2>

    <button onclick="CRM.create(); UI.renderCRM();">
        + Add Customer
    </button>

    <br><br>

    ${
        customers.length===0
        ? "<p>No customers added yet.</p>"
        : customers.map(c=>`

        <div class="card">

            <label>First Name</label>

            <input
                value="${c.firstName}"
                onchange="CRM.update('${c.id}',{firstName:this.value})">

            <label>Last Name</label>

            <input
                value="${c.lastName}"
                onchange="CRM.update('${c.id}',{lastName:this.value})">

            <label>Email</label>

            <input
                value="${c.email}"
                onchange="CRM.update('${c.id}',{email:this.value})">

            <label>Phone</label>

            <input
                value="${c.phone}"
                onchange="CRM.update('${c.id}',{phone:this.value})">

            <label>Birthday</label>

            <input
                type="date"
                value="${c.birthday}"
                onchange="CRM.update('${c.id}',{birthday:this.value})">

            <label>Loyalty Points</label>

            <input
                type="number"
                value="${c.loyaltyPoints}"
                onchange="CRM.update('${c.id}',{loyaltyPoints:Number(this.value)})">

            <label>Notes</label>

            <textarea
                onchange="CRM.update('${c.id}',{notes:this.value})">${c.notes}</textarea>

            <br><br>

            <button onclick="
                if(confirm('Delete this customer?')){
                    CRM.remove('${c.id}');
                    UI.renderCRM();
                }">

                Delete Customer

            </button>

        </div>

        <br>

        `).join("")
    }

    `;

    },
    renderFinance(){

    const transactions = Finance.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Finance</h2>

    <button onclick="Finance.create({type:'Expense'}); UI.renderFinance();">
        + Add Transaction
    </button>

    <br><br>

    <div class="card">

        <strong>Total Income:</strong> ${Utils.money(Finance.income())}<br>
        <strong>Total Expenses:</strong> ${Utils.money(Finance.expenses())}<br>
        <strong>Net Profit:</strong> ${Utils.money(Finance.profit())}

    </div>

    <br>

    ${
        transactions.length===0
        ? "<p>No transactions recorded yet.</p>"
        : transactions.map(t=>`

        <div class="card">

            <label>Type</label>

            <select onchange="Finance.update('${t.id}',{type:this.value});UI.renderFinance();">

                <option value="Income" ${t.type==="Income"?"selected":""}>Income</option>
                <option value="Expense" ${t.type==="Expense"?"selected":""}>Expense</option>

            </select>

            <label>Description</label>

            <input
                value="${t.description}"
                onchange="Finance.update('${t.id}',{description:this.value})">

            <label>Category</label>

            <input
                value="${t.category}"
                onchange="Finance.update('${t.id}',{category:this.value})">

            <label>Amount</label>

            <input
                type="number"
                value="${t.amount}"
                onchange="Finance.update('${t.id}',{amount:Number(this.value)});UI.renderFinance();">

            <label>Payment Method</label>

            <input
                value="${t.paymentMethod}"
                onchange="Finance.update('${t.id}',{paymentMethod:this.value})">

            <button onclick="
                if(confirm('Delete this transaction?')){
                    Finance.remove('${t.id}');
                    UI.renderFinance();
                }">

                Delete Transaction

            </button>

        </div>

        <br>

        `).join("")
    }

    `;

    },
    renderAssets(){

    const assets = Assets.all();

    document.getElementById("workspace").innerHTML = `

    <h2>Asset Management</h2>

    <button onclick="Assets.create(); UI.renderAssets();">
        + Add Asset
    </button>

    <br><br>

    ${
        assets.length===0
        ? "<p>No assets added yet.</p>"
        : assets.map(a=>`

        <div class="card">

            <label>Asset Name</label>

            <input
                value="${a.name}"
                onchange="Assets.update('${a.id}',{name:this.value})">

            <label>Category</label>

            <input
                value="${a.category}"
                onchange="Assets.update('${a.id}',{category:this.value})">

            <label>Serial Number</label>

            <input
                value="${a.serialNumber}"
                onchange="Assets.update('${a.id}',{serialNumber:this.value})">

            <label>Current Value</label>

            <input
                type="number"
                value="${a.currentValue}"
                onchange="Assets.update('${a.id}',{currentValue:Number(this.value)})">

            <label>Location</label>

            <input
                value="${a.location}"
                onchange="Assets.update('${a.id}',{location:this.value})">

            <label>Status</label>

            <select onchange="Assets.update('${a.id}',{status:this.value})">

                <option value="Available" ${a.status==="Available"?"selected":""}>Available</option>

                <option value="Assigned" ${a.status==="Assigned"?"selected":""}>Assigned</option>

                <option value="Maintenance" ${a.status==="Maintenance"?"selected":""}>Maintenance</option>

                <option value="Retired" ${a.status==="Retired"?"selected":""}>Retired</option>

            </select>

            <button onclick="
                if(confirm('Delete this asset?')){
                    Assets.remove('${a.id}');
                    UI.renderAssets();
                }">

                Delete Asset

            </button>

        </div>

        <br>

        `).join("")
    }

    `;

    },
    renderCalendar(){},
    renderReports(){},
    renderSettings(){}

};
