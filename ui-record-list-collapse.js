/*
 * Planner-wide record-list standard.
 * List pages show compact label buttons only. Record contents stay hidden until
 * the matching label is clicked. Only one record is open at a time.
 */
(function () {
  if (typeof UI === "undefined") return;

  const methods = [
    "renderEvents",
    "renderVenues",
    "renderVendors",
    "renderInventory",
    "renderCRM",
    "renderFinance",
    "renderAssets",
    "renderCalendar",
  ];

  function ensureCss() {
    if (document.getElementById("snp-record-collapse-css")) return;
    const style = document.createElement("style");
    style.id = "snp-record-collapse-css";
    style.textContent = `
      .snp-record-toggle{
        display:flex;width:100%;align-items:center;justify-content:space-between;
        gap:12px;text-align:left;padding:14px 16px;margin:10px 0 0;
        border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;
      }
      .snp-record-toggle::after{content:'▾';font-size:18px;transition:transform .15s ease}
      .snp-record-toggle[aria-expanded="true"]::after{transform:rotate(180deg)}
      .snp-record-body{margin-top:0}
      .snp-record-body[hidden]{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function titleFor(card, index) {
    const heading = card.querySelector(":scope > h2, :scope > h3, :scope > h4");
    const text = String(heading?.textContent || "").trim();
    if (text) return text;

    const strong = card.querySelector(":scope > strong");
    const strongText = String(strong?.textContent || "").trim();
    if (strongText) return strongText;

    return `Entry ${index + 1}`;
  }

  function eligibleCard(card) {
    if (!card || card.dataset.snpRecordCollapsed === "1") return false;
    if (card.classList.contains("dashboard-grid")) return false;
    if (card.closest(".dashboard-grid")) return false;
    if (card.classList.contains("snp-create-form-body")) return false;
    if (card.querySelector(":scope > .snp-create-toggle")) return false;
    return true;
  }

  function collapseCurrentList() {
    ensureCss();
    const ws = document.getElementById("workspace");
    if (!ws) return;

    // Only direct record cards on the current list page are converted. Nested
    // cards inside a record remain intact and detail/edit screens are untouched.
    const cards = Array.from(ws.children).filter(
      (el) => el.classList?.contains("card") && eligibleCard(el),
    );

    cards.forEach((card, index) => {
      const title = titleFor(card, index);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "snp-record-toggle";
      toggle.textContent = title;
      toggle.setAttribute("aria-expanded", "false");

      card.dataset.snpRecordCollapsed = "1";
      card.classList.add("snp-record-body");
      card.hidden = true;
      card.insertAdjacentElement("beforebegin", toggle);

      toggle.addEventListener("click", () => {
        const opening = toggle.getAttribute("aria-expanded") !== "true";

        ws.querySelectorAll(":scope > .snp-record-toggle").forEach((other) => {
          other.setAttribute("aria-expanded", "false");
          const body = other.nextElementSibling;
          if (body?.classList.contains("snp-record-body")) body.hidden = true;
        });

        if (opening) {
          toggle.setAttribute("aria-expanded", "true");
          card.hidden = false;
        }
      });
    });
  }

  methods.forEach((method) => {
    const original = UI[method];
    if (typeof original !== "function" || original.__snpRecordCollapseWrapped) return;

    const wrapped = function (...args) {
      const result = original.apply(this, args);
      const finish = () => setTimeout(collapseCurrentList, 0);
      if (result && typeof result.then === "function") return result.finally(finish);
      finish();
      return result;
    };
    wrapped.__snpRecordCollapseWrapped = true;
    UI[method] = wrapped;
  });
})();
