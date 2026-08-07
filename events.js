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
    }

};

Events.load();
