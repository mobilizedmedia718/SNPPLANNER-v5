/* Reusable food/beverage menu templates and per-event menus. */
(function () {
  if (
    typeof UI === "undefined" ||
    typeof Events === "undefined" ||
    typeof Utils === "undefined"
  )
    return;

  const EventMenu = {
    templateKey: "event_menu_templates",
    templates() {
      return Utils.load(this.templateKey, []);
    },
    saveTemplates(list) {
      Utils.save(this.templateKey, list);
    },
    systemPresets() {
      return [
        {
          id: "preset-featured-beverage-single",
          name: "Featured Beverage Ticket — Serves 1",
          description: "Includes one featured beverage.",
          category: "Beverage Package",
          price: 10,
          preset: true,
          regulatedBeverage: true,
          alcohol: true,
          licensedBarOnly: true,
        },
        {
          id: "preset-featured-beverage-two",
          name: "Featured Beverage Package — Serves 2",
          description:
            "Designed for two guests, with an average of 2–2½ beverages per person.",
          category: "Beverage Package",
          price: 25,
          preset: true,
          regulatedBeverage: true,
          alcohol: true,
          licensedBarOnly: true,
        },
        {
          id: "preset-featured-beverage-pitcher",
          name: "Featured Beverage Pitcher Package — Serves 4",
          description:
            "Designed for four guests, with an average of 2–2½ beverages per person.",
          category: "Beverage Package",
          price: 50,
          preset: true,
          regulatedBeverage: true,
          alcohol: true,
          licensedBarOnly: true,
        },
        {
          id: "preset-entree",
          name: "Featured Entree",
          description: "Describe the featured entree for this event.",
          category: "Entree",
          price: 25,
          preset: true,
        },
        {
          id: "preset-food",
          name: "Food Item",
          description: "Describe this food item.",
          category: "Food",
          price: 0,
          preset: true,
        },
        {
          id: "preset-snack",
          name: "Snack",
          description: "Describe this snack.",
          category: "Snack",
          price: 0,
          preset: true,
        },
        {
          id: "preset-dessert",
          name: "Dessert",
          description: "Describe this dessert.",
          category: "Dessert",
          price: 0,
          preset: true,
        },
        {
          id: "preset-nonalcoholic",
          name: "Non-Alcoholic Beverage",
          description: "Describe this beverage.",
          category: "Non-Alcoholic",
          price: 0,
          preset: true,
        },
      ];
    },
    library() {
      const byKey = new Map();
      [...this.systemPresets(), ...this.templates()].forEach((item) =>
        byKey.set(
          `${String(item.category || "")
            .trim()
            .toLowerCase()}|${String(item.name || "")
            .trim()
            .toLowerCase()}`,
          item,
        ),
      );
      return [...byKey.values()];
    },
    ensureEvent(event) {
      if (!event) return null;
      if (!Array.isArray(event.menuItems)) {
        event.menuItems = [];
        Events.update(event.id, { menuItems: event.menuItems });
      }
      return event;
    },
    categories() {
      return [
        ...new Set([
          "Beverage Package",
          "Entree",
          "Food",
          "Snack",
          "Dessert",
          "Non-Alcoholic",
          "Beverage",
          "Special",
          ...this.library()
            .map((x) => String(x.category || "").trim())
            .filter(Boolean),
        ]),
      ].sort();
    },
    publicUrl(eventId) {
      return `https://mobilizedmedia718.github.io/SNPPLANNER-v5/preorder.html?event_id=${encodeURIComponent(eventId)}`;
    },
    qrPosterUrl(eventId) {
      return `https://mobilizedmedia718.github.io/SNPPLANNER-v5/menu-qr.html?event_id=${encodeURIComponent(eventId)}`;
    },
    activeItems(event) {
      return (event.menuItems || []).filter(
        (x) =>
          x.active !== false &&
          String(x.name || "").trim() &&
          Number(x.price || 0) > 0,
      );
    },
    finalize(eventId) {
      const event = this.ensureEvent(Events.get(eventId));
      if (!event) return;
      const items = this.activeItems(event);
      if (!items.length)
        return alert(
          "Add at least one active menu item with a price before finalizing the menu.",
        );
      const snapshot = JSON.parse(JSON.stringify(items));
      const stamp = new Date().toISOString();
      Events.update(eventId, {
        menuFinalized: true,
        menuFinalizedAt: stamp,
        finalizedMenuItems: snapshot,
        menuPublicUrl: this.publicUrl(eventId),
      });
      alert("Menu finalized. The public ordering QR is ready to print.");
      UI.renderEvents();
    },
    reopen(eventId) {
      const event = Events.get(eventId);
      if (!event) return;
      if (
        !confirm(
          "Reopen this menu for editing? The existing printed QR will still work, but the public menu will not update until you finalize again.",
        )
      )
        return;
      Events.update(eventId, { menuFinalized: false });
      UI.renderEvents();
    },
    addBlank(eventId, category = "Food") {
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
      event.menuItems.push({
        id: Utils.id(),
        name: "",
        description: "",
        category,
        price: defaultPrice,
        quantity: 0,
        active: true,
        includedWithVip: false,
      });
      Events.update(eventId, { menuItems: event.menuItems });
      UI.renderEvents();
    },
    addFromTemplate(eventId, templateId) {
      const template = this.library().find((x) => x.id === templateId);
      if (!template) return;
      const event = this.ensureEvent(Events.get(eventId));
      if (!event) return;
      if (event.menuFinalized)
        return alert("Reopen the finalized menu before changing it.");
      event.menuItems.push({
        ...template,
        id: Utils.id(),
        quantity: 0,
        active: true,
        preset: false,
      });
      Events.update(eventId, { menuItems: event.menuItems });
      UI.renderEvents();
    },
    updateItem(eventId, itemId, key, value) {
      const event = this.ensureEvent(Events.get(eventId));
      if (!event) return;
      if (event.menuFinalized) return;
      const item = event.menuItems.find((x) => x.id === itemId);
      if (!item) return;
      item[key] = ["price", "quantity"].includes(key)
        ? Number(value || 0)
        : ["active", "includedWithVip"].includes(key)
          ? !!value
          : value;
      Events.update(eventId, { menuItems: event.menuItems });
    },
    removeItem(eventId, itemId) {
      const event = this.ensureEvent(Events.get(eventId));
      if (!event) return;
      if (event.menuFinalized)
        return alert("Reopen the finalized menu before changing it.");
      event.menuItems = event.menuItems.filter((x) => x.id !== itemId);
      Events.update(eventId, { menuItems: event.menuItems });
      UI.renderEvents();
    },
    saveTemplate(eventId, itemId) {
      const event = this.ensureEvent(Events.get(eventId));
      if (!event) return;
      const item = event.menuItems.find((x) => x.id === itemId);
      if (!item || !String(item.name || "").trim())
        return alert("Give the menu item a name first.");
      const list = this.templates();
      const existing = list.find(
        (x) =>
          String(x.name || "")
            .trim()
            .toLowerCase() ===
            String(item.name || "")
              .trim()
              .toLowerCase() &&
          String(x.category || "")
            .trim()
            .toLowerCase() ===
            String(item.category || "")
              .trim()
              .toLowerCase(),
      );
      const payload = {
        id: existing?.id || Utils.id(),
        name: item.name,
        description: item.description || "",
        category: item.category || "Food",
        price: Number(item.price || 0),
        includedWithVip: !!item.includedWithVip,
        regulatedBeverage: !!item.regulatedBeverage,
        alcohol: !!item.alcohol,
        licensedBarOnly: !!item.licensedBarOnly,
      };
      if (existing) Object.assign(existing, payload);
      else list.push(payload);
      this.saveTemplates(list);
      alert("Menu item saved to the reusable menu library.");
      UI.renderEvents();
    },
    rows(event) {
      event = this.ensureEvent(event);
      if (!event.menuItems.length)
        return `<p>No menu items assigned to this event yet. Choose only the wines and foods you want for this event from the library above.</p>`;
      const cats = this.categories(),
        disabled = event.menuFinalized ? "disabled" : "";
      return event.menuItems
        .map(
          (
            item,
          ) => `<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;">
        <label>Item Name</label><input ${disabled} placeholder="Menu item name" value="${UI.esc(item.name || "")}" oninput="EventMenu.updateItem('${event.id}','${item.id}','name',this.value)">
        <label>Description</label><textarea ${disabled} placeholder="Describe exactly what the guest receives" oninput="EventMenu.updateItem('${event.id}','${item.id}','description',this.value)">${UI.esc(item.description || "")}</textarea>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
          <div><label>Category</label><input ${disabled} list="menu-categories-${event.id}" placeholder="Beverage Package, Food, Entree..." value="${UI.esc(item.category || "")}" oninput="EventMenu.updateItem('${event.id}','${item.id}','category',this.value)"></div>
          <div><label>Price</label><input ${disabled} type="number" min="0" step="0.01" placeholder="0.00" value="${Number(item.price || 0)}" oninput="EventMenu.updateItem('${event.id}','${item.id}','price',this.value)"></div>
          <div><label>Quantity Available</label><input ${disabled} type="number" min="0" step="1" placeholder="0" value="${Number(item.quantity || 0)}" oninput="EventMenu.updateItem('${event.id}','${item.id}','quantity',this.value)"></div>
        </div><datalist id="menu-categories-${event.id}">${cats.map((c) => `<option value="${UI.esc(c)}">`).join("")}</datalist>
        <label><input ${disabled} type="checkbox" ${item.active !== false ? "checked" : ""} onchange="EventMenu.updateItem('${event.id}','${item.id}','active',this.checked)"> Available on this event menu</label>
        <label><input ${disabled} type="checkbox" ${item.includedWithVip ? "checked" : ""} onchange="EventMenu.updateItem('${event.id}','${item.id}','includedWithVip',this.checked)"> Eligible for a ticket-included food/drink benefit</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><button type="button" onclick="EventMenu.saveTemplate('${event.id}','${item.id}')">Save to Menu Library</button>${event.menuFinalized ? "" : `<button type="button" onclick="EventMenu.removeItem('${event.id}','${item.id}')">Remove from Event</button>`}</div>
      </div>`,
        )
        .join("");
    },
    libraryOptions(category) {
      return this.library()
        .filter((x) => !category || x.category === category)
        .map(
          (t) =>
            `<option value="${UI.esc(t.id)}">${UI.esc(t.name)} — ${Utils.money(Number(t.price || 0))}</option>`,
        )
        .join("");
    },
    card(event) {
      event = this.ensureEvent(event);
      const link = this.publicUrl(event.id),
        poster = this.qrPosterUrl(event.id);
      return `<div class="card"><h3>Event Food & Beverage Menu</h3>
        ${event.menuFinalized ? `<div style="padding:12px;border:1px solid #9ccfae;background:#edf9f1;border-radius:10px"><strong>FINALIZED</strong>${event.menuFinalizedAt ? ` — ${Utils.formatDateTime(event.menuFinalizedAt)}` : ""}<br>This frozen menu is what customers see from the printed QR.</div>` : `<p>Build only the menu you want to offer at this event. The library remembers reusable items, while event prices, quantities, and descriptions remain editable.</p>`}
        ${
          event.menuFinalized
            ? ""
            : `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:end;">
          <div><label>Approved Beverage Packages</label><select onchange="if(this.value){EventMenu.addFromTemplate('${event.id}',this.value);this.value=''}"><option value="">Choose a beverage package...</option>${this.libraryOptions("Beverage Package")}</select></div>
          <div><label>Food / Entree Library</label><select onchange="if(this.value){EventMenu.addFromTemplate('${event.id}',this.value);this.value=''}"><option value="">Choose saved food...</option>${this.library()
            .filter((t) => t.category !== "Beverage Package")
            .map(
              (t) =>
                `<option value="${UI.esc(t.id)}">${UI.esc(t.category)} — ${UI.esc(t.name)} — ${Utils.money(Number(t.price || 0))}</option>`,
            )
            .join("")}</select></div>
        </div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"><button type="button" onclick="EventMenu.addBlank('${event.id}','Beverage Package')">+ New Beverage Package</button><button type="button" onclick="EventMenu.addBlank('${event.id}','Entree')">+ New Entree ($25 start)</button><button type="button" onclick="EventMenu.addBlank('${event.id}','Food')">+ New Food Item</button><button type="button" onclick="EventMenu.addBlank('${event.id}','Snack')">+ New Snack</button></div>`
        }
        <hr><p><strong>Customer ordering page:</strong></p><input readonly value="${UI.esc(link)}" onclick="this.select()">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${event.menuFinalized ? `<button type="button" onclick="window.open('${UI.esc(poster)}','_blank')">View / Print Menu QR</button><button type="button" onclick="EventMenu.reopen('${event.id}')">Reopen Menu for Editing</button>` : `<button type="button" onclick="EventMenu.finalize('${event.id}')">Finalize Menu & Generate QR</button>`}</div>
        ${this.rows(event)}
      </div>`;
    },
    open(eventId) {
      const event = this.ensureEvent(Events.get(eventId));
      if (!event) return;
      const ws = document.getElementById("workspace");
      if (ws)
        ws.innerHTML = `<h2>Menu — ${UI.esc(event.name || "Event")}</h2>${this.card(event)}${window.LiveEvent?.activeId ? `<button onclick="LiveEvent.enter('${UI.esc(eventId)}')">Back to Live Event</button>` : ""}`;
    },
  };
  window.EventMenu = EventMenu;
  const priorEvents = UI.renderEvents;
  UI.renderEvents = function (...args) {
    const result = priorEvents.apply(this, args);
    const workspace = document.getElementById("workspace");
    if (!workspace) return result;
    Events.all().forEach((event) => {
      const cards = [...workspace.querySelectorAll(".card")];
      const card = cards.find((c) =>
        c.querySelector(`input[onchange*="Events.update('${event.id}'"]`),
      );
      if (card && !document.getElementById(`event-menu-${event.id}`)) {
        const quick = document.createElement("button");
        quick.type = "button";
        quick.textContent = "Menu";
        quick.onclick = () => EventMenu.open(event.id);
        card.appendChild(quick);
        const wrap = document.createElement("div");
        wrap.id = `event-menu-${event.id}`;
        wrap.innerHTML = EventMenu.card(event);
        card.insertAdjacentElement("afterend", wrap);
      }
    });
    return result;
  };
})();
