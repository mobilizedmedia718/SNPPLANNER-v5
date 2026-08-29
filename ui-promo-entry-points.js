/* Promo Agent entry points for Home and event-specific workflows. */
(function () {
  if (typeof UI === "undefined" || typeof PromoAgent === "undefined") return;

  function eventById(eventId) {
    if (!eventId || typeof Events === "undefined" || typeof Events.get !== "function") return null;
    return Events.get(eventId) || null;
  }

  function ticketUrlForEvent(eventId) {
    const event = eventById(eventId);
    let url = "";

    try {
      if (typeof Eventbrite !== "undefined" && typeof Eventbrite.link === "function") {
        url = String(Eventbrite.link(eventId)?.publicUrl || "").trim();
      }
    } catch (_) {}

    if (!url && event) {
      url = String(
        event.ticketUrl || event.eventUrl || event.publicUrl || event.registrationUrl || "",
      ).trim();
    }

    return url;
  }

  function syncSelectedEventUrl(eventId) {
    if (!eventId) return;
    const url = ticketUrlForEvent(eventId);
    // Never carry a different event's ticket link into a newly selected campaign.
    PromoAgent.state.eventUrl = url || "";
  }

  const originalUpdateSetting = PromoAgent.updateSetting.bind(PromoAgent);
  PromoAgent.updateSetting = function (field, value) {
    originalUpdateSetting(field, value);

    if (field === "selectedEventId") {
      const selected = this.currentEvent?.();
      if (selected?.id) {
        syncSelectedEventUrl(selected.id);
        if (this.__returnToEventId) this.__returnToEventId = selected.id;
        this.save();
      }
    }
  };

  PromoAgent.openGlobal = function () {
    this.__returnToEventId = "";
    this.render();
    window.scrollTo(0, 0);
  };

  PromoAgent.openForEvent = function (eventId) {
    const event = eventById(eventId);
    if (!event) {
      alert("That event could not be found.");
      return;
    }

    this.__returnToEventId = event.id;
    this.state.selectedEventId = event.id;
    syncSelectedEventUrl(event.id);
    this.save();
    this.render();
    window.scrollTo(0, 0);
  };

  PromoAgent.backToEvent = function () {
    const eventId = this.__returnToEventId;
    this.__returnToEventId = "";
    if (eventId && typeof UI.renderEventDetail === "function") {
      UI.renderEventDetail(eventId);
      window.scrollTo(0, 0);
      return;
    }
    if (typeof UI.renderEvents === "function") UI.renderEvents();
  };

  function injectPromoContextBar() {
    const eventId = PromoAgent.__returnToEventId;
    if (!eventId) return;
    const event = eventById(eventId);
    const workspace = document.getElementById("workspace");
    if (!workspace || document.getElementById("snpPromoContextBar")) return;

    const bar = document.createElement("div");
    bar.id = "snpPromoContextBar";
    bar.className = "card";
    bar.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px";

    const label = document.createElement("div");
    label.innerHTML = `<strong>Promoting:</strong> ${UI.esc(event?.name || "Selected event")}`;

    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "← Back to Event";
    back.addEventListener("click", () => PromoAgent.backToEvent());

    bar.appendChild(label);
    bar.appendChild(back);
    workspace.insertBefore(bar, workspace.firstChild);
  }

  const originalPromoRender = PromoAgent.render.bind(PromoAgent);
  PromoAgent.render = function (...args) {
    const result = originalPromoRender(...args);
    injectPromoContextBar();
    return result;
  };

  function injectEventsLandingButton() {
    const workspace = document.getElementById("workspace");
    const newEventButton = document.getElementById("snpNewEventButton");
    if (!workspace || !newEventButton || document.getElementById("snpEventsPromoAgentButton")) return;

    const button = document.createElement("button");
    button.id = "snpEventsPromoAgentButton";
    button.type = "button";
    button.textContent = "📣 Promo Agent — Choose Event";
    button.style.cssText =
      "width:100%;padding:13px 16px;font-size:16px;font-weight:700;margin:0 0 18px 0";
    button.addEventListener("click", () => {
      if (window.SNPHome && typeof SNPHome.openRoute === "function") {
        SNPHome.openRoute("promo");
      } else {
        PromoAgent.openGlobal();
      }
    });

    newEventButton.insertAdjacentElement("afterend", button);
  }

  function injectEventDetailButton(eventId) {
    const event = eventById(eventId);
    const workspace = document.getElementById("workspace");
    if (!event || !workspace || document.getElementById("snpEventPromoAgentButton")) return;

    const firstCard = workspace.querySelector(".card");
    if (!firstCard) return;

    const wrap = document.createElement("div");
    wrap.style.cssText = "margin:0 0 16px 0";

    const button = document.createElement("button");
    button.id = "snpEventPromoAgentButton";
    button.type = "button";
    button.textContent = `📣 Promo Agent for ${event.name || "This Event"}`;
    button.style.cssText = "width:100%;padding:13px 16px;font-size:16px;font-weight:700";
    button.addEventListener("click", () => PromoAgent.openForEvent(event.id));

    wrap.appendChild(button);
    firstCard.parentNode.insertBefore(wrap, firstCard);
  }

  function wrapRenderer(name, afterRender) {
    const original = UI[name];
    if (typeof original !== "function" || original.__promoEntryWrapped) return;

    const wrapped = function (...args) {
      const result = original.apply(this, args);
      if (result && typeof result.then === "function") {
        return result.then((value) => {
          afterRender(...args);
          return value;
        });
      }
      afterRender(...args);
      return result;
    };
    wrapped.__promoEntryWrapped = true;
    UI[name] = wrapped;
  }

  wrapRenderer("renderEvents", () => injectEventsLandingButton());
  wrapRenderer("renderEventDetail", (eventId) => injectEventDetailButton(eventId));
})();
