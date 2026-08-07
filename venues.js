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
            contactPerson: "",
            capacity: 0,
            rentalCost: 0,
            deposit: 0,
            depositRefundable: true,
            parking: "",
            indoorOutdoor: "Indoor",
            alcoholAllowed: false,
            foodAllowed: true,
            outsideVendorsAllowed: true,
            setupTime: "",
            breakdownTime: "",
            notes: "",
            active: true,
            created: Utils.date(),
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
    },

    active() {
        return this.list.filter(v => v.active !== false);
    },

    totalRentalCost() {
        return this.list.reduce(
            (sum, v) => sum + Number(v.rentalCost || 0),
            0
        );
    }

};

Venues.load();
