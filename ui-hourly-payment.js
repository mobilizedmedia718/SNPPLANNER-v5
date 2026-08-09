/* Adds Hourly as a vendor/business payment type without creating a separate instructor module. */
(function () {
    if (typeof UI === "undefined" || typeof Vendors === "undefined") return;

    const originalRenderVendorEdit = UI.renderVendorEdit;
    if (typeof originalRenderVendorEdit === "function") {
        UI.renderVendorEdit = function (id) {
            const result = originalRenderVendorEdit.call(UI, id);
            const v = Vendors.get(id);
            const select = document.getElementById("vendorPaymentType");
            if (select && !Array.from(select.options).some(o => o.value === "Hourly")) {
                const option = document.createElement("option");
                option.value = "Hourly";
                option.textContent = "Hourly";
                if (v && v.paymentType === "Hourly") option.selected = true;
                select.appendChild(option);
            }
            if (v && v.paymentType === "Hourly") UI.renderVendorEditPaymentFields(id, "Hourly");
            return result;
        };
    }

    const originalPaymentFields = UI.renderVendorEditPaymentFields;
    UI.renderVendorEditPaymentFields = function (id, type) {
        const v = Vendors.get(id);
        if (!v) return;
        const box = document.getElementById("vendorPaymentFields");
        if (!box) return;
        if (type === "Hourly") {
            box.innerHTML = `
                <label>Hourly Rate</label><input id="vendorHourlyRate" type="number" min="0" step="0.01" value="${Number(v.hourlyRate || 0)}">
                <label>Hours</label><input id="vendorHours" type="number" min="0" step="0.25" value="${Number(v.hours || 0)}">
                <p><strong>Estimated Payout:</strong> ${Utils.money(Number(v.hourlyRate || 0) * Number(v.hours || 0))}</p>
            `;
            return;
        }
        return originalPaymentFields.call(UI, id, type);
    };

    const originalSaveVendorEdit = UI.saveVendorEdit;
    UI.saveVendorEdit = function (id) {
        const select = document.getElementById("vendorPaymentType");
        const type = select ? select.value : "Flat Rate";
        if (type === "Hourly") {
            const v = Vendors.get(id);
            if (!v) return;
            const fields = {
                name:document.getElementById("vendorName").value,
                category:document.getElementById("vendorCategory").value,
                contact:document.getElementById("vendorContact").value,
                jobTitle:document.getElementById("vendorJobTitle").value,
                phone:document.getElementById("vendorPhone").value,
                alternatePhone:document.getElementById("vendorAlternatePhone").value,
                email:document.getElementById("vendorEmail").value,
                website:document.getElementById("vendorWebsite").value,
                instagram:document.getElementById("vendorInstagram").value,
                facebook:document.getElementById("vendorFacebook").value,
                address:document.getElementById("vendorAddress").value,
                address2:document.getElementById("vendorAddress2").value,
                city:document.getElementById("vendorCity").value,
                state:document.getElementById("vendorState").value,
                zip:document.getElementById("vendorZip").value,
                country:document.getElementById("vendorCountry").value,
                paymentType:"Hourly",
                hourlyRate:Number(document.getElementById("vendorHourlyRate")?.value || 0),
                hours:Number(document.getElementById("vendorHours")?.value || 0),
                payoutStatus:document.getElementById("vendorPayoutStatus").value,
                taxId:document.getElementById("vendorTaxId").value,
                notes:document.getElementById("vendorNotes").value,
                active:document.getElementById("vendorActive").checked
            };
            Vendors.update(id, fields);
            UI.renderVendorDetail(id);
            return;
        }
        return originalSaveVendorEdit.call(UI, id);
    };

    const originalRenderVendorDetail = UI.renderVendorDetail;
    if (typeof originalRenderVendorDetail === "function") {
        UI.renderVendorDetail = function (id) {
            const result = originalRenderVendorDetail.call(UI, id);
            const v = Vendors.get(id);
            if (!v || v.paymentType !== "Hourly") return result;
            const card = document.querySelector("#workspace .card");
            if (!card) return result;
            const paymentParagraphs = Array.from(card.querySelectorAll("p"));
            const flat = paymentParagraphs.find(p => p.textContent.includes("Flat Rate:"));
            if (flat) {
                flat.innerHTML = `<strong>Hourly Rate:</strong> ${Utils.money(v.hourlyRate || 0)}<br><strong>Hours:</strong> ${Number(v.hours || 0)}<br><strong>Estimated Payout:</strong> ${Utils.money(Vendors.calculatePayout(id))}`;
            }
            return result;
        };
    }
})();
