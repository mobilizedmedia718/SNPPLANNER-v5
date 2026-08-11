(function () {
    const DEFAULT_EVENT_URL = "https://www.eventbrite.com/e/paint-the-town-a-sip-and-paint-experience-tickets-1995025559152?aff=oddtdtcreator";
    const STORAGE_KEY = "promoAgent";
    const CREATIVE_DEFAULTS = {
        mediaGoal: "Agent decides",
        referenceUse: "Use as inspiration",
        referenceFocus: "Color scheme and overall vibe",
        visualDirection: "",
        musicMode: "Agent decides",
        musicStyle: "Oakland / Bay Area clean party energy",
        musicNotes: "",
        extraInstructions: "",
        primaryReferenceId: "",
        referenceFiles: []
    };

    const META_CONNECTION_DEFAULTS = {
        instagramHandle: "@painttownevents",
        facebookPageName: "Paint the Town Events",
        businessPortfolioName: "Paint the Town Events",
        connectionMode: "Secure Connector",
        connectorUrl: "https://mmstqostdqouxaiyrxtv.supabase.co/functions/v1/meta-promo-connector",
        instagramBusinessReady: false,
        facebookPageReady: false,
        businessSuiteReady: false,
        twoFactorReady: false,
        allowConnectorPublishing: false,
        lastStatus: "Not tested",
        lastStatusDetail: "Create the Facebook Page, connect Instagram, then test a secure connector when it is ready.",
        lastTestAt: ""
    };

    const DEFAULT_STATE = {
        selectedEventId: "",
        ticketGoal: 100,
        adBudget: 75,
        dailyPostGoal: 3,
        targetAudience: "Oakland and Bay Area adults, creatives, couples, friends, date-night guests, and first-time painters",
        offer: "Tickets start at $40. Limited seats available.",
        eventUrl: DEFAULT_EVENT_URL,
        approvalRequired: true,
        hashtags: "#PaintTheTown #OaklandEvents #SipAndPaint #OaklandNightlife #BayAreaEvents #OaklandArt #DateNightOakland #ThingsToDoInOakland #EastOakland #BlackOwnedEvents #CreativeNightOut #PaintAndSip",
        creative: { ...CREATIVE_DEFAULTS },
        metaConnection: { ...META_CONNECTION_DEFAULTS },
        queue: [],
        lastPlan: null,
        lastRun: "",
        log: []
    };

    const PromoAgent = {
        state: { ...DEFAULT_STATE },

        load() {
            const saved = typeof Utils !== "undefined" ? Utils.load(STORAGE_KEY, {}) : {};
            this.state = {
                ...DEFAULT_STATE,
                ...(saved || {}),
                creative: {
                    ...CREATIVE_DEFAULTS,
                    ...(saved?.creative || {}),
                    referenceFiles: Array.isArray(saved?.creative?.referenceFiles) ? saved.creative.referenceFiles : []
                },
                metaConnection: {
                    ...META_CONNECTION_DEFAULTS,
                    ...(saved?.metaConnection || {})
                },
                queue: Array.isArray(saved?.queue) ? saved.queue : [],
                log: Array.isArray(saved?.log) ? saved.log : []
            };
        },

        save() {
            if (typeof Utils !== "undefined") Utils.save(STORAGE_KEY, this.state);
        },

        esc(value) {
            if (typeof UI !== "undefined" && typeof UI.esc === "function") return UI.esc(value);
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        },

        install() {
            if (typeof UI === "undefined" || UI.__promoAgentInstalled) return;
            UI.__promoAgentInstalled = true;
            UI.renderPromoAgent = () => PromoAgent.render();

            const originalSidebar = UI.renderSidebar.bind(UI);
            UI.renderSidebar = function () {
                originalSidebar();
                PromoAgent.addSidebarButton();
            };

            this.injectStyles();
        },

        addSidebarButton() {
            const sidebar = document.getElementById("sidebar");
            if (!sidebar || document.getElementById("promoAgentNav")) return;
            const button = document.createElement("button");
            button.id = "promoAgentNav";
            button.type = "button";
            button.textContent = "Promo Agent";
            button.onclick = () => this.render();
            sidebar.appendChild(button);
        },

        injectStyles() {
            if (document.getElementById("promoAgentStyles")) return;
            const style = document.createElement("style");
            style.id = "promoAgentStyles";
            style.textContent = `
                .promo-agent-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.8fr);gap:20px;align-items:stretch}
                .promo-agent-title{font-size:1.9rem;margin-bottom:8px}
                .promo-agent-muted{color:#64748b;line-height:1.5}
                .promo-agent-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
                .promo-agent-kpi{background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:14px}
                .promo-agent-kpi strong{display:block;font-size:1.35rem;margin-top:5px}
                .promo-agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
                .promo-agent-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}
                .promo-agent-copy{width:100%;min-height:120px;font-size:.92rem;line-height:1.45;background:#f8fafc}
                .promo-agent-social-preview{display:grid;grid-template-columns:180px minmax(0,1fr);gap:14px;align-items:stretch;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;margin:12px 0}
                .promo-agent-visual{min-height:180px;border-radius:12px;background:linear-gradient(135deg,#17324d,#2f75b5 52%,#e6b94a);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
                .promo-agent-visual strong{font-size:1.05rem;line-height:1.15}
                .promo-agent-visual span{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}
                .promo-agent-preview-copy{font-size:.9rem;line-height:1.45;max-height:180px;overflow:auto}
                .promo-agent-preview-note{font-size:.78rem;color:#64748b;margin-top:6px}
                .promo-agent-reference-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px}
                .promo-agent-reference{border:1px solid var(--border);border-radius:12px;padding:10px;background:#f8fafc}
                .promo-agent-reference img{width:100%;height:120px;object-fit:cover;border-radius:9px;background:#e5e7eb;margin-bottom:8px}
                .promo-agent-reference small{display:block;color:#64748b;word-break:break-word}
                .promo-agent-queue{display:grid;gap:12px}
                .promo-agent-item{border:1px solid var(--border);border-radius:12px;padding:14px;background:#fff}
                .promo-agent-item-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}
                .promo-agent-tag{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:.78rem;background:#dbeafe;color:#1e3a8a;font-weight:700}
                .promo-agent-warning{border-left:5px solid #f59e0b}
                .promo-agent-success{border-left:5px solid #22c55e}
                .promo-agent-danger{border-left:5px solid #ef4444}
                .promo-agent-platforms{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
                .promo-agent-platforms div{background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:12px}
                .promo-agent-connection-status{display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;font-weight:700;font-size:.82rem;background:#f1f5f9;color:#334155}
                .promo-agent-connection-status.connected{background:#dcfce7;color:#166534}
                .promo-agent-connection-status.warning{background:#fef3c7;color:#92400e}
                .promo-agent-connection-status.failed{background:#fee2e2;color:#991b1b}
                .promo-agent-checklist{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:12px}
                .promo-agent-checklist label{background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px}
                @media(max-width:900px){.promo-agent-hero{grid-template-columns:1fr}}
                @media(max-width:700px){.promo-agent-social-preview{grid-template-columns:1fr}.promo-agent-visual{min-height:150px}}
            `;
            document.head.appendChild(style);
        },

        events() {
            return typeof Events !== "undefined" && typeof Events.all === "function" ? Events.all() : [];
        },

        currentEvent() {
            const events = this.events();
            if (!events.length) return null;
            const selected = events.find(event => event.id === this.state.selectedEventId);
            if (selected) return selected;

            const today = new Date().toISOString().slice(0, 10);
            const upcoming = events
                .filter(event => event.date && event.date >= today)
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
            return upcoming || events[events.length - 1];
        },

        updateSetting(field, value) {
            if (!(field in this.state)) return;
            if (["ticketGoal", "adBudget", "dailyPostGoal"].includes(field)) {
                this.state[field] = Math.max(0, Number(value || 0));
            } else if (field === "approvalRequired") {
                this.state[field] = Boolean(value);
            } else {
                this.state[field] = value;
            }
            this.save();
        },

        updateMetaConnection(field, value) {
            if (!this.state.metaConnection) this.state.metaConnection = { ...META_CONNECTION_DEFAULTS };
            if (!(field in META_CONNECTION_DEFAULTS)) return;
            if (["instagramBusinessReady", "facebookPageReady", "businessSuiteReady", "twoFactorReady", "allowConnectorPublishing"].includes(field)) {
                this.state.metaConnection[field] = Boolean(value);
            } else {
                this.state.metaConnection[field] = value;
            }
            this.save();
        },

        metaPrerequisitesReady() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            return Boolean(
                connection.instagramBusinessReady &&
                connection.facebookPageReady &&
                connection.businessSuiteReady &&
                connection.twoFactorReady
            );
        },

        connectorConfigured() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            return Boolean(String(connection.connectorUrl || "").trim());
        },

        connectorReady() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            return this.metaPrerequisitesReady() && this.connectorConfigured() && connection.lastStatus === "Connected";
        },

        connectionStatusClass() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            if (connection.lastStatus === "Connected") return "connected";
            if (connection.lastStatus === "Test failed") return "failed";
            return this.metaPrerequisitesReady() ? "warning" : "";
        },

        async testMetaConnector() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            const url = String(connection.connectorUrl || "").trim();
            if (!url) {
                alert("Add the secure connector URL first. This should be a Supabase Edge Function or Cloudflare Worker, not an Instagram password.");
                return;
            }

            const headers = { "Accept": "application/json" };
            const token = window.SNPDatabase?.session?.access_token;
            if (token) headers.Authorization = `Bearer ${token}`;

            try {
                const response = await fetch(url, { method: "GET", headers });
                const text = await response.text();
                let data = {};
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (_) {
                    data = { message: text };
                }
                const message = data.message || data.status || data.account || (response.ok ? "Connector answered successfully." : "Connector rejected the test.");
                this.state.metaConnection = {
                    ...connection,
                    lastStatus: response.ok ? "Connected" : "Test failed",
                    lastStatusDetail: String(message),
                    lastTestAt: new Date().toISOString()
                };
                this.save();
                this.render();
            } catch (error) {
                this.state.metaConnection = {
                    ...connection,
                    lastStatus: "Test failed",
                    lastStatusDetail: error?.message || "Unable to reach connector.",
                    lastTestAt: new Date().toISOString()
                };
                this.save();
                this.render();
            }
        },

        canSendToConnector(item) {
            const channel = String(item?.channel || "").toLowerCase();
            return channel.includes("instagram") || channel.includes("facebook");
        },

        async sendToMetaConnector(id) {
            const item = this.state.queue.find(row => row.id === id);
            if (!item) return;
            if (!this.canSendToConnector(item)) {
                alert("This item is not an Instagram/Facebook post. Copy it or use the matching platform manually.");
                return;
            }
            if (!item.previewedAt) {
                this.openPreview(id);
                alert("Review the visual preview first. After it looks right, approve it before sending to the connector.");
                return;
            }
            if (item.status !== "Approved" && item.status !== "Sent to Connector") {
                alert("Approve this post first. The agent will not send anything blind.");
                return;
            }

            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            if (!this.connectorReady()) {
                alert("The Instagram/Facebook connector is not ready yet. Complete the checklist and run a successful connector test first.");
                return;
            }
            if (!connection.allowConnectorPublishing) {
                alert("Turn on 'Allow connector to publish approved posts' before sending live content.");
                return;
            }

            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            };
            const token = window.SNPDatabase?.session?.access_token;
            if (token) headers.Authorization = `Bearer ${token}`;

            try {
                const response = await fetch(connection.connectorUrl, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        action: "publish_approved_social_item",
                        connection: {
                            instagramHandle: connection.instagramHandle,
                            facebookPageName: connection.facebookPageName,
                            businessPortfolioName: connection.businessPortfolioName
                        },
                        item,
                        event: this.eventFacts(this.eventForQueue(item)),
                        sentAt: new Date().toISOString()
                    })
                });
                const text = await response.text();
                if (!response.ok) throw new Error(text || "Connector publish failed.");
                this.updateQueue(id, {
                    status: "Sent to Connector",
                    connectorSentAt: new Date().toISOString()
                });
                alert("Approved post sent to the secure connector.");
            } catch (error) {
                alert(`Connector could not publish yet: ${error?.message || error}`);
            }
        },

        updateCreative(field, value) {
            if (!this.state.creative) this.state.creative = { ...CREATIVE_DEFAULTS };
            if (!(field in CREATIVE_DEFAULTS)) return;
            this.state.creative[field] = value;
            this.save();
        },

        async handleReferenceUpload(input) {
            const files = Array.from(input?.files || []);
            if (!files.length) return;
            if (!this.state.creative) this.state.creative = { ...CREATIVE_DEFAULTS };
            const current = Array.isArray(this.state.creative.referenceFiles) ? this.state.creative.referenceFiles : [];
            const accepted = [];
            const maxBytes = 1600000;

            for (const file of files.slice(0, 5)) {
                if (file.size > maxBytes) {
                    alert(`${file.name} is too large for planner storage. Use files under about 1.5 MB for now.`);
                    continue;
                }
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                accepted.push({
                    id: Utils.id(),
                    name: file.name,
                    type: file.type || "application/octet-stream",
                    size: file.size,
                    dataUrl,
                    addedAt: new Date().toISOString()
                });
            }

            this.state.creative.referenceFiles = [...accepted, ...current].slice(0, 8);
            if (!this.state.creative.primaryReferenceId && accepted[0]) {
                this.state.creative.primaryReferenceId = accepted[0].id;
            }
            input.value = "";
            this.save();
            this.render();
        },

        removeReference(id) {
            if (!this.state.creative) return;
            this.state.creative.referenceFiles = (this.state.creative.referenceFiles || []).filter(file => file.id !== id);
            if (this.state.creative.primaryReferenceId === id) {
                this.state.creative.primaryReferenceId = this.state.creative.referenceFiles[0]?.id || "";
            }
            this.save();
            this.render();
        },

        setPrimaryReference(id) {
            if (!this.state.creative) return;
            this.state.creative.primaryReferenceId = id;
            this.save();
            this.render();
        },

        eventLabel(event) {
            if (!event) return "No event selected";
            return [event.name || "Untitled Event", event.date || "", event.time || ""].filter(Boolean).join(" - ");
        },

        formatDate(dateValue) {
            if (!dateValue) return "Date not set";
            const date = new Date(`${dateValue}T12:00:00`);
            if (Number.isNaN(date.getTime())) return dateValue;
            return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        },

        daysUntil(dateValue) {
            if (!dateValue) return null;
            const today = new Date();
            const target = new Date(`${dateValue}T12:00:00`);
            if (Number.isNaN(target.getTime())) return null;
            today.setHours(0, 0, 0, 0);
            target.setHours(0, 0, 0, 0);
            return Math.ceil((target - today) / 86400000);
        },

        ticketCount(event) {
            if (!event) return 0;
            let count = Number(event.ticketsSold || 0);
            if (Array.isArray(event.ticketTypes)) {
                count = Math.max(count, event.ticketTypes.reduce((sum, item) => sum + Number(item.sold || item.quantitySold || 0), 0));
            }
            if (typeof Eventbrite !== "undefined" && typeof Eventbrite.link === "function") {
                const link = Eventbrite.link(event.id);
                count = Math.max(count, Number(link.manualTicketsSold || 0));
                if (Array.isArray(link.attendees)) count = Math.max(count, link.attendees.length);
            }
            return count;
        },

        phase(daysLeft, gap) {
            if (gap <= 0) return "Sellout push";
            if (daysLeft === null) return "Setup";
            if (daysLeft <= 2) return "Last call";
            if (daysLeft <= 7) return "Urgency";
            if (daysLeft <= 14) return "Conversion";
            return "Awareness";
        },

        strategyFor(phase) {
            const strategies = {
                "Awareness": "Show the vibe, the venue, the painting, and the easy beginner-friendly experience. Push shareable content and local discovery.",
                "Conversion": "Start asking directly for ticket purchases. Use date-night, girls-night, creative night out, and limited-seat angles.",
                "Urgency": "Post daily. Push seat count, food/drink add-ons, group DMs, and Eventbrite ads with a small focused budget.",
                "Last call": "Use scarcity. Every post should say the date, time, ticket link, and that seats are almost gone.",
                "Sellout push": "Stop broad discounting. Push waitlist, next event interest, and brand-building content.",
                "Setup": "Finish the event data first, then start the campaign run."
            };
            return strategies[phase] || strategies.Setup;
        },

        eventFacts(event) {
            const venue = typeof Venues !== "undefined" && event?.venueId ? Venues.get(event.venueId) : null;
            const location = venue ? [venue.name, venue.city, venue.state].filter(Boolean).join(", ") : "Oakland";
            const eventName = event?.name || "Paint The Town - A Sip & Paint Experience";
            const date = this.formatDate(event?.date);
            const time = [event?.time, event?.endTime].filter(Boolean).join(" - ") || "4:00 PM - 7:00 PM";
            const theme = event?.theme || "Oakland sunset and tree silhouette";
            return { eventName, date, time, location, theme };
        },

        primaryReference() {
            const files = this.state.creative?.referenceFiles || [];
            return files.find(file => file.id === this.state.creative?.primaryReferenceId) || files.find(file => String(file.type || "").startsWith("image/")) || files[0] || null;
        },

        primaryImageReference() {
            const file = this.primaryReference();
            return file && String(file.type || "").startsWith("image/") ? file : null;
        },

        creativeSnapshot() {
            const creative = this.state.creative || CREATIVE_DEFAULTS;
            return {
                mediaGoal: creative.mediaGoal,
                referenceUse: creative.referenceUse,
                referenceFocus: creative.referenceFocus,
                visualDirection: creative.visualDirection,
                musicMode: creative.musicMode,
                musicStyle: creative.musicStyle,
                musicNotes: creative.musicNotes,
                extraInstructions: creative.extraInstructions,
                primaryReferenceName: this.primaryReference()?.name || "",
                referenceNames: (creative.referenceFiles || []).map(file => file.name)
            };
        },

        productionNotes() {
            const snap = this.creativeSnapshot();
            const lines = [
                `Media goal: ${snap.mediaGoal || "Agent decides"}`,
                `Reference use: ${snap.referenceUse || "Use as inspiration"}`,
                `Reference focus: ${snap.referenceFocus || "Color scheme and overall vibe"}`
            ];
            if (snap.primaryReferenceName) lines.push(`Primary reference: ${snap.primaryReferenceName}`);
            if (snap.visualDirection) lines.push(`User visual direction: ${snap.visualDirection}`);
            if (snap.musicMode === "Agent decides") {
                lines.push(`Music: Agent chooses a track that matches ${snap.musicStyle || "the event vibe"}.`);
            } else if (snap.musicMode === "No music") {
                lines.push("Music: No background music.");
            } else {
                lines.push(`Music: ${snap.musicStyle || snap.musicMode}`);
            }
            if (snap.musicNotes) lines.push(`Music notes: ${snap.musicNotes}`);
            if (snap.extraInstructions) lines.push(`Extra instructions: ${snap.extraInstructions}`);
            return lines.join("\n");
        },

        postBrief(publicCopy) {
            const notes = this.productionNotes();
            return `PUBLIC COPY:\n${publicCopy}\n\nPRODUCTION NOTES:\n${notes}`;
        },

        buildPlan(event) {
            const facts = this.eventFacts(event);
            const goal = Number(event?.capacity || this.state.ticketGoal || 100);
            const sold = this.ticketCount(event);
            const gap = Math.max(0, goal - sold);
            const daysLeft = this.daysUntil(event?.date);
            const phase = this.phase(daysLeft, gap);
            const dailyTarget = gap > 0 ? Math.ceil(gap / Math.max(daysLeft || 1, 1)) : 0;
            const adBudget = Number(this.state.adBudget || 0);
            const eventUrl = this.state.eventUrl || DEFAULT_EVENT_URL;
            const hashtags = this.state.hashtags || DEFAULT_STATE.hashtags;
            const offer = this.state.offer || DEFAULT_STATE.offer;
            const audience = this.state.targetAudience || DEFAULT_STATE.targetAudience;
            const localAngle = facts.location.toLowerCase().includes("oakland") ? "Oakland" : "local";

            const caption = `${facts.eventName}\n\n${localAngle} needs a creative night out. Pull up, sip, paint, and leave with your own canvas. Beginner-friendly, good music, guided painting, and a room full of good energy.\n\n${facts.date} | ${facts.time}\n${facts.location}\n${offer}\n\nGet tickets: ${eventUrl}\n\n${hashtags}`;

            const story = `Tonight's promo story:\n\n${facts.eventName}\n${facts.date} | ${facts.time}\n${facts.location}\n\nPoll: Who are you bringing?\n- Date night\n- Friends night\n- Solo creative reset\n\nLink sticker: ${eventUrl}`;

            const facebook = `Oakland/Bay Area: I am putting together ${facts.eventName}, a beginner-friendly sip and paint experience at ${facts.location}.\n\nGuests will paint ${facts.theme}, enjoy music and good energy, and leave with their own canvas. ${offer}\n\nEvent date: ${facts.date}, ${facts.time}\nTickets: ${eventUrl}`;

            const dm = `Hey, I wanted to personally invite you to ${facts.eventName}. It is ${facts.date} from ${facts.time} at ${facts.location}. It is beginner-friendly, with guided painting, music, and a creative vibe. ${offer}\n\nHere is the ticket link: ${eventUrl}`;

            const eventbriteUpdate = `${facts.eventName} is coming up ${facts.date}. Seats are limited, and this is built for beginners, couples, friends, and anyone who wants a creative night out in Oakland. ${offer}`;

            const adCopy = `Headline: ${facts.eventName}\nText: A creative ${localAngle} sip and paint night with guided painting, music, and good energy. ${offer}\nCTA: Get Tickets\nAudience: ${audience}\nBudget test: ${Utils.money(Math.max(15, Math.min(adBudget || 75, 150)))} for 3-5 days. Keep running only if ticket sales move.`;
            const creative = this.creativeSnapshot();

            return {
                createdAt: new Date().toISOString(),
                eventId: event?.id || "",
                eventName: facts.eventName,
                phase,
                strategy: this.strategyFor(phase),
                goal,
                sold,
                gap,
                daysLeft,
                dailyTarget,
                adBudget,
                creative,
                content: [
                    { channel: "Instagram/Reel", title: "Main caption", copy: this.postBrief(caption) },
                    { channel: "Instagram Story", title: "Story sequence", copy: this.postBrief(story) },
                    { channel: "Facebook Groups", title: "Local group post", copy: this.postBrief(facebook) },
                    { channel: "DM Outreach", title: "Personal invite script", copy: dm },
                    { channel: "Eventbrite", title: "Event update", copy: this.postBrief(eventbriteUpdate) },
                    { channel: "Eventbrite Ads", title: "Ad draft", copy: this.postBrief(adCopy) }
                ],
                tasks: this.tasksFor(phase, dailyTarget, adBudget)
            };
        },

        tasksFor(phase, dailyTarget, adBudget) {
            const base = [
                `Sell at least ${dailyTarget || 1} ticket(s) today.`,
                "Post one Reel or feed post.",
                "Post three story frames with the ticket link.",
                "Send 15 direct invites to likely buyers.",
                "Post in two Oakland or Bay Area event/community groups."
            ];
            if (phase === "Urgency" || phase === "Last call") {
                base.push("Run a last-call post with the exact date, time, and link.");
                base.push("Message every warm lead who reacted, liked, or asked questions.");
            }
            if (Number(adBudget || 0) > 0) {
                base.push("Prepare Eventbrite Ads with approval before spending.");
            }
            return base;
        },

        runToday() {
            const event = this.currentEvent();
            const plan = this.buildPlan(event);
            const now = new Date().toISOString();
            this.state.selectedEventId = plan.eventId || this.state.selectedEventId;
            this.state.lastPlan = plan;
            this.state.lastRun = now;
            this.state.queue = [
                ...plan.content.map(item => ({
                    id: Utils.id(),
                    eventId: plan.eventId,
                    title: item.title,
                    channel: item.channel,
                    copy: item.copy,
                    creative: plan.creative,
                    status: this.state.approvalRequired ? "Needs Approval" : "Draft",
                    createdAt: now
                })),
                ...this.state.queue
            ];
            this.state.log = [
                { id: Utils.id(), at: now, message: `Ran ${plan.phase} plan for ${plan.eventName}` },
                ...this.state.log
            ].slice(0, 25);
            this.save();
            this.render();
        },

        addCalendarTasks() {
            const plan = this.state.lastPlan;
            if (!plan || typeof Calendar === "undefined") return;
            const today = new Date().toISOString().slice(0, 10);
            plan.tasks.forEach(task => Calendar.create({
                title: `Promo: ${task}`,
                description: `${plan.eventName} - ${plan.phase} phase`,
                eventId: plan.eventId,
                date: today,
                category: "Promotion",
                priority: "High"
            }));
            this.state.log = [
                { id: Utils.id(), at: new Date().toISOString(), message: `Added ${plan.tasks.length} promo tasks to Calendar` },
                ...this.state.log
            ].slice(0, 25);
            this.save();
            alert("Promotion tasks added to Calendar.");
        },

        updateQueue(id, updates) {
            const item = this.state.queue.find(row => row.id === id);
            if (!item) return;
            Object.assign(item, updates);
            this.save();
            this.render();
        },

        removeQueue(id) {
            this.state.queue = this.state.queue.filter(row => row.id !== id);
            this.save();
            this.render();
        },

        clearDone() {
            this.state.queue = this.state.queue.filter(row => row.status !== "Done");
            this.save();
            this.render();
        },

        copyQueue(id) {
            const item = this.state.queue.find(row => row.id === id);
            if (!item) return;
            const text = `${item.channel}: ${item.title}\n\n${item.copy}`;
            navigator.clipboard?.writeText(text).then(() => {
                alert("Copied.");
            }).catch(() => {
                prompt("Copy this text:", text);
            });
        },

        shortText(value, limit = 260) {
            const text = String(value || "").replace(/\s+/g, " ").trim();
            if (text.length <= limit) return text;
            return `${text.slice(0, limit).trim()}...`;
        },

        eventForQueue(item) {
            if (item?.eventId && typeof Events !== "undefined" && typeof Events.get === "function") {
                return Events.get(item.eventId) || this.currentEvent();
            }
            return this.currentEvent();
        },

        renderVisualPreview(item) {
            const facts = this.eventFacts(this.eventForQueue(item));
            const channel = String(item.channel || "Social");
            const copy = this.shortText(item.copy, 340);
            const background = this.previewBackgroundStyle();
            return `
                <div class="promo-agent-social-preview">
                    <div class="promo-agent-visual" style="${this.esc(background)}">
                        <span>${this.esc(channel)} Preview</span>
                        <strong>${this.esc(facts.eventName)}</strong>
                        <div>
                            <p>${this.esc(facts.date)}</p>
                            <p>${this.esc(facts.time)}</p>
                            <p>${this.esc(facts.location)}</p>
                        </div>
                    </div>
                    <div>
                        <h4>Visual Confirmation</h4>
                        <div class="promo-agent-preview-copy">${this.esc(copy)}</div>
                        <p class="promo-agent-preview-note">Preview only. This does not publish or spend money.</p>
                        ${item.previewedAt ? `<p class="promo-agent-preview-note">Last preview opened: ${this.esc(new Date(item.previewedAt).toLocaleString())}</p>` : ""}
                    </div>
                </div>
            `;
        },

        previewHtml(item) {
            const facts = this.eventFacts(this.eventForQueue(item));
            const fullCopy = this.esc(item.copy).replace(/\n/g, "<br>");
            const title = `${this.esc(item.channel)} - ${this.esc(item.title)}`;
            const background = this.previewBackgroundStyle(true);
            const references = this.referencePreviewHtml();
            return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Promo Approval Preview</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#eef2f7;color:#111827;padding:24px}
.wrap{max-width:980px;margin:0 auto}
.top{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-block;background:#dbeafe;color:#1e3a8a;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}
.grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:20px}
.phone{background:#111827;border-radius:30px;padding:18px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.post{background:#fff;border-radius:20px;overflow:hidden}
.post-head{display:flex;gap:10px;align-items:center;padding:14px;border-bottom:1px solid #e5e7eb}
.avatar{width:36px;height:36px;border-radius:50%;background:#17324d}
.visual{min-height:320px;${background};color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:22px}
.visual h1{font-size:28px;line-height:1.05;margin:0}
.visual p{margin:4px 0}
.caption{padding:14px;line-height:1.45;font-size:14px}
.panel{background:#fff;border-radius:18px;padding:20px;box-shadow:0 8px 28px rgba(0,0,0,.08)}
.copy{line-height:1.55;white-space:normal}
button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:11px 14px;font-weight:700;cursor:pointer}
@media(max-width:820px){.grid{grid-template-columns:1fr}.phone{max-width:420px;margin:auto;width:100%;box-sizing:border-box}}
</style>
</head>
<body>
<div class="wrap">
<div class="top">
<div>
<span class="badge">Approval Preview - Not Live</span>
<h1>${title}</h1>
</div>
<button onclick="window.print()">Print / Save Preview</button>
</div>
<div class="grid">
<div class="phone">
<div class="post">
<div class="post-head"><div class="avatar"></div><div><strong>Paint The Town</strong><br><small>${this.esc(item.channel)}</small></div></div>
<div class="visual">
<div><small>${this.esc(facts.location)}</small><h1>${this.esc(facts.eventName)}</h1></div>
<div><p>${this.esc(facts.date)}</p><p>${this.esc(facts.time)}</p><p>${this.esc(facts.theme)}</p></div>
</div>
<div class="caption">${this.esc(this.shortText(item.copy, 240)).replace(/\n/g, "<br>")}</div>
</div>
</div>
<div class="panel">
<h2>Full Post Copy</h2>
<p>This preview is for visual approval before posting, scheduling, or launching ads.</p>
<div class="copy">${fullCopy}</div>
${references}
</div>
</div>
</div>
</body>
</html>`;
        },

        previewBackgroundStyle(forFullPage = false) {
            const image = this.primaryImageReference();
            if (!image?.dataUrl) {
                return "background:linear-gradient(135deg,#17324d,#2f75b5 55%,#e6b94a)";
            }
            const overlay = forFullPage
                ? "linear-gradient(135deg,rgba(23,50,77,.82),rgba(47,117,181,.52),rgba(230,185,74,.42))"
                : "linear-gradient(135deg,rgba(23,50,77,.78),rgba(47,117,181,.42),rgba(230,185,74,.35))";
            return `background-image:${overlay},url("${String(image.dataUrl).replace(/"/g, "")}");background-size:cover;background-position:center`;
        },

        referencePreviewHtml() {
            const files = this.state.creative?.referenceFiles || [];
            if (!files.length) return "";
            return `<h2>Reference Files</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">${files.map(file => {
                if (String(file.type || "").startsWith("image/")) {
                    return `<div><img src="${this.esc(file.dataUrl)}" style="width:100%;height:110px;object-fit:cover;border-radius:10px;"><small>${this.esc(file.name)}</small></div>`;
                }
                return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;"><strong>${this.esc(file.type || "File")}</strong><br><small>${this.esc(file.name)}</small></div>`;
            }).join("")}</div>`;
        },

        openPreview(id) {
            const item = this.state.queue.find(row => row.id === id);
            if (!item) return;
            const blob = new Blob([this.previewHtml(item)], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const opened = window.open(url, "_blank", "noopener");
            item.previewedAt = new Date().toISOString();
            if (item.status === "Needs Approval") item.status = "Previewed";
            this.save();
            this.render();
            if (!opened) prompt("Popup was blocked. Copy and open this preview link:", url);
        },

        approveQueue(id) {
            const item = this.state.queue.find(row => row.id === id);
            if (!item) return;
            if (!item.previewedAt) {
                this.openPreview(id);
                alert("Review the visual preview first. After it looks right, click Approve again.");
                return;
            }
            this.updateQueue(id, {
                status: "Approved",
                approvedAt: new Date().toISOString()
            });
        },

        exportPlan() {
            const plan = this.state.lastPlan;
            if (!plan) return;
            const body = [
                `Promo Operator Plan - ${plan.eventName}`,
                `Phase: ${plan.phase}`,
                `Strategy: ${plan.strategy}`,
                `Goal: ${plan.goal}`,
                `Sold: ${plan.sold}`,
                `Gap: ${plan.gap}`,
                `Days left: ${plan.daysLeft ?? "Not set"}`,
                `Daily ticket target: ${plan.dailyTarget}`,
                "",
                "Tasks:",
                ...plan.tasks.map(task => `- ${task}`),
                "",
                "Content:",
                ...plan.content.flatMap(item => [`## ${item.channel} - ${item.title}`, item.copy, ""])
            ].join("\n");
            const blob = new Blob([body], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `promo-plan-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        },

        render() {
            const workspace = document.getElementById("workspace");
            if (!workspace) return;
            const event = this.currentEvent();
            const plan = this.state.lastPlan;
            const goal = Number(event?.capacity || this.state.ticketGoal || 100);
            const sold = this.ticketCount(event);
            const gap = Math.max(0, goal - sold);
            const daysLeft = this.daysUntil(event?.date);
            const phase = this.phase(daysLeft, gap);

            workspace.innerHTML = `
                <div class="promo-agent-hero">
                    <div class="card">
                        <h2 class="promo-agent-title">Promo Operator Agent</h2>
                        <p class="promo-agent-muted">Runs the daily promotion workflow for the selected event: content, outreach, Eventbrite ad drafts, ticket targets, and approval queue.</p>
                        <div class="promo-agent-actions">
                            <button type="button" onclick="PromoAgent.runToday()">Run Today's Promotion Plan</button>
                            <button type="button" onclick="PromoAgent.exportPlan()" ${plan ? "" : "disabled"}>Export Last Plan</button>
                            <button type="button" onclick="PromoAgent.addCalendarTasks()" ${plan ? "" : "disabled"}>Add Tasks to Calendar</button>
                        </div>
                    </div>
                    <div class="card ${gap > 0 ? "promo-agent-warning" : "promo-agent-success"}">
                        <h3>Current Campaign</h3>
                        <p><strong>${this.esc(this.eventLabel(event))}</strong></p>
                        <p class="promo-agent-muted">${this.esc(this.strategyFor(phase))}</p>
                    </div>
                </div>

                <div class="promo-agent-kpis">
                    <div class="promo-agent-kpi">Phase<strong>${this.esc(phase)}</strong></div>
                    <div class="promo-agent-kpi">Tickets Sold<strong>${sold}</strong></div>
                    <div class="promo-agent-kpi">Ticket Goal<strong>${goal}</strong></div>
                    <div class="promo-agent-kpi">Remaining<strong>${gap}</strong></div>
                    <div class="promo-agent-kpi">Days Left<strong>${daysLeft ?? "Set date"}</strong></div>
                    <div class="promo-agent-kpi">Today Target<strong>${gap > 0 ? Math.ceil(gap / Math.max(daysLeft || 1, 1)) : 0}</strong></div>
                </div>

                ${this.renderSettings(event)}
                ${this.renderCreativeControls()}
                ${this.renderMetaConnectionControls()}
                ${this.renderLastPlan(plan)}
                ${this.renderQueue()}
                ${this.renderPlatformControls()}
            `;
        },

        renderSettings(event) {
            const options = this.events().map(row => `
                <option value="${this.esc(row.id)}" ${row.id === (event?.id || "") ? "selected" : ""}>${this.esc(this.eventLabel(row))}</option>
            `).join("");

            return `
                <div class="card">
                    <h3>Agent Settings</h3>
                    <div class="promo-agent-grid">
                        <div>
                            <label>Event</label>
                            <select onchange="PromoAgent.updateSetting('selectedEventId', this.value); PromoAgent.render();">
                                <option value="">Auto-select upcoming event</option>
                                ${options}
                            </select>
                        </div>
                        <div>
                            <label>Ticket Goal</label>
                            <input type="number" min="0" value="${Number(this.state.ticketGoal || 0)}" onchange="PromoAgent.updateSetting('ticketGoal', this.value)">
                        </div>
                        <div>
                            <label>Ad Budget Test</label>
                            <input type="number" min="0" step="1" value="${Number(this.state.adBudget || 0)}" onchange="PromoAgent.updateSetting('adBudget', this.value)">
                        </div>
                        <div>
                            <label>Daily Post Goal</label>
                            <input type="number" min="0" value="${Number(this.state.dailyPostGoal || 0)}" onchange="PromoAgent.updateSetting('dailyPostGoal', this.value)">
                        </div>
                        <div>
                            <label>Event/Ticket Link</label>
                            <input value="${this.esc(this.state.eventUrl)}" onchange="PromoAgent.updateSetting('eventUrl', this.value)">
                        </div>
                        <div>
                            <label>Offer / Sales Angle</label>
                            <input value="${this.esc(this.state.offer)}" onchange="PromoAgent.updateSetting('offer', this.value)">
                        </div>
                        <div>
                            <label>Target Audience</label>
                            <textarea onchange="PromoAgent.updateSetting('targetAudience', this.value)">${this.esc(this.state.targetAudience)}</textarea>
                        </div>
                        <div>
                            <label>Hashtags</label>
                            <textarea onchange="PromoAgent.updateSetting('hashtags', this.value)">${this.esc(this.state.hashtags)}</textarea>
                        </div>
                    </div>
                    <label><input type="checkbox" ${this.state.approvalRequired ? "checked" : ""} onchange="PromoAgent.updateSetting('approvalRequired', this.checked)"> Require approval before public posts or ad spend</label>
                    <div class="promo-agent-actions">
                        <button type="button" onclick="PromoAgent.save(); alert('Agent settings saved.');">Save Agent Settings</button>
                    </div>
                </div>
            `;
        },

        renderCreativeControls() {
            const creative = this.state.creative || CREATIVE_DEFAULTS;
            return `
                <div class="card">
                    <h3>Creative Direction</h3>
                    <p class="promo-agent-muted">Add your own direction or upload references before running the agent. The approval preview will use these files and notes.</p>
                    <div class="promo-agent-grid">
                        <div>
                            <label>Media Goal</label>
                            <select onchange="PromoAgent.updateCreative('mediaGoal', this.value)">
                                ${["Agent decides","Instagram Reel","Instagram Post","Instagram Story","Facebook Post","Eventbrite Ad","Flyer-style graphic","Caption only"].map(option => `<option value="${option}" ${creative.mediaGoal === option ? "selected" : ""}>${option}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label>How To Use Uploaded Reference</label>
                            <select onchange="PromoAgent.updateCreative('referenceUse', this.value)">
                                ${["Use as inspiration","Keep same color scheme","Keep same theme/vibe","Mimic layout/composition","Mimic one part only","Keep it close to original","Agent decides"].map(option => `<option value="${option}" ${creative.referenceUse === option ? "selected" : ""}>${option}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label>Reference Focus</label>
                            <select onchange="PromoAgent.updateCreative('referenceFocus', this.value)">
                                ${["Color scheme and overall vibe","Main subject only","Background only","Typography/font feel","Layout/composition","Luxury/premium feel","Street/Oakland energy","Afrocentric theme","Agent decides"].map(option => `<option value="${option}" ${creative.referenceFocus === option ? "selected" : ""}>${option}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label>Music Direction</label>
                            <select onchange="PromoAgent.updateCreative('musicMode', this.value)">
                                ${["Agent decides","Use my music notes","No music","Clean hip-hop / West Coast","Afrobeats","R&B / soul","House / dance","Jazz / lounge","Latin / Afro-Caribbean"].map(option => `<option value="${option}" ${creative.musicMode === option ? "selected" : ""}>${option}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label>Music Style / Mood</label>
                            <input value="${this.esc(creative.musicStyle)}" placeholder="Example: upbeat Oakland clean hip-hop" onchange="PromoAgent.updateCreative('musicStyle', this.value)">
                        </div>
                        <div>
                            <label>Upload Reference Files</label>
                            <input type="file" accept="image/*,video/*,audio/*,.pdf" multiple onchange="PromoAgent.handleReferenceUpload(this)">
                            <p class="promo-agent-preview-note">Use small files under about 1.5 MB each for now.</p>
                        </div>
                        <div>
                            <label>Your Visual Instructions</label>
                            <textarea placeholder="Example: Keep the flyer colors but make the post cleaner for Instagram." onchange="PromoAgent.updateCreative('visualDirection', this.value)">${this.esc(creative.visualDirection)}</textarea>
                        </div>
                        <div>
                            <label>Music Notes</label>
                            <textarea placeholder="Example: West Coast bounce, clean, no explicit lyrics, smooth but energetic." onchange="PromoAgent.updateCreative('musicNotes', this.value)">${this.esc(creative.musicNotes)}</textarea>
                        </div>
                        <div>
                            <label>Extra Instructions</label>
                            <textarea placeholder="Anything else the agent should follow before generating." onchange="PromoAgent.updateCreative('extraInstructions', this.value)">${this.esc(creative.extraInstructions)}</textarea>
                        </div>
                    </div>
                    ${this.renderReferenceFiles()}
                    <div class="promo-agent-actions">
                        <button type="button" onclick="PromoAgent.save(); alert('Creative direction saved.');">Save Creative Direction</button>
                    </div>
                </div>
            `;
        },

        renderReferenceFiles() {
            const files = this.state.creative?.referenceFiles || [];
            if (!files.length) return `<p class="promo-agent-muted">No reference files uploaded yet.</p>`;
            return `
                <div class="promo-agent-reference-list">
                    ${files.map(file => `
                        <div class="promo-agent-reference">
                            ${String(file.type || "").startsWith("image/") ? `<img src="${this.esc(file.dataUrl)}" alt="">` : `<div style="height:120px;display:grid;place-items:center;background:#e5e7eb;border-radius:9px;margin-bottom:8px;">${this.esc(file.type || "File")}</div>`}
                            <strong>${this.esc(file.name)}</strong>
                            <small>${Math.round(Number(file.size || 0) / 1024)} KB</small>
                            <div class="promo-agent-actions">
                                <button type="button" onclick="PromoAgent.setPrimaryReference('${this.esc(file.id)}')">${this.state.creative?.primaryReferenceId === file.id ? "Primary" : "Make Primary"}</button>
                                <button type="button" onclick="PromoAgent.removeReference('${this.esc(file.id)}')">Remove</button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
        },

        renderMetaConnectionControls() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            const statusClass = this.connectionStatusClass();
            const prerequisitesReady = this.metaPrerequisitesReady();
            const connectorReady = this.connectorReady();
            const tested = connection.lastTestAt ? new Date(connection.lastTestAt).toLocaleString() : "Not tested yet";
            return `
                <div class="card">
                    <div class="promo-agent-item-head">
                        <div>
                            <h3>Instagram / Facebook Connection</h3>
                            <p class="promo-agent-muted">Stores account labels and a secure connector URL only. Do not put Instagram passwords, Meta tokens, or app secrets in this planner.</p>
                        </div>
                        <span class="promo-agent-connection-status ${statusClass}">${this.esc(connection.lastStatus || "Not tested")}</span>
                    </div>
                    <div class="promo-agent-grid">
                        <div>
                            <label>Instagram Handle</label>
                            <input value="${this.esc(connection.instagramHandle)}" placeholder="@painttownevents" onchange="PromoAgent.updateMetaConnection('instagramHandle', this.value)">
                        </div>
                        <div>
                            <label>Facebook Page</label>
                            <input value="${this.esc(connection.facebookPageName)}" placeholder="Paint the Town Events" onchange="PromoAgent.updateMetaConnection('facebookPageName', this.value)">
                        </div>
                        <div>
                            <label>Meta Business Portfolio</label>
                            <input value="${this.esc(connection.businessPortfolioName)}" placeholder="Paint the Town Events" onchange="PromoAgent.updateMetaConnection('businessPortfolioName', this.value)">
                        </div>
                        <div>
                            <label>Connection Mode</label>
                            <select onchange="PromoAgent.updateMetaConnection('connectionMode', this.value)">
                                ${["Manual Meta Business Suite","Secure Connector","Scheduler Bridge","Draft Only"].map(option => `<option value="${option}" ${connection.connectionMode === option ? "selected" : ""}>${option}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label>Secure Connector URL</label>
                            <input value="${this.esc(connection.connectorUrl)}" placeholder="Supabase Edge Function or Cloudflare Worker URL" onchange="PromoAgent.updateMetaConnection('connectorUrl', this.value)">
                            <p class="promo-agent-preview-note">This URL should point to a backend that stores Meta credentials securely.</p>
                        </div>
                        <div>
                            <label>Connector Test</label>
                            <p class="promo-agent-muted">Last test: ${this.esc(tested)}</p>
                            <p class="promo-agent-preview-note">${this.esc(connection.lastStatusDetail || "")}</p>
                        </div>
                    </div>
                    <div class="promo-agent-checklist">
                        <label><input type="checkbox" ${connection.instagramBusinessReady ? "checked" : ""} onchange="PromoAgent.updateMetaConnection('instagramBusinessReady', this.checked); PromoAgent.render();"> Instagram is Business/Professional</label>
                        <label><input type="checkbox" ${connection.facebookPageReady ? "checked" : ""} onchange="PromoAgent.updateMetaConnection('facebookPageReady', this.checked); PromoAgent.render();"> Facebook Page exists</label>
                        <label><input type="checkbox" ${connection.businessSuiteReady ? "checked" : ""} onchange="PromoAgent.updateMetaConnection('businessSuiteReady', this.checked); PromoAgent.render();"> Page and Instagram are in Meta Business Suite</label>
                        <label><input type="checkbox" ${connection.twoFactorReady ? "checked" : ""} onchange="PromoAgent.updateMetaConnection('twoFactorReady', this.checked); PromoAgent.render();"> Two-factor authentication is on</label>
                        <label><input type="checkbox" ${connection.allowConnectorPublishing ? "checked" : ""} onchange="PromoAgent.updateMetaConnection('allowConnectorPublishing', this.checked); PromoAgent.render();"> Allow connector to publish approved posts</label>
                    </div>
                    <div class="promo-agent-actions">
                        <button type="button" onclick="PromoAgent.save(); alert('Instagram/Facebook connection settings saved.');">Save Connection</button>
                        <button type="button" onclick="PromoAgent.testMetaConnector()" ${this.connectorConfigured() ? "" : "disabled"}>Test Secure Connector</button>
                    </div>
                    <p class="promo-agent-muted">
                        ${connectorReady ? "Connector is ready for approved Instagram/Facebook posts." : prerequisitesReady ? "Account setup looks ready. Add and test a secure connector before publishing from the agent." : "Finish the account checklist first. Until then, the agent stays in preview and copy mode."}
                    </p>
                </div>
            `;
        },

        renderLastPlan(plan) {
            if (!plan) {
                return `
                    <div class="card">
                        <h3>Last Promotion Plan</h3>
                        <p class="promo-agent-muted">No plan has been run yet. Click <strong>Run Today's Promotion Plan</strong> to generate the first campaign run.</p>
                    </div>
                `;
            }

            return `
                <div class="card">
                    <h3>Last Promotion Plan</h3>
                    <p><strong>${this.esc(plan.phase)}:</strong> ${this.esc(plan.strategy)}</p>
                    <div class="promo-agent-grid">
                        <div>
                            <h4>Today's Tasks</h4>
                            <ul>${plan.tasks.map(task => `<li>${this.esc(task)}</li>`).join("")}</ul>
                        </div>
                        <div>
                            <h4>Numbers</h4>
                            <p>Goal: ${plan.goal}</p>
                            <p>Sold: ${plan.sold}</p>
                            <p>Remaining: ${plan.gap}</p>
                            <p>Daily target: ${plan.dailyTarget}</p>
                        </div>
                    </div>
                </div>
            `;
        },

        renderQueue() {
            const queue = this.state.queue;
            return `
                <div class="card">
                    <div class="promo-agent-item-head">
                        <h3>Approval Queue</h3>
                        <button type="button" onclick="PromoAgent.clearDone()">Clear Done</button>
                    </div>
                    <div class="promo-agent-queue">
                        ${queue.length ? queue.map(item => this.renderQueueItem(item)).join("") : `<p class="promo-agent-muted">No queued content yet.</p>`}
                    </div>
                </div>
            `;
        },

        renderQueueItem(item) {
            const statusClass = item.status === "Done" ? "promo-agent-success" : item.status === "Needs Approval" ? "promo-agent-warning" : "";
            return `
                <div class="promo-agent-item ${statusClass}">
                    <div class="promo-agent-item-head">
                        <div>
                            <span class="promo-agent-tag">${this.esc(item.channel)}</span>
                            <h4>${this.esc(item.title)}</h4>
                        </div>
                        <strong>${this.esc(item.status)}</strong>
                    </div>
                    ${this.renderVisualPreview(item)}
                    <textarea class="promo-agent-copy" readonly>${this.esc(item.copy)}</textarea>
                    <div class="promo-agent-actions">
                        <button type="button" onclick="PromoAgent.copyQueue('${this.esc(item.id)}')">Copy</button>
                        <button type="button" onclick="PromoAgent.openPreview('${this.esc(item.id)}')">Open Preview Link</button>
                        <button type="button" onclick="PromoAgent.approveQueue('${this.esc(item.id)}')">Approve</button>
                        ${this.canSendToConnector(item) ? `<button type="button" onclick="PromoAgent.sendToMetaConnector('${this.esc(item.id)}')">Send to Connector</button>` : ""}
                        <button type="button" onclick="PromoAgent.updateQueue('${this.esc(item.id)}',{status:'Done'})">Done</button>
                        <button type="button" onclick="PromoAgent.removeQueue('${this.esc(item.id)}')">Delete</button>
                    </div>
                </div>
            `;
        },

        renderPlatformControls() {
            const connection = this.state.metaConnection || META_CONNECTION_DEFAULTS;
            const socialStatus = this.connectorReady()
                ? "Connected. Approved posts can be sent to the secure connector."
                : this.metaPrerequisitesReady()
                    ? "Account setup ready. Add/test a secure connector before direct publishing."
                    : "Draft and approval queue ready. Finish Meta account setup before direct publishing.";
            return `
                <div class="card">
                    <h3>Platform Control Status</h3>
                    <div class="promo-agent-platforms">
                        <div><strong>SNP Planner</strong><br>Active. Agent can read event data and create promotion tasks.</div>
                        <div><strong>Eventbrite</strong><br>Draft-ready. Use generated copy in Eventbrite Ads and updates.</div>
                        <div><strong>Instagram/Facebook</strong><br>${this.esc(socialStatus)}<br><small>${this.esc(connection.instagramHandle)} / ${this.esc(connection.facebookPageName)}</small></div>
                        <div><strong>Ad Spend</strong><br>Human approval required before launch or budget changes.</div>
                    </div>
                </div>
            `;
        }
    };

    PromoAgent.load();
    PromoAgent.install();
    window.PromoAgent = PromoAgent;
})();
