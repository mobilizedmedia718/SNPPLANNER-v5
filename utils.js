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

    restoreBackup(file) {

    if (!file) return;

    const reader = new FileReader();

    reader.onload = event => {

        try {

            const backup = JSON.parse(event.target.result);

            if (backup.business) {
                Business.data = backup.business;
                Business.save();
            }

            if (backup.events) {
                Events.data = backup.events;
                Events.save();
            }

            if (backup.venues) {
                Venues.list = backup.venues;
                Venues.save();
            }

            if (backup.vendors) {
                Vendors.list = backup.vendors;
                Vendors.save();
            }

            if (backup.inventory) {
                Inventory.items = backup.inventory;
                Inventory.save();
            }

            if (backup.customers) {
                CRM.customers = backup.customers;
                CRM.save();
            }

            if (backup.transactions) {
                Finance.transactions = backup.transactions;
                Finance.save();
            }

            if (backup.assets) {
                Assets.assets = backup.assets;
                Assets.save();
            }

            if (backup.calendar) {
                Calendar.reminders = backup.calendar;
                Calendar.save();
            }

            if (backup.settings) {
                Settings.data = backup.settings;
                Settings.save();
            }

            alert("Backup restored successfully.");

            location.reload();

        } catch (error) {

            alert("Unable to restore backup. The file may be invalid.");

            console.error(error);
        }

    };

    reader.readAsText(file);
    }
};
