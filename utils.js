const Utils = {

    id() {
        return crypto.randomUUID();
    },

    money(value) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(Number(value || 0));
    },

    date() {
        return new Date().toISOString();
    },

    save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    load(key, fallback = null) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    },
searchAll(term){

    term = term.toLowerCase().trim();

    return {

        customers: CRM.all().filter(c =>
            `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`
            .toLowerCase()
            .includes(term)
        ),

        events: Events.all().filter(e =>
            `${e.name} ${e.status}`
            .toLowerCase()
            .includes(term)
        ),

        vendors: Vendors.all().filter(v =>
            `${v.name} ${v.category}`
            .toLowerCase()
            .includes(term)
        ),

        venues: Venues.all().filter(v =>
            `${v.name} ${v.city} ${v.state}`
            .toLowerCase()
            .includes(term)
        ),

        inventory: Inventory.all().filter(i =>
            `${i.name} ${i.category}`
            .toLowerCase()
            .includes(term)
        ),

        assets: Assets.all().filter(a =>
            `${a.name} ${a.category}`
            .toLowerCase()
            .includes(term)
        )

    };

}
};
