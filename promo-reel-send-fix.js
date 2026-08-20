/* Targeted fix: reliably send approved Instagram Reel/video queue items to the existing Meta connector. */
(function () {
  if (typeof window === "undefined" || typeof window.PromoAgent === "undefined") return;

  const agent = window.PromoAgent;
  const originalSend = typeof agent.sendToMetaConnector === "function"
    ? agent.sendToMetaConnector.bind(agent)
    : null;
  const inFlight = new Set();

  function isReelOrVideo(item) {
    const channel = String(item?.channel || "").toLowerCase();
    const postType = String(item?.postType || "").toLowerCase();
    return Boolean(
      item?.videoUrl ||
      postType === "reel" ||
      channel.includes("reel")
    );
  }

  function mediaUrl(item) {
    return String(
      item?.publicMediaUrl ||
      item?.mediaUrl ||
      item?.videoUrl ||
      item?.imageUrl ||
      ""
    ).trim();
  }

  agent.sendToMetaConnector = async function (id) {
    const item = this.state?.queue?.find((row) => row.id === id);
    if (!item) return;

    // Leave the already-working image/Facebook path untouched.
    if (!isReelOrVideo(item)) {
      if (originalSend) return originalSend(id);
      return;
    }

    if (!this.canSendToConnector(item)) {
      alert("This item is not an Instagram/Facebook post.");
      return;
    }
    if (!item.previewedAt) {
      this.openPreview(id);
      alert("Review the preview first, then send the approved Reel.");
      return;
    }
    if (item.status !== "Approved" && item.status !== "Sent to Connector") {
      alert("Approve this Reel first.");
      return;
    }

    const connection = this.state.metaConnection || {};
    if (!this.connectorReady()) {
      alert("The Instagram/Facebook connector is not ready. Run a successful connector test first.");
      return;
    }
    if (!connection.allowConnectorPublishing) {
      alert("Turn on 'Allow connector to publish approved posts' before sending live content.");
      return;
    }

    const url = mediaUrl(item);
    if (!url) {
      alert("This Reel is missing its public video URL.");
      return;
    }

    if (inFlight.has(id)) {
      alert("This Reel is already being sent. Please wait for the current request to finish.");
      return;
    }
    inFlight.add(id);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const token = window.SNPDatabase?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const normalizedItem = {
        ...item,
        postType: "reel",
        publicMediaUrl: url,
        mediaUrl: url,
        videoUrl: url,
      };

      // Keep this payload deliberately minimal. The Meta connector does not need
      // planner event rendering data to publish an approved Reel.
      const response = await fetch(String(connection.connectorUrl || "").trim(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "publish_approved_social_item",
          item: normalizedItem,
          videoUrl: url,
          mediaUrl: url,
          sentAt: new Date().toISOString(),
        }),
      });

      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { message: text }; }

      if (!response.ok) {
        const detail = data?.message || data?.status || text || "Connector publish failed.";
        throw new Error(String(detail));
      }

      this.updateQueue(id, {
        status: "Sent to Connector",
        connectorSentAt: new Date().toISOString(),
        connectorStatus: String(data?.status || "accepted"),
      });
      alert("Approved Instagram Reel sent to the secure connector.");
    } catch (error) {
      alert(`Connector could not publish the Reel: ${error?.message || error}`);
    } finally {
      inFlight.delete(id);
    }
  };
})();
