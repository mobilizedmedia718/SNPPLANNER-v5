const Reports = {

    summary() {

        const events = Events.all();
        const customers = CRM.all();
        const vendors = Vendors.all();
        const venues = Venues.all();
        const inventory = Inventory.all();
        const assets = Assets.all();

        return {
            totalEvents: events.length,
            scheduledEvents: Events.scheduled().length,
            completedEvents: Events.completed().length,
            totalTicketsSold: Events.totalTicketsSold(),
            totalEventRevenue: Events.totalRevenue(),

            totalCustomers: customers.length,
            totalCustomerSpend: CRM.totalSpend(),
            totalCustomerVisits: CRM.totalVisits(),
            averageCustomerSpend: CRM.averageSpend(),

            totalVendors: vendors.length,
            activeVendors: Vendors.active().length,

            totalVenues: venues.length,
            activeVenues: Venues.active().length,

            totalInventoryItems: inventory.length,
            totalInventoryUnits: Inventory.totalUnits(),
            lowStockItems: Inventory.lowStock().length,
            totalInventoryCost: Inventory.totalCostValue(),
            totalInventoryRetailValue: Inventory.totalRetailValue(),
            potentialInventoryProfit: Inventory.potentialProfit(),

            totalAssets: assets.length,
            availableAssets: Assets.available().length,
            assignedAssets: Assets.assigned().length,
            maintenanceAssets: Assets.maintenance().length,
            totalAssetValue: Assets.totalValue(),

            totalIncome: Finance.income(),
            totalExpenses: Finance.expenses(),
            totalTaxes: Finance.taxes(),
            totalProfit: Finance.profit(),

            upcomingReminders: Calendar.upcoming().length,
            overdueReminders: Calendar.overdue().length,
            completedReminders: Calendar.completed().length
        };
    },

    financial() {

        const transactions = Finance.all();

        return {
            transactions,
            income: Finance.income(),
            expenses: Finance.expenses(),
            taxes: Finance.taxes(),
            profit: Finance.profit()
        };
    },

    inventory() {

        return {
            items: Inventory.all(),
            lowStock: Inventory.lowStock(),
            totalUnits: Inventory.totalUnits(),
            totalCostValue: Inventory.totalCostValue(),
            totalRetailValue: Inventory.totalRetailValue(),
            potentialProfit: Inventory.potentialProfit()
        };
    },

    customers() {

        return {
            customers: CRM.all(),
            topCustomers: CRM.topCustomers(),
            totalSpend: CRM.totalSpend(),
            totalVisits: CRM.totalVisits(),
            averageSpend: CRM.averageSpend()
        };
    },

    assets() {

        return {
            assets: Assets.all(),
            available: Assets.available(),
            assigned: Assets.assigned(),
            maintenance: Assets.maintenance(),
            totalValue: Assets.totalValue()
        };
    },

    calendar() {

        return {
            all: Calendar.all(),
            upcoming: Calendar.upcoming(),
            overdue: Calendar.overdue(),
            completed: Calendar.completed()
        };
    },

    export() {

        const report = {
            generated: new Date().toISOString(),
            version: "5.0",
            summary: this.summary(),
            financial: this.financial(),
            inventory: this.inventory(),
            customers: this.customers(),
            assets: this.assets(),
            calendar: this.calendar()
        };

        const blob = new Blob(
            [JSON.stringify(report, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            `snp-planner-report-${new Date()
                .toISOString()
                .slice(0,10)}.json`;

        link.click();

        URL.revokeObjectURL(url);
    }

};
