/*
 * Global unsaved-changes guard.
 * Prevents navigation away from editable forms until the user saves,
 * discards/cancels, or chooses to stay on the page.
 */

(function () {
    let dirty = false;
    let bypass = false;
    let pendingAction = null;

    function workspace() {
        return document.getElementById("workspace");
    }

    function currentSaveButton() {
        const root = workspace();
        if (!root) return null;
        return [...root.querySelectorAll("button")]
            .find(button => /^\s*Save\b/i.test((button.textContent || "").trim()));
    }

    function isSaveButton(button) {
        return !!button && /^\s*Save\b/i.test((button.textContent || "").trim());
    }

    function isInlineEditUtility(button) {
        if (!button) return false;
        const text = (button.textContent || "").trim();
        return /^(\+\s*)?Add Product \/ Service$/i.test(text) ||
               /^Remove Product \/ Service$/i.test(text);
    }

    function markDirtyFromField(event) {
        const root = workspace();
        if (!root || !root.contains(event.target)) return;
        if (!currentSaveButton()) return;
        dirty = true;
    }

    function closeModal() {
        document.getElementById("unsavedChangesModal")?.remove();
    }

    function replayPendingAction() {
        const action = pendingAction;
        pendingAction = null;
        closeModal();
        if (!action) return;

        bypass = true;
        try {
            action();
        } finally {
            setTimeout(() => { bypass = false; }, 0);
        }
    }

    function showModal() {
        closeModal();

        const overlay = document.createElement("div");
        overlay.id = "unsavedChangesModal";
        overlay.style.cssText = [
            "position:fixed",
            "inset:0",
            "background:rgba(0,0,0,.45)",
            "display:flex",
            "align-items:center",
            "justify-content:center",
            "z-index:99999",
            "padding:20px"
        ].join(";");

        overlay.innerHTML = `
            <div class="card" style="max-width:520px;width:100%;background:#fff;">
                <h3>Unsaved Changes</h3>
                <p>You changed information on this page and have not saved it yet.</p>
                <p>Please save your changes, cancel/discard them, or stay on this page.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button id="unsavedSaveContinue">Save & Continue</button>
                    <button id="unsavedDiscardContinue">Cancel Changes & Continue</button>
                    <button id="unsavedStay">Stay Here</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById("unsavedSaveContinue").onclick = function () {
            const saveButton = currentSaveButton();
            if (!saveButton) {
                replayPendingAction();
                return;
            }

            dirty = false;
            bypass = true;
            saveButton.click();

            setTimeout(() => {
                bypass = false;
                replayPendingAction();
            }, 0);
        };

        document.getElementById("unsavedDiscardContinue").onclick = function () {
            dirty = false;
            replayPendingAction();
        };

        document.getElementById("unsavedStay").onclick = function () {
            pendingAction = null;
            closeModal();
        };
    }

    document.addEventListener("input", markDirtyFromField, true);
    document.addEventListener("change", markDirtyFromField, true);

    document.addEventListener("click", function (event) {
        if (bypass || !dirty) return;

        const button = event.target.closest("button");
        if (!button) return;

        if (button.closest("#unsavedChangesModal")) return;

        if (isSaveButton(button)) {
            dirty = false;
            return;
        }

        if (isInlineEditUtility(button)) {
            return;
        }

        const inlineCode = button.getAttribute("onclick");
        if (!inlineCode) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        pendingAction = function () {
            const fn = new Function(inlineCode);
            fn.call(button);
        };

        showModal();
    }, true);

    window.addEventListener("beforeunload", function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    });

    // Expose a tiny API so future UI code can deliberately clear or set the state.
    UI.unsavedChanges = {
        mark() { dirty = true; },
        clear() { dirty = false; },
        isDirty() { return dirty; }
    };
})();
