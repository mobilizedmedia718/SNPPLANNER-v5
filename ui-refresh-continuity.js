/*
 * Site-wide refresh continuity for SNP Planner.
 * Restores the current planner view and unsaved workspace form values after a
 * browser refresh in the same tab/session. Draft recovery is not a database save.
 */
(function () {
  if (typeof UI === "undefined") return;

  const VIEW_KEY = "snpPlannerCurrentViewV2";
  const DRAFT_PREFIX = "snpPlannerDraftV2:";
  const LEGACY_VIEW_KEY = "snpPlannerCurrentViewV1";
  let currentView = null;
  let restoring = false;
  let wrappersInstalled = false;

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); }
    catch (e) { console.warn("Planner refresh state could not be saved", e); }
  }
  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); }
    catch (_) { return null; }
  }
  function safeSessionRemove(key) {
    try { sessionStorage.removeItem(key); }
    catch (_) {}
  }

  function serializableArgs(args) {
    try { return JSON.parse(JSON.stringify(Array.from(args || []))); }
    catch (_) { return []; }
  }

  function workspaceSignature() {
    const ws = document.getElementById("workspace");
    return ws ? ws.innerHTML : "";
  }

  function viewKey(view = currentView) {
    if (!view) return "home";
    return `${view.namespace || "UI"}.${view.method}:${JSON.stringify(view.args || [])}`;
  }

  function saveView(namespace, method, args) {
    if (restoring || !window.SNPPlanner?.initialized) return;
    currentView = { namespace, method, args: serializableArgs(args) };
    safeSessionSet(VIEW_KEY, JSON.stringify(currentView));
  }

  function fieldIdentity(el, index) {
    if (el.id) return `id:${el.id}`;
    if (el.name) return `name:${el.name}:${index}`;
    return `index:${index}`;
  }

  function draftFields() {
    const ws = document.getElementById("workspace");
    if (!ws) return [];
    return Array.from(ws.querySelectorAll("input, textarea, select")).filter((el) => {
      const type = String(el.type || "").toLowerCase();
      return type !== "password" && type !== "file" && !el.disabled;
    });
  }

  function captureDraft() {
    if (!currentView || currentView.method === "home") return;
    const fields = draftFields();
    if (!fields.length) return;

    const values = {};
    fields.forEach((el, index) => {
      const key = fieldIdentity(el, index);
      const type = String(el.type || "").toLowerCase();
      values[key] = (type === "checkbox" || type === "radio")
        ? { checked: !!el.checked }
        : { value: el.value };
    });

    safeSessionSet(DRAFT_PREFIX + viewKey(), JSON.stringify({ savedAt: Date.now(), values }));
  }

  function restoreDraft() {
    if (!currentView || currentView.method === "home") return;
    const raw = safeSessionGet(DRAFT_PREFIX + viewKey());
    if (!raw) return;

    let draft;
    try { draft = JSON.parse(raw); }
    catch (_) { return; }
    if (!draft?.values) return;

    draftFields().forEach((el, index) => {
      const saved = draft.values[fieldIdentity(el, index)];
      if (!saved) return;
      const type = String(el.type || "").toLowerCase();
      if (type === "checkbox" || type === "radio") el.checked = !!saved.checked;
      else if (Object.prototype.hasOwnProperty.call(saved, "value")) el.value = saved.value;
    });
  }

  function clearCurrentDraft() {
    if (currentView) safeSessionRemove(DRAFT_PREFIX + viewKey());
  }

  function targetByName(name) {
    if (name === "UI") return window.UI;
    return window[name];
  }

  function installObjectWrappers(namespace, object, methodFilter) {
    if (!object) return;
    Object.keys(object).forEach((method) => {
      const original = object[method];
      if (typeof original !== "function" || original.__snpRefreshWrapped) return;
      if (!methodFilter(method)) return;

      const wrapped = function (...args) {
        const before = workspaceSignature();
        const result = original.apply(this, args);

        const finish = () => {
          setTimeout(() => {
            const after = workspaceSignature();
            // Record only functions that actually navigated or materially rendered
            // the workspace. This avoids treating calculation/helper methods as views.
            if (after && after !== before) {
              saveView(namespace, method, args);
              setTimeout(restoreDraft, 20);
            }
          }, 0);
        };

        if (result && typeof result.then === "function") result.finally(finish);
        else finish();
        return result;
      };
      wrapped.__snpRefreshWrapped = true;
      object[method] = wrapped;
    });
  }

  function installWrappers() {
    if (wrappersInstalled) return;
    wrappersInstalled = true;

    // All current UI page renderers are covered automatically. Structural shell
    // functions are excluded because they are not independent user pages.
    const uiExclude = new Set([
      "renderLayout", "renderSidebar", "renderTopbar", "renderHeader",
      "esc", "statusBadge", "handleSearch"
    ]);
    installObjectWrappers("UI", window.UI, (name) =>
      /^(render|open|show)/i.test(name) && !uiExclude.has(name)
    );

    // Current feature modules that can own a full workspace screen outside UI.
    const featureTargets = [
      "EventMenu", "SNPCoupons", "PromoAgent", "CheckIn", "Checkin",
      "Sales", "TicketSales", "Redemptions", "GuestList", "Employees",
      "Eventbrite"
    ];
    featureTargets.forEach((name) => {
      const obj = window[name];
      installObjectWrappers(name, obj, (method) => /^(render|open|show|view|edit)/i.test(method));
    });
  }

  function restoreLastView() {
    let raw = safeSessionGet(VIEW_KEY);
    if (!raw) {
      // One-time compatibility with the first refresh-continuity version.
      const legacy = safeSessionGet(LEGACY_VIEW_KEY);
      if (legacy) {
        try {
          const old = JSON.parse(legacy);
          raw = JSON.stringify({ namespace: "UI", method: old.method, args: old.args || [] });
        } catch (_) {}
      }
    }
    if (!raw) return false;

    let view;
    try { view = JSON.parse(raw); }
    catch (_) { return false; }

    if (!view?.method || view.method === "home") return false;
    const target = targetByName(view.namespace || "UI");
    if (!target || typeof target[view.method] !== "function") return false;

    restoring = true;
    currentView = view;
    try {
      target[view.method](...(Array.isArray(view.args) ? view.args : []));
      setTimeout(restoreDraft, 75);
      return true;
    } catch (e) {
      console.error("Could not restore planner page after refresh", e);
      return false;
    } finally {
      restoring = false;
    }
  }

  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("#workspace")) captureDraft();
  }, true);
  document.addEventListener("change", (event) => {
    if (event.target?.closest?.("#workspace")) captureDraft();
  }, true);

  // Clear the draft only after an explicit Save/Create/Add action completes
  // without a browser-validity error. Permanent persistence remains the module's job.
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button || !button.closest("#workspace")) return;
    const text = String(button.textContent || "").trim();
    if (!/^(save|create|add)\b/i.test(text)) return;
    setTimeout(() => {
      if (!document.querySelector("#workspace :invalid")) clearCurrentDraft();
    }, 800);
  }, true);

  window.addEventListener("beforeunload", captureDraft);

  function patchHomeWhenReady() {
    if (!window.SNPHome || typeof SNPHome.home !== "function") return false;
    const originalHome = SNPHome.home;
    if (originalHome.__snpRefreshWrapped) return true;

    const wrappedHome = function (...args) {
      if (window.SNPPlanner?.initialized && !restoring) {
        clearCurrentDraft();
        currentView = { namespace: "SNPHome", method: "home", args: [] };
        safeSessionSet(VIEW_KEY, JSON.stringify(currentView));
      }
      return originalHome.apply(this, args);
    };
    wrappedHome.__snpRefreshWrapped = true;
    SNPHome.home = wrappedHome;
    return true;
  }

  function waitForPlanner() {
    installWrappers();
    patchHomeWhenReady();

    if (window.SNPPlanner?.initialized) {
      restoreLastView();
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
    installWrappers,
  };
})();
