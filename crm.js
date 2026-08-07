const CRM = {

    customers: [],

    load() {
        this.customers = Utils.load("customers", []);
    },

    save() {
        Utils.save("customers", this.customers);
    },

    create(data = {}) {

        const customer = {
            id: Utils.id(),
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            birthday: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            loyaltyPoints: 0,
            totalSpent: 0,
            totalVisits: 0,
            tags: [],
            notes: "",
            lastVisit: "",
            created: Utils.date(),
            ...data
        };

        this.customers.push(customer);
        this.save();

        return customer;
    },

    update(id, updates) {

        const customer = this.customers.find(c => c.id === id);

        if (!customer) return;

        Object.assign(customer, updates);

        this.save();
    },

    remove(id) {

        this.customers = this.customers.filter(c => c.id !== id);

        this.save();
    },

    get(id) {
        return this.customers.find(c => c.id === id);
    },

    all() {
        return this.customers;
    },

    search(term) {

        term = String(term || "").toLowerCase().trim();

        return this.customers.filter(c =>
            `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${(c.tags || []).join(" ")}`
                .toLowerCase()
                .includes(term)
        );
    },

    totalSpend() {
        return this.customers.reduce(
            (sum, c) => sum + Number(c.totalSpent || 0),
            0
        );
    },

    totalVisits() {
        return this.customers.reduce(
            (sum, c) => sum + Number(c.totalVisits || 0),
            0
        );
    },

    averageSpend() {
        return this.customers.length
            ? this.totalSpend() / this.customers.length
            : 0;
    },

    topCustomers(limit = 5) {
        return [...this.customers]
            .sort(
                (a, b) =>
                    Number(b.totalSpent || 0) -
                    Number(a.totalSpent || 0)
            )
            .slice(0, limit);
    }

};

CRM.load();
