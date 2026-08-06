const Venues = {

    list: [],

    load() {
        this.list = Utils.load("venues", []);
    },

    save() {
        Utils.save("venues", this.list);
    },

    create(data = {}) {

        const venue = {
            id: Utils.id(),
            name: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            phone: "",
            email: "",
            website: "",
            capacity: 0,
            rentalCost: 0,
            deposit: 0,
            depositRefundable: true,
            parking: "",
            indoorOutdoor: "Indoor",
            notes: "",
            ...data
        };

        this.list.push(venue);
        this.save();

        return venue;
    },

    update(id, updates) {

        const venue = this.list.find(v => v.id === id);

        if (!venue) return;

        Object.assign(venue, updates);

        this.save();
    },

    remove(id) {

        this.list = this.list.filter(v => v.id !== id);

        this.save();
    },

    get(id) {
        return this.list.find(v => v.id === id);
    },

    all() {
        return this.list;
    }

};

Venues.load();
