/* Automatic secure Eventbrite connector + webhook link registration */
(function () {
    if (typeof Eventbrite === "undefined") return;

    const defaultConnector = `${SNP_SUPABASE_URL}/functions/v1/eventbrite-connector`;
    if (!String(Eventbrite.data.connectorUrl || "").trim()) {
        Eventbrite.data.connectorUrl = defaultConnector;
        Eventbrite.save();
    }

    Eventbrite.registerEventLinkCloud = async function(plannerEventId) {
        const user = SNPDatabase.user();
        const token = SNPDatabase.session?.access_token;
        const link = this.link(plannerEventId);
        const eventbriteEventId = String(link.eventbriteEventId || "").trim();
        if (!user?.id || !token || !eventbriteEventId) return false;

        const moveResponse = await fetch(`${SNP_SUPABASE_URL}/rest/v1/eventbrite_event_links?user_id=eq.${encodeURIComponent(user.id)}&eventbrite_event_id=eq.${encodeURIComponent(eventbriteEventId)}`, {
            method: "PATCH",
            headers: {
                ...SNPDatabase.headers(token),
                "Prefer": "return=representation"
            },
            body: JSON.stringify({
                planner_event_id: plannerEventId,
                updated_at: new Date().toISOString()
            })
        });
        if (!moveResponse.ok) throw new Error(await moveResponse.text() || "Unable to update Eventbrite event link.");
        const moved = await moveResponse.json().catch(() => []);
        if (Array.isArray(moved) && moved.length) return true;

        const response = await fetch(`${SNP_SUPABASE_URL}/rest/v1/eventbrite_event_links?on_conflict=user_id,planner_event_id`, {
            method: "POST",
            headers: {
                ...SNPDatabase.headers(token),
                "Prefer": "resolution=merge-duplicates,return=minimal"
            },
            body: JSON.stringify({
                user_id: user.id,
                planner_event_id: plannerEventId,
                eventbrite_event_id: eventbriteEventId,
                updated_at: new Date().toISOString()
            })
        });
        if (!response.ok) throw new Error(await response.text() || "Unable to register Eventbrite event link.");
        return true;
    };

    const originalSetEventbriteEventId = Eventbrite.setEventbriteEventId.bind(Eventbrite);
    Eventbrite.setEventbriteEventId = function(eventId, value) {
        const nextId = String(value || "").trim();
        if (nextId) {
            for (const [otherPlannerEventId, otherLink] of Object.entries(this.data.events || {})) {
                if (otherPlannerEventId !== eventId && String(otherLink?.eventbriteEventId || "").trim() === nextId) {
                    delete this.data.events[otherPlannerEventId];
                }
            }
        }
        originalSetEventbriteEventId(eventId, value);
        this.registerEventLinkCloud(eventId).catch(error => console.warn("Eventbrite webhook link registration:", error));
    };

    Eventbrite.registerAllEventLinks = async function() {
        const entries = Object.entries(this.data.events || {});
        for (const [plannerEventId, link] of entries) {
            if (link?.eventbriteEventId) {
                try { await this.registerEventLinkCloud(plannerEventId); } catch (_) {}
            }
        }
    };

    Eventbrite.syncAllLinkedEvents = async function() {
        if (!SNPDatabase.session?.access_token) return;
        const activeEventIds = new Set((Events.all?.() || []).map(event => String(event.id || "")));
        for (const [plannerEventId, link] of Object.entries(this.data.events || {})) {
            if (!activeEventIds.has(String(plannerEventId)) || !link?.eventbriteEventId) continue;
            try {
                await this.loadTicketClasses(plannerEventId);
                await this.syncSales(plannerEventId);
            } catch (error) {
                console.warn("Automatic Eventbrite synchronization:", error);
            }
        }
    };

    window.addEventListener("load", () => {
        setTimeout(async () => {
            await Eventbrite.registerAllEventLinks();
            await Eventbrite.syncAllLinkedEvents();
        }, 1800);
    });
})();
