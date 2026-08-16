/* Site-wide ticket-sales routing controls. Eventbrite is the safe default. */
(function () {
  if (typeof Settings === "undefined" || typeof UI === "undefined") return;

  const SalesRouting = {
    enabled(channel) {
      return Settings.salesChannelEnabled(channel);
    },
    event(eventId) {
      return typeof Events !== "undefined" ? Events.get(eventId) : null;
    },
    eventbriteUrl(eventId) {
      const event = this.event(eventId);
      const linked = typeof Eventbrite !== "undefined" ? Eventbrite.link(eventId) : null;
      return String(linked?.publicUrl || event?.eventbritePublicUrl || "").trim();
    },
    openEventbrite(eventId) {
      if (!this.enabled("eventbrite"))
        return alert("Eventbrite ticket sales are turned off in Settings.");
      const url = this.eventbriteUrl(eventId);
      if (!url)
        return alert("Add the public Eventbrite ticket-page URL in Eventbrite settings first.");
      window.open(url, "_blank", "noopener,noreferrer");
    },
    statusHtml() {
      const channels = Settings.data.ticketSalesChannels || {};
      const enabled = [
        channels.eventbrite ? "Eventbrite" : "",
        channels.stripe ? "Stripe" : "",
        channels.manual ? "Manual / off-platform" : "",
      ].filter(Boolean);
      return enabled.length ? enabled.join(", ") : "No sales sources enabled";
    },
    settingsCard() {
      const channels = Settings.data.ticketSalesChannels || {};
      return `<div class="card" id="ticketSalesRoutingSettings">
        <h3>Ticket Sales Routing — System-wide</h3>
        <p>Choose which sources may accept new ticket and prepaid-package purchases. Turning a source off preserves its historical orders and reports.</p>
        <label><input id="salesChannelEventbrite" type="checkbox" ${channels.eventbrite ? "checked" : ""}> Eventbrite checkout</label>
        <label><input id="salesChannelStripe" type="checkbox" ${channels.stripe ? "checked" : ""}> Stripe / SNP Planner checkout</label>
        <label><input id="salesChannelManual" type="checkbox" ${channels.manual ? "checked" : ""}> Manual or off-platform sales recording</label>
        <button type="button" onclick="SalesRouting.saveSettings()">Save Ticket Sales Sources</button>
        <p><strong>Currently enabled:</strong> ${UI.esc(this.statusHtml())}</p>
      </div>`;
    },
    saveSettings() {
      Settings.updateSalesChannel(
        "eventbrite",
        document.getElementById("salesChannelEventbrite")?.checked,
      );
      Settings.updateSalesChannel(
        "stripe",
        document.getElementById("salesChannelStripe")?.checked,
      );
      Settings.updateSalesChannel(
        "manual",
        document.getElementById("salesChannelManual")?.checked,
      );
      alert("Ticket sales sources saved system-wide.");
      UI.renderSettings();
    },
    eventbriteOnlyCard(eventId, heading = "Online Sales") {
      const event = this.event(eventId);
      const url = this.eventbriteUrl(eventId);
      return `<h2>${UI.esc(heading)} — ${UI.esc(event?.name || "Event")}</h2>
        <div class="card"><h3>${this.enabled("eventbrite") ? "Eventbrite Checkout" : "Ticket Sales Paused"}</h3>
        <p>${this.enabled("eventbrite") ? "New ticket and prepaid beverage-package purchases are routed through Eventbrite. Stripe checkout is currently disabled." : "No online checkout source is enabled. Turn on Eventbrite or Stripe under Settings → Ticket Sales Routing."}</p>
        ${this.enabled("eventbrite") ? `<button type="button" onclick="SalesRouting.openEventbrite('${UI.esc(eventId)}')" ${url ? "" : "disabled"}>Open Eventbrite Ticket Page</button>` : ""}
        ${this.enabled("eventbrite") ? (url ? `<p><input readonly value="${UI.esc(url)}" onclick="this.select()"></p>` : "<p>Add the public Eventbrite URL under Eventbrite settings.</p>") : ""}
        <button type="button" onclick="CheckInUI.open('${UI.esc(eventId)}')">Check In / Scan Ticket</button></div>`;
    },
  };

  window.SalesRouting = SalesRouting;

  const originalRenderSettings = UI.renderSettings.bind(UI);
  UI.renderSettings = function () {
    originalRenderSettings();
    const workspace = document.getElementById("workspace");
    if (workspace && !document.getElementById("ticketSalesRoutingSettings"))
      workspace.insertAdjacentHTML("afterbegin", SalesRouting.settingsCard());
  };

  if (typeof TicketSalesUI !== "undefined") {
    const originalOpenTicketSales = TicketSalesUI.open.bind(TicketSalesUI);
    TicketSalesUI.open = function (eventId) {
      if (!SalesRouting.enabled("stripe")) {
        this.eventId = eventId;
        const workspace = document.getElementById("workspace");
        if (workspace)
          workspace.innerHTML = SalesRouting.eventbriteOnlyCard(eventId, "Ticket Sales");
        return;
      }
      return originalOpenTicketSales(eventId);
    };

    const originalTicketCheckout = TicketSalesUI.checkout.bind(TicketSalesUI);
    TicketSalesUI.checkout = function () {
      if (!SalesRouting.enabled("stripe"))
        return SalesRouting.openEventbrite(this.eventId);
      return originalTicketCheckout();
    };

    const originalCopyTicketLink = TicketSalesUI.copyCheckoutLink.bind(TicketSalesUI);
    TicketSalesUI.copyCheckoutLink = function () {
      if (!SalesRouting.enabled("stripe"))
        return SalesRouting.openEventbrite(this.eventId);
      return originalCopyTicketLink();
    };
  }

  if (typeof SalesUI !== "undefined") {
    const originalSalesOpen = SalesUI.open.bind(SalesUI);
    SalesUI.open = async function () {
      const eventId = window.LiveEvent?.activeId || this.selectedEventId || Events.all().find(e => e.status !== "Cancelled" && e.status !== "Completed")?.id || "";
      if (!SalesRouting.enabled("stripe")) {
        if (!eventId) return originalSalesOpen();
        this.selectedEventId = eventId;
        const workspace = document.getElementById("workspace");
        if (workspace)
          workspace.innerHTML = SalesRouting.eventbriteOnlyCard(eventId, "Event Sales");
        return;
      }
      return originalSalesOpen();
    };

    const originalSalesCheckout = SalesUI.checkout.bind(SalesUI);
    SalesUI.checkout = function () {
      if (!SalesRouting.enabled("stripe"))
        return SalesRouting.openEventbrite(this.activeEventId());
      return originalSalesCheckout();
    };

    if (typeof SalesUI.createPaymentLink === "function") {
      const originalPaymentLink = SalesUI.createPaymentLink.bind(SalesUI);
      SalesUI.createPaymentLink = function () {
        if (!SalesRouting.enabled("stripe"))
          return SalesRouting.openEventbrite(this.activeEventId());
        return originalPaymentLink();
      };
    }
  }

  const originalEventDetail = UI.renderEventDetail.bind(UI);
  UI.renderEventDetail = function (eventId) {
    const result = originalEventDetail(eventId);
    const card = document.getElementById("ticketSalesActions");
    if (!card) return result;
    const event = Events.get(eventId);
    const types = typeof TicketSalesUI !== "undefined" ? TicketSalesUI.activeTicketTypes(event) : [];
    card.innerHTML = `<h3>Ticket Sales</h3>
      ${SalesRouting.enabled("eventbrite") ? `<button type="button" onclick="SalesRouting.openEventbrite('${UI.esc(eventId)}')">Open Eventbrite Ticket Page</button>` : ""}
      ${SalesRouting.enabled("stripe") ? `<button type="button" onclick="TicketSalesUI.open('${UI.esc(eventId)}')">Sell Ticket with Stripe</button>` : ""}
      <button type="button" onclick="CheckInUI.open('${UI.esc(eventId)}')">Check In / Scan Ticket</button>
      <p><strong>Enabled sales sources:</strong> ${UI.esc(SalesRouting.statusHtml())}</p>
      ${types.length ? `<p><strong>Active ticket types:</strong> ${types.map(t => UI.esc(t.name || "Ticket")).join(", ")}</p>` : ""}`;
    return result;
  };
})();
