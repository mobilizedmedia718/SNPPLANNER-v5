const Finance = {

    transactions: [],

    load() {
        this.transactions = Utils.load("transactions", []);
    },

    save() {
        Utils.save("transactions", this.transactions);
    },

    create(data = {}) {

        const transaction = {
            id: Utils.id(),
            date: new Date().toISOString().slice(0,10),
            type: "Expense",
            category: "",
            description: "",
            amount: 0,
            eventId: "",
            vendorId: "",
            customerId: "",
            paymentMethod: "Cash",
            status: "Completed",
            taxAmount: 0,
            notes: "",
            created: Utils.date(),
            ...data
        };

        this.transactions.push(transaction);
        this.save();

        return transaction;
    },

    update(id, updates) {

        const transaction = this.transactions.find(t => t.id === id);

        if (!transaction) return;

        Object.assign(transaction, updates);
        this.save();
    },

    remove(id) {

        this.transactions = this.transactions.filter(t => t.id !== id);
        this.save();
    },

    get(id) {
        return this.transactions.find(t => t.id === id);
    },

    all() {
        return this.transactions;
    },

    income() {
        return this.transactions
            .filter(t => t.type === "Income" && t.status !== "Cancelled")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    },

    expenses() {
        return this.transactions
            .filter(t => t.type === "Expense" && t.status !== "Cancelled")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    },

    taxes() {
        return this.transactions
            .filter(t => t.status !== "Cancelled")
            .reduce((sum, t) => sum + Number(t.taxAmount || 0), 0);
    },

    profit() {
        return this.income() - this.expenses();
    },

    byEvent(eventId) {
        return this.transactions.filter(t => t.eventId === eventId);
    },

    byVendor(vendorId) {
        return this.transactions.filter(t => t.vendorId === vendorId);
    },

    byCustomer(customerId) {
        return this.transactions.filter(t => t.customerId === customerId);
    },

    eventProfit(eventId) {

        const items = this.byEvent(eventId);

        const income = items
            .filter(t => t.type === "Income" && t.status !== "Cancelled")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const expenses = items
            .filter(t => t.type === "Expense" && t.status !== "Cancelled")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        return income - expenses;
    }

};

Finance.load();
