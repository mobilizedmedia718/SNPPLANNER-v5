/* Make Save Event reliably leave edit mode and show the saved event detail card. */
(function () {
    if (typeof UI === "undefined" || typeof Events === "undefined") return;

    let activeEventId = null;
    const originalRenderEventEdit = UI.renderEventEdit;

    if (typeof originalRenderEventEdit === "function") {
        UI.renderEventEdit = function (id) {
            activeEventId = id;
            const result = originalRenderEventEdit.call(UI, id);
            const workspace = document.getElementById("workspace");
            if (workspace) {
                const saveButton = Array.from(workspace.querySelectorAll("button"))
                    .find(button => /^Save Event$/i.test(String(button.textContent || "").trim()));
                if (saveButton) saveButton.dataset.snpEventSave = id;
            }
            return result;
        };
    }

    function value(id) {
        return document.getElementById(id)?.value ?? "";
    }

    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("button[data-snp-event-save]");
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const id = button.dataset.snpEventSave || activeEventId;
        const record = Events.get(id);
        if (!record) return UI.renderEvents();

        Events.update(id, {
            name: value("eventName"),
            date: value("eventDate"),
            time: value("eventTime"),
            endTime: value("eventEndTime"),
            venueId: value("eventVenueId"),
            theme: value("eventTheme"),
            instructor: value("eventInstructor"),
            capacity: Number(value("eventCapacity") || 0),
            ticketsSold: Number(value("eventTicketsSold") || 0),
            ticketPrice: Number(value("eventTicketPrice") || 0),
            revenueGoal: Number(value("eventRevenueGoal") || 0),
            actualRevenue: Number(value("eventActualRevenue") || 0),
            status: value("eventStatus") || "Draft",
            notes: value("eventNotes")
        });

        if (window.SNPSharedOptions?.markClean) window.SNPSharedOptions.markClean();
        activeEventId = null;
        UI.renderEventDetail(id);
    }, true);
})();
