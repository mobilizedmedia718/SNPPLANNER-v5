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
            unit: "Each",
            quantity: 0,
            minimum: 0,
            reorder: 0,
            cost: 0,
            sellPrice: 0,
            storageLocation: "",
            notes: "",
            active: true,
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
        return this.items.filter(i => i.quantity <= i.minimum);
    }

};

Inventory.load();
