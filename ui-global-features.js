/*
 * Global UI features:
 * 1) Reliable edit-screen navigation guard.
 * 2) Shared Category suggestions across modules.
 */
(function () {
    let bypassNavigationGuard = false;
    let pendingNavigationCode = null;
    let pendingNavigationContext = null;

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

    function closeUnsavedModal() {
        document.getElementById("unsavedChangesModal")?.remove();
    }

    function runPendingNavigation() {
        const code = pendingNavigationCode;
        const context = pendingNavigationContext;
        pendingNavigationCode = null;
        pendingNavigationContext = null;
        closeUnsavedModal();

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
                <p>You are currently editing this record.</p>
                <p>Save your changes, cancel them, or stay on this page before moving to another section.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button type="button" id="unsavedSaveContinue">Save & Continue</button>
                    <button type="button" id="unsavedDiscardContinue">Cancel Changes & Continue</button>
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

            setTimeout(() => {
                bypassNavigationGuard = false;
                runPendingNavigation();
            }, 75);
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

    document.addEventListener("click", function (event) {
        if (bypassNavigationGuard) return;

        const button = event.target?.closest?.("button");
        if (!button) return;
        if (button.closest("#unsavedChangesModal")) return;

        const save = currentSaveButton();
        if (!save) return;

        if (button === save || isSaveButton(button) || isCancelButton(button) || isInlineEditorButton(button)) {
            return;
        }

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
        if (!currentSaveButton()) return;
        event.preventDefault();
        event.returnValue = "";
    });

    function sharedCategories() {
        const values = [];

        function add(records) {
            (records || []).forEach(record => {
                const value = String(record?.category || "").trim();
                if (value) values.push(value);
            });
        }

        if (typeof Vendors !== "undefined" && Vendors.all) add(Vendors.all());
        if (typeof Inventory !== "undefined" && Inventory.all) add(Inventory.all());
        if (typeof Finance !== "undefined" && Finance.all) add(Finance.all());
        if (typeof Assets !== "undefined" && Assets.all) add(Assets.all());
        if (typeof Calendar !== "undefined" && Calendar.all) add(Calendar.all());

        return [...new Set(values)].sort((a, b) => a.localeCompare(b));
    }

    function installSharedCategorySuggestions() {
        const root = workspace();
        if (!root) return;

        let datalist = document.getElementById("snpSharedCategories");
        if (!datalist) {
            datalist = document.createElement("datalist");
            datalist.id = "snpSharedCategories";
            root.appendChild(datalist);
        }

        const desiredOptions = sharedCategories()
            .map(category => `<option value="${UI.esc(category)}"></option>`)
            .join("");

        if (datalist.innerHTML !== desiredOptions) {
            datalist.innerHTML = desiredOptions;
        }

        Array.from(root.querySelectorAll("label")).forEach(label => {
            if (textOf(label).toLowerCase() !== "category") return;

            let input = label.nextElementSibling;
            while (input && input.tagName === "DATALIST") {
                input = input.nextElementSibling;
            }

            if (input?.tagName === "INPUT") {
                if (input.getAttribute("list") !== "snpSharedCategories") {
                    input.setAttribute("list", "snpSharedCategories");
                }
                if (!input.getAttribute("placeholder")) {
                    input.setAttribute("placeholder", "Choose or type a category");
                }
            }
        });
    }

    function wrapRender(name) {
        const original = UI[name];
        if (typeof original !== "function" || original.__snpCategoryWrapped) return;

        const wrapped = function (...args) {
            const result = original.apply(UI, args);
            setTimeout(installSharedCategorySuggestions, 0);
            return result;
        };
        wrapped.__snpCategoryWrapped = true;
        UI[name] = wrapped;
    }

    document.addEventListener("DOMContentLoaded", function () {
        [
            "renderVendors","renderVendorEdit",
            "renderInventory","renderInventoryEdit",
            "renderFinance","renderFinanceEdit",
            "renderAssets","renderAssetEdit",
            "renderCalendar","renderCalendarEdit"
        ].forEach(wrapRender);

        setTimeout(installSharedCategorySuggestions, 0);
    });

    window.SNPSharedOptions = {
        categories: sharedCategories,
        refreshCategories: installSharedCategorySuggestions
    };
})();
