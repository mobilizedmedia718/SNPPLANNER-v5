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
            venueId: "",
            status: "Draft",
            capacity: 0,
            ticketsSold: 0,
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
    }

};

Events.load();
