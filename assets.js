const Assets = {

    assets: [],

    load() {
        this.assets = Utils.load("assets", []);
    },

    save() {
        Utils.save("assets", this.assets);
    },

    create(data = {}) {

        const asset = {
            id: Utils.id(),
            name: "",
            category: "",
            serialNumber: "",
            purchaseDate: "",
            purchasePrice: 0,
            currentValue: 0,
            location: "",
            assignedTo: "",
            assignedEventId: "",
            status: "Available",
            condition: "Good",
            warrantyExpires: "",
            maintenanceDue: "",
            notes: "",
            ...data
        };

        this.assets.push(asset);
        this.save();

        return asset;
    },

    update(id, updates) {

        const asset = this.assets.find(a => a.id === id);

        if (!asset) return;

        Object.assign(asset, updates);

        this.save();
    },

    remove(id) {

        this.assets = this.assets.filter(a => a.id !== id);

        this.save();
    },

    get(id) {
        return this.assets.find(a => a.id === id);
    },

    all() {
        return this.assets;
    },

    available() {
        return this.assets.filter(a => a.status === "Available");
    },

    assigned() {
        return this.assets.filter(a => a.status === "Assigned");
    },

    maintenance() {
        return this.assets.filter(a =>
            a.status === "Maintenance" || a.condition === "Needs Repair"
        );
    }

};

Assets.load();
