/*
 * UI overrides for compact list -> locked detail -> explicit edit flows.
 * Loaded after ui.js and before app.js.
 */

(function () {
  function optionList(values) {
    return values
      .map((value) => `<option value="${UI.esc(value)}"></option>`)
      .join("");
  }

  function offeringEditor(
    record,
    moduleName,
    rerenderName,
    names,
    descriptions,
  ) {
    const offerings = Array.isArray(record.offerings) ? record.offerings : [];
    const namesId = `${moduleName.toLowerCase()}OfferingNames`;
    const descriptionsId = `${moduleName.toLowerCase()}OfferingDescriptions`;

    return `
            <h4>Products / Services Offered</h4>

            <datalist id="${namesId}">${optionList(names)}</datalist>
            <datalist id="${descriptionsId}">${optionList(descriptions)}</datalist>

            ${
              offerings.length === 0
                ? "<p>No products or services added yet.</p>"
                : offerings
                    .map(
                      (item) => `
                <div class="card">
                    <label>Product / Service Name</label>
                    <input
                        list="${namesId}"
                        value="${UI.esc(item.name || "")}"
                        placeholder="Choose or type a product/service"
                        onchange="${moduleName}.updateOffering('${record.id}','${item.id}',{name:this.value})">

                    <label>Description</label>
                    <input
                        list="${descriptionsId}"
                        value="${UI.esc(item.description || "")}"
                        placeholder="Choose or type a description"
                        onchange="${moduleName}.updateOffering('${record.id}','${item.id}',{description:this.value})">

                    <label>Quantity</label>
                    <input
                        type="number"
                        min="0"
                        value="${Number(item.quantity || 0)}"
                        onchange="${moduleName}.updateOffering('${record.id}','${item.id}',{quantity:Number(this.value)})">

                    <label>Unit</label>
                    <select onchange="${moduleName}.updateOffering('${record.id}','${item.id}',{unit:this.value})">
                        ${[
                          "Each",
                          "Hour",
                          "Day",
                          "Package",
                          "Case",
                          "Box",
                          "Dozen",
                          "Flat Rate",
                          "Other",
                        ]
                          .map(
                            (unit) =>
                              `<option value="${unit}" ${item.unit === unit ? "selected" : ""}>${unit}</option>`,
                          )
                          .join("")}
                    </select>

                    <label>Price</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value="${Number(item.price || 0)}"
                        onchange="${moduleName}.updateOffering('${record.id}','${item.id}',{price:Number(this.value)})">

                    <label>Notes</label>
                    <textarea
                        placeholder="Item notes"
                        onchange="${moduleName}.updateOffering('${record.id}','${item.id}',{notes:this.value})">${UI.esc(item.notes || "")}</textarea>

                    <br><br>
                    <button onclick="${moduleName}.removeOffering('${record.id}','${item.id}');UI.${rerenderName}('${record.id}');">
                        Remove Product / Service
                    </button>
                </div>
            `,
                    )
                    .join("")
            }

            <button onclick="${moduleName}.addOffering('${record.id}');UI.${rerenderName}('${record.id}');">
                + Add Product / Service
            </button>
            <br><br>
        `;
  }

  function offeringDetail(record) {
    const offerings = Array.isArray(record.offerings) ? record.offerings : [];
    return `
            <h4>Products / Services Offered</h4>
            ${
              offerings.length === 0
                ? "<p>No products or services added.</p>"
                : offerings
                    .map(
                      (item) => `
                <div class="card">
                    <p><strong>Product / Service:</strong> ${UI.esc(item.name || "—")}</p>
                    <p><strong>Description:</strong> ${UI.esc(item.description || "—")}</p>
                    <p><strong>Quantity:</strong> ${Number(item.quantity || 0)}</p>
                    <p><strong>Unit:</strong> ${UI.esc(item.unit || "—")}</p>
                    <p><strong>Price:</strong> ${Utils.money(item.price || 0)}</p>
                    <p><strong>Notes:</strong> ${UI.esc(item.notes || "—")}</p>
                </div>
            `,
                    )
                    .join("")
            }
        `;
  }

  /* ---------------- CRM LIST ---------------- */

  UI.renderCRM = function () {
    const customers = CRM.all();
    document.getElementById("workspace").innerHTML = `
            <h2>Customer CRM</h2>
            <button onclick="const c=CRM.create();UI.renderCustomerEdit(c.id);">+ Add Customer</button>
            <br><br>
            ${
              customers.length === 0
                ? "<p>No customers added yet.</p>"
                : customers
                    .map(
                      (c) => `
                <div class="card">
                    <h3>${this.esc(CRM.fullName(c) || c.company || "Unnamed Customer")}</h3>
                    ${c.company ? `<p>${this.esc(c.company)}</p>` : ""}
                    ${c.email ? `<p>${this.esc(c.email)}</p>` : ""}
                    ${c.phone ? `<p>${this.esc(c.phone)}</p>` : ""}
                    ${c.city || c.state ? `<p>${this.esc([c.city, c.state].filter(Boolean).join(", "))}</p>` : ""}
                    <button onclick="UI.renderCustomerDetail('${c.id}')">View Customer</button>
                </div>
            `,
                    )
                    .join("")
            }
        `;
  };

  /* ---------------- EVENTS ---------------- */

  UI.renderEvents = function () {
    const events = Events.all();
    const venues = Venues.all();
    document.getElementById("workspace").innerHTML = `
            <h2>Events</h2>
            <button onclick="const e=Events.create();UI.renderEventEdit(e.id);">+ New Event</button>
            <br><br>
            ${
              events.length === 0
                ? "<p>No events created yet.</p>"
                : events
                    .map((event) => {
                      const venue = venues.find((v) => v.id === event.venueId);
                      return `
                    <div class="card">
                        <h3>${this.esc(event.name || "Unnamed Event")}</h3>
                        <p>${this.esc(event.date || "No date")}${event.time ? ` — ${this.esc(Utils.formatTime(event.time))}` : ""}</p>
                        ${venue ? `<p>${this.esc(venue.name || "Unnamed Venue")}</p>` : ""}
                        <p>Status: ${this.statusBadge(event.status || "Draft")}</p>
                        <button onclick="UI.renderEventDetail('${event.id}')">View Event</button>
                    </div>
                `;
                    })
                    .join("")
            }
        `;
  };

  UI.renderEventDetail = function (id) {
    const event = Events.get(id);
    if (!event) return this.renderEvents();
    const venue = Venues.get(event.venueId);
    const capacityPercent =
      Number(event.capacity || 0) > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (Number(event.ticketsSold || 0) / Number(event.capacity || 0)) *
                  100,
              ),
            ),
          )
        : 0;
    const revenuePercent =
      Number(event.revenueGoal || 0) > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (Number(event.actualRevenue || 0) /
                  Number(event.revenueGoal || 0)) *
                  100,
              ),
            ),
          )
        : 0;

    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderEvents()">← Back to Events</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(event.name || "Unnamed Event")}</h2>
                <p><strong>Date:</strong> ${this.esc(event.date || "—")}</p>
                <p><strong>Start Time:</strong> ${this.esc(Utils.formatTime(event.time) || "—")}</p>
                <p><strong>End Time:</strong> ${this.esc(Utils.formatTime(event.endTime) || "—")}</p>
                <p><strong>Venue:</strong> ${this.esc(venue ? venue.name : "—")}</p>
                <p><strong>Theme:</strong> ${this.esc(event.theme || "—")}</p>
                <p><strong>Instructor:</strong> ${this.esc(event.instructor || "—")}</p>
                <p><strong>Capacity:</strong> ${Number(event.capacity || 0)}</p>
                <p><strong>Tickets Sold:</strong> ${Number(event.ticketsSold || 0)}</p>
                <p><strong>Ticket Price:</strong> ${Utils.money(event.ticketPrice || 0)}</p>
                <p><strong>Status:</strong> ${this.statusBadge(event.status || "Draft")}</p>

                <h4>Capacity Progress</h4>
                <p>${capacityPercent}%</p>
                <div class="progress-bar"><div class="progress-fill" style="width:${capacityPercent}%"></div></div>

                <h4>Revenue Goal Progress</h4>
                <p><strong>Goal:</strong> ${Utils.money(event.revenueGoal || 0)}</p>
                <p><strong>Actual Revenue:</strong> ${Utils.money(event.actualRevenue || 0)}</p>
                <p>${revenuePercent}%</p>
                <div class="progress-bar"><div class="progress-fill" style="width:${revenuePercent}%"></div></div>

                <h4>Event Financial Summary</h4>
                <p><strong>Income:</strong> ${Utils.money(
                  Finance.byEvent(event.id)
                    .filter(
                      (t) => t.type === "Income" && t.status !== "Cancelled",
                    )
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0),
                )}</p>
                <p><strong>Expenses:</strong> ${Utils.money(
                  Finance.byEvent(event.id)
                    .filter(
                      (t) => t.type === "Expense" && t.status !== "Cancelled",
                    )
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0),
                )}</p>
                <p><strong>Profit:</strong> ${Utils.money(Finance.eventProfit(event.id))}</p>

                ${offeringDetail(event)}
                <p><strong>Notes:</strong> ${this.esc(event.notes || "—")}</p>

                <br>
                <button onclick="UI.renderEventEdit('${event.id}')">Edit Event</button>
                <button onclick="if(confirm('Delete this event?')){Events.remove('${event.id}');UI.renderEvents();}">Delete Event</button>
            </div>
        `;
  };

  UI.renderEventEdit = function (id) {
    const event = Events.get(id);
    if (!event) return this.renderEvents();
    const venues = Venues.active();
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderEventDetail('${event.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Event</h2>

                <label>Event Name</label>
                <input id="eventName" value="${this.esc(event.name || "")}" placeholder="Event name">

                <label>Date</label>
                <input id="eventDate" type="date" value="${this.esc(event.date || "")}">

                <label>Start Time</label>
                <input id="eventTime" type="time" value="${this.esc(event.time || "")}">

                <label>End Time</label>
                <input id="eventEndTime" type="time" value="${this.esc(event.endTime || "")}">

                <label>Venue</label>
                <select id="eventVenueId">
                    <option value="">Select Venue</option>
                    ${venues.map((v) => `<option value="${v.id}" ${event.venueId === v.id ? "selected" : ""}>${this.esc(v.name || "Unnamed Venue")}</option>`).join("")}
                </select>

                <label>Theme</label>
                <input id="eventTheme" list="eventThemesEdit" value="${this.esc(event.theme || "")}" placeholder="Choose or type a theme">
                <datalist id="eventThemesEdit">${optionList(Events.themes())}</datalist>

                <label>Instructor</label>
                <input id="eventInstructor" value="${this.esc(event.instructor || "")}" placeholder="Instructor">

                <label>Capacity</label>
                <input id="eventCapacity" type="number" min="0" value="${Number(event.capacity || 0)}">

                <label>Tickets Sold</label>
                <input id="eventTicketsSold" type="number" min="0" value="${Number(event.ticketsSold || 0)}">

                <label>Ticket Price</label>
                <input id="eventTicketPrice" type="number" min="0" step="0.01" value="${Number(event.ticketPrice || 0)}">

                <label>Revenue Goal</label>
                <input id="eventRevenueGoal" type="number" min="0" step="0.01" value="${Number(event.revenueGoal || 0)}">

                <label>Actual Revenue</label>
                <input id="eventActualRevenue" type="number" min="0" step="0.01" value="${Number(event.actualRevenue || 0)}">

                <label>Status</label>
                <select id="eventStatus">
                    ${["Draft", "Scheduled", "Completed", "Cancelled"].map((status) => `<option value="${status}" ${event.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select>

                ${offeringEditor(event, "Events", "renderEventEdit", Events.offeringNames(), Events.offeringDescriptions())}

                <label>Notes</label>
                <textarea id="eventNotes" placeholder="Event notes">${this.esc(event.notes || "")}</textarea>

                <br><br>
                <button onclick="
                    Events.update('${event.id}',{
                        name:document.getElementById('eventName').value,
                        date:document.getElementById('eventDate').value,
                        time:document.getElementById('eventTime').value,
                        endTime:document.getElementById('eventEndTime').value,
                        venueId:document.getElementById('eventVenueId').value,
                        theme:document.getElementById('eventTheme').value,
                        instructor:document.getElementById('eventInstructor').value,
                        capacity:Number(document.getElementById('eventCapacity').value),
                        ticketsSold:Number(document.getElementById('eventTicketsSold').value),
                        ticketPrice:Number(document.getElementById('eventTicketPrice').value),
                        revenueGoal:Number(document.getElementById('eventRevenueGoal').value),
                        actualRevenue:Number(document.getElementById('eventActualRevenue').value),
                        status:document.getElementById('eventStatus').value,
                        notes:document.getElementById('eventNotes').value
                    });
                    UI.renderEventDetail('${event.id}');
                ">Save Event</button>
            </div>
        `;
  };

  /* ---------------- VENUES ---------------- */

  UI.renderVenues = function () {
    const venues = Venues.all();
    document.getElementById("workspace").innerHTML = `
            <h2>Venues</h2>
            <button onclick="const v=Venues.create();UI.renderVenueEdit(v.id);">+ Add Venue</button>
            <br><br>
            ${
              venues.length === 0
                ? "<p>No venues added yet.</p>"
                : venues
                    .map(
                      (v) => `
                <div class="card">
                    <h3>${this.esc(v.name || "Unnamed Venue")}</h3>
                    ${v.city || v.state ? `<p>${this.esc([v.city, v.state].filter(Boolean).join(", "))}</p>` : ""}
                    ${v.phone ? `<p>${this.esc(v.phone)}</p>` : ""}
                    <p>${this.statusBadge(v.active !== false ? "Active" : "Inactive")}</p>
                    <button onclick="UI.renderVenueDetail('${v.id}')">View Venue</button>
                </div>
            `,
                    )
                    .join("")
            }
        `;
  };

  UI.renderVenueDetail = function (id) {
    const v = Venues.get(id);
    if (!v) return this.renderVenues();
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderVenues()">← Back to Venues</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(v.name || "Unnamed Venue")}</h2>
                <p><strong>Contact Person:</strong> ${this.esc(v.contactPerson || "—")}</p>
                <p><strong>Job Title:</strong> ${this.esc(v.jobTitle || "—")}</p>
                <p><strong>Phone:</strong> ${this.esc(v.phone || "—")}</p>
                <p><strong>Alternate Phone:</strong> ${this.esc(v.alternatePhone || "—")}</p>
                <p><strong>Email:</strong> ${this.esc(v.email || "—")}</p>
                <p><strong>Website:</strong> ${this.esc(v.website || "—")}</p>
                <p><strong>Instagram:</strong> ${this.esc(v.instagram || "—")}</p>
                <p><strong>Facebook:</strong> ${this.esc(v.facebook || "—")}</p>
                <p><strong>Address:</strong> ${this.esc(Venues.fullAddress(v) || "—")}</p>
                <p><strong>Capacity:</strong> ${Number(v.capacity || 0)}</p>
                <p><strong>Rental Cost:</strong> ${Utils.money(v.rentalCost || 0)}</p>
                <p><strong>Deposit:</strong> ${Utils.money(v.deposit || 0)}</p>
                <p><strong>Deposit Refundable:</strong> ${v.depositRefundable ? "Yes" : "No"}</p>
                <p><strong>Parking:</strong> ${this.esc(v.parking || "—")}</p>
                <p><strong>Indoor / Outdoor:</strong> ${this.esc(v.indoorOutdoor || "—")}</p>
                <p><strong>Alcohol Allowed:</strong> ${v.alcoholAllowed ? "Yes" : "No"}</p>
                <p><strong>Food Allowed:</strong> ${v.foodAllowed ? "Yes" : "No"}</p>
                <p><strong>Outside Vendors Allowed:</strong> ${v.outsideVendorsAllowed ? "Yes" : "No"}</p>
                <p><strong>Setup Time:</strong> ${this.esc(Utils.formatTime(v.setupTime) || "—")}</p>
                <p><strong>Breakdown Time:</strong> ${this.esc(Utils.formatTime(v.breakdownTime) || "—")}</p>
                <p><strong>Tax ID:</strong> ${this.esc(v.taxId || "—")}</p>
                <p><strong>Status:</strong> ${this.statusBadge(v.active !== false ? "Active" : "Inactive")}</p>
                ${offeringDetail(v)}
                <p><strong>Notes:</strong> ${this.esc(v.notes || "—")}</p>
                <br>
                <button onclick="UI.renderVenueEdit('${v.id}')">Edit Venue</button>
                <button onclick="if(confirm('Delete this venue?')){Venues.remove('${v.id}');UI.renderVenues();}">Delete Venue</button>
            </div>
        `;
  };

  UI.renderVenueEdit = function (id) {
    const v = Venues.get(id);
    if (!v) return this.renderVenues();
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderVenueDetail('${v.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Venue</h2>
                <label>Venue Name</label><input id="venueName" value="${this.esc(v.name || "")}" placeholder="Venue name">
                <label>Contact Person</label><input id="venueContactPerson" value="${this.esc(v.contactPerson || "")}" placeholder="Contact person">
                <label>Job Title</label><input id="venueJobTitle" value="${this.esc(v.jobTitle || "")}" placeholder="Job title">
                <label>Phone</label><input id="venuePhone" value="${this.esc(v.phone || "")}" placeholder="Phone">
                <label>Alternate Phone</label><input id="venueAlternatePhone" value="${this.esc(v.alternatePhone || "")}" placeholder="Alternate phone">
                <label>Email</label><input id="venueEmail" type="email" value="${this.esc(v.email || "")}" placeholder="Email">
                <label>Website</label><input id="venueWebsite" value="${this.esc(v.website || "")}" placeholder="Website">
                <label>Instagram</label><input id="venueInstagram" value="${this.esc(v.instagram || "")}" placeholder="Instagram">
                <label>Facebook</label><input id="venueFacebook" value="${this.esc(v.facebook || "")}" placeholder="Facebook">
                <label>Address</label><input id="venueAddress" value="${this.esc(v.address || "")}" placeholder="Street address">
                <label>Address Line 2</label><input id="venueAddress2" value="${this.esc(v.address2 || "")}" placeholder="Suite, unit, etc.">
                <label>City</label><input id="venueCity" value="${this.esc(v.city || "")}" placeholder="City">
                <label>State</label><input id="venueState" value="${this.esc(v.state || "")}" placeholder="State">
                <label>ZIP Code</label><input id="venueZip" value="${this.esc(v.zip || "")}" placeholder="ZIP code">
                <label>Country</label><input id="venueCountry" value="${this.esc(v.country || "")}" placeholder="Country">
                <label>Capacity</label><input id="venueCapacity" type="number" min="0" value="${Number(v.capacity || 0)}">
                <label>Rental Cost</label><input id="venueRentalCost" type="number" min="0" step="0.01" value="${Number(v.rentalCost || 0)}">
                <label>Deposit</label><input id="venueDeposit" type="number" min="0" step="0.01" value="${Number(v.deposit || 0)}">
                <label><input id="venueDepositRefundable" type="checkbox" ${v.depositRefundable ? "checked" : ""}> Deposit Refundable</label>
                <label>Parking</label><input id="venueParking" value="${this.esc(v.parking || "")}" placeholder="Parking details">
                <label>Indoor / Outdoor</label>
                <select id="venueIndoorOutdoor">${["Indoor", "Outdoor", "Both"].map((x) => `<option value="${x}" ${v.indoorOutdoor === x ? "selected" : ""}>${x}</option>`).join("")}</select>
                <label><input id="venueAlcoholAllowed" type="checkbox" ${v.alcoholAllowed ? "checked" : ""}> Alcohol Allowed</label>
                <label><input id="venueFoodAllowed" type="checkbox" ${v.foodAllowed ? "checked" : ""}> Food Allowed</label>
                <label><input id="venueOutsideVendorsAllowed" type="checkbox" ${v.outsideVendorsAllowed ? "checked" : ""}> Outside Vendors Allowed</label>
                <label>Setup Time</label><input id="venueSetupTime" type="time" value="${this.esc(v.setupTime || "")}">
                <label>Breakdown Time</label><input id="venueBreakdownTime" type="time" value="${this.esc(v.breakdownTime || "")}">
                <label>Tax ID</label><input id="venueTaxId" value="${this.esc(v.taxId || "")}" placeholder="Tax ID">
                <label><input id="venueActive" type="checkbox" ${v.active !== false ? "checked" : ""}> Active Venue</label>

                ${offeringEditor(v, "Venues", "renderVenueEdit", Venues.offeringNames(), Venues.offeringDescriptions())}

                <label>Notes</label><textarea id="venueNotes" placeholder="Venue notes">${this.esc(v.notes || "")}</textarea>
                <br><br>
                <button onclick="
                    Venues.update('${v.id}',{
                        name:document.getElementById('venueName').value,
                        contactPerson:document.getElementById('venueContactPerson').value,
                        jobTitle:document.getElementById('venueJobTitle').value,
                        phone:document.getElementById('venuePhone').value,
                        alternatePhone:document.getElementById('venueAlternatePhone').value,
                        email:document.getElementById('venueEmail').value,
                        website:document.getElementById('venueWebsite').value,
                        instagram:document.getElementById('venueInstagram').value,
                        facebook:document.getElementById('venueFacebook').value,
                        address:document.getElementById('venueAddress').value,
                        address2:document.getElementById('venueAddress2').value,
                        city:document.getElementById('venueCity').value,
                        state:document.getElementById('venueState').value,
                        zip:document.getElementById('venueZip').value,
                        country:document.getElementById('venueCountry').value,
                        capacity:Number(document.getElementById('venueCapacity').value),
                        rentalCost:Number(document.getElementById('venueRentalCost').value),
                        deposit:Number(document.getElementById('venueDeposit').value),
                        depositRefundable:document.getElementById('venueDepositRefundable').checked,
                        parking:document.getElementById('venueParking').value,
                        indoorOutdoor:document.getElementById('venueIndoorOutdoor').value,
                        alcoholAllowed:document.getElementById('venueAlcoholAllowed').checked,
                        foodAllowed:document.getElementById('venueFoodAllowed').checked,
                        outsideVendorsAllowed:document.getElementById('venueOutsideVendorsAllowed').checked,
                        setupTime:document.getElementById('venueSetupTime').value,
                        breakdownTime:document.getElementById('venueBreakdownTime').value,
                        taxId:document.getElementById('venueTaxId').value,
                        active:document.getElementById('venueActive').checked,
                        notes:document.getElementById('venueNotes').value
                    });
                    UI.renderVenueDetail('${v.id}');
                ">Save Venue</button>
            </div>
        `;
  };

  /* ---------------- VENDORS ---------------- */

  UI.renderVendors = function () {
    const vendors = Vendors.all();
    document.getElementById("workspace").innerHTML = `
            <h2>Vendors</h2>
            <button onclick="const v=Vendors.create();UI.renderVendorEdit(v.id);">+ Add Vendor</button>
            <br><br>
            ${
              vendors.length === 0
                ? "<p>No vendors added yet.</p>"
                : vendors
                    .map(
                      (v) => `
                <div class="card">
                    <h3>${this.esc(v.name || "Unnamed Vendor")}</h3>
                    ${v.category ? `<p>${this.esc(v.category)}</p>` : ""}
                    ${v.phone ? `<p>${this.esc(v.phone)}</p>` : ""}
                    <p>${this.statusBadge(v.active !== false ? "Active" : "Inactive")}</p>
                    <button onclick="UI.renderVendorDetail('${v.id}')">View Vendor</button>
                </div>
            `,
                    )
                    .join("")
            }
        `;
  };

  UI.renderVendorDetail = function (id) {
    const v = Vendors.get(id);
    if (!v) return this.renderVendors();
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderVendors()">← Back to Vendors</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(v.name || "Unnamed Vendor")}</h2>
                <p><strong>Category:</strong> ${this.esc(v.category || "—")}</p>
                <p><strong>Contact Person:</strong> ${this.esc(v.contact || "—")}</p>
                <p><strong>Job Title:</strong> ${this.esc(v.jobTitle || "—")}</p>
                <p><strong>Phone:</strong> ${this.esc(v.phone || "—")}</p>
                <p><strong>Alternate Phone:</strong> ${this.esc(v.alternatePhone || "—")}</p>
                <p><strong>Email:</strong> ${this.esc(v.email || "—")}</p>
                <p><strong>Website:</strong> ${this.esc(v.website || "—")}</p>
                <p><strong>Instagram:</strong> ${this.esc(v.instagram || "—")}</p>
                <p><strong>Facebook:</strong> ${this.esc(v.facebook || "—")}</p>
                <p><strong>Address:</strong> ${this.esc(Vendors.fullAddress(v) || "—")}</p>
                <p><strong>Payment Type:</strong> ${this.esc(v.paymentType || "—")}</p>
                ${
                  v.paymentType === "Percentage"
                    ? `<p><strong>Percentage:</strong> ${Number(v.percentage || 0)}%</p><p><strong>Minimum Guarantee:</strong> ${Utils.money(v.minimumGuarantee || 0)}</p>`
                    : `<p><strong>Flat Rate:</strong> ${Utils.money(v.flatRate || 0)}</p>`
                }
                <p><strong>Payout Status:</strong> ${this.statusBadge(v.payoutStatus || "Unpaid")}</p>
                <p><strong>Tax ID:</strong> ${this.esc(v.taxId || "—")}</p>
                <p><strong>Status:</strong> ${this.statusBadge(v.active !== false ? "Active" : "Inactive")}</p>
                ${offeringDetail(v)}
                <p><strong>Notes:</strong> ${this.esc(v.notes || "—")}</p>
                <br>
                <button onclick="UI.renderVendorEdit('${v.id}')">Edit Vendor</button>
                <button onclick="if(confirm('Delete this vendor?')){Vendors.remove('${v.id}');UI.renderVendors();}">Delete Vendor</button>
            </div>
        `;
  };

  UI.renderVendorEdit = function (id) {
    const v = Vendors.get(id);
    if (!v) return this.renderVendors();
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderVendorDetail('${v.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Vendor</h2>
                <label>Vendor Name</label><input id="vendorName" value="${this.esc(v.name || "")}" placeholder="Vendor name">
                <label>Category</label><input id="vendorCategory" list="vendorCategoriesEdit" value="${this.esc(v.category || "")}" placeholder="Choose or type a category">
                <datalist id="vendorCategoriesEdit">${optionList(Vendors.categories())}</datalist>
                <label>Contact Person</label><input id="vendorContact" value="${this.esc(v.contact || "")}" placeholder="Contact person">
                <label>Job Title</label><input id="vendorJobTitle" value="${this.esc(v.jobTitle || "")}" placeholder="Job title">
                <label>Phone</label><input id="vendorPhone" value="${this.esc(v.phone || "")}" placeholder="Phone">
                <label>Alternate Phone</label><input id="vendorAlternatePhone" value="${this.esc(v.alternatePhone || "")}" placeholder="Alternate phone">
                <label>Email</label><input id="vendorEmail" type="email" value="${this.esc(v.email || "")}" placeholder="Email">
                <label>Website</label><input id="vendorWebsite" value="${this.esc(v.website || "")}" placeholder="Website">
                <label>Instagram</label><input id="vendorInstagram" value="${this.esc(v.instagram || "")}" placeholder="Instagram">
                <label>Facebook</label><input id="vendorFacebook" value="${this.esc(v.facebook || "")}" placeholder="Facebook">
                <label>Address</label><input id="vendorAddress" value="${this.esc(v.address || "")}" placeholder="Street address">
                <label>Address Line 2</label><input id="vendorAddress2" value="${this.esc(v.address2 || "")}" placeholder="Suite, unit, etc.">
                <label>City</label><input id="vendorCity" value="${this.esc(v.city || "")}" placeholder="City">
                <label>State</label><input id="vendorState" value="${this.esc(v.state || "")}" placeholder="State">
                <label>ZIP Code</label><input id="vendorZip" value="${this.esc(v.zip || "")}" placeholder="ZIP code">
                <label>Country</label><input id="vendorCountry" value="${this.esc(v.country || "")}" placeholder="Country">
                <label>Payment Type</label>
                <select id="vendorPaymentType" onchange="UI.renderVendorEditPaymentFields('${v.id}',this.value)">
                    <option value="Flat Rate" ${v.paymentType === "Flat Rate" ? "selected" : ""}>Flat Rate</option>
                    <option value="Percentage" ${v.paymentType === "Percentage" ? "selected" : ""}>Percentage</option>
                </select>
                <div id="vendorPaymentFields">
                    ${
                      v.paymentType === "Percentage"
                        ? `
                        <label>Percentage (%)</label><input id="vendorPercentage" type="number" min="0" step="0.01" value="${Number(v.percentage || 0)}">
                        <label>Minimum Guarantee</label><input id="vendorMinimumGuarantee" type="number" min="0" step="0.01" value="${Number(v.minimumGuarantee || 0)}">
                    `
                        : `
                        <label>Flat Rate</label><input id="vendorFlatRate" type="number" min="0" step="0.01" value="${Number(v.flatRate || 0)}">
                    `
                    }
                </div>
                <label>Payout Status</label>
                <select id="vendorPayoutStatus">${["Unpaid", "Pending", "Paid"].map((x) => `<option value="${x}" ${v.payoutStatus === x ? "selected" : ""}>${x}</option>`).join("")}</select>
                <label>Tax ID</label><input id="vendorTaxId" value="${this.esc(v.taxId || "")}" placeholder="Tax ID">
                <label><input id="vendorActive" type="checkbox" ${v.active !== false ? "checked" : ""}> Active Vendor</label>

                ${offeringEditor(v, "Vendors", "renderVendorEdit", Vendors.offeringNames(), Vendors.offeringDescriptions())}

                <label>Notes</label><textarea id="vendorNotes" placeholder="Vendor notes">${this.esc(v.notes || "")}</textarea>
                <br><br>
                <button onclick="UI.saveVendorEdit('${v.id}')">Save Vendor</button>
            </div>
        `;
  };

  UI.renderVendorEditPaymentFields = function (id, type) {
    const v = Vendors.get(id);
    if (!v) return;
    const box = document.getElementById("vendorPaymentFields");
    if (!box) return;
    box.innerHTML =
      type === "Percentage"
        ? `
            <label>Percentage (%)</label><input id="vendorPercentage" type="number" min="0" step="0.01" value="${Number(v.percentage || 0)}">
            <label>Minimum Guarantee</label><input id="vendorMinimumGuarantee" type="number" min="0" step="0.01" value="${Number(v.minimumGuarantee || 0)}">
        `
        : `
            <label>Flat Rate</label><input id="vendorFlatRate" type="number" min="0" step="0.01" value="${Number(v.flatRate || 0)}">
        `;
  };

  UI.saveVendorEdit = function (id) {
    const type = document.getElementById("vendorPaymentType").value;
    Vendors.update(id, {
      name: document.getElementById("vendorName").value,
      category: document.getElementById("vendorCategory").value,
      contact: document.getElementById("vendorContact").value,
      jobTitle: document.getElementById("vendorJobTitle").value,
      phone: document.getElementById("vendorPhone").value,
      alternatePhone: document.getElementById("vendorAlternatePhone").value,
      email: document.getElementById("vendorEmail").value,
      website: document.getElementById("vendorWebsite").value,
      instagram: document.getElementById("vendorInstagram").value,
      facebook: document.getElementById("vendorFacebook").value,
      address: document.getElementById("vendorAddress").value,
      address2: document.getElementById("vendorAddress2").value,
      city: document.getElementById("vendorCity").value,
      state: document.getElementById("vendorState").value,
      zip: document.getElementById("vendorZip").value,
      country: document.getElementById("vendorCountry").value,
      paymentType: type,
      flatRate:
        type === "Flat Rate"
          ? Number(document.getElementById("vendorFlatRate")?.value || 0)
          : Number(Vendors.get(id).flatRate || 0),
      percentage:
        type === "Percentage"
          ? Number(document.getElementById("vendorPercentage")?.value || 0)
          : Number(Vendors.get(id).percentage || 0),
      minimumGuarantee:
        type === "Percentage"
          ? Number(
              document.getElementById("vendorMinimumGuarantee")?.value || 0,
            )
          : Number(Vendors.get(id).minimumGuarantee || 0),
      payoutStatus: document.getElementById("vendorPayoutStatus").value,
      taxId: document.getElementById("vendorTaxId").value,
      active: document.getElementById("vendorActive").checked,
      notes: document.getElementById("vendorNotes").value,
    });
    UI.renderVendorDetail(id);
  };

  /* ---------------- INVENTORY ---------------- */

  UI.renderInventory = function () {
    const items = Inventory.all();
    document.getElementById("workspace").innerHTML = `
            <h2>Inventory</h2>
            <button onclick="const i=Inventory.create();UI.renderInventoryEdit(i.id);">+ Add Inventory Item</button>
            <br><br>
            <div class="dashboard-grid">
                <div class="card"><h3>Inventory Items</h3><h2>${items.length}</h2></div>
                <div class="card"><h3>Total Units</h3><h2>${Inventory.totalUnits()}</h2></div>
                <div class="card"><h3>Low Stock</h3><h2>${Inventory.lowStock().length}</h2></div>
                <div class="card"><h3>Inventory Cost</h3><h2>${Utils.money(Inventory.totalCostValue())}</h2></div>
                <div class="card"><h3>Retail Value</h3><h2>${Utils.money(Inventory.totalRetailValue())}</h2></div>
                <div class="card"><h3>Potential Profit</h3><h2>${Utils.money(Inventory.potentialProfit())}</h2></div>
            </div>
            <br>
            ${
              items.length === 0
                ? "<p>No inventory items added yet.</p>"
                : items
                    .map(
                      (item) => `
                <div class="card">
                    <h3>${this.esc(item.name || "Unnamed Item")}</h3>
                    ${item.category ? `<p>${this.esc(item.category)}</p>` : ""}
                    <p>In Stock: ${Number(item.quantity || 0)}</p>
                    <p>Status: ${this.statusBadge(item.status || "Active")}</p>
                    ${Number(item.quantity || 0) <= Number(item.minimum || 0) ? `<p>${this.statusBadge("Low Stock")}</p>` : ""}
                    <button onclick="UI.renderInventoryDetail('${item.id}')">View Item</button>
                </div>
            `,
                    )
                    .join("")
            }
        `;
  };

  UI.renderInventoryDetail = function (id) {
    const item = Inventory.get(id);
    if (!item) return this.renderInventory();
    const vendor = Vendors.get(item.vendorId);
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderInventory()">← Back to Inventory</button>
            <br><br>
            <div class="card">
                <h2>${this.esc(item.name || "Unnamed Item")}</h2>
                <p><strong>Category:</strong> ${this.esc(item.category || "—")}</p>
                <p><strong>SKU:</strong> ${this.esc(item.sku || "—")}</p>
                <p><strong>Vendor:</strong> ${this.esc(vendor ? vendor.name : "—")}</p>
                <h4>Purchase Information</h4>
                <p><strong>Purchase Unit:</strong> ${this.esc(item.purchaseUnit || "—")}</p>
                <p><strong>Number Purchased:</strong> ${Number(item.purchaseQuantity || 0)}</p>
                <p><strong>Units Per Purchase:</strong> ${Number(item.unitsPerPurchase || 1)}</p>
                <p><strong>Cost Entry Type:</strong> ${this.esc(item.purchaseCostType || "—")}</p>
                <p><strong>Purchase Cost:</strong> ${Utils.money(item.purchaseCost || 0)}</p>
                <p><strong>Total Individual Units Purchased:</strong> ${Inventory.purchaseUnits(item.id)}</p>
                <p><strong>Total Purchase Cost:</strong> ${Utils.money(item.totalPurchaseCost || 0)}</p>
                <p><strong>Calculated Cost Per Individual Unit:</strong> ${Utils.money(item.calculatedUnitCost || 0)}</p>
                <p><strong>Purchase Date:</strong> ${this.esc(item.purchaseDate || "—")}</p>
                <p><strong>Invoice Number:</strong> ${this.esc(item.invoiceNumber || "—")}</p>
                <p><strong>Purchase Notes:</strong> ${this.esc(item.purchaseNotes || "—")}</p>
                <h4>Current Inventory</h4>
                <p><strong>Quantity In Stock:</strong> ${Number(item.quantity || 0)}</p>
                <p><strong>Minimum Stock:</strong> ${Number(item.minimum || 0)}</p>
                <p><strong>Selling Price Per Individual Unit:</strong> ${Utils.money(item.sellPrice || 0)}</p>
                <p><strong>Storage Location:</strong> ${this.esc(item.storageLocation || "—")}</p>
                <p><strong>Status:</strong> ${this.statusBadge(item.status || "Active")}</p>
                ${Number(item.quantity || 0) <= Number(item.minimum || 0) ? `<p>${this.statusBadge("Low Stock")}</p>` : ""}
                <p><strong>Notes:</strong> ${this.esc(item.notes || "—")}</p>
                <br>
                <button onclick="UI.renderInventoryEdit('${item.id}')">Edit Item</button>
                <button onclick="if(confirm('Delete this inventory item?')){Inventory.remove('${item.id}');UI.renderInventory();}">Delete Item</button>
            </div>
        `;
  };

  UI.renderInventoryEdit = function (id) {
    const item = Inventory.get(id);
    if (!item) return this.renderInventory();
    const vendors = Vendors.active();
    document.getElementById("workspace").innerHTML = `
            <button onclick="UI.renderInventoryDetail('${item.id}')">← Cancel</button>
            <br><br>
            <div class="card">
                <h2>Edit Inventory Item</h2>
                <label>Item Name</label><input id="inventoryName" value="${this.esc(item.name || "")}" placeholder="Item name">
                <label>Category</label><input id="inventoryCategory" list="inventoryCategoriesEdit" value="${this.esc(item.category || "")}" placeholder="Choose or type a category">
                <datalist id="inventoryCategoriesEdit">${optionList(Inventory.categories())}</datalist>
                <label>SKU</label><input id="inventorySku" value="${this.esc(item.sku || "")}" placeholder="SKU">
                <label>Vendor</label>
                <select id="inventoryVendorId">
                    <option value="">No Vendor</option>
                    ${vendors.map((v) => `<option value="${v.id}" ${item.vendorId === v.id ? "selected" : ""}>${this.esc(v.name || "Unnamed Vendor")}</option>`).join("")}
                </select>

                <h4>Purchase Information</h4>
                <label>Purchase Unit</label>
                <select id="inventoryPurchaseUnit">${["Piece", "Pack", "Box", "Case", "Bundle", "Dozen", "Roll", "Set", "Other"].map((x) => `<option value="${x}" ${item.purchaseUnit === x ? "selected" : ""}>${x}</option>`).join("")}</select>
                <label>Number of Purchase Units Purchased</label><input id="inventoryPurchaseQuantity" type="number" min="0" value="${Number(item.purchaseQuantity || 0)}">
                <label>Individual Units Per Purchase Unit</label><input id="inventoryUnitsPerPurchase" type="number" min="1" value="${Number(item.unitsPerPurchase || 1)}">
                <label>Cost Entry Type</label>
                <select id="inventoryPurchaseCostType">${["Total Purchase", "Per Purchase Unit", "Per Individual Unit"].map((x) => `<option value="${x}" ${item.purchaseCostType === x ? "selected" : ""}>${x}</option>`).join("")}</select>
                <label>Purchase Cost</label><input id="inventoryPurchaseCost" type="number" min="0" step="0.01" value="${Number(item.purchaseCost || 0)}">
                <label>Purchase Date</label><input id="inventoryPurchaseDate" type="date" value="${this.esc(item.purchaseDate || "")}">
                <label>Invoice Number</label><input id="inventoryInvoiceNumber" value="${this.esc(item.invoiceNumber || "")}" placeholder="Invoice number">
                <label>Purchase Notes</label><textarea id="inventoryPurchaseNotes" placeholder="Purchase notes">${this.esc(item.purchaseNotes || "")}</textarea>

                <h4>Current Inventory</h4>
                <label>Quantity Currently In Stock</label><input id="inventoryQuantity" type="number" min="0" value="${Number(item.quantity || 0)}">
                <label>Minimum Stock</label><input id="inventoryMinimum" type="number" min="0" value="${Number(item.minimum || 0)}">
                <label>Selling Price Per Individual Unit</label><input id="inventorySellPrice" type="number" min="0" step="0.01" value="${Number(item.sellPrice || 0)}">
                <label>Storage Location</label><input id="inventoryStorageLocation" value="${this.esc(item.storageLocation || "")}" placeholder="Storage location">
                <label>Status</label>
                <select id="inventoryStatus">${["Active", "Inactive"].map((x) => `<option value="${x}" ${item.status === x ? "selected" : ""}>${x}</option>`).join("")}</select>
                <label>Notes</label><textarea id="inventoryNotes" placeholder="Item notes">${this.esc(item.notes || "")}</textarea>
                <br><br>
                <button onclick="
                    Inventory.update('${item.id}',{
                        name:document.getElementById('inventoryName').value,
                        category:document.getElementById('inventoryCategory').value,
                        sku:document.getElementById('inventorySku').value,
                        vendorId:document.getElementById('inventoryVendorId').value,
                        purchaseUnit:document.getElementById('inventoryPurchaseUnit').value,
                        purchaseQuantity:Number(document.getElementById('inventoryPurchaseQuantity').value),
                        unitsPerPurchase:Number(document.getElementById('inventoryUnitsPerPurchase').value),
                        purchaseCostType:document.getElementById('inventoryPurchaseCostType').value,
                        purchaseCost:Number(document.getElementById('inventoryPurchaseCost').value),
                        purchaseDate:document.getElementById('inventoryPurchaseDate').value,
                        invoiceNumber:document.getElementById('inventoryInvoiceNumber').value,
                        purchaseNotes:document.getElementById('inventoryPurchaseNotes').value,
                        quantity:Number(document.getElementById('inventoryQuantity').value),
                        minimum:Number(document.getElementById('inventoryMinimum').value),
                        sellPrice:Number(document.getElementById('inventorySellPrice').value),
                        storageLocation:document.getElementById('inventoryStorageLocation').value,
                        status:document.getElementById('inventoryStatus').value,
                        notes:document.getElementById('inventoryNotes').value
                    });
                    UI.renderInventoryDetail('${item.id}');
                ">Save Item</button>
            </div>
        `;
  };
})();
