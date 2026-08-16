/* Reusable event ticket types, capacity planning, and staff assignments. */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined" || typeof Utils === "undefined") return;

    const TicketPlanning = {
        templateKey: "ticket_type_templates",
        defaultStaffReservePct: 10,
        defaultPaintPct: 100,

        systemTemplates() {
            return [
                {
                    id:"preset-standard-paint-9x12",
                    name:"Standard Paint Admission — 9×12 Canvas",
                    description:"Includes guided painting instruction, painting supplies, and one 9×12 canvas. Food and beverages are purchased separately.",
                    price:40,
                    kind:"paint",
                    includesPainting:true,
                    preset:true
                },
                {
                    id:"preset-paint-upgrade-11x14",
                    name:"11×14 Paint Upgrade",
                    description:"Includes guided painting instruction, painting supplies, and one 11×14 canvas. Food and beverages are purchased separately.",
                    price:55,
                    kind:"paint",
                    includesPainting:true,
                    preset:true
                },
                {
                    id:"preset-couples-paint-beverage-95",
                    name:"Couples Paint & Beverage Package — Serves 2",
                    description:"A complete experience for two guests, including two standard paint admissions with 9×12 canvases and one featured beverage package designed for two.",
                    price:95,
                    eventbriteUnitPrice:47.50,
                    groupSize:2,
                    seatMultiplier:2,
                    minimumOrderQuantity:2,
                    maximumOrderQuantity:2,
                    kind:"paint",
                    includesPainting:true,
                    canvasSize:"9×12",
                    inclusions:[{
                        id:"couples-featured-beverage-for-two",
                        label:"Featured Beverage Package — Serves 2",
                        menuCategory:"Beverage Packages",
                        choiceFromEventMenu:false,
                        quantity:1,
                        redeemable:true,
                        scope:"order"
                    }],
                    preset:true
                }
            ];
        },

        savedTemplates() {
            return Utils.load(this.templateKey, []);
        },

        templates() {
            const byName = new Map();
            [...this.systemTemplates(), ...this.savedTemplates()].forEach(template => {
                byName.set(String(template.name || "").trim().toLowerCase(), template);
            });
            return [...byName.values()];
        },

        saveTemplates(list) {
            Utils.save(this.templateKey, list);
        },

        ensureEvent(event) {
            let changed = false;
            if (!Array.isArray(event.ticketTypes)) { event.ticketTypes = []; changed = true; }
            if (!Array.isArray(event.staffAssignments)) { event.staffAssignments = []; changed = true; }
            if (event.staffReservePct === undefined || event.staffReservePct === null) { event.staffReservePct = this.defaultStaffReservePct; changed = true; }
            if (event.paintSeatPct === undefined || event.paintSeatPct === null) { event.paintSeatPct = this.defaultPaintPct; changed = true; }
            if (changed) Events.update(event.id, {
                ticketTypes:event.ticketTypes,
                staffAssignments:event.staffAssignments,
                staffReservePct:event.staffReservePct,
                paintSeatPct:event.paintSeatPct
            });
            return event;
        },

        availableCapacity(event) {
            const capacity = Math.max(0, Number(event.capacity || 0));
            const pctReserve = Math.ceil(capacity * Math.max(0, Number(event.staffReservePct || 0)) / 100);
            const actualStaff = Array.isArray(event.staffAssignments) ? event.staffAssignments.length : 0;
            const staffSeats = Math.max(pctReserve, actualStaff);
            const venuePublicCapacity = Math.max(0, capacity - staffSeats);
            const sharedPaintCapacity = Math.max(0, Number(event.sharedPaintCapacity || 0));
            return {
                venueCapacity: capacity,
                staffSeats,
                venuePublicCapacity,
                publicCapacity: sharedPaintCapacity > 0 ? Math.min(venuePublicCapacity, sharedPaintCapacity) : venuePublicCapacity,
                sharedPaintCapacity
            };
        },

        ticketCapacityUsed(event) {
            return (Array.isArray(event.ticketTypes) ? event.ticketTypes : [])
                .filter(t => t.active !== false)
                .reduce((s,t)=>s + Math.max(0, Number(t.quantity || 0)) * Math.max(1, Number(t.seatMultiplier || 1)), 0);
        },

        templateOptions() {
            return this.templates().map(t => `<option value="${UI.esc(t.id)}">${UI.esc(t.name || "Ticket Type")}</option>`).join("");
        },

        addTemplateFromTicket(eventId, ticketId) {
            const event = Events.get(eventId); if (!event) return;
            const t = (event.ticketTypes || []).find(x => x.id === ticketId); if (!t) return;
            const templates = this.savedTemplates();
            const same = templates.find(x => String(x.name || "").trim().toLowerCase() === String(t.name || "").trim().toLowerCase());
            const payload = {
                id:same?.id || Utils.id(),
                name:t.name || "",
                description:t.description || "",
                price:Number(t.price || 0),
                kind:t.kind || "paint",
                includesPainting:t.includesPainting !== false,
                canvasSize:t.canvasSize || "",
                groupSize:Math.max(1,Number(t.groupSize || 1)),
                seatMultiplier:Math.max(1,Number(t.seatMultiplier || t.groupSize || 1)),
                eventbriteUnitPrice:Number(t.eventbriteUnitPrice || 0),
                minimumOrderQuantity:Math.max(1,Number(t.minimumOrderQuantity || 1)),
                maximumOrderQuantity:Math.max(1,Number(t.maximumOrderQuantity || t.minimumOrderQuantity || 1)),
                inclusions:JSON.parse(JSON.stringify(Array.isArray(t.inclusions) ? t.inclusions : []))
            };
            if (same) Object.assign(same, payload); else templates.push(payload);
            this.saveTemplates(templates);
            alert("Ticket type saved as a reusable template.");
            UI.renderEvents();
        },

        addBlank(eventId) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            event.ticketTypes.push({ id:Utils.id(), name:"", description:"", price:0, quantity:0, kind:"paint", includesPainting:true, active:true });
            Events.update(eventId, { ticketTypes:event.ticketTypes });
            UI.renderEvents();
        },

        addFromTemplate(eventId, templateId) {
            if (!templateId) return;
            const template = this.templates().find(t => t.id === templateId); if (!template) return;
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            event.ticketTypes.push({ ...template, id:Utils.id(), quantity:0, active:true });
            Events.update(eventId, { ticketTypes:event.ticketTypes });
            UI.renderEvents();
        },

        updateTicket(eventId, ticketId, key, value) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            const t = event.ticketTypes.find(x => x.id === ticketId); if (!t) return;
            t[key] = ["price","quantity"].includes(key) ? Number(value || 0) : key === "includesPainting" || key === "active" ? !!value : value;
            if (key === "kind") t.includesPainting = value === "paint" || value === "vip";
            Events.update(eventId, { ticketTypes:event.ticketTypes });
            if (["quantity","kind","active"].includes(key)) this.refreshCapacitySummary(eventId);
        },

        removeTicket(eventId, ticketId) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            event.ticketTypes = event.ticketTypes.filter(x => x.id !== ticketId);
            Events.update(eventId, { ticketTypes:event.ticketTypes });
            UI.renderEvents();
        },

        applySuggestedAllocation(eventId) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            const cap = this.availableCapacity(event).publicCapacity;
            const paintPct = Math.min(100, Math.max(0, Number(event.paintSeatPct ?? this.defaultPaintPct)));
            const paintQty = Math.round(cap * paintPct / 100);
            const active = event.ticketTypes.filter(t => t.active !== false);
            const paint = active.filter(t => t.kind === "paint" || (t.kind === "vip" && t.includesPainting));
            if (!paint.length) return alert("Add at least one active Paint Admission ticket type first.");
            const split = (list,total) => {
                let remaining = total;
                list.forEach((t,i) => {
                    const qty = i === list.length - 1 ? remaining : Math.round(total / list.length);
                    t.quantity = Math.max(0, qty); remaining -= qty;
                });
            };
            split(paint, paintQty);
            Events.update(eventId, { ticketTypes:event.ticketTypes });
            UI.renderEvents();
        },

        addStaff(eventId) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            event.staffAssignments.push({ id:Utils.id(), name:"", role:"Sales Staff", payType:"hourly", payRate:0, scheduledHours:0, salesTotal:0, clockIn:"", clockOut:"", accessRole:"sales_only" });
            Events.update(eventId, { staffAssignments:event.staffAssignments });
            UI.renderEvents();
        },

        updateStaff(eventId, staffId, key, value) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            const s = event.staffAssignments.find(x => x.id === staffId); if (!s) return;
            s[key] = ["payRate","scheduledHours","salesTotal"].includes(key) ? Number(value || 0) : value;
            Events.update(eventId, { staffAssignments:event.staffAssignments });
            if (key === "name") this.refreshCapacitySummary(eventId);
        },

        removeStaff(eventId, staffId) {
            const event = this.ensureEvent(Events.get(eventId)); if (!event) return;
            event.staffAssignments = event.staffAssignments.filter(x => x.id !== staffId);
            Events.update(eventId, { staffAssignments:event.staffAssignments });
            UI.renderEvents();
        },

        updateEventSetting(eventId, key, value) {
            Events.update(eventId, { [key]:Number(value || 0) });
            UI.renderEvents();
        },

        refreshCapacitySummary(eventId) {
            const event = Events.get(eventId); if (!event) return;
            const box = document.getElementById(`ticket-capacity-${eventId}`); if (!box) return;
            const cap = this.availableCapacity(event);
            const used = this.ticketCapacityUsed(event);
            box.innerHTML = this.capacityHtml(event, cap, used);
        },

        capacityHtml(event, cap = this.availableCapacity(event), used = this.ticketCapacityUsed(event)) {
            const over = cap.sharedPaintCapacity > 0 ? false : used > cap.publicCapacity;
            const painterQty = (event.ticketTypes || []).filter(t => t.active !== false && (t.kind === "paint" || (t.kind === "vip" && t.includesPainting))).reduce((s,t)=>s+Number(t.quantity||0)*Math.max(1,Number(t.seatMultiplier||1)),0);
            const observerQty = (event.ticketTypes || []).filter(t => t.active !== false && t.kind === "observer").reduce((s,t)=>s+Number(t.quantity||0)*Math.max(1,Number(t.seatMultiplier||1)),0);
            const ratioTotal = painterQty + observerQty;
            const actualPct = ratioTotal ? Math.round(painterQty / ratioTotal * 100) : 0;
            const sold = Math.max(0, Number(event.eventbritePaintTicketsSold ?? event.eventbriteTicketsSold ?? 0) + Number(event.stripeTicketsSold || 0));
            return `<p><strong>Venue capacity:</strong> ${cap.venueCapacity} &nbsp; <strong>Reserved for staff:</strong> ${cap.staffSeats} &nbsp; <strong>Paint admission capacity:</strong> ${cap.publicCapacity}</p>
                ${cap.sharedPaintCapacity > 0 ? `<p><strong>Shared paint-instruction pool:</strong> ${sold}/${cap.publicCapacity} sold &nbsp; <strong>Individual ticket ceilings:</strong> ${used}</p>` : `<p><strong>Ticket capacity assigned:</strong> ${used}/${cap.publicCapacity} ${over ? `<span style="color:#b91c1c;font-weight:700;">— OVER CAPACITY</span>` : ""}</p>`}
                <p><strong>Paint admissions / other admissions:</strong> ${painterQty} / ${observerQty}${ratioTotal ? ` (${actualPct}% paint)` : ""}</p>`;
        },

        ticketRows(event) {
            const rows = event.ticketTypes || [];
            if (!rows.length) return `<p>No ticket types yet.</p>`;
            return rows.map(t => { const groupSize=Math.max(1,Number(t.groupSize||t.seatMultiplier||1)); return `<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;">
                <label>Ticket Type Name</label><input value="${UI.esc(t.name || "")}" onchange="TicketPlanning.updateTicket('${event.id}','${t.id}','name',this.value)">
                <label>Description</label><textarea onchange="TicketPlanning.updateTicket('${event.id}','${t.id}','description',this.value)">${UI.esc(t.description || "")}</textarea>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
                    <div><label>${groupSize>1?'Package Price':'Price'}</label><input type="number" min="0" step="0.01" value="${Number(t.price || 0)}" onchange="TicketPlanning.updateTicket('${event.id}','${t.id}','price',this.value)"></div>
                    <div><label>${groupSize>1?'Packages Available':'Quantity Available'}</label><input type="number" min="0" step="1" value="${Number(t.quantity || 0)}" onchange="TicketPlanning.updateTicket('${event.id}','${t.id}','quantity',this.value)"></div>
                    <div><label>Type</label><select onchange="TicketPlanning.updateTicket('${event.id}','${t.id}','kind',this.value)">
                        <option value="paint" ${t.kind === "paint" ? "selected" : ""}>Paint Admission</option>
                        <option value="observer" ${t.kind === "observer" ? "selected" : ""}>Observer / Gallery</option>
                        <option value="vip" ${t.kind === "vip" ? "selected" : ""}>VIP</option>
                        <option value="comp" ${t.kind === "comp" ? "selected" : ""}>Complimentary / Guest</option>
                    </select></div>
                </div>
                ${groupSize>1?`<p><small><strong>Package capacity:</strong> ${groupSize} guests per package; each purchase uses ${Math.max(1,Number(t.seatMultiplier||groupSize))} admission spaces.${Number(t.eventbriteUnitPrice||0)>0?` Eventbrite charges ${Utils.money(t.eventbriteUnitPrice)} per attendee and requires exactly ${groupSize} tickets, for ${Utils.money(t.price)} total.`:''}</small></p>`:''}
                <label><input type="checkbox" ${t.active !== false ? "checked" : ""} onchange="TicketPlanning.updateTicket('${event.id}','${t.id}','active',this.checked)"> Active for sale</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <button type="button" onclick="TicketPlanning.addTemplateFromTicket('${event.id}','${t.id}')">Save as Reusable Ticket Type</button>
                    <button type="button" onclick="TicketPlanning.removeTicket('${event.id}','${t.id}')">Remove</button>
                </div>
            </div>`; }).join("");
        },

        staffRows(event) {
            const rows = event.staffAssignments || [];
            if (!rows.length) return `<p>No staff assigned yet.</p>`;
            return rows.map(s => `<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
                    <div><label>Name</label><input value="${UI.esc(s.name || "")}" onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','name',this.value)"></div>
                    <div><label>Role</label><input value="${UI.esc(s.role || "")}" onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','role',this.value)"></div>
                    <div><label>Pay Type</label><select onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','payType',this.value)">
                        <option value="hourly" ${s.payType === "hourly" ? "selected" : ""}>Hourly</option>
                        <option value="flat" ${s.payType === "flat" ? "selected" : ""}>Flat Rate</option>
                        <option value="commission" ${s.payType === "commission" ? "selected" : ""}>Commission</option>
                        <option value="hourly_commission" ${s.payType === "hourly_commission" ? "selected" : ""}>Hourly + Commission</option>
                        <option value="volunteer" ${s.payType === "volunteer" ? "selected" : ""}>Volunteer</option>
                    </select></div>
                    <div><label>Rate / Amount</label><input type="number" min="0" step="0.01" value="${Number(s.payRate || 0)}" onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','payRate',this.value)"></div>
                    <div><label>Scheduled Hours</label><input type="number" min="0" step="0.25" value="${Number(s.scheduledHours || 0)}" onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','scheduledHours',this.value)"></div>
                </div>
                <p><small>Future account access: ${s.accessRole === "sales_only" ? "Sales-only" : UI.esc(s.accessRole || "Sales-only")} • Sales attribution and clock-in/out will attach to this staff record.</small></p>
                <button type="button" onclick="TicketPlanning.removeStaff('${event.id}','${s.id}')">Remove Staff</button>
            </div>`).join("");
        },

        planningCard(event) {
            this.ensureEvent(event);
            const cap = this.availableCapacity(event);
            const used = this.ticketCapacityUsed(event);
            const templates = this.templates();
            return `<div class="card" id="ticket-planning-${event.id}">
                <h3>Ticket Types & Capacity Plan</h3>
                <p>The approved reusable package starts with the <strong>$40 Standard 9×12 Paint Admission</strong> and the <strong>$55 11×14 Paint Upgrade</strong>. Food and beverage packages remain separate from admission.</p>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
                    <div><label>Staff Reserve (%)</label><input type="number" min="0" max="50" step="1" value="${Number(event.staffReservePct || 0)}" onchange="TicketPlanning.updateEventSetting('${event.id}','staffReservePct',this.value)"></div>
                    <div><label>Paint Admission Target (%)</label><input type="number" min="0" max="100" step="1" value="${Number(event.paintSeatPct ?? this.defaultPaintPct)}" onchange="TicketPlanning.updateEventSetting('${event.id}','paintSeatPct',this.value)"></div>
                    <div><label>Shared Paint-Instruction Capacity</label><input type="number" min="0" step="1" value="${Number(event.sharedPaintCapacity || 0)}" placeholder="0 = venue public capacity" onchange="TicketPlanning.updateEventSetting('${event.id}','sharedPaintCapacity',this.value)"></div>
                </div>
                <div id="ticket-capacity-${event.id}">${this.capacityHtml(event, cap, used)}</div>
                <button type="button" onclick="TicketPlanning.applySuggestedAllocation('${event.id}')">Allocate Paint Admission Capacity</button>
                <hr>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
                    <button type="button" onclick="TicketPlanning.addBlank('${event.id}')">+ Add Ticket Type</button>
                    ${templates.length ? `<select id="ticket-template-${event.id}" style="max-width:360px;"><option value="">Choose approved or saved ticket type…</option>${this.templateOptions()}</select><button type="button" onclick="TicketPlanning.addFromTemplate('${event.id}',document.getElementById('ticket-template-${event.id}').value)">Add Ticket Package</button>` : ""}
                </div>
                ${this.ticketRows(event)}
                <hr>
                <h3>Event Staff</h3>
                <p>Staff count is included in capacity planning. Wage types support hourly, flat rate, commission, hourly + commission, and volunteer.</p>
                <button type="button" onclick="TicketPlanning.addStaff('${event.id}')">+ Add Staff Member</button>
                ${this.staffRows(event)}
            </div>`;
        }
    };

    window.TicketPlanning = TicketPlanning;

    const priorRenderEvents = UI.renderEvents;
    UI.renderEvents = function (...args) {
        const result = priorRenderEvents.apply(this, args);
        const workspace = document.getElementById("workspace");
        if (!workspace) return result;
        const existing = workspace.querySelectorAll("[id^='ticket-planning-']");
        existing.forEach(x => x.remove());
        Events.all().forEach(event => workspace.insertAdjacentHTML("beforeend", TicketPlanning.planningCard(event)));
        return result;
    };
})();
