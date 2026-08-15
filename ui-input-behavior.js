/* Site-wide data-entry behavior for SNP Planner. */
(function () {
    function inPlanner(el) {
        return !!el?.closest?.("#app");
    }

    function isTextField(el) {
        return el instanceof HTMLTextAreaElement || (
            el instanceof HTMLInputElement &&
            ["text", "search", "url", "email", "tel"].includes(el.type)
        );
    }

    document.addEventListener("focusin", function (event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
        if (!inPlanner(input)) return;

        // Numeric fields frequently render 0 as a default. Clear that display
        // when the user enters the field so typing replaces the default value.
        if (input instanceof HTMLInputElement && input.type === "number" && String(input.value).trim() === "0") {
            input.dataset.snpWasDefaultZero = "1";
            input.value = "";
            return;
        }

        // Placeholder/help copy must never behave like saved data. If an older
        // record contains the same text as the placeholder, clear it on focus.
        if (
            isTextField(input) &&
            input.placeholder &&
            String(input.value || "").trim() === String(input.placeholder || "").trim()
        ) {
            input.dataset.snpWasPlaceholderValue = "1";
            input.value = "";
        }
    }, true);

    document.addEventListener("focusout", function (event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
        if (!inPlanner(input)) return;

        // Leave numeric fields visually blank after the user clears them.
        // Save handlers already coerce blank numeric values to zero as needed.
        delete input.dataset.snpWasDefaultZero;
        delete input.dataset.snpWasPlaceholderValue;
    }, true);
})();
