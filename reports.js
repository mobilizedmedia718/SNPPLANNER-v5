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

    byEvent() {

        return Events.all().map(event => {

            const venue = Venues.get(event.venueId);

            return {
                id: event.id,
                name: event.name || "Unnamed Event",
                date: event.date || "",
                status: event.status || "Draft",
                venue: venue ? venue.name : "",
                capacity: Number(event.capacity || 0),
                ticketsSold: Number(event.ticketsSold || 0)
            };
        });
    },

    customerSummary() {

        return CRM.all().map(customer => ({
            id: customer.id,
            name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
            email: customer.email || "",
            visits: Number(customer.totalVisits || 0),
            spent: Number(customer.totalSpent || 0),
            loyaltyPoints: Number(customer.loyaltyPoints || 0)
        }));
    },

    inventorySummary() {

        return Inventory.all().map(item => ({
            id: item.id,
            name: item.name || "Unnamed Item",
            category: item.category || "",
            quantity: Number(item.quantity || 0),
            minimum: Number(item.minimum || 0),
            cost: Number(item.cost || 0),
            sellPrice: Number(item.sellPrice || 0),
            lowStock: Number(item.quantity || 0) <= Number(item.minimum || 0)
        }));
    },

    financeSummary() {

        return {
            income: Finance.income(),
            expenses: Finance.expenses(),
            profit: Finance.profit(),
            transactions: Finance.all()
        };
    },

    exportSummary() {

        const report = {
            generated: new Date().toISOString(),
            summary: this.summary(),
            events: this.byEvent(),
            customers: this.customerSummary(),
            inventory: this.inventorySummary(),
            finance: this.financeSummary()
        };

        const blob = new Blob(
            [JSON.stringify(report, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = `snp-planner-report-${new Date().toISOString().slice(0,10)}.json`;

        link.click();

        URL.revokeObjectURL(url);
    }

};
