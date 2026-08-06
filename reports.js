const Reports = {

    summary() {

        return {
            totalEvents: Events.all().length,
            totalCustomers: CRM.all().length,
            totalVendors: Vendors.all().length,
            totalVenues: Venues.all().length,
            totalInventoryItems: Inventory.all().length,
            totalAssets: Assets.all().length,
            totalIncome: Finance.income(),
            totalExpenses: Finance.expenses(),
            totalProfit: Finance.profit()
        };

    },

    dashboard() {

        const data = this.summary();

        console.table(data);

        return data;

    },

    export() {

        return JSON.stringify(this.summary(), null, 2);

    }

};
