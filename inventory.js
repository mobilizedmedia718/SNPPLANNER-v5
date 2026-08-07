const Inventory = {

    items: [],

    load() {
        this.items = Utils.load("inventory", []);
    },

    save() {
        Utils.save("inventory", this.items);
    },

    create(data = {}) {

        const item = {
            id: Utils.id(),
            name: "",
            category: "",
            vendorId: "",
            sku: "",
            quantity: 0,
            minimum: 0,
            cost: 0,
            sellPrice: 0,
            storageLocation: "",
            status: "Active",
            notes: "",
            created: Utils.date(),
            ...data
        };

        this.items.push(item);
        this.save();

        return item;
    },

    update(id, updates) {

        const item = this.items.find(i => i.id === id);

        if (!item) return;

        Object.assign(item, updates);
        this.save();
    },

    remove(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
    },

    get(id) {
        return this.items.find(i => i.id === id);
    },

    all() {
        return this.items;
    },

    lowStock() {
        return this.items.filter(
            item =>
                item.status !== "Inactive" &&
                Number(item.quantity || 0) <= Number(item.minimum || 0)
        );
    },

    totalUnits() {
        return this.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
        );
    },

    totalCostValue() {
        return this.items.reduce(
            (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                Number(item.cost || 0),
            0
        );
    },

    totalRetailValue() {
        return this.items.reduce(
            (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                Number(item.sellPrice || 0),
            0
        );
    },

    potentialProfit() {
        return this.totalRetailValue() - this.totalCostValue();
    }

};

Inventory.load();
