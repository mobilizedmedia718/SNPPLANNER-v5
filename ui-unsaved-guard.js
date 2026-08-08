/*
 * Global unsaved-changes guard.
 * Protects editable screens from accidental navigation before Save.
 */
(function () {
    let dirty = false;
    let bypass = false;
    let pendingCode = null;
    let pendingThis = null;

    function workspace() {
        return document.getElementById("workspace");
    }

    function buttonsInWorkspace() {
        const root = workspace();
        return root ? Array.from(root.querySelectorAll("button")) : [];
    }

    function saveButton() {
        return buttonsInWorkspace().find(button => {
            const text = String(button.textContent || "").trim();
            return /^Save(?:\s|$)/i.test(text);
        }) || null;
    }

    function isSaveButton(button) {
        if (!button) return false;
        return /^Save(?:\s|$)/i.test(String(button.textContent || "").trim());
    }

    function isEditUtility(button) {
        if (!button) return false;
        const text = String(button.textContent || "").trim();
        return /^(\+\s*)?Add Product \/ Service$/i.test(text) ||
               /^Remove Product \/ Service$/i.test(text);
    }

    function markDirty(event) {
        const root = workspace();
        if (!root || !event.target || !root.contains(event.target)) return;

        // Only treat changes as unsaved when this screen has an explicit Save action.
        if (!saveButton()) return;
        dirty = true;
    }

    function removeModal() {
        const modal = document.getElementById("unsavedChangesModal");
        if (modal) modal.remove();
    }

    function runPending() {
        const code = pendingCode;
        const context = pendingThis;
        pendingCode = null;
        pendingThis = null;
        removeModal();

        if (!code) return;

        bypass = true;
        try {
            const fn = new Function(code);
            fn.call(context || window);
        } finally {
            setTimeout(function () { bypass = false; }, 0);
        }
    }

    function showPrompt() {
        removeModal();

        const overlay = document.createElement("div");
        overlay.id = "unsavedChangesModal";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:999999;padding:20px;";
        overlay.innerHTML = `
            <div class="card" style="max-width:540px;width:100%;background:white;">
                <h3>Unsaved Changes</h3>
                <p>You changed information on this page but have not saved it.</p>
                <p>Save or cancel your changes before leaving this screen.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button type="button" id="unsavedSaveContinue">Save & Continue</button>
                    <button type="button" id="unsavedDiscardContinue">Cancel Changes & Continue</button>
                    <button type="button" id="unsavedStay">Stay Here</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("unsavedSaveContinue").addEventListener("click", function () {
            const button = saveButton();
            if (!button) {
                dirty = false;
                runPending();
                return;
            }

            dirty = false;
            bypass = true;
            button.click();

            setTimeout(function () {
                bypass = false;
                runPending();
            }, 25);
        });

        document.getElementById("unsavedDiscardContinue").addEventListener("click", function () {
            dirty = false;
            runPending();
        });

        document.getElementById("unsavedStay").addEventListener("click", function () {
            pendingCode = null;
            pendingThis = null;
            removeModal();
        });
    }

    // input covers typing immediately; change covers selects, checkboxes, dates, etc.
    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);

    // Capture BEFORE inline onclick handlers run.
    document.addEventListener("click", function (event) {
        if (bypass) return;

        const target = event.target;
        if (!target || typeof target.closest !== "function") return;

        const button = target.closest("button");
        if (!button) return;
        if (button.closest("#unsavedChangesModal")) return;

        if (isSaveButton(button)) {
            dirty = false;
            return;
        }

        if (isEditUtility(button)) return;
        if (!dirty) return;

        const code = button.getAttribute("onclick");
        if (!code) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        pendingCode = code;
        pendingThis = button;
        showPrompt();
    }, true);

    // Protect browser refresh/close/back navigation too.
    window.addEventListener("beforeunload", function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    });

    // Clear stale dirty state whenever a saved/detail/list screen is rendered.
    const root = workspace();
    if (root && window.MutationObserver) {
        const observer = new MutationObserver(function () {
            if (!saveButton()) dirty = false;
        });
        observer.observe(root, { childList: true, subtree: true });
    }

    UI.unsavedChanges = {
        mark: function () { dirty = true; },
        clear: function () { dirty = false; },
        isDirty: function () { return dirty; }
    };
})();
