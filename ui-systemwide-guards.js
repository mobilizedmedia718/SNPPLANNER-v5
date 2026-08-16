/* Final cross-screen UI pass: 12-hour entry widgets and stable dynamic controls. */
(function () {
  function enhanceTimeInput(input) {
    if (!input || input.dataset.snpTwelveHour === "1") return;
    input.dataset.snpTwelveHour = "1";
    input.hidden = true;
    const display = document.createElement("input");
    display.type = "text";
    display.inputMode = "numeric";
    display.autocomplete = "off";
    display.className = "snp-time-12-hour";
    display.placeholder = "4:00 PM";
    display.setAttribute("aria-label", "Time in 12-hour format");
    if (input.id) display.id = `${input.id}-12-hour`;
    display.value = window.SNPTime?.formatTime(input.value) || input.value;

    function sync() {
      const typed = display.value.trim();
      const parsed = window.SNPTime?.parseTime(typed) || "";
      if (!typed) {
        display.setCustomValidity("");
        input.value = "";
      } else if (!parsed) {
        display.setCustomValidity("Enter a time such as 4:00 PM.");
        return false;
      } else {
        display.setCustomValidity("");
        input.value = parsed;
        display.value = window.SNPTime.formatTime(parsed);
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    display.addEventListener("change", sync);
    display.addEventListener("blur", sync);
    display.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !sync()) display.reportValidity();
    });
    input.insertAdjacentElement("afterend", display);
  }

  function scan() {
    document
      .querySelectorAll('input[type="time"]:not([data-snp-twelve-hour="1"])')
      .forEach(enhanceTimeInput);
    window.SNPMenuNav?.repair?.();
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      scan();
    }, 0);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("DOMContentLoaded", schedule);
  setTimeout(schedule, 0);
})();
