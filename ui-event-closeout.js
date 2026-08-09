/* Event closeout checklist and final financial snapshot. */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined" || typeof Finance === "undefined") return;

    function esc(value) { return UI.esc(value); }

    function totals(eventId) {
        const rows = Finance.byEvent(eventId).filter(t => t.status !== "Cancelled");
        const income = rows.filter(t => t.type === "Income").reduce((s,t) => s + Number(t.amount || 0), 0);
        const expenses = rows.filter(t => t.type === "Expense").reduce((s,t) => s + Number(t.amount || 0), 0);
        const taxes = rows.reduce((s,t) => s + Number(t.taxAmount || 0), 0);
        return { income, expenses, taxes, profit: income - expenses };
    }

    function linkedVendors(eventId) {
        const ids = [...new Set(Finance.byEvent(eventId).map(t => t.vendorId).filter(Boolean))];
        return ids.map(id => Vendors.get(id)).filter(Boolean);
    }

    function linkedAssets(eventId) {
        return typeof Assets !== "undefined" ? Assets.all().filter(a => a.assignedEventId === eventId) : [];
    }

    function linkedCalendar(eventId) {
        return typeof Calendar !== "undefined" ? Calendar.byEvent(eventId) : [];
    }

    function itemRow(id, label, detail, actionHtml = "") {
        return `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #e5e7eb;">
                <input class="closeout-check" id="${id}" type="checkbox" onchange="UI.updateCloseoutConfirmState()" style="width:auto;margin-top:4px;">
                <label for="${id}" style="flex:1;cursor:pointer;">
                    <strong>${esc(label)}</strong>
                    ${detail ? `<div style="font-size:.9em;opacity:.8;margin-top:3px;">${detail}</div>` : ""}
                </label>
                ${actionHtml}
            </div>
        `;
    }

    UI.updateCloseoutConfirmState = function () {
        const checks = Array.from(document.querySelectorAll("#eventCloseoutModal .closeout-check"));
        const button = document.getElementById("confirmEventCloseout");
        if (button) button.disabled = !checks.length || !checks.every(c => c.checked);
    };

    UI.openEventCloseout = function (eventId) {
        const event = Events.get(eventId);
        if (!event) return;
        document.getElementById("eventCloseoutModal")?.remove();

        const venue = event.venueId && typeof Venues !== "undefined" ? Venues.get(event.venueId) : null;
        const transactions = Finance.byEvent(eventId);
        const vendors = linkedVendors(eventId);
        const assets = linkedAssets(eventId);
        const reminders = linkedCalendar(eventId);
        const offerings = Array.isArray(event.offerings) ? event.offerings : [];
        const t = totals(eventId);

        const overlay = document.createElement("div");
        overlay.id = "eventCloseoutModal";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:999999;overflow:auto;padding:24px;";
        overlay.innerHTML = `
            <div class="card" style="max-width:900px;margin:20px auto;background:#fff;">
                <h2>Complete & Close Out Event</h2>
                <p><strong>${esc(event.name || "Unnamed Event")}</strong></p>
                <p>Review every item below. You must check every box before the event can be finalized.</p>

                <h3>Event Details</h3>
                ${itemRow("co-event", "Event information is final", `${esc(event.date || "No date")} · ${Number(event.ticketsSold || 0)} tickets sold · ${Utils.money(event.actualRevenue || 0)} recorded revenue`, `<button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderEventEdit('${event.id}')">Edit</button>`)}
                ${venue ? itemRow("co-venue", `Venue: ${venue.name || "Unnamed Venue"}`, esc(Venues.fullAddress ? Venues.fullAddress(venue) : ""), `<button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderVenueEdit('${venue.id}')">Edit</button>`) : ""}

                ${offerings.length ? `<h3>Event Products / Services</h3>${offerings.map((o,i) => itemRow(`co-offering-${i}`, o.name || "Unnamed Product / Service", `Qty ${Number(o.quantity || 0)} · ${Utils.money(o.price || 0)} each`)).join("")}` : ""}

                ${transactions.length ? `<h3>Financial Transactions</h3>${transactions.map((tr,i) => itemRow(
                    `co-fin-${i}`,
                    tr.description || "Unnamed Transaction",
                    `${esc(tr.type)} · ${Utils.money(tr.amount || 0)} · Status: ${esc(tr.status || "Completed")}`,
                    `<span style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderFinanceEdit('${tr.id}')">Edit</button><button type="button" onclick="if(confirm('Remove this transaction from this event?')){Finance.update('${tr.id}',{eventId:''});UI.openEventCloseout('${event.id}');}">Remove from Event</button></span>`
                )).join("")}` : `<p>No finance transactions are linked to this event.</p>`}

                ${vendors.length ? `<h3>Vendors / Instructors</h3>${vendors.map((v,i) => itemRow(`co-vendor-${i}`, v.name || "Unnamed Vendor", `${esc(v.category || "Business")} · Payment: ${esc(v.paymentType || "—")}`, `<button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderVendorEdit('${v.id}')">Edit</button>`)).join("")}` : ""}

                ${assets.length ? `<h3>Assigned Assets</h3>${assets.map((a,i) => itemRow(`co-asset-${i}`, a.name || "Unnamed Asset", `Status: ${esc(a.status || "—")}`, `<span style="display:flex;gap:6px;"><button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderAssetEdit('${a.id}')">Edit</button><button type="button" onclick="if(confirm('Remove this asset from this event?')){Assets.update('${a.id}',{assignedEventId:''});UI.openEventCloseout('${event.id}');}">Remove</button></span>`)).join("")}` : ""}

                ${reminders.length ? `<h3>Calendar / Tasks</h3>${reminders.map((r,i) => itemRow(`co-cal-${i}`, r.title || "Unnamed Task", `${esc(r.date || "No date")} · ${r.completed ? "Completed" : "Not completed"}`, `<span style="display:flex;gap:6px;"><button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderCalendarEdit('${r.id}')">Edit</button><button type="button" onclick="if(confirm('Remove this task from this event?')){Calendar.update('${r.id}',{eventId:''});UI.openEventCloseout('${event.id}');}">Remove</button></span>`)).join("")}` : ""}

                <h3>Final Numbers</h3>
                <div class="dashboard-grid">
                    <div class="card"><strong>Income</strong><h3>${Utils.money(t.income)}</h3></div>
                    <div class="card"><strong>Expenses</strong><h3>${Utils.money(t.expenses)}</h3></div>
                    <div class="card"><strong>Taxes</strong><h3>${Utils.money(t.taxes)}</h3></div>
                    <div class="card"><strong>Net Profit</strong><h3>${Utils.money(t.profit)}</h3></div>
                </div>
                ${itemRow("co-final", "I reviewed the final totals and they are correct", "These values will be stored in the event closeout snapshot.")}

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button type="button" id="confirmEventCloseout" disabled onclick="UI.confirmEventCloseout('${event.id}')">Confirm & Close Event</button>
                    <button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove()">Exit Without Completing</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        UI.updateCloseoutConfirmState();
    };

    UI.confirmEventCloseout = function (eventId) {
        const event = Events.get(eventId);
        if (!event) return;
        const checks = Array.from(document.querySelectorAll("#eventCloseoutModal .closeout-check"));
        if (!checks.length || !checks.every(c => c.checked)) {
            alert("Check every item before completing this event.");
            return;
        }

        // Only event-linked finance records are finalized. This avoids changing
        // unrelated records elsewhere in the planner.
        Finance.byEvent(eventId).forEach(t => {
            if (t.status === "Pending") Finance.update(t.id, { status: "Completed" });
        });

        const t = totals(eventId);
        const closedAt = new Date().toISOString();
        Events.update(eventId, {
            status: "Completed",
            closedOutAt: closedAt,
            actualRevenue: Number(event.actualRevenue || t.income || 0),
            closeoutSnapshot: {
                closedAt,
                ticketsSold: Number(event.ticketsSold || 0),
                actualRevenue: Number(event.actualRevenue || 0),
                income: t.income,
                expenses: t.expenses,
                taxes: t.taxes,
                profit: t.profit,
                financeTransactionIds: Finance.byEvent(eventId).map(x => x.id),
                vendorIds: linkedVendors(eventId).map(x => x.id),
                assetIds: linkedAssets(eventId).map(x => x.id),
                calendarIds: linkedCalendar(eventId).map(x => x.id)
            }
        });

        // Mark linked calendar items complete once the closeout is confirmed.
        linkedCalendar(eventId).forEach(r => Calendar.update(r.id, { completed: true }));

        document.getElementById("eventCloseoutModal")?.remove();
        UI.renderEventDetail(eventId);
    };

    const originalRenderEventDetail = UI.renderEventDetail;
    if (typeof originalRenderEventDetail === "function") {
        UI.renderEventDetail = function (id) {
            const result = originalRenderEventDetail.call(UI, id);
            const event = Events.get(id);
            if (!event) return result;
            const card = document.querySelector("#workspace .card");
            if (!card) return result;

            const controls = document.createElement("div");
            controls.style.marginTop = "14px";
            if (event.closedOutAt && event.closeoutSnapshot) {
                const s = event.closeoutSnapshot;
                controls.innerHTML = `
                    <div class="card" style="background:#f7f7f7;">
                        <h3>Event Closed Out</h3>
                        <p><strong>Closed:</strong> ${esc(new Date(event.closedOutAt).toLocaleString())}</p>
                        <p><strong>Final Income:</strong> ${Utils.money(s.income || 0)}</p>
                        <p><strong>Final Expenses:</strong> ${Utils.money(s.expenses || 0)}</p>
                        <p><strong>Final Profit:</strong> ${Utils.money(s.profit || 0)}</p>
                    </div>
                `;
            } else {
                controls.innerHTML = `<button type="button" onclick="UI.openEventCloseout('${event.id}')">Complete / Close Out Event</button>`;
            }
            card.appendChild(controls);
            return result;
        };
    }
})();
