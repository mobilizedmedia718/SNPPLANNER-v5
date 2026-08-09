/* Live Event Mode: setup -> event -> breakdown timing, with focused event controls in the top bar. */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined") return;

    const ACTIVE_KEY = "snpplanner_active_event_mode";

    function nowIso() { return new Date().toISOString(); }
    function minutesBetween(start, end) {
        if (!start || !end) return 0;
        const ms = new Date(end).getTime() - new Date(start).getTime();
        return Math.max(0, Math.round(ms / 60000));
    }
    function formatDuration(minutes) {
        const m = Math.max(0, Number(minutes || 0));
        const h = Math.floor(m / 60);
        const rem = m % 60;
        return h ? `${h}h ${rem}m` : `${rem}m`;
    }
    function formatTimestamp(value) {
        if (!value) return "—";
        try { return new Date(value).toLocaleString(); } catch (_) { return value; }
    }

    const LiveEvent = {
        activeId: localStorage.getItem(ACTIVE_KEY) || "",
        get activeEvent() { return this.activeId ? Events.get(this.activeId) : null; },

        startSetup(eventId) {
            const event = Events.get(eventId);
            if (!event) return;
            const stamp = nowIso();
            Events.update(eventId, {
                setupStartedAt: event.setupStartedAt || stamp,
                lifecycleStage: "setup",
                operationalStartedAt: event.operationalStartedAt || stamp
            });
            this.activeId = eventId;
            localStorage.setItem(ACTIVE_KEY, eventId);
            this.enter(eventId);
        },

        markEventStarted(eventId) {
            const event = Events.get(eventId);
            if (!event) return;
            const stamp = nowIso();
            const setupStart = event.setupStartedAt || stamp;
            Events.update(eventId, {
                setupStartedAt: setupStart,
                eventStartedAt: event.eventStartedAt || stamp,
                setupMinutes: minutesBetween(setupStart, event.eventStartedAt || stamp),
                lifecycleStage: "event",
                status: event.status === "Draft" ? "Scheduled" : event.status
            });
            this.enter(eventId);
        },

        endEvent(eventId) {
            const event = Events.get(eventId);
            if (!event) return;
            if (!event.eventStartedAt) return alert("Mark the event as started first.");
            const stamp = nowIso();
            Events.update(eventId, {
                eventEndedAt: event.eventEndedAt || stamp,
                eventRunMinutes: minutesBetween(event.eventStartedAt, event.eventEndedAt || stamp),
                breakdownStartedAt: event.breakdownStartedAt || stamp,
                lifecycleStage: "breakdown"
            });
            this.enter(eventId);
        },

        finishBreakdown(eventId) {
            const event = Events.get(eventId);
            if (!event) return;
            if (!event.breakdownStartedAt) return alert("End the event first to start breakdown timing.");
            const stamp = nowIso();
            const breakdownEnd = event.breakdownEndedAt || stamp;
            const setupMinutes = minutesBetween(event.setupStartedAt, event.eventStartedAt);
            const eventRunMinutes = minutesBetween(event.eventStartedAt, event.eventEndedAt);
            const breakdownMinutes = minutesBetween(event.breakdownStartedAt, breakdownEnd);
            Events.update(eventId, {
                breakdownEndedAt: breakdownEnd,
                setupMinutes,
                eventRunMinutes,
                breakdownMinutes,
                totalOperationalMinutes: setupMinutes + eventRunMinutes + breakdownMinutes,
                lifecycleStage: "finished",
                status: "Completed"
            });
            this.exit(false);
            UI.renderEventDetail(eventId);
        },

        exit(goDashboard = true) {
            this.activeId = "";
            localStorage.removeItem(ACTIVE_KEY);
            this.restoreLayout();
            if (goDashboard) UI.renderDashboard();
        },

        chooseEvent() {
            const choices = Events.all().filter(e => e.status !== "Cancelled");
            const workspace = document.getElementById("workspace");
            if (!workspace) return;
            workspace.innerHTML = `
                <div class="card">
                    <h2>Select Event</h2>
                    ${choices.length ? choices.map(e => `
                        <button type="button" style="display:block;width:100%;margin:8px 0;padding:14px;text-align:left;" onclick="LiveEvent.selectEvent('${UI.esc(e.id)}')">
                            <strong>${UI.esc(e.name || "Untitled Event")}</strong>${e.date ? `<br><small>${UI.esc(e.date)}</small>` : ""}
                        </button>
                    `).join("") : `<p>No events available.</p>`}
                </div>
            `;
        },

        selectEvent(eventId) {
            const event = Events.get(eventId);
            if (!event) return;
            this.activeId = eventId;
            localStorage.setItem(ACTIVE_KEY, eventId);
            if (["setup","event","breakdown"].includes(event.lifecycleStage)) this.enter(eventId);
            else UI.renderEventDetail(eventId);
        },

        applyFocusedLayout() {
            const sidebar = document.getElementById("sidebar");
            if (sidebar) sidebar.style.display = "none";
            const layout = document.querySelector(".layout");
            if (layout) layout.style.gridTemplateColumns = "1fr";

            const eventId = this.activeId;
            const topbar = document.querySelector(".topbar");
            if (topbar) topbar.classList.add("live-event-topbar");
            const logo = document.querySelector(".logo");
            if (logo) logo.style.display = "none";

            const topbarRight = document.querySelector(".topbar-right");
            if (topbarRight) {
                topbarRight.style.width = "100%";
                topbarRight.style.display = "grid";
                topbarRight.style.gridTemplateColumns = "repeat(auto-fit,minmax(150px,1fr))";
                topbarRight.style.gap = "10px";
                topbarRight.innerHTML = `
                    <button type="button" onclick="LiveEvent.chooseEvent()">Event</button>
                    <button type="button" onclick="SalesUI.open()">Sales</button>
                    <button type="button" onclick="TicketSalesUI.open('${UI.esc(eventId)}')">Sell Ticket</button>
                    <button type="button" onclick="CheckInUI.open('${UI.esc(eventId)}')">Check In</button>
                    <button type="button" onclick="LiveEvent.enter('${UI.esc(eventId)}')">Event Controls</button>
                    <button type="button" onclick="LiveEvent.exit(true)">Dashboard</button>
                `;
            }
        },

        restoreLayout() {
            UI.renderLayout();
        },

        renderStageControls(event) {
            const stage = event.lifecycleStage || "";
            if (stage === "setup") return `<button type="button" onclick="LiveEvent.markEventStarted('${UI.esc(event.id)}')">Event Has Started</button>`;
            if (stage === "event") return `<button type="button" onclick="LiveEvent.endEvent('${UI.esc(event.id)}')">End Event / Start Breakdown</button>`;
            if (stage === "breakdown") return `<button type="button" onclick="LiveEvent.finishBreakdown('${UI.esc(event.id)}')">Finish Breakdown</button>`;
            return "";
        },

        renderTiming(event) {
            const setupLive = event.eventStartedAt ? event.setupMinutes : minutesBetween(event.setupStartedAt, nowIso());
            const eventLive = event.eventEndedAt ? event.eventRunMinutes : (event.eventStartedAt ? minutesBetween(event.eventStartedAt, nowIso()) : 0);
            const breakdownLive = event.breakdownEndedAt ? event.breakdownMinutes : (event.breakdownStartedAt ? minutesBetween(event.breakdownStartedAt, nowIso()) : 0);
            const total = Number(setupLive || 0) + Number(eventLive || 0) + Number(breakdownLive || 0);
            return `
                <div class="card">
                    <h2>${UI.esc(event.name || "Event")} — Live Event Mode</h2>
                    <p><strong>Current stage:</strong> ${UI.esc((event.lifecycleStage || "setup").toUpperCase())}</p>
                    <p><strong>Setup started:</strong> ${formatTimestamp(event.setupStartedAt)}</p>
                    <p><strong>Event started:</strong> ${formatTimestamp(event.eventStartedAt)}</p>
                    <p><strong>Event ended:</strong> ${formatTimestamp(event.eventEndedAt)}</p>
                    <p><strong>Breakdown finished:</strong> ${formatTimestamp(event.breakdownEndedAt)}</p>
                    <hr>
                    <p><strong>Setup time:</strong> ${formatDuration(setupLive)}</p>
                    <p><strong>Event time:</strong> ${formatDuration(eventLive)}</p>
                    <p><strong>Breakdown time:</strong> ${formatDuration(breakdownLive)}</p>
                    <p><strong>Total operational time:</strong> ${formatDuration(total)}</p>
                    <br>
                    ${this.renderStageControls(event)}
                </div>
            `;
        },

        enter(eventId) {
            const event = Events.get(eventId);
            if (!event) return;
            this.activeId = eventId;
            localStorage.setItem(ACTIVE_KEY, eventId);
            this.applyFocusedLayout();
            const workspace = document.getElementById("workspace");
            if (workspace) workspace.innerHTML = this.renderTiming(event);
        },

        timingSummary(event) {
            if (!event?.setupStartedAt) return "";
            return `
                <div class="card">
                    <h3>Operational Time Tracking</h3>
                    <p><strong>Setup started:</strong> ${formatTimestamp(event.setupStartedAt)}</p>
                    <p><strong>Event started:</strong> ${formatTimestamp(event.eventStartedAt)}</p>
                    <p><strong>Event ended:</strong> ${formatTimestamp(event.eventEndedAt)}</p>
                    <p><strong>Breakdown finished:</strong> ${formatTimestamp(event.breakdownEndedAt)}</p>
                    <p><strong>Setup:</strong> ${formatDuration(event.setupMinutes)}</p>
                    <p><strong>Event:</strong> ${formatDuration(event.eventRunMinutes)}</p>
                    <p><strong>Breakdown:</strong> ${formatDuration(event.breakdownMinutes)}</p>
                    <p><strong>Total operational time:</strong> ${formatDuration(event.totalOperationalMinutes)}</p>
                </div>
            `;
        }
    };

    window.LiveEvent = LiveEvent;

    const originalRenderLayout = UI.renderLayout;
    UI.renderLayout = function (...args) {
        const result = originalRenderLayout.apply(this, args);
        const topbarRight = document.querySelector(".topbar-right");
        if (topbarRight && !document.getElementById("topEventButton")) {
            const eventBtn = document.createElement("button");
            eventBtn.id = "topEventButton";
            eventBtn.type = "button";
            eventBtn.textContent = "Event";
            eventBtn.onclick = () => LiveEvent.chooseEvent();
            const firstButton = topbarRight.querySelector("button");
            if (firstButton) topbarRight.insertBefore(eventBtn, firstButton);
            else topbarRight.appendChild(eventBtn);
        }
        if (topbarRight && !document.getElementById("topSalesButton") && typeof SalesUI !== "undefined") {
            const sales = document.createElement("button");
            sales.id = "topSalesButton";
            sales.type = "button";
            sales.textContent = "Sales";
            sales.onclick = () => SalesUI.open();
            const firstButton = topbarRight.querySelector("button");
            if (firstButton) topbarRight.insertBefore(sales, firstButton);
            else topbarRight.appendChild(sales);
        }
        if (LiveEvent.activeEvent && ["setup","event","breakdown"].includes(LiveEvent.activeEvent.lifecycleStage)) {
            setTimeout(() => LiveEvent.enter(LiveEvent.activeId), 0);
        }
        return result;
    };

    const originalRenderEventDetail = UI.renderEventDetail;
    UI.renderEventDetail = function (id) {
        const result = originalRenderEventDetail.call(UI, id);
        const event = Events.get(id);
        const workspace = document.getElementById("workspace");
        if (!event || !workspace) return result;

        const card = workspace.querySelector(".card");
        if (card) {
            const controls = document.createElement("div");
            controls.className = "card";
            controls.innerHTML = event.setupStartedAt && event.lifecycleStage !== "finished"
                ? `<h3>Event Operations</h3><button type="button" onclick="LiveEvent.enter('${UI.esc(id)}')">Return to Live Event Mode</button>`
                : event.lifecycleStage === "finished"
                    ? `<h3>Event Operations</h3><p>Setup, event, and breakdown timing are complete.</p>`
                    : `<h3>Event Operations</h3><p>Start this when setup begins. SNP Planner will time setup, the event itself, and breakdown separately.</p><button type="button" onclick="LiveEvent.startSetup('${UI.esc(id)}')">Start Setup / Event Mode</button>`;
            card.insertAdjacentElement("afterend", controls);
            controls.insertAdjacentHTML("afterend", LiveEvent.timingSummary(event));
        }
        return result;
    };
})();
