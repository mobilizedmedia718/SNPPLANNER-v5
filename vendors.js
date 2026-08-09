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
            offerings: [],
            contact: "",
            jobTitle: "",
            phone: "",
            alternatePhone: "",
            email: "",
            website: "",
            instagram: "",
            facebook: "",
            address: "",
            address2: "",
            city: "",
            state: "",
            zip: "",
            country: "",
            paymentType: "Flat Rate",
            flatRate: 0,
            hourlyRate: 0,
            hours: 0,
            percentage: 0,
            minimumGuarantee: 0,
            payoutStatus: "Unpaid",
            taxId: "",
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

    fullAddress(vendor) {
        if (!vendor) return "";
        return [vendor.address, vendor.address2, vendor.city, vendor.state, vendor.zip, vendor.country]
            .filter(Boolean)
            .join(", ");
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

        if (vendor.paymentType === "Hourly") {
            return Number(vendor.hourlyRate || 0) * Number(vendor.hours || 0);
        }

        return Number(vendor.flatRate || 0);
    },

    addOffering(vendorId) {
        const vendor = this.get(vendorId);
        if (!vendor) return;
        if (!Array.isArray(vendor.offerings)) vendor.offerings = [];
        vendor.offerings.push({
            id: Utils.id(), name: "", description: "", quantity: 1,
            unit: "Each", price: 0, notes: ""
        });
        this.save();
    },

    updateOffering(vendorId, offeringId, updates) {
        const vendor = this.get(vendorId);
        if (!vendor || !Array.isArray(vendor.offerings)) return;
        const offering = vendor.offerings.find(item => item.id === offeringId);
        if (!offering) return;
        Object.assign(offering, updates);
        this.save();
    },

    removeOffering(vendorId, offeringId) {
        const vendor = this.get(vendorId);
        if (!vendor || !Array.isArray(vendor.offerings)) return;
        vendor.offerings = vendor.offerings.filter(item => item.id !== offeringId);
        this.save();
    },

    categories() {
        return [
            ...new Set(
                this.list
                    .map(v => String(v.category || "").trim())
                    .filter(Boolean)
            )
        ].sort();
    },

    offeringNames() {
        return [
            ...new Set(
                this.list
                    .flatMap(vendor => Array.isArray(vendor.offerings) ? vendor.offerings : [])
                    .map(item => String(item.name || "").trim())
                    .filter(Boolean)
            )
        ].sort();
    },

    offeringDescriptions() {
        return [
            ...new Set(
                this.list
                    .flatMap(vendor => Array.isArray(vendor.offerings) ? vendor.offerings : [])
                    .map(item => String(item.description || "").trim())
                    .filter(Boolean)
            )
        ].sort();
    }

};

Vendors.load();
