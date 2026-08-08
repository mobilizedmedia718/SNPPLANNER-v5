const Events = {

    data: [],

    load() {
        this.data = Utils.load("events", []);
    },

    save() {
        Utils.save("events", this.data);
    },

    create(eventData = {}) {

        const event = {
            id: Utils.id(),
            name: "",
            date: "",
            time: "",
            endTime: "",
            venueId: "",
            status: "Draft",
            capacity: 0,
            ticketsSold: 0,
            ticketPrice: 0,
            revenueGoal: 0,
            actualRevenue: 0,
            theme: "",
            instructor: "",
            offerings: [],
            notes: "",
            created: Utils.date(),
            ...eventData
        };

        this.data.push(event);
        this.save();

        return event;
    },

    update(id, updates) {

        const event = this.data.find(e => e.id === id);

        if (!event) return;

        Object.assign(event, updates);
        this.save();
    },

    remove(id) {

        this.data = this.data.filter(e => e.id !== id);
        this.save();
    },

    get(id) {
        return this.data.find(e => e.id === id);
    },

    all() {
        return this.data;
    },

    scheduled() {
        return this.data.filter(e => e.status === "Scheduled");
    },

    completed() {
        return this.data.filter(e => e.status === "Completed");
    },

    totalTicketsSold() {
        return this.data.reduce(
            (sum, event) => sum + Number(event.ticketsSold || 0),
            0
        );
    },

    totalRevenue() {
        return this.data.reduce(
            (sum, event) => sum + Number(event.actualRevenue || 0),
            0
        );
    },
    addOffering(eventId) {

    const event = this.get(eventId);

    if (!event) return;

    if (!Array.isArray(event.offerings)) {
        event.offerings = [];
    }

    event.offerings.push({
        id: Utils.id(),
        name: "",
        description: "",
        quantity: 1,
        unit: "Each",
        price: 0,
        notes: ""
    });

    this.save();
},

updateOffering(eventId, offeringId, updates) {

    const event = this.get(eventId);

    if (!event || !Array.isArray(event.offerings)) return;

    const offering = event.offerings.find(
        item => item.id === offeringId
    );

    if (!offering) return;

    Object.assign(offering, updates);
    this.save();
},

removeOffering(eventId, offeringId) {

    const event = this.get(eventId);

    if (!event || !Array.isArray(event.offerings)) return;

    event.offerings = event.offerings.filter(
        item => item.id !== offeringId
    );

    this.save();
},

};

Events.load();
