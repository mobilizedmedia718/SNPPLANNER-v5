/* Shared 12-hour clock formatting for every SNP Planner surface. */
(function (root) {
  function single(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const twelveHour = text.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
    if (twelveHour) {
      const hour = Math.min(12, Math.max(1, Number(twelveHour[1])));
      const minute = String(Math.min(59, Number(twelveHour[2] || 0))).padStart(
        2,
        "0",
      );
      return `${hour}:${minute} ${twelveHour[3].toUpperCase()}M`;
    }
    const twentyFourHour = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!twentyFourHour) return text;
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour > 23 || minute > 59) return text;
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  }

  function formatTime(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(date);
      }
    }
    const parts = text.split(
      /\s+(?:to|[-–—])\s+|\s*[-–—]\s*(?=\d{1,2}:\d{2})/i,
    );
    return parts.length === 2
      ? `${single(parts[0])} – ${single(parts[1])}`
      : single(text);
  }

  function parseTime(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const twentyFourHour = text.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHour) {
      const hour = Number(twentyFourHour[1]);
      const minute = Number(twentyFourHour[2]);
      return hour <= 23 && minute <= 59
        ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        : "";
    }
    const twelveHour = text.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
    if (!twelveHour) return "";
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] || 0);
    if (hour < 1 || hour > 12 || minute > 59) return "";
    if (twelveHour[3].toLowerCase() === "a") hour = hour === 12 ? 0 : hour;
    else hour = hour === 12 ? 12 : hour + 12;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  root.SNPTime = Object.freeze({ formatTime, parseTime, formatDateTime });
})(typeof window !== "undefined" ? window : globalThis);
