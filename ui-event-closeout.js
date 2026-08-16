/* Event closeout checklist, reconciliation, unresolved-payment handling, and final report. */
(function () {
  if (
    typeof UI === "undefined" ||
    typeof Events === "undefined" ||
    typeof Finance === "undefined"
  )
    return;

  const PAID_STATUSES = new Set(["Completed", "Paid", "Resolved"]);
  const UNRESOLVED_STATUSES = new Set([
    "Pending",
    "Unpaid",
    "Deferred",
    "On Hold",
  ]);
  const EXCLUDED_STATUSES = new Set(["Cancelled", "Refunded", "Transferred"]);

  function esc(value) {
    return UI.esc(value);
  }
  function money(value) {
    return Utils.money(Number(value || 0));
  }

  function eventRows(eventId) {
    return Finance.byEvent(eventId).filter(
      (t) => !EXCLUDED_STATUSES.has(String(t.status || "")),
    );
  }

  function totals(eventId) {
    const rows = eventRows(eventId);
    const collectedIncome = rows
      .filter(
        (t) =>
          t.type === "Income" &&
          PAID_STATUSES.has(String(t.status || "Completed")),
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const pendingIncome = rows
      .filter(
        (t) =>
          t.type === "Income" &&
          UNRESOLVED_STATUSES.has(String(t.status || "")),
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const expenses = rows
      .filter(
        (t) =>
          t.type === "Expense" &&
          !UNRESOLVED_STATUSES.has(String(t.status || "")),
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const pendingExpenses = rows
      .filter(
        (t) =>
          t.type === "Expense" &&
          UNRESOLVED_STATUSES.has(String(t.status || "")),
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const taxes = rows
      .filter((t) => PAID_STATUSES.has(String(t.status || "Completed")))
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0);
    const refunds = Finance.byEvent(eventId)
      .filter((t) => String(t.status || "") === "Refunded")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return {
      collectedIncome,
      pendingIncome,
      expenses,
      pendingExpenses,
      taxes,
      refunds,
      profit: collectedIncome - expenses,
      projectedProfit:
        collectedIncome + pendingIncome - (expenses + pendingExpenses),
    };
  }

  function linkedVendors(eventId) {
    const ids = [
      ...new Set(
        Finance.byEvent(eventId)
          .map((t) => t.vendorId)
          .filter(Boolean),
      ),
    ];
    return ids.map((id) => Vendors.get(id)).filter(Boolean);
  }
  function linkedAssets(eventId) {
    return typeof Assets !== "undefined"
      ? Assets.all().filter((a) => a.assignedEventId === eventId)
      : [];
  }
  function linkedCalendar(eventId) {
    return typeof Calendar !== "undefined" ? Calendar.byEvent(eventId) : [];
  }

  function guestStats(event) {
    const guests = Array.isArray(event.guestList) ? event.guestList : [];
    const confirmed = guests.filter(
      (g) => String(g.status || "Confirmed") !== "Cancelled",
    ).length;
    const checkedIn = guests.filter(
      (g) =>
        g.checkedIn || String(g.status || "").toLowerCase() === "checked in",
    ).length;
    const tickets = guests.reduce(
      (s, g) => s + Number(g.ticketQuantity || 0),
      0,
    );
    return { confirmed, checkedIn, tickets };
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
            </div>`;
  }

  function unresolvedHtml(eventId) {
    const unresolved = Finance.byEvent(eventId).filter((t) =>
      UNRESOLVED_STATUSES.has(String(t.status || "")),
    );
    if (!unresolved.length)
      return `<p style="color:#166534;"><strong>No unresolved event payments.</strong></p>`;
    return `
            <div style="border:2px solid #f59e0b;border-radius:10px;padding:12px;margin:10px 0;">
                <h3 style="margin-top:0;">Unresolved Payments</h3>
                <p>These amounts are recorded but <strong>not included in collected revenue</strong> until resolved.</p>
                ${unresolved
                  .map(
                    (tr) => `
                    <div style="padding:10px 0;border-bottom:1px solid #ddd;">
                        <strong>${esc(tr.description || "Transaction")}</strong> — ${money(tr.amount)}<br>
                        <small>Status: ${esc(tr.status || "Pending")}</small><br><br>
                        <button type="button" onclick="UI.resolveEventPayment('${esc(eventId)}','${esc(tr.id)}','Completed')">Mark Paid</button>
                        <button type="button" onclick="UI.resolveEventPayment('${esc(eventId)}','${esc(tr.id)}','Refunded')">Refund</button>
                        <button type="button" onclick="UI.transferEventPayment('${esc(eventId)}','${esc(tr.id)}')">Transfer to Another Event</button>
                        <button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderFinanceEdit('${esc(tr.id)}')">Edit</button>
                    </div>
                `,
                  )
                  .join("")}
            </div>`;
  }

  UI.resolveEventPayment = function (eventId, transactionId, status) {
    const tr = Finance.get(transactionId);
    if (!tr) return;
    const updates = { status, resolvedAt: new Date().toISOString() };
    if (status === "Refunded")
      updates.notes = `${tr.notes || ""}${tr.notes ? "\n" : ""}Resolved as refund during event closeout.`;
    Finance.update(transactionId, updates);
    UI.openEventCloseout(eventId);
  };

  UI.transferEventPayment = function (eventId, transactionId) {
    const targets = Events.all().filter(
      (e) =>
        e.id !== eventId &&
        e.status !== "Completed" &&
        e.status !== "Cancelled",
    );
    if (!targets.length)
      return alert("There is no other open event to transfer this payment to.");
    const names = targets
      .map(
        (e, i) =>
          `${i + 1}. ${e.name || "Untitled Event"}${e.date ? ` — ${e.date}` : ""}`,
      )
      .join("\n");
    const choice = prompt(
      `Transfer to which event? Enter the number:\n\n${names}`,
    );
    const index = Number(choice) - 1;
    if (!Number.isInteger(index) || !targets[index]) return;
    const tr = Finance.get(transactionId);
    Finance.update(transactionId, {
      eventId: targets[index].id,
      status: "Transferred",
      transferredFromEventId: eventId,
      transferredAt: new Date().toISOString(),
      notes: `${tr?.notes || ""}${tr?.notes ? "\n" : ""}Transferred from ${Events.get(eventId)?.name || "prior event"}.`,
    });
    UI.openEventCloseout(eventId);
  };

  UI.updateCloseoutConfirmState = function () {
    const checks = Array.from(
      document.querySelectorAll("#eventCloseoutModal .closeout-check"),
    );
    const button = document.getElementById("confirmEventCloseout");
    if (button)
      button.disabled = !checks.length || !checks.every((c) => c.checked);
  };

  UI.openEventCloseout = function (eventId) {
    const event = Events.get(eventId);
    if (!event) return;
    document.getElementById("eventCloseoutModal")?.remove();

    const venue =
      event.venueId && typeof Venues !== "undefined"
        ? Venues.get(event.venueId)
        : null;
    const transactions = Finance.byEvent(eventId);
    const vendors = linkedVendors(eventId);
    const assets = linkedAssets(eventId);
    const reminders = linkedCalendar(eventId);
    const offerings = Array.isArray(event.offerings) ? event.offerings : [];
    const t = totals(eventId);
    const guests = guestStats(event);

    const overlay = document.createElement("div");
    overlay.id = "eventCloseoutModal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:999999;overflow:auto;padding:24px;";
    overlay.innerHTML = `
            <div class="card" style="max-width:980px;margin:20px auto;background:#fff;">
                <h2>Event Closeout & Reconciliation</h2>
                <p><strong>${esc(event.name || "Unnamed Event")}</strong></p>
                <p>Review every section. Unresolved money remains on record but is excluded from final collected revenue until resolved.</p>

                ${unresolvedHtml(eventId)}

                <h3>Attendance & Tickets</h3>
                <div class="dashboard-grid">
                    <div class="card"><strong>Tickets Sold</strong><h3>${Number(event.ticketsSold || 0)}</h3></div>
                    <div class="card"><strong>Confirmed Guests</strong><h3>${guests.confirmed}</h3></div>
                    <div class="card"><strong>Checked In</strong><h3>${guests.checkedIn}</h3></div>
                    <div class="card"><strong>Guest-list Ticket Qty</strong><h3>${guests.tickets}</h3></div>
                </div>
                ${itemRow("co-attendance", "Attendance and ticket counts are reviewed", `Tickets sold: ${Number(event.ticketsSold || 0)} · Checked in: ${guests.checkedIn}`)}

                <h3>Operational Time</h3>
                <div class="dashboard-grid">
                    <div class="card"><strong>Setup</strong><h3>${Number(event.setupMinutes || 0)} min</h3></div>
                    <div class="card"><strong>Event</strong><h3>${Number(event.eventRunMinutes || 0)} min</h3></div>
                    <div class="card"><strong>Breakdown</strong><h3>${Number(event.breakdownMinutes || 0)} min</h3></div>
                    <div class="card"><strong>Total</strong><h3>${Number(event.totalOperationalMinutes || 0)} min</h3></div>
                </div>
                ${itemRow("co-time", "Setup, event, and breakdown times are correct", `Total operational time: ${Number(event.totalOperationalMinutes || 0)} minutes`)}

                <h3>Event Details</h3>
                ${itemRow("co-event", "Event information is final", `${esc(event.date || "No date")} · ${Number(event.ticketsSold || 0)} tickets sold`, `<button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderEventEdit('${event.id}')">Edit</button>`)}
                ${venue ? itemRow("co-venue", `Venue: ${venue.name || "Unnamed Venue"}`, esc(Venues.fullAddress ? Venues.fullAddress(venue) : ""), `<button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderVenueEdit('${venue.id}')">Edit</button>`) : ""}

                ${offerings.length ? `<h3>Event Products / Services</h3>${offerings.map((o, i) => itemRow(`co-offering-${i}`, o.name || "Unnamed Product / Service", `Qty ${Number(o.quantity || 0)} · ${money(o.price)} each`)).join("")}` : ""}

                ${
                  transactions.length
                    ? `<h3>Financial Transactions</h3>${transactions
                        .map((tr, i) =>
                          itemRow(
                            `co-fin-${i}`,
                            tr.description || "Unnamed Transaction",
                            `${esc(tr.type)} · ${money(tr.amount)} · Status: ${esc(tr.status || "Completed")}`,
                            `<span style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderFinanceEdit('${tr.id}')">Edit</button><button type="button" onclick="if(confirm('Remove this transaction from this event?')){Finance.update('${tr.id}',{eventId:''});UI.openEventCloseout('${event.id}');}">Remove from Event</button></span>`,
                          ),
                        )
                        .join("")}`
                    : `<p>No finance transactions are linked to this event.</p>`
                }

                ${vendors.length ? `<h3>Vendors / Instructors</h3>${vendors.map((v, i) => itemRow(`co-vendor-${i}`, v.name || "Unnamed Vendor", `${esc(v.category || "Business")} · Payment: ${esc(v.paymentType || "—")}`, `<button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove();UI.renderVendorEdit('${v.id}')">Edit</button>`)).join("")}` : ""}
                ${assets.length ? `<h3>Assigned Assets</h3>${assets.map((a, i) => itemRow(`co-asset-${i}`, a.name || "Unnamed Asset", `Status: ${esc(a.status || "—")}`)).join("")}` : ""}
                ${reminders.length ? `<h3>Calendar / Tasks</h3>${reminders.map((r, i) => itemRow(`co-cal-${i}`, r.title || "Unnamed Task", `${esc(r.date || "No date")} · ${r.completed ? "Completed" : "Not completed"}`)).join("")}` : ""}

                <h3>Final Financial Numbers</h3>
                <div class="dashboard-grid">
                    <div class="card"><strong>Collected Income</strong><h3>${money(t.collectedIncome)}</h3></div>
                    <div class="card"><strong>Pending Income</strong><h3>${money(t.pendingIncome)}</h3></div>
                    <div class="card"><strong>Paid Expenses</strong><h3>${money(t.expenses)}</h3></div>
                    <div class="card"><strong>Pending Expenses</strong><h3>${money(t.pendingExpenses)}</h3></div>
                    <div class="card"><strong>Refunds</strong><h3>${money(t.refunds)}</h3></div>
                    <div class="card"><strong>Taxes</strong><h3>${money(t.taxes)}</h3></div>
                    <div class="card"><strong>Final Profit</strong><h3>${money(t.profit)}</h3></div>
                    <div class="card"><strong>Projected Profit if Pending Resolves</strong><h3>${money(t.projectedProfit)}</h3></div>
                </div>
                ${itemRow("co-final", "I reviewed the final collected totals", `Collected income ${money(t.collectedIncome)} · Final profit ${money(t.profit)}. Pending amounts are excluded.`)}

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button type="button" id="confirmEventCloseout" disabled onclick="UI.confirmEventCloseout('${event.id}')">Confirm & Close Event</button>
                    <button type="button" onclick="document.getElementById('eventCloseoutModal')?.remove()">Exit Without Completing</button>
                </div>
            </div>`;
    document.body.appendChild(overlay);
    UI.updateCloseoutConfirmState();
  };

  UI.confirmEventCloseout = function (eventId) {
    const event = Events.get(eventId);
    if (!event) return;
    const checks = Array.from(
      document.querySelectorAll("#eventCloseoutModal .closeout-check"),
    );
    if (!checks.length || !checks.every((c) => c.checked))
      return alert("Check every item before completing this event.");

    const t = totals(eventId);
    const unresolved = Finance.byEvent(eventId).filter((tr) =>
      UNRESOLVED_STATUSES.has(String(tr.status || "")),
    );
    const closedAt = new Date().toISOString();
    const guests = guestStats(event);

    Events.update(eventId, {
      status: "Completed",
      closedOutAt: closedAt,
      actualRevenue: t.collectedIncome,
      closeoutSnapshot: {
        closedAt,
        ticketsSold: Number(event.ticketsSold || 0),
        confirmedGuests: guests.confirmed,
        checkedInGuests: guests.checkedIn,
        collectedIncome: t.collectedIncome,
        pendingIncome: t.pendingIncome,
        expenses: t.expenses,
        pendingExpenses: t.pendingExpenses,
        refunds: t.refunds,
        taxes: t.taxes,
        profit: t.profit,
        projectedProfit: t.projectedProfit,
        setupMinutes: Number(event.setupMinutes || 0),
        eventRunMinutes: Number(event.eventRunMinutes || 0),
        breakdownMinutes: Number(event.breakdownMinutes || 0),
        totalOperationalMinutes: Number(event.totalOperationalMinutes || 0),
        unresolvedTransactionIds: unresolved.map((x) => x.id),
        financeTransactionIds: Finance.byEvent(eventId).map((x) => x.id),
        vendorIds: linkedVendors(eventId).map((x) => x.id),
        assetIds: linkedAssets(eventId).map((x) => x.id),
        calendarIds: linkedCalendar(eventId).map((x) => x.id),
      },
    });

    linkedCalendar(eventId).forEach((r) =>
      Calendar.update(r.id, { completed: true }),
    );
    document.getElementById("eventCloseoutModal")?.remove();
    UI.renderEventDetail(eventId);
  };

  const originalRenderEventDetail = UI.renderEventDetail;
  if (typeof originalRenderEventDetail === "function") {
    UI.renderEventDetail = function (id) {
      const result = originalRenderEventDetail.call(UI, id);
      const event = Events.get(id);
      const workspace = document.getElementById("workspace");
      if (!event || !workspace) return result;

      const controls = document.createElement("div");
      controls.style.marginTop = "14px";
      if (event.closedOutAt && event.closeoutSnapshot) {
        const s = event.closeoutSnapshot;
        controls.innerHTML = `
                    <div class="card" style="background:#f7f7f7;">
                        <h3>Event Closeout Report</h3>
                        <p><strong>Closed:</strong> ${esc(Utils.formatDateTime(event.closedOutAt))}</p>
                        <p><strong>Collected Income:</strong> ${money(s.collectedIncome || 0)}</p>
                        <p><strong>Pending Income:</strong> ${money(s.pendingIncome || 0)}</p>
                        <p><strong>Expenses:</strong> ${money(s.expenses || 0)}</p>
                        <p><strong>Final Profit:</strong> ${money(s.profit || 0)}</p>
                        <p><strong>Attendance:</strong> ${Number(s.checkedInGuests || 0)} checked in / ${Number(s.confirmedGuests || 0)} confirmed</p>
                        <p><strong>Operational Time:</strong> ${Number(s.totalOperationalMinutes || 0)} minutes</p>
                        ${Array.isArray(s.unresolvedTransactionIds) && s.unresolvedTransactionIds.length ? `<p><strong>Unresolved at closeout:</strong> ${s.unresolvedTransactionIds.length}</p>` : ""}
                        <button type="button" onclick="UI.openEventCloseout('${event.id}')">Review / Reconcile Closeout</button>
                    </div>`;
      } else {
        controls.innerHTML = `<button type="button" onclick="UI.openEventCloseout('${event.id}')">Complete / Close Out Event</button>`;
      }
      workspace.appendChild(controls);
      return result;
    };
  }
})();
