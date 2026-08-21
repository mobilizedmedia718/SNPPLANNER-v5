# SNP Planner V5 — Page Style Specifications

This file records the approved visual/functional style of planner pages so a page design can be reused elsewhere without losing its behavior. Whenever a page covered here changes, update its style specification in the same change set.

## Maintenance rule

- Every reviewed planner page gets a named style specification.
- The specification records both appearance and behavior.
- If the live page changes, this document must change at the same time.
- The newest specification is the source of truth for reproducing that page style on another module.
- Reusing a style means reusing its information hierarchy, navigation pattern, visibility rules, interaction model, editing rules, and refresh/recovery behavior — not merely copying colors or button shapes.
- A page must never silently drift away from its recorded style. If a change is intentional, revise the style record and change log together.

---

# Style: EVENTS-HUB

**Status:** Active / approved

**Purpose:** First page shown after selecting **Events** from Planner Home.

## Page role

A clean navigation/selection page. It is not an event dashboard, event editor, ticket screen, or operational view.

## Visible content

Only these primary controls belong on the page:

1. **+ New Event**
2. **Select Existing Event** control containing events that have already been created and are available to open.

A simple page title such as **Events** may be shown.

## Content that must stay hidden on this page

The Events Hub must not display event-specific information or operational panels, including:

- Ticket types or ticket sales
- Ticket quantities, pricing, inclusions, or consumables
- Staff assignments or employee panels
- Menu items or menu setup
- Guest list
- Customer/event attendee details
- Event finances or closeout data
- QR codes, check-in, redemption, or refunded-ticket controls
- Promo/social/event marketing controls
- Detailed event date/time/venue fields
- Editable event fields
- Any dropdown or form used to modify an existing event

## Existing-event interaction

- Selecting an existing event immediately opens that event's dedicated detail page.
- The selector belongs only to the Events Hub and does not remain visible after entering an event.
- The event detail screen is a separate page state, not an expanded area underneath the selector.

## New-event interaction

- **+ New Event** opens the event creation/planning workflow.
- Data-entry fields, dropdowns, selectors, and editable controls are allowed in the New Event workflow because that screen is specifically for creating/planning an event.

## Editing rule

- Viewing and editing are separate modes.
- An existing event detail page must initially display saved information as information, not as an always-open form.
- Editable fields/dropdowns for event configuration appear only after the user chooses **Edit Event** or enters another explicit planning/editing action.

## Refresh continuity

- Refresh must return the user to the planner page/view that was active before refresh rather than forcing a return to Planner Home.
- If the active screen contains unsaved form values, those values are preserved as a same-tab/session draft and restored after refresh.
- Draft recovery is not the same as committing data to Supabase/database storage; it protects against accidental refresh while editing.
- Password and file inputs are excluded from draft capture.
- Explicit successful Save/Create/Add actions clear stale draft values for that view.
- A deliberate Home action changes the saved navigation state to Home; normal application startup must not overwrite the previously active page before recovery occurs.

## Navigation style

Expected flow:

**Planner Home → Events Hub → Existing Event Detail**

or

**Planner Home → Events Hub → New Event / Planning**

Back/Home controls follow the planner-wide navigation standard.

## Visual hierarchy

- Minimal first screen
- Clear Events heading
- Primary **+ New Event** action
- One clear existing-event selector
- Generous whitespace; no event-detail clutter
- No nested operational panels on the hub page

## Reuse guidance

This style is appropriate for other modules when the desired behavior is:

- first choose **New** or **Existing**;
- do not expose record details until a record is selected;
- keep viewing separate from editing;
- move all record-specific functionality onto a dedicated detail screen;
- preserve current page state and unsaved draft values through an accidental refresh.

When reused, rename the controls and records for the destination module while preserving this information architecture.

## Revision history

### 2026-08-21 — EVENTS-HUB v2
- Added refresh continuity as part of the page behavior.
- Refresh restores the active planner view instead of returning to Home.
- Unsaved form inputs are recovered from a same-session draft after refresh.
- Explicit saves clear stale drafts.

### 2026-08-21 — EVENTS-HUB v1
- Defined Events as a selection-only landing page.
- Limited first-screen controls to **+ New Event** and existing-event selection.
- Removed ticket/event-operation content from the landing-page design.
- Established separate detail and edit/planning states.
- Established rule that the page style record must be updated whenever the live page is updated.
