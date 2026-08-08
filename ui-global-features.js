/*
 * Global UI features:
 * 1) Reliable edit-screen navigation guard that only triggers for actual unsaved changes.
 * 2) Shared Category and Description suggestions across modules.
 */
(function () {
    let bypassNavigationGuard = false;
    let pendingNavigationCode = null;
    let pendingNavigationContext = null;
    let workspaceDirty = false;

    function workspace() {
        return document.getElementById("workspace");
    }

    function textOf(element) {
        return String(element?.textContent || "").trim();
    }

    function currentSaveButton() {
        const root = workspace();
        if (!root) return null;
        return Array.from(root.querySelectorAll("button")).find(button =>
            /^Save(?:\s|$)/i.test(textOf(button))
        ) || null;
    }

    function isSaveButton(button) {
        return /^Save(?:\s|$)/i.test(textOf(button));
    }

    function isCancelButton(button) {
        return /^(?:←\s*)?Cancel(?:\s|$)/i.test(textOf(button));
    }

    function isInlineEditorButton(button) {
        const text = textOf(button);
        return /^(?:\+\s*)?Add Product \/ Service$/i.test(text) ||
               /^Remove Product \/ Service$/i.test(text);
    }

    function markDirty() {
        if (currentSaveButton()) workspaceDirty = true;
    }

    function markClean() {
        workspaceDirty = false;
    }

    function closeUnsavedModal() {
        document.getElementById("unsavedChangesModal")?.remove();
    }

    function runPendingNavigation() {
        const code = pendingNavigationCode;
        const context = pendingNavigationContext;
        pendingNavigationCode = null;
        pendingNavigationContext = null;
        closeUnsavedModal();
        markClean();

        if (!code) return;

        bypassNavigationGuard = true;
        try {
            const fn = new Function(code);
            fn.call(context || window);
        } finally {
            setTimeout(() => {
                bypassNavigationGuard = false;
            }, 0);
        }
    }

    function showUnsavedModal() {
        closeUnsavedModal();

        const overlay = document.createElement("div");
        overlay.id = "unsavedChangesModal";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.52);display:flex;align-items:center;justify-content:center;z-index:999999;padding:20px;";
        overlay.innerHTML = `
            <div class="card" style="max-width:560px;width:100%;background:#fff;">
                <h3>Save or Cancel Before Leaving</h3>
                <p>You have unsaved changes on this page.</p>
                <p>Save your changes, discard them, or stay here before moving to another section.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button type="button" id="unsavedSaveContinue">Save & Continue</button>
                    <button type="button" id="unsavedDiscardContinue">Discard Changes & Continue</button>
                    <button type="button" id="unsavedStay">Stay Here</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("unsavedSaveContinue").onclick = function () {
            const save = currentSaveButton();
            if (!save) {
                runPendingNavigation();
                return;
            }

            bypassNavigationGuard = true;
            save.click();
            markClean();

            setTimeout(() => {
                bypassNavigationGuard = false;
                runPendingNavigation();
            }, 100);
        };

        document.getElementById("unsavedDiscardContinue").onclick = function () {
            runPendingNavigation();
        };

        document.getElementById("unsavedStay").onclick = function () {
            pendingNavigationCode = null;
            pendingNavigationContext = null;
            closeUnsavedModal();
        };
    }

    document.addEventListener("input", function (event) {
        if (event.target?.closest?.("#workspace")) markDirty();
    }, true);

    document.addEventListener("change", function (event) {
        if (event.target?.closest?.("#workspace")) markDirty();
    }, true);

    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("button");
        if (!button) return;

        if (!button.closest("#unsavedChangesModal") && (isSaveButton(button) || isCancelButton(button))) {
            markClean();
            return;
        }

        if (bypassNavigationGuard) return;
        if (button.closest("#unsavedChangesModal")) return;

        const save = currentSaveButton();
        if (!save || !workspaceDirty) return;

        if (button === save || isInlineEditorButton(button)) return;

        const inlineCode = button.getAttribute("onclick");
        if (!inlineCode) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        pendingNavigationCode = inlineCode;
        pendingNavigationContext = button;
        showUnsavedModal();
    }, true);

    window.addEventListener("beforeunload", function (event) {
        if (!workspaceDirty || !currentSaveButton()) return;
        event.preventDefault();
        event.returnValue = "";
    });

    function collectFieldValues(fieldName) {
        const values = [];
        const seenObjects = new Set();

        function visit(value) {
            if (!value || typeof value !== "object") return;
            if (seenObjects.has(value)) return;
            seenObjects.add(value);

            if (Array.isArray(value)) {
                value.forEach(visit);
                return;
            }

            Object.entries(value).forEach(([key, child]) => {
                if (key.toLowerCase() === fieldName.toLowerCase()) {
                    const text = String(child ?? "").trim();
                    if (text) values.push(text);
                }
                if (child && typeof child === "object") visit(child);
            });
        }

        const modules = [
            typeof Vendors !== "undefined" ? Vendors : null,
            typeof Venues !== "undefined" ? Venues : null,
            typeof Inventory !== "undefined" ? Inventory : null,
            typeof Finance !== "undefined" ? Finance : null,
            typeof Assets !== "undefined" ? Assets : null,
            typeof Calendar !== "undefined" ? Calendar : null,
            typeof Events !== "undefined" ? Events : null,
            typeof CRM !== "undefined" ? CRM : null
        ];

        modules.forEach(module => {
            if (module?.all) visit(module.all());
        });

        return [...new Set(values)].sort((a, b) => a.localeCompare(b));
    }

    function sharedCategories() {
        return collectFieldValues("category");
    }

    function sharedDescriptions() {
        return collectFieldValues("description");
    }

    function ensureDatalist(id, values) {
        const root = workspace();
        if (!root) return null;

        let datalist = document.getElementById(id);
        if (!datalist) {
            datalist = document.createElement("datalist");
            datalist.id = id;
            root.appendChild(datalist);
        }

        const desiredOptions = values
            .map(value => `<option value="${UI.esc(value)}"></option>`)
            .join("");

        if (datalist.innerHTML !== desiredOptions) datalist.innerHTML = desiredOptions;
        return datalist;
    }

    function installSharedSuggestions() {
        const root = workspace();
        if (!root) return;

        ensureDatalist("snpSharedCategories", sharedCategories());
        ensureDatalist("snpSharedDescriptions", sharedDescriptions());

        Array.from(root.querySelectorAll("label")).forEach(label => {
            const labelText = textOf(label).toLowerCase();
            if (labelText !== "category" && labelText !== "description") return;

            let input = label.nextElementSibling;
            while (input && input.tagName === "DATALIST") input = input.nextElementSibling;

            if (input?.tagName !== "INPUT") return;

            const listId = labelText === "category" ? "snpSharedCategories" : "snpSharedDescriptions";
            input.setAttribute("list", listId);

            if (!input.getAttribute("placeholder")) {
                input.setAttribute(
                    "placeholder",
                    labelText === "category" ? "Choose or type a category" : "Choose or type a description"
                );
            }
        });
    }

    function wrapRender(name) {
        const original = UI[name];
        if (typeof original !== "function" || original.__snpSharedOptionsWrapped) return;

        const wrapped = function (...args) {
            markClean();
            const result = original.apply(UI, args);
            setTimeout(installSharedSuggestions, 0);
            return result;
        };
        wrapped.__snpSharedOptionsWrapped = true;
        UI[name] = wrapped;
    }

    document.addEventListener("DOMContentLoaded", function () {
        [
            "renderVendors","renderVendorEdit",
            "renderVenues","renderVenueEdit",
            "renderInventory","renderInventoryEdit",
            "renderFinance","renderFinanceEdit",
            "renderAssets","renderAssetEdit",
            "renderCalendar","renderCalendarEdit",
            "renderEvents","renderEventEdit",
            "renderCRM","renderCRMEdit","renderCustomerEdit"
        ].forEach(wrapRender);

        setTimeout(installSharedSuggestions, 0);
    });

    window.SNPSharedOptions = {
        categories: sharedCategories,
        descriptions: sharedDescriptions,
        refreshCategories: installSharedSuggestions,
        refreshDescriptions: installSharedSuggestions,
        refresh: installSharedSuggestions,
        markClean,
        markDirty
    };
})();
