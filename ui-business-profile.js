/* Business profile view/edit behavior */

(function () {
    if (typeof UI === "undefined" || typeof Business === "undefined" || typeof Utils === "undefined") return;

    UI._businessEditing = false;
    UI._pendingBusinessLogo = null;

    UI.renderBusiness = function () {
        const b = Business.data || {};
        const hasSavedData = Boolean(
            b.name || b.owner || b.ownerTitle || b.phone || b.alternatePhone ||
            b.email || b.website || b.instagram || b.facebook || b.address ||
            b.address2 || b.city || b.state || b.zip || b.country || b.taxId ||
            b.notes || b.logo || Number(b.taxRate || 0)
        );

        if (!hasSavedData || this._businessEditing) {
            this.renderBusinessEditor();
            return;
        }

        const address = Business.fullAddress ? Business.fullAddress() : [
            b.address, b.address2, b.city, b.state, b.zip, b.country
        ].filter(Boolean).join(", ");

        document.getElementById("workspace").innerHTML = `
            <h2>Business Profile</h2>
            <div class="card">
                ${b.logo ? `<div style="margin-bottom:18px;"><img src="${this.esc(b.logo)}" alt="Business logo" style="max-width:220px;max-height:140px;object-fit:contain;"></div>` : ""}
                <h3>${this.esc(b.name || "Business Profile")}</h3>
                ${b.owner ? `<p><strong>Owner:</strong> ${this.esc(b.owner)}${b.ownerTitle ? ` — ${this.esc(b.ownerTitle)}` : ""}</p>` : ""}
                ${b.phone ? `<p><strong>Phone:</strong> ${this.esc(b.phone)}</p>` : ""}
                ${b.alternatePhone ? `<p><strong>Alternate Phone:</strong> ${this.esc(b.alternatePhone)}</p>` : ""}
                ${b.email ? `<p><strong>Email:</strong> ${this.esc(b.email)}</p>` : ""}
                ${b.website ? `<p><strong>Website:</strong> ${this.esc(b.website)}</p>` : ""}
                ${address ? `<p><strong>Address:</strong> ${this.esc(address)}</p>` : ""}
                ${b.taxId ? `<p><strong>Tax ID:</strong> ${this.esc(b.taxId)}</p>` : ""}
                ${Number(b.taxRate || 0) ? `<p><strong>Tax Rate:</strong> ${Number(b.taxRate || 0)}%</p>` : ""}
                ${b.instagram ? `<p><strong>Instagram:</strong> ${this.esc(b.instagram)}</p>` : ""}
                ${b.facebook ? `<p><strong>Facebook:</strong> ${this.esc(b.facebook)}</p>` : ""}
                ${b.notes ? `<p><strong>Notes:</strong> ${this.esc(b.notes)}</p>` : ""}
                <br>
                <button type="button" onclick="UI._businessEditing=true;UI.renderBusiness();">Edit Business Profile</button>
            </div>
        `;
    };

    UI.renderBusinessEditor = function () {
        const b = Business.data || {};
        this._pendingBusinessLogo = null;

        document.getElementById("workspace").innerHTML = `
            <h2>Business Profile</h2>
            <div class="card">
                <label>Business Name</label><input id="businessName" value="${this.esc(b.name || "")}">
                <label>Owner</label><input id="businessOwner" value="${this.esc(b.owner || "")}">
                <label>Owner Title</label><input id="businessOwnerTitle" value="${this.esc(b.ownerTitle || "")}">

                <label>Business Logo</label>
                <input id="businessLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onchange="UI.previewBusinessLogo(this.files[0])">
                <p style="font-size:.9em;opacity:.8;">Choose a PNG, JPG, WebP, or GIF. The logo will be saved with your business profile and synced with your account.</p>
                <div id="businessLogoPreview" style="margin:10px 0 18px;">
                    ${b.logo ? `<img src="${this.esc(b.logo)}" alt="Business logo preview" style="max-width:220px;max-height:140px;object-fit:contain;display:block;margin-bottom:8px;">` : ""}
                    ${b.logo ? `<button type="button" onclick="UI.removeBusinessLogo();">Remove Logo</button>` : ""}
                </div>

                <label>Logo URL (optional alternative)</label><input id="businessLogo" value="${b.logo && !String(b.logo).startsWith("data:") ? this.esc(b.logo) : ""}" placeholder="https://...">
                <label>Phone</label><input id="businessPhone" value="${this.esc(b.phone || "")}">
                <label>Alternate Phone</label><input id="businessAlternatePhone" value="${this.esc(b.alternatePhone || "")}">
                <label>Email</label><input id="businessEmail" type="email" value="${this.esc(b.email || "")}">
                <label>Website</label><input id="businessWebsite" value="${this.esc(b.website || "")}">
                <label>Instagram</label><input id="businessInstagram" value="${this.esc(b.instagram || "")}">
                <label>Facebook</label><input id="businessFacebook" value="${this.esc(b.facebook || "")}">
                <label>Address</label><input id="businessAddress" value="${this.esc(b.address || "")}">
                <label>Address Line 2</label><input id="businessAddress2" value="${this.esc(b.address2 || "")}">
                <label>City</label><input id="businessCity" value="${this.esc(b.city || "")}">
                <label>State</label><input id="businessState" value="${this.esc(b.state || "")}">
                <label>ZIP Code</label><input id="businessZip" value="${this.esc(b.zip || "")}">
                <label>Country</label><input id="businessCountry" value="${this.esc(b.country || "")}">
                <label>Tax Rate (%)</label><input id="businessTax" type="number" step="0.01" value="${Number(b.taxRate || 0)}">
                <label>Tax ID</label><input id="businessTaxId" value="${this.esc(b.taxId || "")}">
                <label>Notes</label><textarea id="businessNotes">${this.esc(b.notes || "")}</textarea>
                <br><br>
                <button type="button" onclick="UI.saveBusinessProfile();">Save Business Profile</button>
                ${Object.values(b).some(value => String(value ?? "").trim() && value !== 0) ? `<button type="button" onclick="UI._businessEditing=false;UI.renderBusiness();">Cancel</button>` : ""}
            </div>
        `;
    };

    UI.previewBusinessLogo = function (file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Please choose an image file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert("Please use a logo image smaller than 2 MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            UI._pendingBusinessLogo = String(reader.result || "");
            const preview = document.getElementById("businessLogoPreview");
            if (preview) {
                preview.innerHTML = `
                    <img src="${UI.esc(UI._pendingBusinessLogo)}" alt="Business logo preview" style="max-width:220px;max-height:140px;object-fit:contain;display:block;margin-bottom:8px;">
                    <button type="button" onclick="UI.removeBusinessLogo();">Remove Logo</button>
                `;
            }
            const url = document.getElementById("businessLogo");
            if (url) url.value = "";
        };
        reader.readAsDataURL(file);
    };

    UI.removeBusinessLogo = function () {
        UI._pendingBusinessLogo = "";
        const preview = document.getElementById("businessLogoPreview");
        if (preview) preview.innerHTML = "<p>No logo selected.</p>";
        const file = document.getElementById("businessLogoFile");
        if (file) file.value = "";
        const url = document.getElementById("businessLogo");
        if (url) url.value = "";
    };

    UI.saveBusinessProfile = function () {
        const urlLogo = document.getElementById("businessLogo").value.trim();
        const logo = this._pendingBusinessLogo !== null
            ? this._pendingBusinessLogo
            : (urlLogo || Business.data.logo || "");

        Business.data = {
            ...Business.data,
            name: document.getElementById("businessName").value,
            owner: document.getElementById("businessOwner").value,
            ownerTitle: document.getElementById("businessOwnerTitle").value,
            logo,
            phone: document.getElementById("businessPhone").value,
            alternatePhone: document.getElementById("businessAlternatePhone").value,
            email: document.getElementById("businessEmail").value,
            website: document.getElementById("businessWebsite").value,
            instagram: document.getElementById("businessInstagram").value,
            facebook: document.getElementById("businessFacebook").value,
            address: document.getElementById("businessAddress").value,
            address2: document.getElementById("businessAddress2").value,
            city: document.getElementById("businessCity").value,
            state: document.getElementById("businessState").value,
            zip: document.getElementById("businessZip").value,
            country: document.getElementById("businessCountry").value,
            taxRate: Number(document.getElementById("businessTax").value || 0),
            taxId: document.getElementById("businessTaxId").value,
            notes: document.getElementById("businessNotes").value
        };

        Utils.save("business", Business.data);
        this._pendingBusinessLogo = null;
        this._businessEditing = false;
        this.renderBusiness();
    };
})();
