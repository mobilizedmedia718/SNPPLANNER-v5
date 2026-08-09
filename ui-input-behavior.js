/* Improves data-entry fields: default zero values clear when the user starts entering data. */
(function () {
    document.addEventListener("focusin", function (event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (!input.closest("#workspace")) return;

        if (input.type === "number" && String(input.value).trim() === "0") {
            input.dataset.snpWasDefaultZero = "1";
            input.value = "";
            return;
        }

        // If a field contains placeholder-style text that exactly matches its
        // placeholder, clear it so the user can type without deleting it first.
        if (
            (input.type === "text" || input.type === "search" || input.type === "url" || input.type === "email") &&
            input.placeholder &&
            input.value &&
            input.value.trim() === input.placeholder.trim()
        ) {
            input.dataset.snpWasPlaceholderValue = "1";
            input.value = "";
        }
    }, true);

    document.addEventListener("focusout", function (event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (!input.closest("#workspace")) return;

        // Keep blank numeric fields visually blank. Existing save handlers
        // already convert blank numeric values to 0 where appropriate.
        delete input.dataset.snpWasDefaultZero;
        delete input.dataset.snpWasPlaceholderValue;
    }, true);
})();
