/*
 * Refresh continuity for SNP Planner.
 * Keeps the current planner screen and unsaved workspace form values through a
 * browser refresh in the same tab/session. This is draft recovery, not a DB save.
 */
(function () {
  if (typeof UI === "undefined") return;

  const VIEW_KEY = "snpPlannerCurrentViewV1";
  const DRAFT_PREFIX = "snpPlannerDraftV1:";
  let currentView = null;
  let restoring = false;

  const restorableMethods = [
    "renderDashboard",
    "renderBusiness",
    "renderEvents",
    "renderEventDetail",
    "renderEventEdit",
    "renderVenues",
    "renderVenueDetail",
    "renderVenueEdit",
    "renderVendors",
    "renderVendorDetail",
    "renderVendorEdit",
    "renderInventory",
    "renderInventoryDetail",
    "renderInventoryEdit",
    "renderCRM",
    "renderCustomerDetail",
    "renderCustomerEdit",
    "renderFinance",
    "renderFinanceDetail",
    "renderFinanceEdit",
    "renderAssets",
    "renderAssetDetail",
    "renderAssetEdit",
    "renderCalendar",
    "renderCalendarDetail",
    "renderCalendarEdit",
    "renderReports",
    "renderSettings",
  ];

  function safeSessionSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn("Planner refresh state could not be saved", e);
    }
  }

  function safeSessionGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSessionRemove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (_) {}
  }

  function viewKey(view = currentView) {
    if (!view) return "home";
    return `${view.method}:${JSON.stringify(view.args || [])}`;
  }

  function saveView(method, args) {
    if (restoring) return;
    currentView = { method, args: Array.from(args || []) };
    safeSessionSet(VIEW_KEY, JSON.stringify(currentView));
  }

  function fieldIdentity(el, index) {
    if (el.id) return `id:${el.id}`;
    if (el.name) return `name:${el.name}:${index}`;
    return `index:${index}`;
  }

  function captureDraft() {
    if (!currentView || currentView.method === "home") return;
    const ws = document.getElementById("workspace");
    if (!ws) return;

    const fields = Array.from(
      ws.querySelectorAll("input, textarea, select"),
    ).filter((el) => {
      const type = String(el.type || "").toLowerCase();
      return type !== "password" && type !== "file" && !el.disabled;
    });

    if (!fields.length) return;

    const values = {};
    fields.forEach((el, index) => {
      const key = fieldIdentity(el, index);
      const type = String(el.type || "").toLowerCase();
      values[key] =
        type === "checkbox" || type === "radio"
          ? { checked: !!el.checked }
          : { value: el.value };
    });

    safeSessionSet(
      DRAFT_PREFIX + viewKey(),
      JSON.stringify({ savedAt: Date.now(), values }),
    );
  }

  function restoreDraft() {
    if (!currentView || currentView.method === "home") return;
    const raw = safeSessionGet(DRAFT_PREFIX + viewKey());
    if (!raw) return;

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch (_) {
      return;
    }

    // Same-session drafts are intended for accidental refresh recovery.
    if (!draft || !draft.values) return;

    const ws = document.getElementById("workspace");
    if (!ws) return;
    const fields = Array.from(
      ws.querySelectorAll("input, textarea, select"),
    ).filter((el) => {
      const type = String(el.type || "").toLowerCase();
      return type !== "password" && type !== "file" && !el.disabled;
    });

    fields.forEach((el, index) => {
      const saved = draft.values[fieldIdentity(el, index)];
      if (!saved) return;
      const type = String(el.type || "").toLowerCase();
      if (type === "checkbox" || type === "radio") {
        el.checked = !!saved.checked;
      } else if (Object.prototype.hasOwnProperty.call(saved, "value")) {
        el.value = saved.value;
      }
    });
  }

  function clearCurrentDraft() {
    if (!currentView) return;
    safeSessionRemove(DRAFT_PREFIX + viewKey());
  }

  restorableMethods.forEach((method) => {
    const original = UI[method];
    if (typeof original !== "function" || original.__snpRefreshWrapped) return;

    const wrapped = function (...args) {
      saveView(method, args);
      const result = original.apply(this, args);
      const finish = () => setTimeout(restoreDraft, 25);
      if (result && typeof result.then === "function") {
        return result.finally(finish);
      }
      finish();
      return result;
    };
    wrapped.__snpRefreshWrapped = true;
    UI[method] = wrapped;
  });

  function restoreLastView() {
    const raw = safeSessionGet(VIEW_KEY);
    if (!raw) return;

    let view;
    try {
      view = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (!view || typeof UI[view.method] !== "function") return;

    restoring = true;
    currentView = view;
    try {
      UI[view.method](...(Array.isArray(view.args) ? view.args : []));
      setTimeout(restoreDraft, 50);
    } catch (e) {
      console.error("Could not restore planner page after refresh", e);
    } finally {
      restoring = false;
    }
  }

  // Save draft continuously while the user types/changes fields.
  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("#workspace")) captureDraft();
  }, true);
  document.addEventListener("change", (event) => {
    if (event.target?.closest?.("#workspace")) captureDraft();
  }, true);

  // A successful explicit Save/Create/Add should not leave stale draft values.
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button || !button.closest("#workspace")) return;
    const text = String(button.textContent || "").trim();
    if (!/^(save|create|add)\b/i.test(text)) return;
    setTimeout(() => {
      const invalid = document.querySelector("#workspace :invalid");
      if (!invalid) clearCurrentDraft();
    }, 750);
  }, true);

  // Refresh/unload gets one final snapshot of unsaved workspace values.
  window.addEventListener("beforeunload", captureDraft);

  // Home should become the saved page only when the user deliberately chooses it,
  // not during the application's normal startup sequence.
  function patchHomeWhenReady() {
    if (!window.SNPHome || typeof SNPHome.home !== "function") return false;
    const originalHome = SNPHome.home;
    if (originalHome.__snpRefreshWrapped) return true;
    const wrappedHome = function (...args) {
      if (window.SNPPlanner?.initialized && !restoring) {
        clearCurrentDraft();
        currentView = { method: "home", args: [] };
        safeSessionSet(VIEW_KEY, JSON.stringify(currentView));
      }
      return originalHome.apply(this, args);
    };
    wrappedHome.__snpRefreshWrapped = true;
    SNPHome.home = wrappedHome;
    return true;
  }

  // Wait until authenticated startup finishes, then replace the startup Home with
  // the last page that was active before refresh.
  function waitForPlanner() {
    patchHomeWhenReady();
    if (window.SNPPlanner?.initialized) {
      const raw = safeSessionGet(VIEW_KEY);
      if (raw) {
        try {
          const view = JSON.parse(raw);
          if (view?.method && view.method !== "home") restoreLastView();
        } catch (_) {}
      }
      return;
    }
    setTimeout(waitForPlanner, 120);
  }

  setTimeout(waitForPlanner, 0);

  window.SNPRefreshContinuity = {
    captureDraft,
    restoreDraft,
    clearCurrentDraft,
    restoreLastView,
    getCurrentView: () => currentView,
  };
})();
