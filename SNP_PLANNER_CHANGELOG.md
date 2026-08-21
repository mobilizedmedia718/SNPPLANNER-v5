# SNP Planner V5 — Persistent Change Log & UI Standards

This file is the durable change record for the live `mobilizedmedia718/SNPPLANNER-v5` planner. Update this file whenever behavior, navigation, workflow, integrations, data rules, or visible UI standards change.

## Source-of-truth rules

- Preserve SNP Planner V5. Do not rebuild as a separate planner or roll back to older versions.
- Current live repository code and current Supabase state outrank older chat/history notes when they conflict.
- Existing working integrations should be inspected before being replaced.
- Public posting, ad spend, destructive deletion, and irreversible changes still require the appropriate approval.
- Do not expose service-role keys, passwords, API tokens, webhook secrets, or other secrets in the UI or repository.

## Global UI standards

### Navigation
- Planner starts on a dedicated full-page Home screen after login.
- Home contains module buttons rather than an always-open sidebar.
- Back and Home controls appear inside modules.
- Back returns to a freshly rendered Home instead of restoring copied HTML, because copied HTML loses JavaScript listeners.
- All Home module buttons use direct route handlers and must remain functional after repeated Back/Home navigation.

### Collapsed lists / menus
- List/menu entries are closed by default.
- A record is represented by a label/button using the record name/title.
- The record contents remain hidden until that record's button is clicked.
- Only the selected record is open at one time; opening another closes the previous record.
- This list behavior is standardized for Events, Venues, Vendors, Inventory, Customers/CRM, Finance, Assets, and Calendar.
- Detail/edit pages are not automatically collapsed; the rule applies to list/menu views.

### Create/Add/New forms
- Create/Add/New entry forms are closed by default.
- The form opens only when its Create/Add/New button is clicked.
- After a successful save, the create form closes again.
- Do not leave all create fields expanded on initial page load.

### Event menu items
- Event menu item editors collapse after Save.
- Existing menu items render as compact summaries until Edit is selected.
- Menu library selections must not discard an unsaved item currently being edited.

### Time display
- User-facing time input/display uses 12-hour AM/PM format.

## Current functional standards already established

- Stripe Checkout uses immediate payment; no pay-later attendance flow.
- Eventbrite integration exists and should not be rebuilt unless live inspection shows a specific failure.
- Eventbrite attendee/customer synchronization can create/update CRM customer information.
- Staff access is event-specific and separated from owner/company data.
- Staff onboarding uses email verification; staff login does not depend on a shared staff code.
- QR credentials support check-in/redemption and refunded/voided credentials must not remain usable.
- Customer sales flow supports selecting an existing customer or creating a new customer.
- Empty existing-customer lists must not block the New Customer path.
- Inventory, finance, event financial rules, discounts/coupons, menu items, ticket inclusions, staff quick view, redemptions, and sales have dedicated UI/functionality fixes loaded after the base UI.
- Promo Operator Agent exists in the live planner and should preserve approval-before-public-post/ad-spend safeguards.

## Change chronology — recent live repository work

### 2026-08-21
- Standardized record-list collapse behavior across Events, Venues, Vendors, Inventory, Customers/CRM, Finance, Assets, and Calendar. Entries are hidden until their label button is clicked; only one record opens at a time.
- Fixed Home navigation so Back rebuilds Home rather than restoring raw `innerHTML`, preventing dead buttons caused by lost event listeners.
- Replaced fragile Home button execution with stable direct route handlers.
- Forced browser refresh of Home navigation script through version bump.
- Set central planner release version to 5.30 and display it on Home.
- Changed post-login landing page from Executive Dashboard to dedicated Planner Home.
- Added full-page Planner Home navigation and a Coupons & Complimentary Benefits shortcut.
- Added reusable customer coupon generator and connected complimentary benefits to reusable event-menu/inventory items.
- Fixed Eventbrite attendee/customer auto-sync to create CRM customers from attendees.

### Existing behavior preserved from earlier V5 work
- Site-wide Create/Add/New collapse behavior.
- Event menu item save/collapse behavior.
- 12-hour time-entry conversion.
- Inventory save and totals corrections.
- Finance/inventory synchronization.
- Event closeout and event financial rules.
- Ticket sales, ticket QR, refund guards, redemption integration, guest list, ticket inclusions/consumables, and event staff quick view.
- Promo Agent, Meta/social connector workflow, approval queue, Eventbrite promotion support, and postponement-mode work.
- Supabase-backed persistence and synchronization for the V5 planner.

## Known current consistency rule

When a module is reviewed and a UI/functionality rule is approved, apply the same rule to equivalent modules rather than fixing only one screen. Record the approved rule and implementation here so later changes do not accidentally undo it.

## 2026-08-21 consistency audit starting point

The user is reviewing modules one at a time beginning with Events. First inconsistency identified: Events/list records were visible/open instead of being hidden behind event-name buttons. The standardized collapsed-list fix was added planner-wide so equivalent list modules follow the same interaction model before individual module review continues.
