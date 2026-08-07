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

            company: "",
            jobTitle: "",

            email: "",
            phone: "",
            alternatePhone: "",

            birthday: "",

            address: "",
            address2: "",
            city: "",
            state: "",
            zip: "",
            country: "",

            website: "",
            instagram: "",
            facebook: "",

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

        term = String(term || "")
            .toLowerCase()
            .trim();

        return this.customers.filter(c =>
            `
                ${c.firstName}
                ${c.lastName}
                ${c.company}
                ${c.jobTitle}
                ${c.email}
                ${c.phone}
                ${c.alternatePhone}
                ${c.address}
                ${c.address2}
                ${c.city}
                ${c.state}
                ${c.zip}
                ${c.country}
                ${c.website}
                ${(c.tags || []).join(" ")}
            `
            .toLowerCase()
            .includes(term)
        );
    },

    fullName(customer) {

        if (!customer) return "";

        return `${customer.firstName || ""} ${customer.lastName || ""}`
            .trim();
    },

    fullAddress(customer) {

        if (!customer) return "";

        return [
            customer.address,
            customer.address2,
            customer.city,
            customer.state,
            customer.zip,
            customer.country
        ]
        .filter(Boolean)
        .join(", ");
    },

    totalSpend() {
        return this.customers.reduce(
            (sum, c) =>
                sum + Number(c.totalSpent || 0),
            0
        );
    },

    totalVisits() {
        return this.customers.reduce(
            (sum, c) =>
                sum + Number(c.totalVisits || 0),
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
