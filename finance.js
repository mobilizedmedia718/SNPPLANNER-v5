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
            date: Utils.date(),
            type: "Expense",
            category: "",
            description: "",
            amount: 0,
            eventId: "",
            vendorId: "",
            customerId: "",
            paymentMethod: "Cash",
            status: "Completed",
            notes: "",
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
            .filter(t => t.type === "Income")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    },

    expenses() {
        return this.transactions
            .filter(t => t.type === "Expense")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    },

    profit() {
        return this.income() - this.expenses();
    }

};

Finance.load();
