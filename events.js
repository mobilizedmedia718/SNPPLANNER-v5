const Events = {

    list: [],

    load() {
        this.list = Utils.load("events", []);
    },

    save() {
        Utils.save("events", this.list);
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

        this.list.push(event);
        this.save();

        return event;
    },

    update(id, updates) {

        const event = this.list.find(e => e.id === id);

        if (!event) return;

        Object.assign(event, updates);

        this.save();
    },

    remove(id) {

        this.list = this.list.filter(e => e.id !== id);

        this.save();
    },

    get(id) {
        return this.list.find(e => e.id === id);
    },

    all() {
        return this.list;
    }

};

Events.load();
