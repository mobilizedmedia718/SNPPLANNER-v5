/* Eventbrite connection UI restored for V5 */
(function () {
    if (typeof UI === "undefined" || typeof Eventbrite === "undefined" || typeof Events === "undefined") return;

    const originalRenderSidebar = UI.renderSidebar;
    UI.renderSidebar = function (...args) {
        const result = originalRenderSidebar.apply(UI, args);
        const sidebar = document.getElementById("sidebar");
        if (sidebar && !document.getElementById("eventbriteNavButton")) {
            const button = document.createElement("button");
            button.id = "eventbriteNavButton";
            button.type = "button";
            button.textContent = "Eventbrite";
            button.onclick = () => UI.renderEventbrite();
            const settingsButton = Array.from(sidebar.querySelectorAll("button"))
                .find(item => item.textContent.trim() === "Settings");
            sidebar.insertBefore(button, settingsButton || null);
        }
        return result;
    };

    UI.renderEventbrite = function (selectedEventId = "") {
        const events = Events.all();
        const eventId = selectedEventId || events[0]?.id || "";
        const event = eventId ? Events.get(eventId) : null;
        const link = eventId ? Eventbrite.link(eventId) : null;
        const sales = link?.sales || [];
        const ticketClasses = link?.ticketClasses || [];
        const totalSold = sales.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const totalRevenue = sales.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

        document.getElementById("workspace").innerHTML = `
            <h2>Eventbrite Connection</h2>
            <div class="card">
                <p>Connect an SNP Planner event to its Eventbrite event. Sales synchronization updates the event's Tickets Sold and Actual Revenue while preserving manual sales already entered in SNP Planner.</p>

                <label>SNP Planner Event</label>
                <select id="eventbritePlannerEvent" onchange="UI.renderEventbrite(this.value)">
                    <option value="">Select Event</option>
                    ${events.map(item => `
                        <option value="${UI.esc(item.id)}" ${item.id === eventId ? "selected" : ""}>
                            ${UI.esc(item.name || "Unnamed Event")}${item.date ? ` — ${UI.esc(item.date)}` : ""}
                        </option>
                    `).join("")}
                </select>

                <label>Secure Connector URL</label>
                <input id="eventbriteConnectorUrl" type="url" value="${UI.esc(Eventbrite.data.connectorUrl || "")}" placeholder="https://your-secure-connector.example.com">

                <label>Eventbrite Event ID</label>
                <input id="eventbriteEventId" inputmode="numeric" value="${UI.esc(link?.eventbriteEventId || event?.eventbriteEventId || "")}" ${event ? "" : "disabled"}>

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
                    <button type="button" onclick="UI.saveEventbriteConnection()" ${event ? "" : "disabled"}>Save Connection</button>
                    <button type="button" onclick="UI.importEventbriteTicketTypes()" ${event ? "" : "disabled"}>Import Eventbrite Ticket Types</button>
                    <button type="button" onclick="UI.syncEventbriteSales()" ${event ? "" : "disabled"}>Sync Eventbrite Sales</button>
                </div>

                <div id="eventbriteStatus" class="status" style="margin-top:14px;">
                    ${link?.lastSync ? `Last synchronized: ${UI.esc(new Date(link.lastSync).toLocaleString())}` : "Not synchronized yet."}
                </div>
            </div>

            ${event ? `
                <div class="card">
                    <h3>${UI.esc(event.name || "Event")}</h3>
                    <p><strong>Total Tickets Sold in SNP Planner:</strong> ${Number(event.ticketsSold || 0)}</p>
                    <p><strong>Eventbrite Tickets Sold:</strong> ${Number(event.eventbriteTicketsSold || totalSold || 0)}</p>
                    <p><strong>Eventbrite Revenue:</strong> ${Utils.money(event.eventbriteRevenue || totalRevenue || 0)}</p>
                    <p><strong>Actual Revenue in SNP Planner:</strong> ${Utils.money(event.actualRevenue || 0)}</p>
                </div>

                <div class="card">
                    <h3>Imported Ticket Types</h3>
                    ${ticketClasses.length ? `
                        <div class="scroll"><table>
                            <tr><th>Ticket Type</th><th>Ticket Class ID</th></tr>
                            ${ticketClasses.map(item => `<tr><td>${UI.esc(item.name)}</td><td>${UI.esc(item.id)}</td></tr>`).join("")}
                        </table></div>
                    ` : "<p>No ticket types imported yet.</p>"}
                </div>

                <div class="card">
                    <h3>Synced Ticket Sales</h3>
                    ${sales.length ? `
                        <div class="scroll"><table>
                            <tr><th>Ticket Type</th><th>Ticket Class ID</th><th>Quantity Sold</th><th>Revenue</th></tr>
                            ${sales.map(row => `<tr>
                                <td>${UI.esc(row.name)}</td>
                                <td>${UI.esc(row.ticketClassId)}</td>
                                <td>${Number(row.quantity || 0)}</td>
                                <td>${Utils.money(row.revenue || 0)}</td>
                            </tr>`).join("")}
                        </table></div>
                    ` : "<p>No Eventbrite sales synchronized yet.</p>"}
                </div>
            ` : `<div class="card"><p>Create an SNP Planner event first, then return here to connect it to Eventbrite.</p></div>`}
        `;
    };

    UI.saveEventbriteConnection = function () {
        const eventId = document.getElementById("eventbritePlannerEvent")?.value || "";
        if (!eventId) return;
        Eventbrite.setConnectorUrl(document.getElementById("eventbriteConnectorUrl")?.value || "");
        Eventbrite.setEventbriteEventId(eventId, document.getElementById("eventbriteEventId")?.value || "");
        Events.update(eventId, { eventbriteEventId: Eventbrite.link(eventId).eventbriteEventId });
        const status = document.getElementById("eventbriteStatus");
        if (status) status.textContent = "Eventbrite connection saved.";
    };

    UI.importEventbriteTicketTypes = async function () {
        const eventId = document.getElementById("eventbritePlannerEvent")?.value || "";
        if (!eventId) return;
        UI.saveEventbriteConnection();
        const status = document.getElementById("eventbriteStatus");
        if (status) status.textContent = "Loading Eventbrite ticket types...";
        try {
            await Eventbrite.loadTicketClasses(eventId);
            UI.renderEventbrite(eventId);
            const nextStatus = document.getElementById("eventbriteStatus");
            if (nextStatus) nextStatus.textContent = "Ticket types imported successfully.";
        } catch (error) {
            if (status) status.textContent = error.message || String(error);
        }
    };

    UI.syncEventbriteSales = async function () {
        const eventId = document.getElementById("eventbritePlannerEvent")?.value || "";
        if (!eventId) return;
        UI.saveEventbriteConnection();
        const status = document.getElementById("eventbriteStatus");
        if (status) status.textContent = "Synchronizing Eventbrite sales...";
        try {
            const result = await Eventbrite.syncSales(eventId);
            UI.renderEventbrite(eventId);
            const nextStatus = document.getElementById("eventbriteStatus");
            if (nextStatus) {
                nextStatus.textContent = `Synchronization complete: ${result.eventbriteTicketsSold} Eventbrite tickets, ${Utils.money(result.eventbriteRevenue)} revenue.`;
            }
        } catch (error) {
            if (status) status.textContent = error.message || String(error);
        }
    };
})();
