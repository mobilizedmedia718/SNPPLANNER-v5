/* Event check-in for Eventbrite + SNP Planner Stripe tickets */
const CheckInUI = {
    eventId: "",
    stream: null,
    scanTimer: null,
    html5Scanner: null,
    practicePayload: "",

    async open(eventId = "") {
        await this.stopScanner();
        this.eventId = eventId || window.LiveEvent?.activeId || "";
        if (!this.eventId) {
            const events = Events.all().filter(e => e.status !== "Cancelled" && e.status !== "Completed");
            const workspace = document.getElementById("workspace");
            if (!workspace) return;
            workspace.innerHTML = `<h2>Check-In</h2><div class="card"><h3>Choose Event</h3>${events.map(e => `<button type="button" style="margin:6px;" onclick="CheckInUI.open('${UI.esc(e.id)}')">${UI.esc(e.name || "Event")}</button>`).join("") || "<p>No active events.</p>"}</div>`;
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
                <p>One scanner accepts Eventbrite tickets and SNP Planner QR tickets created from Stripe purchases.</p>
                <div id="checkinScanner" style="display:none;width:100%;max-width:640px;margin:10px 0;"></div>
                <video id="checkinVideo" playsinline muted style="display:none;width:100%;max-height:360px;background:#111;border-radius:8px;"></video>
                <button type="button" onclick="CheckInUI.startScanner()">Start Camera Scanner</button>
                <button type="button" onclick="CheckInUI.stopScanner()">Stop Camera</button>
                <button type="button" onclick="CheckInUI.showPracticeQR()">Practice QR Test</button>
                <br><br>
                <label>Ticket Barcode / QR Value</label>
                <input id="manualTicketBarcode" autocomplete="off" placeholder="Scan or type ticket code">
                <button type="button" onclick="CheckInUI.submitManualBarcode()">Check In Ticket</button>
                <br><br>
                <button type="button" onclick="CheckInUI.refreshFromEventbrite()">Refresh Eventbrite Check-Ins</button>
                <p><small>Loaded Eventbrite attendees: ${Number(link.attendees?.length || 0)} • Checked in patrons: ${patrons.length}</small></p>
            </div>
            <div class="card">
                <h3>Checked-In Patrons</h3>
                ${patrons.length ? patrons.map(c => `<button type="button" style="display:block;width:100%;margin:7px 0;padding:12px;text-align:left;" onclick="SalesUI.selectedEventId='${UI.esc(this.eventId)}';SalesUI.selectPatron('${UI.esc(c.id)}')"><strong>${UI.esc(CRM.fullName(c) || c.email || "Patron")}</strong>${c.email ? `<br><small>${UI.esc(c.email)}</small>` : ""}</button>`).join("") : `<p>No patrons checked in yet.</p>`}
                <button type="button" onclick="SalesUI.selectedEventId='${UI.esc(this.eventId)}';SalesUI.renderPatronPicker()">Go to Sales</button>
                ${window.LiveEvent?.activeId ? `<button type="button" onclick="LiveEvent.enter('${UI.esc(this.eventId)}')">Back to Live Event</button>` : `<button type="button" onclick="UI.renderEventDetail('${UI.esc(this.eventId)}')">Back to Event</button>`}
            </div>`;
    },

    async refreshFromEventbrite() { try { await Eventbrite.syncCheckedIn(this.eventId); await this.render("Eventbrite check-ins refreshed."); } catch (error) { alert(error?.message || "Unable to refresh Eventbrite check-ins."); } },
    async submitManualBarcode() { const value = document.getElementById("manualTicketBarcode")?.value.trim() || ""; if (value) await this.processBarcode(value); },

    duplicateAlert(label = "This ticket") {
        alert(`DUPLICATE TICKET ALERT: ${label} has already been checked in. This scan was rejected.`);
    },

    async processSnpTicket(value) {
        const parts = value.split(":");
        const scannedEventId = parts[1] || "";
        const ticketId = parts[2] || "";
        if (!scannedEventId || !ticketId) throw new Error("Invalid SNP Planner ticket QR code.");
        if (String(scannedEventId) !== String(this.eventId)) throw new Error("This ticket belongs to a different event.");

        const event = Events.get(this.eventId);
        const passes = Array.isArray(event?.ticketPasses) ? event.ticketPasses : [];
        const pass = passes.find(p => String(p.id) === String(ticketId));
        if (!pass) throw new Error("This SNP Planner ticket was not found for this event.");
        if (pass.checkedIn) {
            await this.stopScanner();
            this.duplicateAlert("This SNP Planner ticket");
            await this.render("Duplicate ticket rejected — no attendance record was changed.");
            return;
        }

        const now = new Date().toISOString();
        pass.checkedIn = true;
        pass.checkedInAt = now;
        pass.status = "Checked In";
        const checkIns = Array.isArray(event.checkIns) ? event.checkIns : [];
        checkIns.push({ ticketId:pass.id, customerId:pass.customerId || "", checkedInAt:now, source:"SNP Planner Stripe Ticket" });

        const guestList = Array.isArray(event.guestList) ? event.guestList : [];
        const guest = guestList.find(g => String(g.id || "") === String(pass.guestId || ""));
        if (guest) {
            const guestPasses = passes.filter(p => String(p.guestId || "") === String(guest.id));
            const checkedCount = guestPasses.filter(p => p.checkedIn).length;
            guest.checkedInCount = checkedCount;
            guest.checkedIn = checkedCount >= guestPasses.length && guestPasses.length > 0;
            guest.status = guest.checkedIn ? "Checked In" : "Partially Checked In";
        }
        Events.update(this.eventId, { ticketPasses:passes, guestList, checkIns });

        const customer = pass.customerId ? CRM.get(pass.customerId) : null;
        if (customer) CRM.update(customer.id, { totalVisits:Number(customer.totalVisits || 0) + 1, lastVisit:now });
        await this.stopScanner();
        await this.render(`${customer ? (CRM.fullName(customer) || customer.email || "Patron") : "Patron"} checked in with SNP Planner ticket.`);
    },

    async processEventbriteTicket(value) {
        if (!Eventbrite.link(this.eventId).attendees.length) await Eventbrite.loadAttendees(this.eventId);
        const attendees = Eventbrite.link(this.eventId).attendees || [];
        const candidate = attendees.find(a => String(a.barcode || "") === value || (a.barcode && value.includes(String(a.barcode))));
        if (!candidate) throw new Error("This ticket was not found on the Eventbrite attendee list for this event.");

        const event = Events.get(this.eventId);
        const checkIns = Array.isArray(event?.checkIns) ? event.checkIns : [];
        const already = checkIns.some(x => String(x.attendeeId || "") === String(candidate.id) || (candidate.barcode && String(x.barcode || "") === String(candidate.barcode)));
        const linkedCheckedIn = (Eventbrite.link(this.eventId).checkedIn || []).some(a => String(a.id || "") === String(candidate.id));
        if (already || linkedCheckedIn) {
            await this.stopScanner();
            this.duplicateAlert("This Eventbrite ticket");
            await this.render("Duplicate ticket rejected — no attendance record was changed.");
            return;
        }

        const result = await Eventbrite.registerScannedPatron(this.eventId, candidate.barcode || value);
        const updatedEvent = Events.get(this.eventId);
        const updatedCheckIns = Array.isArray(updatedEvent?.checkIns) ? updatedEvent.checkIns : [];
        updatedCheckIns.push({ attendeeId:result.attendee.id, customerId:result.customer.id, barcode:result.attendee.barcode, checkedInAt:new Date().toISOString(), source:"SNP Planner Scanner" });
        Events.update(this.eventId, { checkIns:updatedCheckIns });
        const customer = CRM.get(result.customer.id);
        if (customer) CRM.update(customer.id, { totalVisits:Number(customer.totalVisits || 0) + 1, lastVisit:new Date().toISOString() });
        await this.stopScanner();
        await this.render(`${CRM.fullName(result.customer) || result.customer.email || "Patron"} checked in with Eventbrite ticket.`);
    },

    async processBarcode(rawValue) {
        try {
            const value = String(rawValue || "").trim();
            if (!value) return;
            if (value.startsWith("SNP-PRACTICE:")) {
                await this.stopScanner();
                await this.render("Practice QR SUCCESS — scanner works. No attendance, CRM, sales, or revenue data was changed.");
                return;
            }
            if (value.startsWith("SNP-TICKET:")) return await this.processSnpTicket(value);
            return await this.processEventbriteTicket(value);
        } catch (error) {
            await this.stopScanner();
            alert(error?.message || "Ticket could not be checked in.");
        }
    },

    async loadQRCodeLibrary() {
        if (window.QRCode) return true;
        return new Promise(resolve => {
            let script = document.getElementById("snp-qrcode-generator");
            if (script) {
                const wait = setInterval(() => { if (window.QRCode) { clearInterval(wait); resolve(true); } }, 100);
                setTimeout(() => { clearInterval(wait); resolve(!!window.QRCode); }, 8000);
                return;
            }
            script = document.createElement("script");
            script.id = "snp-qrcode-generator";
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
            script.onload = () => resolve(!!window.QRCode);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    },

    async showPracticeQR() {
        const loaded = await this.loadQRCodeLibrary();
        if (!loaded) return alert("Practice QR generator could not load.");
        document.getElementById("practiceQrModal")?.remove();
        this.practicePayload = `SNP-PRACTICE:${this.eventId}:${Date.now()}`;
        const overlay = document.createElement("div");
        overlay.id = "practiceQrModal";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;padding:24px;overflow:auto;";
        overlay.innerHTML = `<div class="card" style="max-width:520px;margin:30px auto;background:#fff;text-align:center;"><h2>Practice QR</h2><p>This code is practice-only and never changes real event data.</p><div id="practiceQrCanvas" style="display:flex;justify-content:center;margin:20px;"></div><p><small>Show this QR on another screen/device, then use Start Camera Scanner to scan it.</small></p><button type="button" onclick="document.getElementById('practiceQrModal')?.remove()">Close</button></div>`;
        document.body.appendChild(overlay);
        new QRCode(document.getElementById("practiceQrCanvas"), { text:this.practicePayload, width:260, height:260, correctLevel:QRCode.CorrectLevel.M });
    },

    async loadScannerLibrary() {
        if (window.Html5Qrcode) return true;
        if (document.getElementById("snp-html5-qrcode")) {
            return new Promise(resolve => {
                const wait = setInterval(() => { if (window.Html5Qrcode) { clearInterval(wait); resolve(true); } }, 100);
                setTimeout(() => { clearInterval(wait); resolve(!!window.Html5Qrcode); }, 8000);
            });
        }
        return new Promise(resolve => {
            const script = document.createElement("script");
            script.id = "snp-html5-qrcode";
            script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
            script.onload = () => resolve(!!window.Html5Qrcode);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    },

    async startScanner() {
        if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) return alert("Camera access is not available in this browser. Use manual ticket entry.");
        await this.stopScanner();
        if ("BarcodeDetector" in window) {
            try {
                const video = document.getElementById("checkinVideo");
                this.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:"environment" } }, audio:false });
                video.srcObject = this.stream; video.style.display = "block"; await video.play();
                const detector = new BarcodeDetector({ formats:["qr_code","code_128","code_39","ean_13","ean_8","upc_a","upc_e"] });
                const scan = async () => {
                    if (!this.stream || !video.isConnected) return;
                    try { const codes = await detector.detect(video); if (codes?.length) { await this.processBarcode(codes[0].rawValue); return; } } catch (_) {}
                    this.scanTimer = setTimeout(scan, 250);
                };
                scan(); return;
            } catch (_) { await this.stopScanner(); }
        }
        const loaded = await this.loadScannerLibrary();
        if (!loaded) return alert("The camera scanner could not load. You can still enter the ticket code manually.");
        try {
            const region = document.getElementById("checkinScanner");
            if (!region) return;
            region.style.display = "block";
            this.html5Scanner = new Html5Qrcode("checkinScanner");
            await this.html5Scanner.start({ facingMode:"environment" }, { fps:10, qrbox:{ width:260, height:260 } }, async decodedText => { if (!this.html5Scanner) return; await this.processBarcode(decodedText); }, () => {});
        } catch (error) {
            await this.stopScanner();
            alert("Unable to open the camera. Allow camera permission and try again, or enter the ticket code manually.");
        }
    },

    async stopScanner() {
        if (this.scanTimer) clearTimeout(this.scanTimer);
        this.scanTimer = null;
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
        if (this.html5Scanner) {
            const scanner = this.html5Scanner; this.html5Scanner = null;
            try { await scanner.stop(); } catch (_) {}
            try { await scanner.clear(); } catch (_) {}
        }
        const video = document.getElementById("checkinVideo");
        if (video) { video.pause?.(); video.srcObject = null; video.style.display = "none"; }
        const region = document.getElementById("checkinScanner");
        if (region) { region.style.display = "none"; region.innerHTML = ""; }
    }
};
window.CheckInUI = CheckInUI;
