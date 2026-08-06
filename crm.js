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

        term = term.toLowerCase();

        return this.customers.filter(c =>
            `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`
                .toLowerCase()
                .includes(term)
        );
    }

};

CRM.load();
