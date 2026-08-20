/* Keep inventory purchase totals connected to Finance expenses without double-counting. */
(function () {
  if (
    typeof Inventory === "undefined" ||
    typeof Finance === "undefined" ||
    typeof Utils === "undefined"
  )
    return;

  const SOURCE_TYPE = "inventory_purchase";

  function purchaseAmount(item) {
    const explicit = Number(item?.totalPurchaseCost || 0);
    if (explicit > 0) return explicit;

    const purchaseQuantity = Math.max(0, Number(item?.purchaseQuantity || 0));
    const unitsPerPurchase = Math.max(1, Number(item?.unitsPerPurchase || 1));
    const purchaseCost = Math.max(0, Number(item?.purchaseCost || 0));
    const costType = String(item?.purchaseCostType || "Total Purchase");

    if (costType === "Per Purchase Unit") return purchaseCost * purchaseQuantity;
    if (costType === "Per Individual Unit")
      return purchaseCost * purchaseQuantity * unitsPerPurchase;
    return purchaseCost;
  }

  function syncAll() {
    let changed = false;
    const transactions = Finance.transactions;

    Inventory.all().forEach((item) => {
      const amount = purchaseAmount(item);
      let transaction = transactions.find(
        (row) =>
          row.sourceType === SOURCE_TYPE && String(row.sourceId) === String(item.id),
      );

      if (amount <= 0) {
        if (transaction && transaction.status !== "Cancelled") {
          transaction.status = "Cancelled";
          transaction.notes = "Automatically cancelled because the linked inventory purchase total is zero.";
          changed = true;
        }
        return;
      }

      const desired = {
        date: item.purchaseDate || String(item.created || Utils.date()).slice(0, 10),
        type: "Expense",
        category: "Inventory Purchase",
        description: `Inventory purchase — ${item.name || "Unnamed item"}`,
        amount,
        eventId: String(item.eventId || ""),
        vendorId: String(item.vendorId || ""),
        customerId: "",
        paymentMethod: transaction?.paymentMethod || "Other",
        status: "Completed",
        taxAmount: Number(transaction?.taxAmount || 0),
        notes: item.purchaseNotes || "Automatically linked from Inventory.",
        sourceType: SOURCE_TYPE,
        sourceId: item.id,
      };

      if (!transaction) {
        transaction = {
          id: Utils.id(),
          created: Utils.date(),
          ...desired,
        };
        transactions.push(transaction);
        changed = true;
        return;
      }

      for (const [key, value] of Object.entries(desired)) {
        if (transaction[key] !== value) {
          transaction[key] = value;
          changed = true;
        }
      }
    });

    if (changed) Finance.save();
    return changed;
  }

  const originalCreate = Inventory.create.bind(Inventory);
  Inventory.create = function (data = {}) {
    const item = originalCreate(data);
    syncAll();
    return item;
  };

  const originalUpdate = Inventory.update.bind(Inventory);
  Inventory.update = function (id, updates) {
    const result = originalUpdate(id, updates);
    syncAll();
    return result;
  };

  Inventory.syncPurchaseExpenses = syncAll;
  syncAll();
})();
