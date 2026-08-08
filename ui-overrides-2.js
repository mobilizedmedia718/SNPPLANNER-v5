/*
 * Additional UI overrides for Finance, Assets, and Calendar.
 * Compact list -> locked detail -> explicit edit/save flow.
 */

(function () {

    function eventName(id) {
        const event = Events.get(id);
        return event ? (event.name || "Unnamed Event") : "—";
    }

    function vendorName(id) {
        const vendor = Vendors.get(id);
        return vendor ? (vendor.name || "Unnamed Vendor") : "—";
    }

    function customerName(id) {
        const customer = CRM.get(id);
        if (!customer) return "—";
        return CRM.fullName(customer) || customer.company || "Unnamed Customer";
    }

    /* ---------------- FINANCE ---------------- */

    UI.renderFinance = function () {
        const transactions = Finance.all();

        document.getElementById("workspace").innerHTML = `
            <h2>Finance</h2>
            <button onclick="const t=Finance.create({type:'Expense'});UI.renderFinanceEdit(t.id);">+ Add Transaction</button>
            <br><br>

            <div class="dashboard-grid">
                <div class="card"><h3>Total Income</h3><h2>${Utils.money(Finance.income())}</h2></div>
                <div class="card"><h3>Total Expenses</h3><h2>${Utils.money(Finance.expenses())}</h2></div>
                <div class="card"><h3>Taxes</h3><h2>${Utils.money(Finance.taxes())}</h2></div>
                <div class="card"><h3>Net Profit</h3><h2>${Utils.money(Finance.profit())}</h2></div>
            </div>

            <br>

            ${transactions.length === 0 ? "<p>No transactions recorded yet.</p>" : transactions.map(t => `
                <div class="card">
                    <h3>${this.esc(t.description || "Unnamed Transaction")}</h3>
                    <p>${this.esc(t.date || "No date")} — ${this.esc(t.type || "Expense")}</p>
                    <p><strong>${Utils.money(t.amount || 0)}</strong></p>
                    ${t.category ? `<p>${this.esc(t.category)}</p>` : ""}
                    <p>Status: ${this.statusBadge(t.status || "Completed")}</p>
                    <button onclick="UI.renderFinanceDetail('${t.id}')">View Transaction</button>
                </div>
            `).join("")}
        `;
    };

    UI.renderFinanceDetail = function (id) {
        const t = Finance.get(id);
        if (!t) return this.renderFinance();

        document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderFinance()">← Back to Finance</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(t.description || "Unnamed Transaction")}</h2>
                <p><strong>Date:</strong> ${this.esc(t.date || "—")}</p>
                <p><strong>Type:</strong> ${this.esc(t.type || "—")}</p>
                <p><strong>Category:</strong> ${this.esc(t.category || "—")}</p>
                <p><strong>Amount:</strong> ${Utils.money(t.amount || 0)}</p>
                <p><strong>Tax Amount:</strong> ${Utils.money(t.taxAmount || 0)}</p>
                <p><strong>Event:</strong> ${this.esc(eventName(t.eventId))}</p>
                <p><strong>Vendor:</strong> ${this.esc(vendorName(t.vendorId))}</p>
                <p><strong>Customer:</strong> ${this.esc(customerName(t.customerId))}</p>
                <p><strong>Payment Method:</strong> ${this.esc(t.paymentMethod || "—")}</p>
                <p><strong>Status:</strong> ${this.statusBadge(t.status || "Completed")}</p>
                <p><strong>Notes:</strong> ${this.esc(t.notes || "—")}</p>
                <br>
                <button onclick="UI.renderFinanceEdit('${t.id}')">Edit Transaction</button>
                <button onclick="if(confirm('Delete this transaction?')){Finance.remove('${t.id}');UI.renderFinance();}">Delete Transaction</button>
            </div>
        `;
    };

    UI.renderFinanceEdit = function (id) {
        const t = Finance.get(id);
        if (!t) return this.renderFinance();
        const events = Events.all();
        const vendors = Vendors.all();
        const customers = CRM.all();

        document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderFinanceDetail('${t.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Transaction</h2>

                <label>Date</label>
                <input id="financeDate" type="date" value="${this.esc(t.date || "")}">

                <label>Type</label>
                <select id="financeType">
                    ${["Income","Expense"].map(x => `<option value="${x}" ${t.type === x ? "selected" : ""}>${x}</option>`).join("")}
                </select>

                <label>Description</label>
                <input id="financeDescription" value="${this.esc(t.description || "")}" placeholder="Description">

                <label>Category</label>
                <input id="financeCategory" value="${this.esc(t.category || "")}" placeholder="Category">

                <label>Amount</label>
                <input id="financeAmount" type="number" min="0" step="0.01" value="${Number(t.amount || 0)}">

                <label>Tax Amount</label>
                <input id="financeTaxAmount" type="number" min="0" step="0.01" value="${Number(t.taxAmount || 0)}">

                <label>Event</label>
                <select id="financeEventId">
                    <option value="">No Event</option>
                    ${events.map(event => `<option value="${event.id}" ${t.eventId === event.id ? "selected" : ""}>${this.esc(event.name || "Unnamed Event")}</option>`).join("")}
                </select>

                <label>Vendor</label>
                <select id="financeVendorId">
                    <option value="">No Vendor</option>
                    ${vendors.map(vendor => `<option value="${vendor.id}" ${t.vendorId === vendor.id ? "selected" : ""}>${this.esc(vendor.name || "Unnamed Vendor")}</option>`).join("")}
                </select>

                <label>Customer</label>
                <select id="financeCustomerId">
                    <option value="">No Customer</option>
                    ${customers.map(customer => `<option value="${customer.id}" ${t.customerId === customer.id ? "selected" : ""}>${this.esc(CRM.fullName(customer) || customer.company || "Unnamed Customer")}</option>`).join("")}
                </select>

                <label>Payment Method</label>
                <select id="financePaymentMethod">
                    ${["Cash","Card","Bank Transfer","Check","Other"].map(x => `<option value="${x}" ${t.paymentMethod === x ? "selected" : ""}>${x}</option>`).join("")}
                </select>

                <label>Status</label>
                <select id="financeStatus">
                    ${["Completed","Pending","Cancelled"].map(x => `<option value="${x}" ${t.status === x ? "selected" : ""}>${x}</option>`).join("")}
                </select>

                <label>Notes</label>
                <textarea id="financeNotes" placeholder="Transaction notes">${this.esc(t.notes || "")}</textarea>

                <br><br>
                <button onclick="
                    Finance.update('${t.id}',{
                        date:document.getElementById('financeDate').value,
                        type:document.getElementById('financeType').value,
                        description:document.getElementById('financeDescription').value,
                        category:document.getElementById('financeCategory').value,
                        amount:Number(document.getElementById('financeAmount').value),
                        taxAmount:Number(document.getElementById('financeTaxAmount').value),
                        eventId:document.getElementById('financeEventId').value,
                        vendorId:document.getElementById('financeVendorId').value,
                        customerId:document.getElementById('financeCustomerId').value,
                        paymentMethod:document.getElementById('financePaymentMethod').value,
                        status:document.getElementById('financeStatus').value,
                        notes:document.getElementById('financeNotes').value
                    });
                    UI.renderFinanceDetail('${t.id}');
                ">Save Transaction</button>
            </div>
        `;
    };

    /* ---------------- ASSETS ---------------- */

    UI.renderAssets = function () {
        const assets = Assets.all();

        document.getElementById("workspace").innerHTML = `
            <h2>Asset Management</h2>
            <button onclick="const a=Assets.create();UI.renderAssetEdit(a.id);">+ Add Asset</button>
            <br><br>

            <div class="dashboard-grid">
                <div class="card"><h3>Total Assets</h3><h2>${assets.length}</h2></div>
                <div class="card"><h3>Available</h3><h2>${Assets.available().length}</h2></div>
                <div class="card"><h3>Assigned</h3><h2>${Assets.assigned().length}</h2></div>
                <div class="card"><h3>Maintenance</h3><h2>${Assets.maintenance().length}</h2></div>
                <div class="card"><h3>Total Value</h3><h2>${Utils.money(Assets.totalValue())}</h2></div>
            </div>

            <br>

            ${assets.length === 0 ? "<p>No assets added yet.</p>" : assets.map(a => `
                <div class="card">
                    <h3>${this.esc(a.name || "Unnamed Asset")}</h3>
                    ${a.category ? `<p>${this.esc(a.category)}</p>` : ""}
                    ${a.location ? `<p>${this.esc(a.location)}</p>` : ""}
                    <p>Status: ${this.statusBadge(a.status || "Available")}</p>
                    <p>Condition: ${this.statusBadge(a.condition || "Good")}</p>
                    <button onclick="UI.renderAssetDetail('${a.id}')">View Asset</button>
                </div>
            `).join("")}
        `;
    };

    UI.renderAssetDetail = function (id) {
        const a = Assets.get(id);
        if (!a) return this.renderAssets();

        document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderAssets()">← Back to Assets</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(a.name || "Unnamed Asset")}</h2>
                <p><strong>Category:</strong> ${this.esc(a.category || "—")}</p>
                <p><strong>Serial Number:</strong> ${this.esc(a.serialNumber || "—")}</p>
                <p><strong>Purchase Date:</strong> ${this.esc(a.purchaseDate || "—")}</p>
                <p><strong>Purchase Price:</strong> ${Utils.money(a.purchasePrice || 0)}</p>
                <p><strong>Current Value:</strong> ${Utils.money(a.currentValue || 0)}</p>
                <p><strong>Location:</strong> ${this.esc(a.location || "—")}</p>
                <p><strong>Assigned To:</strong> ${this.esc(a.assignedTo || "—")}</p>
                <p><strong>Assigned Event:</strong> ${this.esc(eventName(a.assignedEventId))}</p>
                <p><strong>Status:</strong> ${this.statusBadge(a.status || "Available")}</p>
                <p><strong>Condition:</strong> ${this.statusBadge(a.condition || "Good")}</p>
                <p><strong>Warranty Expires:</strong> ${this.esc(a.warrantyExpires || "—")}</p>
                <p><strong>Maintenance Due:</strong> ${this.esc(a.maintenanceDue || "—")}</p>
                <p><strong>Maintenance Notes:</strong> ${this.esc(a.maintenanceNotes || "—")}</p>
                <p><strong>Notes:</strong> ${this.esc(a.notes || "—")}</p>
                <br>
                <button onclick="UI.renderAssetEdit('${a.id}')">Edit Asset</button>
                <button onclick="if(confirm('Delete this asset?')){Assets.remove('${a.id}');UI.renderAssets();}">Delete Asset</button>
            </div>
        `;
    };

    UI.renderAssetEdit = function (id) {
        const a = Assets.get(id);
        if (!a) return this.renderAssets();
        const events = Events.all();

        document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderAssetDetail('${a.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Asset</h2>

                <label>Asset Name</label><input id="assetName" value="${this.esc(a.name || "")}" placeholder="Asset name">
                <label>Category</label><input id="assetCategory" value="${this.esc(a.category || "")}" placeholder="Category">
                <label>Serial Number</label><input id="assetSerialNumber" value="${this.esc(a.serialNumber || "")}" placeholder="Serial number">
                <label>Purchase Date</label><input id="assetPurchaseDate" type="date" value="${this.esc(a.purchaseDate || "")}">
                <label>Purchase Price</label><input id="assetPurchasePrice" type="number" min="0" step="0.01" value="${Number(a.purchasePrice || 0)}">
                <label>Current Value</label><input id="assetCurrentValue" type="number" min="0" step="0.01" value="${Number(a.currentValue || 0)}">
                <label>Location</label><input id="assetLocation" value="${this.esc(a.location || "")}" placeholder="Location">
                <label>Assigned To</label><input id="assetAssignedTo" value="${this.esc(a.assignedTo || "")}" placeholder="Assigned to">

                <label>Assigned Event</label>
                <select id="assetAssignedEventId">
                    <option value="">No Event</option>
                    ${events.map(event => `<option value="${event.id}" ${a.assignedEventId === event.id ? "selected" : ""}>${this.esc(event.name || "Unnamed Event")}</option>`).join("")}
                </select>

                <label>Status</label>
                <select id="assetStatus">${["Available","Assigned","Maintenance","Retired"].map(x => `<option value="${x}" ${a.status === x ? "selected" : ""}>${x}</option>`).join("")}</select>

                <label>Condition</label>
                <select id="assetCondition">${["Excellent","Good","Fair","Needs Repair"].map(x => `<option value="${x}" ${a.condition === x ? "selected" : ""}>${x}</option>`).join("")}</select>

                <label>Warranty Expires</label><input id="assetWarrantyExpires" type="date" value="${this.esc(a.warrantyExpires || "")}">
                <label>Maintenance Due</label><input id="assetMaintenanceDue" type="date" value="${this.esc(a.maintenanceDue || "")}">
                <label>Maintenance Notes</label><textarea id="assetMaintenanceNotes" placeholder="Maintenance notes">${this.esc(a.maintenanceNotes || "")}</textarea>
                <label>Notes</label><textarea id="assetNotes" placeholder="Asset notes">${this.esc(a.notes || "")}</textarea>

                <br><br>
                <button onclick="
                    Assets.update('${a.id}',{
                        name:document.getElementById('assetName').value,
                        category:document.getElementById('assetCategory').value,
                        serialNumber:document.getElementById('assetSerialNumber').value,
                        purchaseDate:document.getElementById('assetPurchaseDate').value,
                        purchasePrice:Number(document.getElementById('assetPurchasePrice').value),
                        currentValue:Number(document.getElementById('assetCurrentValue').value),
                        location:document.getElementById('assetLocation').value,
                        assignedTo:document.getElementById('assetAssignedTo').value,
                        assignedEventId:document.getElementById('assetAssignedEventId').value,
                        status:document.getElementById('assetStatus').value,
                        condition:document.getElementById('assetCondition').value,
                        warrantyExpires:document.getElementById('assetWarrantyExpires').value,
                        maintenanceDue:document.getElementById('assetMaintenanceDue').value,
                        maintenanceNotes:document.getElementById('assetMaintenanceNotes').value,
                        notes:document.getElementById('assetNotes').value
                    });
                    UI.renderAssetDetail('${a.id}');
                ">Save Asset</button>
            </div>
        `;
    };

    /* ---------------- CALENDAR ---------------- */

    UI.renderCalendar = function () {
        const reminders = Calendar.all();

        document.getElementById("workspace").innerHTML = `
            <h2>Calendar & Reminders</h2>
            <button onclick="const r=Calendar.create();UI.renderReminderEdit(r.id);">+ Add Reminder</button>
            <br><br>

            <div class="dashboard-grid">
                <div class="card"><h3>Total Reminders</h3><h2>${reminders.length}</h2></div>
                <div class="card"><h3>Upcoming</h3><h2>${Calendar.upcoming().length}</h2></div>
                <div class="card"><h3>Overdue</h3><h2>${Calendar.overdue().length}</h2></div>
                <div class="card"><h3>Completed</h3><h2>${Calendar.completed().length}</h2></div>
            </div>

            <br>

            ${reminders.length === 0 ? "<p>No reminders created yet.</p>" : reminders.map(r => `
                <div class="card">
                    <h3>${this.esc(r.title || "Untitled Reminder")}</h3>
                    <p>${this.esc(r.date || "No date")}${r.time ? ` — ${this.esc(r.time)}` : ""}</p>
                    ${r.category ? `<p>${this.esc(r.category)}</p>` : ""}
                    <p>Priority: ${this.statusBadge(r.priority || "Normal")}</p>
                    <p>Status: ${this.statusBadge(r.completed ? "Completed" : (r.date && r.date < new Date().toISOString().slice(0,10) ? "Overdue" : "Pending"))}</p>
                    <button onclick="UI.renderReminderDetail('${r.id}')">View Reminder</button>
                </div>
            `).join("")}
        `;
    };

    UI.renderReminderDetail = function (id) {
        const r = Calendar.get(id);
        if (!r) return this.renderCalendar();

        document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderCalendar()">← Back to Calendar</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(r.title || "Untitled Reminder")}</h2>
                <p><strong>Description:</strong> ${this.esc(r.description || "—")}</p>
                <p><strong>Event:</strong> ${this.esc(eventName(r.eventId))}</p>
                <p><strong>Date:</strong> ${this.esc(r.date || "—")}</p>
                <p><strong>Time:</strong> ${this.esc(r.time || "—")}</p>
                <p><strong>Category:</strong> ${this.esc(r.category || "—")}</p>
                <p><strong>Priority:</strong> ${this.statusBadge(r.priority || "Normal")}</p>
                <p><strong>Completed:</strong> ${r.completed ? "Yes" : "No"}</p>
                <p><strong>Recurring:</strong> ${r.recurring ? "Yes" : "No"}</p>
                <p><strong>Recurrence:</strong> ${this.esc(r.recurrence || "None")}</p>
                <br>
                <button onclick="UI.renderReminderEdit('${r.id}')">Edit Reminder</button>
                <button onclick="if(confirm('Delete this reminder?')){Calendar.remove('${r.id}');UI.renderCalendar();}">Delete Reminder</button>
            </div>
        `;
    };

    UI.renderReminderEdit = function (id) {
        const r = Calendar.get(id);
        if (!r) return this.renderCalendar();
        const events = Events.all();

        document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderReminderDetail('${r.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Reminder</h2>

                <label>Title</label><input id="reminderTitle" value="${this.esc(r.title || "")}" placeholder="Reminder title">
                <label>Description</label><textarea id="reminderDescription" placeholder="Description">${this.esc(r.description || "")}</textarea>

                <label>Event</label>
                <select id="reminderEventId">
                    <option value="">No Event</option>
                    ${events.map(event => `<option value="${event.id}" ${r.eventId === event.id ? "selected" : ""}>${this.esc(event.name || "Unnamed Event")}</option>`).join("")}
                </select>

                <label>Date</label><input id="reminderDate" type="date" value="${this.esc(r.date || "")}">
                <label>Time</label><input id="reminderTime" type="time" value="${this.esc(r.time || "")}">
                <label>Category</label><input id="reminderCategory" value="${this.esc(r.category || "")}" placeholder="Category">

                <label>Priority</label>
                <select id="reminderPriority">${["Low","Normal","High","Urgent"].map(x => `<option value="${x}" ${r.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select>

                <label><input id="reminderCompleted" type="checkbox" ${r.completed ? "checked" : ""}> Completed</label>
                <label><input id="reminderRecurring" type="checkbox" ${r.recurring ? "checked" : ""}> Recurring</label>

                <label>Recurrence</label>
                <select id="reminderRecurrence">${["None","Daily","Weekly","Monthly","Yearly"].map(x => `<option value="${x}" ${r.recurrence === x ? "selected" : ""}>${x}</option>`).join("")}</select>

                <br><br>
                <button onclick="
                    Calendar.update('${r.id}',{
                        title:document.getElementById('reminderTitle').value,
                        description:document.getElementById('reminderDescription').value,
                        eventId:document.getElementById('reminderEventId').value,
                        date:document.getElementById('reminderDate').value,
                        time:document.getElementById('reminderTime').value,
                        category:document.getElementById('reminderCategory').value,
                        priority:document.getElementById('reminderPriority').value,
                        completed:document.getElementById('reminderCompleted').checked,
                        recurring:document.getElementById('reminderRecurring').checked,
                        recurrence:document.getElementById('reminderRecurrence').value
                    });
                    UI.renderReminderDetail('${r.id}');
                ">Save Reminder</button>
            </div>
        `;
    };

})();
