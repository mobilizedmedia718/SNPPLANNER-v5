const Utils = {

    save(key, data) {
        localStorage.setItem(
            `snpplanner_${key}`,
            JSON.stringify(data)
        );
    },

    load(key, fallback = null) {

        try {

            const data = localStorage.getItem(
                `snpplanner_${key}`
            );

            return data !== null
                ? JSON.parse(data)
                : fallback;

        } catch (error) {

            console.error(
                `Unable to load ${key}:`,
                error
            );

            return fallback;
        }
    },

    remove(key) {
        localStorage.removeItem(`snpplanner_${key}`);
    },

    id() {

        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2)
        );
    },

    date() {
        return new Date().toISOString();
    },

    money(value) {

        const amount = Number(value || 0);

        const currency =
            typeof Settings !== "undefined" &&
            Settings.data &&
            Settings.data.currency
                ? Settings.data.currency
                : "USD";

        try {

            return new Intl.NumberFormat(
                "en-US",
                {
                    style: "currency",
                    currency
                }
            ).format(amount);

        } catch (error) {

            return new Intl.NumberFormat(
                "en-US",
                {
                    style: "currency",
                    currency: "USD"
                }
            ).format(amount);
        }
    },

    searchAll(term) {

        const query = String(term || "")
            .trim()
            .toLowerCase();

        if (!query) {
            return {
                customers: [],
                events: [],
                vendors: [],
                venues: [],
                inventory: [],
                assets: []
            };
        }

        const matches = (...values) =>
            values
                .flat()
                .filter(value =>
                    value !== undefined &&
                    value !== null
                )
                .join(" ")
                .toLowerCase()
                .includes(query);

        return {

            customers: CRM.all().filter(c =>
                matches(
                    c.firstName,
                    c.lastName,
                    c.email,
                    c.phone,
                    c.tags || []
                )
            ),

            events: Events.all().filter(e =>
                matches(
                    e.name,
                    e.status,
                    e.theme,
                    e.instructor,
                    e.notes
                )
            ),

            vendors: Vendors.all().filter(v =>
                matches(
                    v.name,
                    v.category,
                    v.contact,
                    v.email,
                    v.phone
                )
            ),

            venues: Venues.all().filter(v =>
                matches(
                    v.name,
                    v.address,
                    v.city,
                    v.state,
                    v.zip
                )
            ),

            inventory: Inventory.all().filter(i =>
                matches(
                    i.name,
                    i.category,
                    i.sku,
                    i.storageLocation
                )
            ),

            assets: Assets.all().filter(a =>
                matches(
                    a.name,
                    a.category,
                    a.serialNumber,
                    a.location,
                    a.assignedTo
                )
            )
        };
    },

    backupData() {

        return {
            version: "5.0",
            exported: new Date().toISOString(),

            business:
                typeof Business !== "undefined"
                    ? Business.data
                    : {},

            settings:
                typeof Settings !== "undefined"
                    ? Settings.data
                    : {},

            events:
                typeof Events !== "undefined"
                    ? Events.all()
                    : [],

            venues:
                typeof Venues !== "undefined"
                    ? Venues.all()
                    : [],

            vendors:
                typeof Vendors !== "undefined"
                    ? Vendors.all()
                    : [],

            inventory:
                typeof Inventory !== "undefined"
                    ? Inventory.all()
                    : [],

            customers:
                typeof CRM !== "undefined"
                    ? CRM.all()
                    : [],

            transactions:
                typeof Finance !== "undefined"
                    ? Finance.all()
                    : [],

            assets:
                typeof Assets !== "undefined"
                    ? Assets.all()
                    : [],

            calendar:
                typeof Calendar !== "undefined"
                    ? Calendar.all()
                    : []
        };
    },

    downloadBackup() {

        const backup = this.backupData();

        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            `snp-planner-backup-${new Date()
                .toISOString()
                .slice(0, 10)}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    },

    restoreBackup(file) {

        if (!file) return;

        const reader = new FileReader();

        reader.onload = event => {

            try {

                const backup =
                    JSON.parse(event.target.result);

                if (
                    !backup ||
                    typeof backup !== "object"
                ) {
                    throw new Error(
                        "Invalid backup file."
                    );
                }

                if (backup.business) {
                    this.save(
                        "business",
                        backup.business
                    );
                }

                if (backup.settings) {
                    this.save(
                        "settings",
                        backup.settings
                    );
                }

                if (Array.isArray(backup.events)) {
                    this.save(
                        "events",
                        backup.events
                    );
                }

                if (Array.isArray(backup.venues)) {
                    this.save(
                        "venues",
                        backup.venues
                    );
                }

                if (Array.isArray(backup.vendors)) {
                    this.save(
                        "vendors",
                        backup.vendors
                    );
                }

                if (Array.isArray(backup.inventory)) {
                    this.save(
                        "inventory",
                        backup.inventory
                    );
                }

                if (Array.isArray(backup.customers)) {
                    this.save(
                        "customers",
                        backup.customers
                    );
                }

                if (Array.isArray(backup.transactions)) {
                    this.save(
                        "transactions",
                        backup.transactions
                    );
                }

                if (Array.isArray(backup.assets)) {
                    this.save(
                        "assets",
                        backup.assets
                    );
                }

                if (Array.isArray(backup.calendar)) {
                    this.save(
                        "calendar",
                        backup.calendar
                    );
                }

                alert(
                    "Backup restored successfully. The app will now reload."
                );

                window.location.reload();

            } catch (error) {

                console.error(
                    "Backup restore failed:",
                    error
                );

                alert(
                    "That backup file could not be restored."
                );
            }
        };

        reader.readAsText(file);
    }

};
