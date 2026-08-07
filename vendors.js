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
            minimumGuarantee: 0,
            payoutStatus: "Unpaid",
            notes: "",
            active: true,
            created: Utils.date(),
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
    },

    active() {
        return this.list.filter(v => v.active !== false);
    },

    calculatePayout(vendorId, revenue = 0) {

        const vendor = this.get(vendorId);

        if (!vendor) return 0;

        if (vendor.paymentType === "Percentage") {
            return Math.max(
                Number(vendor.minimumGuarantee || 0),
                Number(revenue || 0) * Number(vendor.percentage || 0) / 100
            );
        }

        return Number(vendor.flatRate || 0);
    }

};

Vendors.load();
