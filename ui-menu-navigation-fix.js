/* Persistent Menu navigation + inventory-to-menu-library bridge. */
(function () {
  if (typeof UI === "undefined") return;

  function activeOrChoose() {
    const active = window.LiveEvent?.activeId || "";
    if (active && window.EventMenu) return EventMenu.open(active);
    const events = (window.Events?.all?.() || []).filter(
      (e) => e.status !== "Cancelled",
    );
    const ws = document.getElementById("workspace");
    if (!ws) return;
    ws.innerHTML = `<h2>Menu</h2><div class="card"><h3>Choose Event Menu</h3>${events.length ? events.map((e) => `<button type="button" style="display:block;width:100%;margin:8px 0;padding:12px;text-align:left" onclick="EventMenu.open('${UI.esc(e.id)}')"><strong>${UI.esc(e.name || "Untitled Event")}</strong>${e.date ? `<br><small>${UI.esc(e.date)}</small>` : ""}</button>`).join("") : "<p>Create an event first.</p>"}</div>`;
  }
  function addTopMenu() {
    const r = document.querySelector(".topbar-right");
    if (!r || document.getElementById("topPersistentMenuButton")) return;
    const existing = [...r.querySelectorAll("button")].find(
      (x) => String(x.textContent || "").trim() === "Menu",
    );
    if (existing) {
      existing.id = "topPersistentMenuButton";
      return;
    }
    const b = document.createElement("button");
    b.id = "topPersistentMenuButton";
    b.type = "button";
    b.textContent = "Menu";
    b.onclick = activeOrChoose;
    const logout = [...r.querySelectorAll("button")].find((x) =>
      /logout/i.test(x.textContent || ""),
    );
    if (logout) r.insertBefore(b, logout);
    else r.appendChild(b);
  }
  function addSidebarMenu() {
    const s = document.getElementById("sidebar");
    if (!s || document.getElementById("sidebarMenuButton")) return;
    const b = document.createElement("button");
    b.id = "sidebarMenuButton";
    b.type = "button";
    b.textContent = "Menu";
    b.onclick = activeOrChoose;
    const events = [...s.querySelectorAll("button")].find((x) =>
      /^Events$/i.test((x.textContent || "").trim()),
    );
    if (events) events.insertAdjacentElement("afterend", b);
    else s.appendChild(b);
  }
  function addEventMenus() {
    const ws = document.getElementById("workspace");
    if (!ws || !window.Events || !window.EventMenu) return;
    Events.all().forEach((e) => {
      const cards = [...ws.querySelectorAll(".card")];
      const card = cards.find(
        (c) =>
          c.querySelector(`input[onchange*="Events.update('${e.id}'"]`) ||
          c.querySelector(`select[onchange*="Events.update('${e.id}'"]`),
      );
      if (card && !card.querySelector(`[data-event-menu="${e.id}"]`)) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.eventMenu = e.id;
        b.textContent = "Menu";
        b.style.marginLeft = "8px";
        b.onclick = () => EventMenu.open(e.id);
        card.appendChild(b);
      }
    });
  }

  window.SNPMenuNav = {
    open: activeOrChoose,
    repair: () => {
      addTopMenu();
      addSidebarMenu();
      addEventMenus();
    },
  };

  const oldLayout = UI.renderLayout;
  if (typeof oldLayout === "function")
    UI.renderLayout = function (...a) {
      const r = oldLayout.apply(this, a);
      setTimeout(() => {
        addTopMenu();
        addSidebarMenu();
      }, 0);
      return r;
    };
  const oldSidebar = UI.renderSidebar;
  if (typeof oldSidebar === "function")
    UI.renderSidebar = function (...a) {
      const r = oldSidebar.apply(this, a);
      setTimeout(addSidebarMenu, 0);
      return r;
    };
  const oldEvents = UI.renderEvents;
  if (typeof oldEvents === "function")
    UI.renderEvents = function (...a) {
      const r = oldEvents.apply(this, a);
      setTimeout(addEventMenus, 0);
      return r;
    };

  // Inventory category: any inventory record marked Menu Item becomes a reusable
  // menu-library option using its Sell Price and description/notes.
  if (window.Inventory) {
    const oldCategories = Inventory.categories?.bind(Inventory);
    Inventory.categories = function () {
      return [
        ...new Set(["Menu Item", ...(oldCategories ? oldCategories() : [])]),
      ].sort();
    };
  }
  if (window.EventMenu && window.Inventory) {
    const oldLibrary = EventMenu.library.bind(EventMenu);
    EventMenu.library = function () {
      const base = oldLibrary();
      const inv = (Inventory.all?.() || [])
        .filter(
          (i) =>
            String(i.category || "")
              .trim()
              .toLowerCase() === "menu item" && i.status !== "Inactive",
        )
        .map((i) => ({
          id: `inventory-menu-${i.id}`,
          inventoryId: i.id,
          name: i.name || "Menu Item",
          description: i.notes || i.purchaseNotes || "",
          category: i.menuCategory || "Food",
          price: Number(i.sellPrice || 0),
          fromInventory: true,
        }));
      const seen = new Map();
      [...base, ...inv].forEach((x) =>
        seen.set(
          `${String(x.category || "").toLowerCase()}|${String(x.name || "").toLowerCase()}`,
          x,
        ),
      );
      return [...seen.values()];
    };
    const oldAdd = EventMenu.addFromTemplate.bind(EventMenu);
    EventMenu.addFromTemplate = function (eventId, templateId) {
      const invPrefix = "inventory-menu-";
      if (String(templateId).startsWith(invPrefix)) {
        const iid = String(templateId).slice(invPrefix.length);
        const src = Inventory.get(iid);
        const event = this.ensureEvent(Events.get(eventId));
        if (!src || !event) return;
        event.menuItems.push({
          id: Utils.id(),
          inventoryId: src.id,
          name: src.name || "",
          description: src.notes || src.purchaseNotes || "",
          category: src.menuCategory || "Food",
          price: Number(src.sellPrice || 0),
          quantity: Number(src.quantity || 0),
          active: true,
          includedWithVip: false,
        });
        Events.update(eventId, { menuItems: event.menuItems });
        UI.renderEvents();
        return;
      }
      return oldAdd(eventId, templateId);
    };
  }

  // Run once in case the layout already exists before this file loads.
  setTimeout(() => {
    addTopMenu();
    addSidebarMenu();
    addEventMenus();
  }, 0);
})();
