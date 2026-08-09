/* Display SNP Planner generated QR passes for Stripe ticket purchases. */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined" || typeof CRM === "undefined") return;

    async function loadQRCodeLibrary() {
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
    }

    window.SNPTicketQR = {
        async show(eventId, ticketId) {
            const event = Events.get(eventId);
            const pass = (Array.isArray(event?.ticketPasses) ? event.ticketPasses : []).find(p => String(p.id) === String(ticketId));
            if (!event || !pass) return alert("Ticket pass not found.");
            const loaded = await loadQRCodeLibrary();
            if (!loaded) return alert("QR generator could not load.");
            document.getElementById("snpTicketQrModal")?.remove();
            const customer = pass.customerId ? CRM.get(pass.customerId) : null;
            const overlay = document.createElement("div");
            overlay.id = "snpTicketQrModal";
            overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;padding:24px;overflow:auto;";
            overlay.innerHTML = `<div class="card" style="max-width:520px;margin:30px auto;background:#fff;text-align:center;">
                <h2>${UI.esc(event.name || "Event")} Ticket</h2>
                <p><strong>${UI.esc(customer ? (CRM.fullName(customer) || customer.email || "Guest") : "Guest")}</strong></p>
                <div id="snpTicketQrCanvas" style="display:flex;justify-content:center;margin:20px;"></div>
                <p><strong>Status:</strong> ${UI.esc(pass.checkedIn ? "Checked In" : "Confirmed")}</p>
                <p><small>Ticket ${Number(pass.ticketNumber || 1)} • Source: Stripe / SNP Planner</small></p>
                <button type="button" onclick="document.getElementById('snpTicketQrModal')?.remove()">Close</button>
            </div>`;
            document.body.appendChild(overlay);
            new QRCode(document.getElementById("snpTicketQrCanvas"), { text:pass.qrPayload || `SNP-TICKET:${eventId}:${pass.id}`, width:280, height:280, correctLevel:QRCode.CorrectLevel.M });
        }
    };

    const priorDetail = UI.renderEventDetail;
    UI.renderEventDetail = function (id) {
        const result = priorDetail.call(UI, id);
        const event = Events.get(id);
        const workspace = document.getElementById("workspace");
        const passes = Array.isArray(event?.ticketPasses) ? event.ticketPasses : [];
        if (!event || !workspace || !passes.length) return result;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>SNP Planner Ticket QR Passes</h3>
            <p>Stripe ticket purchases receive SNP Planner QR passes. Eventbrite tickets keep their Eventbrite QR codes; the same Check In scanner accepts both.</p>
            ${passes.map(pass => {
                const c = pass.customerId ? CRM.get(pass.customerId) : null;
                const name = c ? (CRM.fullName(c) || c.email || "Guest") : "Guest";
                return `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eee;">
                    <span><strong>${UI.esc(name)}</strong><br><small>Ticket ${Number(pass.ticketNumber || 1)} • ${pass.checkedIn ? "Checked In" : "Confirmed"}</small></span>
                    <button type="button" onclick="SNPTicketQR.show('${UI.esc(id)}','${UI.esc(pass.id)}')">View QR</button>
                </div>`;
            }).join("")}`;
        workspace.appendChild(card);
        return result;
    };
})();
