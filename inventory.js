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

            /* Current stock */
            quantity: 0,
            minimum: 0,

            /* Purchasing */
            purchaseUnit: "Piece",
            purchaseQuantity: 0,
            unitsPerPurchase: 1,
            purchaseCostType: "Total Purchase",
            purchaseCost: 0,
            totalPurchaseCost: 0,
            calculatedUnitCost: 0,

            purchaseDate: "",
            invoiceNumber: "",
            purchaseNotes: "",

            /* Existing cost field remains for reports */
            cost: 0,

            sellPrice: 0,
            storageLocation: "",
            status: "Active",
            notes: "",
            created: Utils.date(),

            ...data
        };

        this.items.push(item);
        this.recalculatePurchase(item.id);
        this.save();
        return item;
    },

    update(id, updates) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        Object.assign(item, updates);
        this.recalculatePurchase(id);
        this.save();
    },

    recalculatePurchase(id) {
        const item = this.get(id);
        if (!item) return;

        const purchaseQuantity = Math.max(0, Number(item.purchaseQuantity || 0));
        const unitsPerPurchase = Math.max(1, Number(item.unitsPerPurchase || 1));
        const purchaseCost = Math.max(0, Number(item.purchaseCost || 0));
        const totalUnits = purchaseQuantity * unitsPerPurchase;

        let totalPurchaseCost = 0;
        let unitCost = 0;

        if (item.purchaseCostType === "Per Purchase Unit") {
            totalPurchaseCost = purchaseCost * purchaseQuantity;
            unitCost = unitsPerPurchase > 0 ? purchaseCost / unitsPerPurchase : 0;
        } else if (item.purchaseCostType === "Per Individual Unit") {
            totalPurchaseCost = purchaseCost * totalUnits;
            unitCost = purchaseCost;
        } else {
            totalPurchaseCost = purchaseCost;
            unitCost = totalUnits > 0 ? totalPurchaseCost / totalUnits : 0;
        }

        item.totalPurchaseCost = totalPurchaseCost;
        item.calculatedUnitCost = unitCost;
        item.cost = unitCost;
    },

    purchaseUnits(id) {
        const item = this.get(id);
        if (!item) return 0;
        return Number(item.purchaseQuantity || 0) * Number(item.unitsPerPurchase || 1);
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
        return this.items.filter(item => item.status !== "Inactive" && Number(item.quantity || 0) <= Number(item.minimum || 0));
    },

    totalUnits() {
        return this.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    },

    totalCostValue() {
        return this.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0), 0);
    },

    totalRetailValue() {
        return this.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.sellPrice || 0), 0);
    },

    potentialProfit() {
        return this.totalRetailValue() - this.totalCostValue();
    },

    categories() {
        return [
            ...new Set([
                "Event Sales",
                ...this.items
                    .map(item => String(item.category || "").trim())
                    .filter(Boolean)
            ])
        ].sort();
    }

};

Inventory.load();
