const Vendors = {

    list: [],

    load() {
        this.list = Utils.load("vendors", []);
    },

    save() {
        Utils.save("vendors", this.list);
    },

    create(data = {}) {

        const vendor = {
            id: Utils.id(),
            name: "",
            category: "",
            contact: "",
            phone: "",
            email: "",
            website: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            paymentType: "Flat Rate",
            flatRate: 0,
            percentage: 0,
            notes: "",
            active: true,
            ...data
        };

        this.list.push(vendor);
        this.save();

        return vendor;
    },

    update(id, updates) {

        const vendor = this.list.find(v => v.id === id);

        if (!vendor) return;

        Object.assign(vendor, updates);

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

Vendors.load();
