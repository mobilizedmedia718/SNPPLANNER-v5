/* Eventbrite integration restored from the original SNP Planner.
 * Uses the same secure connector contract:
 *   GET {connectorUrl}/ticket-classes?event_id=...
 *   GET {connectorUrl}/sales?event_id=...
 */
const Eventbrite = {
    data: {
        connectorUrl: "",
        events: {}
    },

    load() {
        const saved = Utils.load("eventbrite", {});
        this.data = {
            connectorUrl: "",
            events: {},
            ...saved,
            events: saved?.events && typeof saved.events === "object" ? saved.events : {}
        };
    },

    save() {
        Utils.save("eventbrite", this.data);
    },

    link(eventId) {
        if (!this.data.events[eventId]) {
            this.data.events[eventId] = {
                eventbriteEventId: "",
                lastSync: "",
                ticketClasses: [],
                sales: [],
                manualTicketsSold: null,
                manualRevenue: null
            };
        }
        return this.data.events[eventId];
    },

    setConnectorUrl(value) {
        this.data.connectorUrl = String(value || "").trim().replace(/\/$/, "");
        this.save();
    },

    setEventbriteEventId(eventId, value) {
        this.link(eventId).eventbriteEventId = String(value || "").trim();
        this.save();
    },

    async connectorRequest(path, plannerEventId) {
        const connectorUrl = String(this.data.connectorUrl || "").trim().replace(/\/$/, "");
        const link = this.link(plannerEventId);
        const eventbriteEventId = String(link.eventbriteEventId || "").trim();

        if (!connectorUrl) throw new Error("Enter the Secure Connector URL.");
        if (!eventbriteEventId) throw new Error("Enter the Eventbrite Event ID.");

        const response = await fetch(
            `${connectorUrl}${path}?event_id=${encodeURIComponent(eventbriteEventId)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Eventbrite connection failed (${response.status}).`);
        }
        return data;
    },

    async loadTicketClasses(plannerEventId) {
        const data = await this.connectorRequest("/ticket-classes", plannerEventId);
        const link = this.link(plannerEventId);
        link.ticketClasses = (data.ticket_classes || data.ticketClasses || []).map(item => ({
            id: String(item.id),
            name: item.name || ""
        }));
        link.lastSync = new Date().toISOString();
        this.save();
        return link.ticketClasses;
    },

    async syncSales(plannerEventId) {
        const event = Events.get(plannerEventId);
        if (!event) throw new Error("Choose an SNP Planner event first.");

        const data = await this.connectorRequest("/sales", plannerEventId);
        const link = this.link(plannerEventId);

        link.sales = (data.sales || []).map(row => ({
            ticketClassId: String(row.ticketClassId || row.ticket_class_id || ""),
            name: row.name || "",
            quantity: Number(row.quantity || 0),
            revenue: Number(row.revenue || 0)
        }));

        const priorEventbriteTickets = Number(event.eventbriteTicketsSold || 0);
        const priorEventbriteRevenue = Number(event.eventbriteRevenue || 0);

        if (link.manualTicketsSold === null || link.manualTicketsSold === undefined) {
            link.manualTicketsSold = Math.max(0, Number(event.ticketsSold || 0) - priorEventbriteTickets);
        }
        if (link.manualRevenue === null || link.manualRevenue === undefined) {
            link.manualRevenue = Math.max(0, Number(event.actualRevenue || 0) - priorEventbriteRevenue);
        }

        const eventbriteTicketsSold = link.sales.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const eventbriteRevenue = link.sales.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

        link.lastSync = new Date().toISOString();
        this.save();

        Events.update(plannerEventId, {
            eventbriteEventId: link.eventbriteEventId,
            eventbriteTicketsSold,
            eventbriteRevenue,
            ticketsSold: Number(link.manualTicketsSold || 0) + eventbriteTicketsSold,
            actualRevenue: Number(link.manualRevenue || 0) + eventbriteRevenue
        });

        return {
            eventbriteTicketsSold,
            eventbriteRevenue,
            sales: link.sales
        };
    }
};

Eventbrite.load();
