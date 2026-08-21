/* Events landing page: New Event + existing-event selector only. */
(function () {
  if (typeof UI === "undefined" || typeof Events === "undefined") return;

  UI.renderEvents = function () {
    const events = Events.all();
    const ws = document.getElementById("workspace");
    if (!ws) return;

    const options = events
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .map((event) => {
        const name = UI.esc(event.name || "Unnamed Event");
        const date = event.date ? ` — ${UI.esc(event.date)}` : "";
        const status = event.status ? ` — ${UI.esc(event.status)}` : "";
        return `<option value="${UI.esc(event.id)}">${name}${date}${status}</option>`;
      })
      .join("");

    ws.innerHTML = `
      <section style="max-width:760px;margin:0 auto;padding:10px 4px 40px">
        <h2>Events</h2>

        <button id="snpNewEventButton" type="button" style="width:100%;padding:14px;font-size:16px;font-weight:700;margin-bottom:18px;">
          + New Event
        </button>

        <div class="card">
          <label for="snpEventSelector"><strong>Select Existing Event</strong></label>
          <select id="snpEventSelector" style="width:100%;margin-top:8px;">
            <option value="">Choose an event...</option>
            ${options}
          </select>
          ${events.length ? "" : '<p style="margin-bottom:0;">No events have been created yet.</p>'}
        </div>
      </section>`;

    const create = document.getElementById("snpNewEventButton");
    if (create) {
      create.addEventListener("click", () => {
        const event = Events.create();
        UI.renderEventEdit(event.id);
      });
    }

    const selector = document.getElementById("snpEventSelector");
    if (selector) {
      selector.addEventListener("change", () => {
        const id = selector.value;
        if (!id) return;
        UI.renderEventDetail(id);
      });
    }
  };
})();
