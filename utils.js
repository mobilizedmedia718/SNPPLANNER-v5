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
    downloadBackup() {

    const backup = {
        version: "5.0",
        created: new Date().toISOString(),

        business: Business.data,
        events: Events.all(),
        venues: Venues.all(),
        vendors: Vendors.all(),
        inventory: Inventory.all(),
        customers: CRM.all(),
        transactions: Finance.all(),
        assets: Assets.all(),
        calendar: Calendar.all(),
        settings: Settings.data
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `snp-planner-backup-${new Date().toISOString().slice(0,10)}.json`;

    link.click();

    URL.revokeObjectURL(url);
    },
};
