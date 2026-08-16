/* Collapse event menu item forms after save. */
(function () {
  if (
    typeof EventMenu === "undefined" ||
    typeof Events === "undefined" ||
    typeof UI === "undefined" ||
    typeof Utils === "undefined"
  )
    return;

  let editingKey = "";

  function key(eventId, itemId) {
    return `${eventId}:${itemId}`;
  }

  function fieldId(eventId, itemId, name) {
    return `menu-item-${eventId}-${itemId}-${name}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
  }

  function value(eventId, itemId, name) {
    return document.getElementById(fieldId(eventId, itemId, name))?.value || "";
  }

  function checked(eventId, itemId, name) {
    return !!document.getElementById(fieldId(eventId, itemId, name))?.checked;
  }

  function commitOpenEditor(eventId) {
    if (!editingKey || !editingKey.startsWith(`${eventId}:`)) return;
    const itemId = editingKey.slice(String(eventId).length + 1);
    const event = EventMenu.ensureEvent(Events.get(eventId));
    const item = event?.menuItems?.find(
      (row) => String(row.id) === String(itemId),
    );
    if (!item || event.menuFinalized) return;
    Object.assign(item, {
      name: value(eventId, itemId, "name").trim(),
      description: value(eventId, itemId, "description").trim(),
      category: value(eventId, itemId, "category").trim() || "Food",
      price: Number(value(eventId, itemId, "price") || 0),
      quantity: Number(value(eventId, itemId, "quantity") || 0),
      active: checked(eventId, itemId, "active"),
      includedWithVip: checked(eventId, itemId, "includedWithVip"),
    });
    Events.update(eventId, { menuItems: event.menuItems });
  }

  function renderMenu(eventId) {
    if (typeof EventMenu.open === "function") EventMenu.open(eventId);
    else UI.renderEvents();
  }

  function optionList(values) {
    return values
      .map((value) => `<option value="${UI.esc(value)}"></option>`)
      .join("");
  }

  function itemEditor(menu, event, item) {
    const disabled = event.menuFinalized ? "disabled" : "";
    const categories = menu.categories();
    const categoryListId = fieldId(event.id, item.id, "categories");
    return `
            <div style="border:1px solid #2f75b5;border-radius:10px;padding:12px;margin:10px 0;background:#f8fafc;">
                <h4>${item.name ? "Edit Menu Item" : "Create Menu Item"}</h4>
                <datalist id="${categoryListId}">${optionList(categories)}</datalist>

                <label>Item Name</label>
                <input ${disabled} id="${fieldId(event.id, item.id, "name")}" placeholder="Menu item name" value="${UI.esc(item.name || "")}">

                <label>Description</label>
                <textarea ${disabled} id="${fieldId(event.id, item.id, "description")}" placeholder="Describe exactly what the guest receives">${UI.esc(item.description || "")}</textarea>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
                    <div>
                        <label>Category</label>
                        <input ${disabled} id="${fieldId(event.id, item.id, "category")}" list="${categoryListId}" placeholder="Beverage Package, Food, Entree..." value="${UI.esc(item.category || "")}">
                    </div>
                    <div>
                        <label>Price</label>
                        <input ${disabled} id="${fieldId(event.id, item.id, "price")}" type="number" min="0" step="0.01" placeholder="0.00" value="${Number(item.price || 0)}">
                    </div>
                    <div>
                        <label>Quantity Available</label>
                        <input ${disabled} id="${fieldId(event.id, item.id, "quantity")}" type="number" min="0" step="1" placeholder="0" value="${Number(item.quantity || 0)}">
                    </div>
                </div>

                <label>
                    <input ${disabled} id="${fieldId(event.id, item.id, "active")}" type="checkbox" ${item.active !== false ? "checked" : ""}>
                    Available on this event menu
                </label>
                <label>
                    <input ${disabled} id="${fieldId(event.id, item.id, "includedWithVip")}" type="checkbox" ${item.includedWithVip ? "checked" : ""}>
                    Eligible for a ticket-included food/drink benefit
                </label>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <button type="button" onclick="EventMenu.saveItem('${UI.esc(event.id)}','${UI.esc(item.id)}')">Save Menu Item</button>
                    <button type="button" onclick="EventMenu.cancelItemEdit('${UI.esc(event.id)}','${UI.esc(item.id)}')">Cancel</button>
                    ${event.menuFinalized ? "" : `<button type="button" onclick="EventMenu.removeItem('${UI.esc(event.id)}','${UI.esc(item.id)}')">Remove from Event</button>`}
                </div>
            </div>
        `;
  }

  function itemSummary(event, item) {
    return `
            <div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;background:#fff;">
                <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start;">
                    <div>
                        <h4 style="margin:0 0 6px;">${UI.esc(item.name || "Unnamed Menu Item")}</h4>
                        <p><strong>Category:</strong> ${UI.esc(item.category || "Food")}</p>
                        <p><strong>Description:</strong> ${UI.esc(item.description || "No description yet.")}</p>
                    </div>
                    <div>
                        <p><strong>Price:</strong> ${Utils.money(item.price || 0)}</p>
                        <p><strong>Quantity:</strong> ${Number(item.quantity || 0)}</p>
                        <p><strong>Status:</strong> ${item.active !== false ? "Available" : "Inactive"}</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <button type="button" onclick="EventMenu.editItem('${UI.esc(event.id)}','${UI.esc(item.id)}')">Edit</button>
                    <button type="button" onclick="EventMenu.saveTemplate('${UI.esc(event.id)}','${UI.esc(item.id)}')">Save to Menu Library</button>
                    ${event.menuFinalized ? "" : `<button type="button" onclick="EventMenu.removeItem('${UI.esc(event.id)}','${UI.esc(item.id)}')">Remove from Event</button>`}
                </div>
            </div>
        `;
  }

  EventMenu.editItem = function (eventId, itemId) {
    editingKey = key(eventId, itemId);
    renderMenu(eventId);
  };

  EventMenu.cancelItemEdit = function (eventId) {
    editingKey = "";
    renderMenu(eventId);
  };

  EventMenu.saveItem = function (eventId, itemId) {
    const event = this.ensureEvent(Events.get(eventId));
    if (!event || event.menuFinalized) return;
    const item = event.menuItems.find((row) => row.id === itemId);
    if (!item) return;

    Object.assign(item, {
      name: value(eventId, itemId, "name").trim(),
      description: value(eventId, itemId, "description").trim(),
      category: value(eventId, itemId, "category").trim() || "Food",
      price: Number(value(eventId, itemId, "price") || 0),
      quantity: Number(value(eventId, itemId, "quantity") || 0),
      active: checked(eventId, itemId, "active"),
      includedWithVip: checked(eventId, itemId, "includedWithVip"),
    });

    Events.update(eventId, { menuItems: event.menuItems });
    editingKey = "";
    renderMenu(eventId);
  };

  EventMenu.addBlank = function (eventId, category = "Food") {
    const event = this.ensureEvent(Events.get(eventId));
    if (!event) return;
    if (event.menuFinalized)
      return alert("Reopen the finalized menu before changing it.");
    const defaultPrice =
      category === "Entree"
        ? 25
        : category === "Beverage Package"
          ? 10
          : 0;
    const item = {
      id: Utils.id(),
      name: "",
      description: "",
      category,
      price: defaultPrice,
      quantity: 0,
      active: true,
      includedWithVip: false,
    };
    event.menuItems.push(item);
    Events.update(eventId, { menuItems: event.menuItems });
    editingKey = key(eventId, item.id);
    renderMenu(eventId);
  };

  const originalAddFromTemplate = EventMenu.addFromTemplate.bind(EventMenu);
  EventMenu.addFromTemplate = function (eventId, templateId) {
    // Selecting a reusable item must not discard edits already on screen.
    commitOpenEditor(eventId);
    editingKey = "";
    originalAddFromTemplate(eventId, templateId);
    renderMenu(eventId);
  };

  EventMenu.removeItem = function (eventId, itemId) {
    const event = this.ensureEvent(Events.get(eventId));
    if (!event) return;
    if (event.menuFinalized)
      return alert("Reopen the finalized menu before changing it.");
    event.menuItems = event.menuItems.filter((row) => row.id !== itemId);
    Events.update(eventId, { menuItems: event.menuItems });
    if (editingKey === key(eventId, itemId)) editingKey = "";
    renderMenu(eventId);
  };

  EventMenu.rows = function (event) {
    event = this.ensureEvent(event);
    if (!event.menuItems.length)
      return "<p>No menu items assigned to this event yet. Choose approved beverage packages or saved food items from the library above.</p>";
    return event.menuItems
      .map((item) =>
        editingKey === key(event.id, item.id)
          ? itemEditor(this, event, item)
          : itemSummary(event, item),
      )
      .join("");
  };
})();
