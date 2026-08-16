const Utils = {
  _cloudSaveQueues: {},

  save(key, data) {
    const snapshot = JSON.parse(JSON.stringify(data));

    localStorage.setItem(`snpplanner_${key}`, JSON.stringify(snapshot));

    if (window.SNPDatabase?.user?.()) {
      // Serialize cloud writes per storage key. A newly-created blank record
      // often saves immediately before the user finishes the form. Without
      // a queue, that older request can finish after the real Save and
      // overwrite the completed record in Supabase.
      const prior = this._cloudSaveQueues[key] || Promise.resolve();
      const next = prior
        .catch(() => {})
        .then(() => SNPDatabase.saveStorage(key, snapshot))
        .catch((error) => {
          console.error(`Unable to sync ${key} to Supabase:`, error);
          throw error;
        });

      this._cloudSaveQueues[key] = next;
      next
        .finally(() => {
          if (this._cloudSaveQueues[key] === next)
            delete this._cloudSaveQueues[key];
        })
        .catch(() => {});
    }
  },

  async flushSave(key) {
    const pending = this._cloudSaveQueues[key];
    if (!pending) return true;
    try {
      await pending;
      return true;
    } catch (_) {
      return false;
    }
  },

  load(key, fallback = null) {
    try {
      const data = localStorage.getItem(`snpplanner_${key}`);
      return data !== null ? JSON.parse(data) : fallback;
    } catch (error) {
      console.error(`Unable to load ${key}:`, error);
      return fallback;
    }
  },

  remove(key) {
    localStorage.removeItem(`snpplanner_${key}`);
    if (window.SNPDatabase?.user?.()) {
      const prior = this._cloudSaveQueues[key] || Promise.resolve();
      const next = prior
        .catch(() => {})
        .then(() => SNPDatabase.removeStorage(key))
        .catch((error) => {
          console.error(`Unable to remove ${key} from Supabase:`, error);
          throw error;
        });
      this._cloudSaveQueues[key] = next;
      next
        .finally(() => {
          if (this._cloudSaveQueues[key] === next)
            delete this._cloudSaveQueues[key];
        })
        .catch(() => {});
    }
  },

  id() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  date() {
    return new Date().toISOString();
  },

  money(value) {
    const amount = Number(value || 0);
    const currency =
      typeof Settings !== "undefined" && Settings.data && Settings.data.currency
        ? Settings.data.currency
        : "USD";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount);
    } catch (error) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    }
  },

  formatTime(value) {
    return window.SNPTime?.formatTime(value) || String(value ?? "");
  },

  parseTime(value) {
    return window.SNPTime?.parseTime(value) || String(value ?? "");
  },

  formatDateTime(value) {
    return window.SNPTime?.formatDateTime(value) || String(value ?? "");
  },

  searchAll(term) {
    const query = String(term || "")
      .trim()
      .toLowerCase();
    if (!query)
      return {
        customers: [],
        events: [],
        vendors: [],
        venues: [],
        inventory: [],
        assets: [],
      };
    const matches = (...values) =>
      values
        .flat()
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase()
        .includes(query);
    return {
      customers: CRM.all().filter((c) =>
        matches(c.firstName, c.lastName, c.email, c.phone, c.tags || []),
      ),
      events: Events.all().filter((e) =>
        matches(e.name, e.status, e.theme, e.instructor, e.notes),
      ),
      vendors: Vendors.all().filter((v) =>
        matches(v.name, v.category, v.contact, v.email, v.phone),
      ),
      venues: Venues.all().filter((v) =>
        matches(v.name, v.address, v.city, v.state, v.zip),
      ),
      inventory: Inventory.all().filter((i) =>
        matches(i.name, i.category, i.sku, i.storageLocation),
      ),
      assets: Assets.all().filter((a) =>
        matches(a.name, a.category, a.serialNumber, a.location, a.assignedTo),
      ),
    };
  },

  backupData() {
    return {
      version: "5.0",
      exported: new Date().toISOString(),
      business: typeof Business !== "undefined" ? Business.data : {},
      settings: typeof Settings !== "undefined" ? Settings.data : {},
      eventbrite: typeof Eventbrite !== "undefined" ? Eventbrite.data : {},
      events: typeof Events !== "undefined" ? Events.all() : [],
      venues: typeof Venues !== "undefined" ? Venues.all() : [],
      vendors: typeof Vendors !== "undefined" ? Vendors.all() : [],
      inventory: typeof Inventory !== "undefined" ? Inventory.all() : [],
      customers: typeof CRM !== "undefined" ? CRM.all() : [],
      transactions: typeof Finance !== "undefined" ? Finance.all() : [],
      assets: typeof Assets !== "undefined" ? Assets.all() : [],
      calendar: typeof Calendar !== "undefined" ? Calendar.all() : [],
      promoAgent: typeof PromoAgent !== "undefined" ? PromoAgent.state : {},
    };
  },

  downloadBackup() {
    const backup = this.backupData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snp-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  restoreBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup || typeof backup !== "object")
          throw new Error("Invalid backup file.");

        const entries = [
          ["business", backup.business, (value) => !!value],
          ["settings", backup.settings, (value) => !!value],
          [
            "eventbrite",
            backup.eventbrite,
            (value) => !!value && typeof value === "object",
          ],
          ["events", backup.events, Array.isArray],
          ["venues", backup.venues, Array.isArray],
          ["vendors", backup.vendors, Array.isArray],
          ["inventory", backup.inventory, Array.isArray],
          ["customers", backup.customers, Array.isArray],
          ["transactions", backup.transactions, Array.isArray],
          ["assets", backup.assets, Array.isArray],
          ["calendar", backup.calendar, Array.isArray],
          [
            "promoAgent",
            backup.promoAgent,
            (value) => !!value && typeof value === "object",
          ],
        ];

        const cloudWrites = [];
        entries.forEach(([key, value, valid]) => {
          if (!valid(value)) return;
          localStorage.setItem(`snpplanner_${key}`, JSON.stringify(value));
          if (window.SNPDatabase?.user?.())
            cloudWrites.push(SNPDatabase.saveStorage(key, value));
        });

        await Promise.all(cloudWrites);
        alert("Backup restored successfully. The app will now reload.");
        window.location.reload();
      } catch (error) {
        console.error("Backup restore failed:", error);
        alert("That backup file could not be restored.");
      }
    };
    reader.readAsText(file);
  },
};
