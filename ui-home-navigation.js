/* Dedicated full-page Planner Home with resilient route-based navigation. */
(function () {
  if (typeof UI === "undefined") return;

  const modules = [
    ["Executive Dashboard", "dashboard"],
    ["Business", "business"],
    ["Events", "events"],
    ["Venues", "venues"],
    ["Vendors", "vendors"],
    ["Inventory", "inventory"],
    ["Customers / CRM", "crm"],
    ["Coupons & Complimentary Benefits", "coupons"],
    ["Finance", "finance"],
    ["Assets", "assets"],
    ["Calendar", "calendar"],
    ["Reports", "reports"],
    ["Settings", "settings"],
  ];

  const routeHandlers = {
    dashboard: () => UI.renderDashboard.call(UI),
    business: () => UI.renderBusiness.call(UI),
    events: () => UI.renderEvents.call(UI),
    venues: () => UI.renderVenues.call(UI),
    vendors: () => UI.renderVendors.call(UI),
    inventory: () => UI.renderInventory.call(UI),
    crm: () => UI.renderCRM.call(UI),
    coupons: () => openCoupons(),
    finance: () => UI.renderFinance.call(UI),
    assets: () => UI.renderAssets.call(UI),
    calendar: () => UI.renderCalendar.call(UI),
    reports: () => UI.renderReports.call(UI),
    settings: () => UI.renderSettings.call(UI),
  };

  let currentRoute = "home";

  function version() {
    return window.SNPPlanner?.version || "5.30";
  }

  function shell() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.style.display = "none";

    const layout = document.querySelector(".layout");
    if (layout) {
      layout.style.display = "block";
      layout.style.width = "100%";
    }

    const ws = document.getElementById("workspace");
    if (ws) {
      ws.style.width = "100%";
      ws.style.maxWidth = "none";
      ws.style.margin = "0";
      ws.style.padding = "18px";
    }

    const top = document.querySelector(".topbar");
    if (top) top.style.display = "none";
  }

  function controls(show = true) {
    let d = document.getElementById("snpNavFloat");

    if (!show) {
      if (d) d.style.display = "none";
      return;
    }

    if (!d) {
      d = document.createElement("div");
      d.id = "snpNavFloat";
      d.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;gap:8px";
      d.innerHTML =
        '<button id="snpBackBtn" type="button" style="border-radius:999px;padding:12px 16px;box-shadow:0 3px 12px #0003">← Back</button>' +
        '<button id="snpHomeBtn" type="button" style="border-radius:999px;padding:12px 16px;box-shadow:0 3px 12px #0003">⌂ Home</button>';
      document.body.appendChild(d);
      d.querySelector("#snpBackBtn").addEventListener("click", back);
      d.querySelector("#snpHomeBtn").addEventListener("click", home);
    }

    d.style.display = "flex";
  }

  function home() {
    shell();
    currentRoute = "home";
    controls(false);

    const ws = document.getElementById("workspace");
    if (!ws) return;

    ws.innerHTML = `
      <section style="max-width:1100px;margin:0 auto;padding:12px 4px 40px">
        <div style="text-align:center;margin:8px 0 18px">
          <h1 style="margin-bottom:6px">🎨 SNP Planner</h1>
          <div style="font-weight:700;opacity:.75;margin-bottom:5px">Version ${UI.esc(version())}</div>
          <h2 style="margin-top:0">Home</h2>
        </div>
        <div class="card" style="margin-bottom:20px">
          <label for="snpHomeSearch"><strong>Search Planner</strong></label>
          <input id="snpHomeSearch" type="search" placeholder="Search customers, events, vendors..." style="width:100%;font-size:18px;padding:12px;margin-top:7px">
          <div id="snpHomeSearchResults"></div>
        </div>
        <div id="snpHomeModules" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px"></div>
        <div style="text-align:center;margin-top:24px;opacity:.65;font-size:13px">SNP Planner v${UI.esc(version())}</div>
      </section>`;

    const grid = document.getElementById("snpHomeModules");
    if (!grid) return;

    modules.forEach(([name, route]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = name;
      b.dataset.snpRoute = route;
      b.style.cssText =
        "min-height:94px;font-size:16px;font-weight:600;padding:14px";
      grid.appendChild(b);
    });

    const out = document.createElement("button");
    out.type = "button";
    out.textContent = "Log Out";
    out.dataset.snpLogout = "1";
    out.style.cssText =
      "min-height:94px;font-size:16px;font-weight:600;padding:14px";
    grid.appendChild(out);

    // One delegated handler keeps every Home button live, including after DOM changes.
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button || !grid.contains(button)) return;
      if (button.dataset.snpLogout === "1") {
        logout();
        return;
      }
      const route = button.dataset.snpRoute;
      if (route) openRoute(route);
    });

    const search = document.getElementById("snpHomeSearch");
    if (search) search.addEventListener("input", (e) => homeSearch(e.target.value));
  }

  async function openRoute(route) {
    const name = modules.find((x) => x[1] === route)?.[0] || route;
    const handler = routeHandlers[route];
    const ws = document.getElementById("workspace");

    if (typeof handler !== "function") {
      if (ws) {
        ws.innerHTML = `<h2>${UI.esc(name)}</h2><div class="card"><strong>This section is unavailable.</strong><p>Navigation handler not found.</p></div>`;
      }
      controls(true);
      return;
    }

    try {
      currentRoute = route;
      const result = handler();
      if (result && typeof result.then === "function") await result;
      shell();
      controls(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Home navigation failed:", name, err);
      if (ws) {
        ws.innerHTML = `<h2>${UI.esc(name)}</h2><div class="card"><strong>Could not open this section.</strong><p>${UI.esc(String(err?.message || err))}</p></div>`;
      }
      controls(true);
    }
  }

  function homeSearch(q) {
    const box = document.getElementById("snpHomeSearchResults");
    if (!box) return;
    if (!String(q || "").trim()) {
      box.innerHTML = "";
      return;
    }
    try {
      if (typeof UI.handleSearch === "function") {
        UI.handleSearch(q);
        currentRoute = "search";
        shell();
        controls(true);
      } else {
        box.innerHTML = "<p>Search is unavailable.</p>";
      }
    } catch (e) {
      console.error("Home search failed", e);
      box.innerHTML = `<p>${UI.esc(String(e?.message || e))}</p>`;
    }
  }

  // Back always returns to a freshly rebuilt Home. Restoring raw innerHTML loses
  // JavaScript listeners and was the cause of dead Home buttons after navigation.
  function back() {
    if (currentRoute === "home") return;
    home();
    window.scrollTo(0, 0);
  }

  function openCoupons() {
    shell();
    controls(true);
    const customers = CRM.all();
    const ws = document.getElementById("workspace");
    if (!ws) return;

    ws.innerHTML = `<h2>Coupons & Complimentary Benefits</h2><p>Select a customer to generate or review coupons, free admission, complimentary menu items, or complimentary inventory items.</p>${
      customers.length
        ? customers
            .map(
              (c) =>
                `<div class="card"><strong>${UI.esc(CRM.fullName(c))}</strong>${c.email ? " — " + UI.esc(c.email) : ""}<br><button type="button" data-coupon-customer="${UI.esc(c.id)}">Open Coupons</button></div>`,
            )
            .join("")
        : '<div class="card">No customers available.</div>'
    }`;

    document.querySelectorAll("[data-coupon-customer]").forEach((b) =>
      b.addEventListener("click", () => SNPCoupons.show(b.dataset.couponCustomer)),
    );
  }

  async function logout() {
    if (window.SNPDatabase) await SNPDatabase.signOut();
  }

  const oldLayout = UI.renderLayout;
  UI.renderLayout = function (...args) {
    const r = oldLayout.apply(UI, args);
    setTimeout(shell, 0);
    return r;
  };

  window.SNPHome = {
    home,
    back,
    openRoute,
    openModule: (index) => {
      const route = modules[index]?.[1];
      if (route) return openRoute(route);
    },
    homeSearch,
    openCoupons,
    logout,
    version,
  };
})();
