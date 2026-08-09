/* Event check-in and Eventbrite ticket scanning */
const CheckInUI = {
    eventId: "",
    stream: null,
    scanTimer: null,

    async open(eventId = "") {
        this.stopScanner();
        this.eventId = eventId || window.LiveEvent?.activeId || "";
        if (!this.eventId) {
            const events = Events.all().filter(e => e.status !== "Cancelled" && e.status !== "Completed");
            const workspace = document.getElementById("workspace");
            if (!workspace) return;
            workspace.innerHTML = `
                <h2>Check-In</h2>
                <div class="card"><h3>Choose Event</h3>
                ${events.map(e => `<button type="button" style="margin:6px;" onclick="CheckInUI.open('${UI.esc(e.id)}')">${UI.esc(e.name || "Event")}</button>`).join("") || "<p>No active events.</p>"}
                </div>`;
            return;
        }
        await this.render();
    },

    patrons() {
        const event = Events.get(this.eventId);
        return (Array.isArray(event?.patronIds) ? event.patronIds : []).map(id => CRM.get(id)).filter(Boolean);
    },

    async render(message = "") {
        const event = Events.get(this.eventId);
        const patrons = this.patrons();
        const link = Eventbrite.link(this.eventId);
        const workspace = document.getElementById("workspace");
        if (!workspace) return;

        workspace.innerHTML = `
            <h2>Check-In — ${UI.esc(event?.name || "Event")}</h2>
            ${message ? `<div class="card"><strong>${UI.esc(message)}</strong></div>` : ""}
            <div class="card">
                <h3>Ticket Scanner</h3>
                <p>Scan an Eventbrite ticket QR/barcode with this device camera, or enter the barcode manually.</p>
                <video id="checkinVideo" playsinline muted style="display:none;width:100%;max-height:360px;background:#111;border-radius:8px;"></video>
                <button type="button" onclick="CheckInUI.startScanner()">Start Camera Scanner</button>
                <button type="button" onclick="CheckInUI.stopScanner()">Stop Camera</button>
                <br><br>
                <label>Ticket Barcode</label>
                <input id="manualTicketBarcode" autocomplete="off" placeholder="Scan or type barcode">
                <button type="button" onclick="CheckInUI.submitManualBarcode()">Check In Ticket</button>
                <br><br>
                <button type="button" onclick="CheckInUI.refreshFromEventbrite()">Refresh Eventbrite Check-Ins</button>
                <p><small>Loaded Eventbrite attendees: ${Number(link.attendees?.length || 0)} • Checked in: ${patrons.length}</small></p>
            </div>

            <div class="card">
                <h3>Checked-In Patrons</h3>
                ${patrons.length ? patrons.map(c => `
                    <button type="button" style="display:block;width:100%;margin:7px 0;padding:12px;text-align:left;" onclick="SalesUI.selectedEventId='${UI.esc(this.eventId)}';SalesUI.selectPatron('${UI.esc(c.id)}')">
                        <strong>${UI.esc(CRM.fullName(c) || c.email || "Patron")}</strong>${c.email ? `<br><small>${UI.esc(c.email)}</small>` : ""}
                    </button>
                `).join("") : `<p>No patrons checked in yet.</p>`}
                <button type="button" onclick="SalesUI.selectedEventId='${UI.esc(this.eventId)}';SalesUI.renderPatronPicker()">Go to Sales</button>
                ${window.LiveEvent?.activeId ? `<button type="button" onclick="LiveEvent.enter('${UI.esc(this.eventId)}')">Back to Live Event</button>` : `<button type="button" onclick="UI.renderEventDetail('${UI.esc(this.eventId)}')">Back to Event</button>`}
            </div>
        `;
    },

    async refreshFromEventbrite() {
        try {
            await Eventbrite.syncCheckedIn(this.eventId);
            await this.render("Eventbrite check-ins refreshed.");
        } catch (error) {
            alert(error?.message || "Unable to refresh Eventbrite check-ins.");
        }
    },

    async submitManualBarcode() {
        const value = document.getElementById("manualTicketBarcode")?.value.trim() || "";
        if (!value) return;
        await this.processBarcode(value);
    },

    async processBarcode(rawValue) {
        try {
            const value = String(rawValue || "").trim();
            let result;
            try {
                result = await Eventbrite.registerScannedPatron(this.eventId, value);
            } catch (firstError) {
                // Some QR readers return a larger encoded string. Try matching any known barcode contained inside it.
                if (!Eventbrite.link(this.eventId).attendees.length) await Eventbrite.loadAttendees(this.eventId);
                const candidate = Eventbrite.link(this.eventId).attendees.find(a => a.barcode && value.includes(String(a.barcode)));
                if (!candidate) throw firstError;
                result = await Eventbrite.registerScannedPatron(this.eventId, candidate.barcode);
            }

            const event = Events.get(this.eventId);
            const checkIns = Array.isArray(event?.checkIns) ? event.checkIns : [];
            if (!checkIns.some(x => x.attendeeId === result.attendee.id)) {
                checkIns.push({
                    attendeeId: result.attendee.id,
                    customerId: result.customer.id,
                    barcode: result.attendee.barcode,
                    checkedInAt: new Date().toISOString(),
                    source: "SNP Planner Scanner"
                });
                Events.update(this.eventId, { checkIns });
                const customer = CRM.get(result.customer.id);
                if (customer) {
                    CRM.update(customer.id, {
                        totalVisits: Number(customer.totalVisits || 0) + 1,
                        lastVisit: new Date().toISOString()
                    });
                }
            }

            this.stopScanner();
            await this.render(`${CRM.fullName(result.customer) || result.customer.email || "Patron"} checked in.`);
        } catch (error) {
            alert(error?.message || "Ticket could not be checked in.");
        }
    },

    async startScanner() {
        if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
            return alert("Camera scanning is not supported in this browser. Use the manual barcode field.");
        }
        if (!("BarcodeDetector" in window)) {
            return alert("This browser does not support built-in QR/barcode detection. Use the manual barcode field or Eventbrite Organizer scanning, then refresh check-ins.");
        }

        try {
            this.stopScanner();
            const video = document.getElementById("checkinVideo");
            if (!video) return;
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            video.srcObject = this.stream;
            video.style.display = "block";
            await video.play();
            const detector = new BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] });

            const scan = async () => {
                if (!this.stream || !video.isConnected) return;
                try {
                    const codes = await detector.detect(video);
                    if (codes?.length) {
                        await this.processBarcode(codes[0].rawValue);
                        return;
                    }
                } catch (_) {}
                this.scanTimer = setTimeout(scan, 250);
            };
            scan();
        } catch (error) {
            this.stopScanner();
            alert("Unable to open the camera. Check camera permission and try again.");
        }
    },

    stopScanner() {
        if (this.scanTimer) clearTimeout(this.scanTimer);
        this.scanTimer = null;
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
        const video = document.getElementById("checkinVideo");
        if (video) {
            video.pause?.();
            video.srcObject = null;
            video.style.display = "none";
        }
    }
};

window.CheckInUI = CheckInUI;
