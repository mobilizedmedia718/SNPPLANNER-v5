const Settings = {
  data: {
    theme: "light",
    currency: "USD",
    language: "en",
    autosave: true,
    notifications: true,
    compactMode: false,
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12",
    defaultTaxRate: 0,
    lowStockAlerts: true,
    reminderAlerts: true,
    ticketSalesChannels: {
      eventbrite: true,
      stripe: false,
      manual: false,
    },
  },

  load() {
    const saved = Utils.load("settings", {});
    const needsTimeFormatMigration = saved.timeFormat !== "12";

    this.data = {
      ...this.data,
      ...saved,
      // One clock style across every planner, staff, and customer view.
      // Stored values remain HH:mm so sorting and form saves stay valid.
      timeFormat: "12",
      ticketSalesChannels: {
        eventbrite: saved.ticketSalesChannels?.eventbrite !== false,
        stripe: saved.ticketSalesChannels?.stripe === true,
        manual: saved.ticketSalesChannels?.manual === true,
      },
    };

    this.apply();
    if (needsTimeFormatMigration) this.save();
  },

  save() {
    Utils.save("settings", this.data);
  },

  update(key, value) {
    if (!(key in this.data)) return;
    if (key === "timeFormat") value = "12";

    this.data[key] = value;

    this.save();
    this.apply();
  },

  salesChannelEnabled(channel) {
    return this.data.ticketSalesChannels?.[channel] === true;
  },

  updateSalesChannel(channel, enabled) {
    if (!["eventbrite", "stripe", "manual"].includes(channel)) return;
    this.data.ticketSalesChannels = {
      ...this.data.ticketSalesChannels,
      [channel]: !!enabled,
    };
    this.save();
    document.dispatchEvent(
      new CustomEvent("snp-sales-channels-changed", {
        detail: { ...this.data.ticketSalesChannels },
      }),
    );
  },

  apply() {
    if (this.data.theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    if (this.data.compactMode) {
      document.body.classList.add("compact");
    } else {
      document.body.classList.remove("compact");
    }
  },

  reset() {
    this.data = {
      theme: "light",
      currency: "USD",
      language: "en",
      autosave: true,
      notifications: true,
      compactMode: false,
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12",
      defaultTaxRate: 0,
      lowStockAlerts: true,
      reminderAlerts: true,
      ticketSalesChannels: {
        eventbrite: true,
        stripe: false,
        manual: false,
      },
    };

    this.save();
    this.apply();
  },
};

Settings.load();
