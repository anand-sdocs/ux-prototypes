# Business-admin configuration mockup: build plan and handoff

**Status (2026-10-02):** Built and checked in the browser. `admin.html` + `admin.css` + `admin.js` cover the list, the six-step editor with live preview, the Test view and a simulated **Lightning App Builder** view (with a "Today" comparison). Run it with `python3 -m http.server 4174` in this folder and open `/admin.html`. Next up is the tech spec.

## Guided walkthrough (2026-10-02)

`admin.html` now opens with a guided walkthrough (`tour.js`), built like the Repeating Section prototype: a scenario bar at the top and a step guide with **Show me**. Deep links: `admin.html?scenario=bizadmin|sfadmin|rep|flow`.

1. **Priya Shah, business admin:** (ends by turning on her own **Builder details** and opening Initech to see them) creates *Mid-Market Deals* (Amount ≥ 25,000 and < 100,000; Proposal, Order Form, NDA; adds Email and Request signature), previews, activates, tests Sam on Initech, finds that *Sales — Standard* wins, moves the new configuration up and tests again.
2. **Marco Diaz, Salesforce admin:** in App Builder, finds and drags *S-Docs Documents* onto the Opportunity page, sets the **Title** (the only property), previews as Sam on Initech and saves.
3. **Sam Rivera, sales rep:** on Initech – Partner Resale, generates the proposal and order form, requests a signature, and sees the documents flip to Signed. An event panel shows the lifecycle events.
4. **Bonus, Marco in Flow Builder:** adds the component to a screen, maps `{!recordId}`, stores `{!docIds}` and `{!lastEvent}`, then debugs as Sam. The component picks *Mid-Market Deals* by priority, as on the record page.

The object list on the left only shows objects with saved configurations (there's no "Add object"); New configuration lets you pick any object.


- **App Builder has one property, Title** (2026-10-02). No Configuration or Mode properties: the component always uses the first match, and **Builder details** is the business admin's own per-person switch on the Document Configurations page.
- **Phase 1 has no advanced settings** (2026-10-02). `PHASE1 = true` in `admin.js` hides the wizard and strips the seed data down to when-to-show, templates and actions. The wizard code is kept for later phases; set the flag to `false` to see it.
- **The simple editor is the default** (2026-10-02). It has three cards: *When to show* (field conditions with all/any, plus optional advanced logic; no conditions means everyone), *Templates* (an ordered list) and *Actions* (one checklist; bulk-capable actions also show on the toolbar). The six-step wizard is kept behind **Advanced settings**, and the simple view lists which advanced settings a configuration uses.
- **Placement keys are dropped from v1** (2026-10-02). Configurations target placement types only.

- Each **Configuration is tied to one Salesforce object**, and an object can have many Configurations.
- **Order decides.** When a record matches several Configurations, the highest-priority one wins: **#1 at the top of the list**, checked first. *Confirm this reading with Anand.*
- The visual language **matches the LWC 2.0 prototype** (`index.html` / `styles.css`): Salesforce chrome, the S-Docs card, navy primary. The wizard's live preview reuses the real `.sd-card` classes. It does not use the S-Docs UI Kit, because Anand asked for it to be "based on the LWC mockup".
- The design stays independent of the current LWC and SDK. Reuse is decided in the tech spec.
- Files: `admin.html` + `admin.css` (prefix `ad-`) + `admin.js`, with `styles.css` reused for the chrome, card, modal, toast and menu.

## Views to build (single page, rendered by JS)

### 1. Configurations list (tab "Document Configurations")

- **Header:** "Document Configurations", "Test a record" (secondary) and "New configuration" (primary).
- **Left rail:** the objects, each with a configuration count (Opportunity 6, Account 2, Quote 3, Case 1, Contract 0), plus "Add object".
- **Main panel:** that object's configurations in priority order. Each row has:
  - a drag handle and the priority number,
  - name and key, and a status pill (Active / Draft / Inactive),
  - placement chips,
  - a plain-English condition summary,
  - counts of templates, actions and steps,
  - a kebab menu: Edit, Test, Duplicate, Move up/down/top, Activate/Deactivate, Delete.
- **Reordering:** drag and drop, plus up/down in the menu, then a toast.
- **Info strip:** "Checked top to bottom; the first match wins."
- **Badges:** a **Fallback** badge on an Always + any-placement config at the bottom. An **Unreachable** warning on any config below an always-matching Active config.

### 2. Configuration editor (wizard)

- **Header:** breadcrumb, status, and the buttons Test / Save draft / **Activate** (one primary).
- **Three columns:** stepper, step body, and a **live preview** rail (sticky) showing the S-Docs card as an end user will see it.

The six steps:

1. **Basics & scope:**
   - name, key (auto-slug), description;
   - object (locked once created);
   - placements: Record Page / Experience Cloud / Screen Flow / Embedded LWC;
   - active window;
   - run-as (System only when the config is limited to Experience Cloud);
   - read-only priority note.
2. **Who & when:**
   - logic: Always / All / Any / Custom (`1 AND (2 OR 3)`);
   - condition rows over record and parent fields, user fields, profile, role, permission set, custom permission, group, formula, Apex;
   - operators filtered by type, value as a literal or a field reference;
   - live custom-logic validation (recursive-descent parser, no `eval`);
   - plain-English summary.
3. **Templates:**
   - picker style Flat / Favorites / Grouped;
   - toggles: multi-select, user favorites, regenerate; auto-generate policy;
   - template table: reorder, group label, Featured ★, Preselected, Auto-generate, "Shown when" rules (modal with the same condition builder), remove;
   - "Add templates" modal with search.
4. **Actions:**
   - one row per action (Preview, Download, Edit, Refresh, Versions, Delete, Email, Request signature, Sign in person);
   - per action: on/off, where it shows (toolbar + menu / menu / toolbar), who (Everyone / Document creator / Record owner), and a settings modal for Email, Signature, Download, Edit and Delete;
   - after-generate behaviour, output (separate / combined PDF), document list scope, publish platform events.
5. **Before & after generation:**
   - a vertical pipeline: User clicks Generate → before steps → **Generate** → after steps → Done (events);
   - add a step: Validation / Ask the user / Apex / Flow, with Apex and Flow only for the after phase;
   - each step type has its own edit modal: condition rows + message + Block/Warn; prompt inputs; Apex class + "sets inputs"; Flow + input/output mapping + sync/async;
   - a **Generation inputs** table: key (with `{{input.key}}` token), type, required, default, host-settable, and computed "Filled by" chips.
6. **Review:**
   - checks:
     - custom logic is valid and the rows are complete;
     - the config has at least one template;
     - run-as System is used only with Experience Cloud;
     - every required input has a source;
     - the config isn't unreachable;
   - summary cards, then Activate.

**Live preview behaviour:**
- The template dropdown respects picker style, featured and preselected settings, and the per-template visibility rules (evaluated on the sample record).
- The documents toolbar and row menu show only the enabled actions.
- **Generate actually runs the before steps.** Validation is evaluated against the sample record, the prompt modal is shown, and Apex/Flow appear as progress toasts. Generated rows are then added.
- A small **event log** under the card (`configurationresolved`, `generationstarted`, `documentgenerated`…).

### 3. Test a record ("Which configuration applies?")

- **Controls:** object, record, run-as user, placement.
- **Trace:** every configuration in priority order, each marked one of:
  - skipped (Draft, out of date range, placement, or key mismatch),
  - conditions not met, with each row shown ✓/✗ and its actual value,
  - **Wins**,
  - not evaluated (a higher-priority one already matched).
- **Right side:** the winning configuration's card preview, as that user sees it.

## Sample data (planned)

**Opportunity configurations, in order:**

1. **Renewal Desk**: Embedded; `Type = Renewal`; Renewal Quote, Change Order (shown only at Closed Won), Order Form; Flow `Calc_Uplift` → `uplift_pct`.
2. **Partner Portal**: Experience Cloud, run as System; profile is one of *Partner Community User*; Order Form ★, Proposal; Preview and Download only.
3. **Enterprise Sales**: Record Page; `1 AND 2 AND (3 OR 4)`, where:
   - 1 = Amount ≥ 100k
   - 2 = Type = New Business
   - 3 = user has perm set Deal_Desk
   - 4 = user's role is VP_Sales

   Templates: Proposal ★ (preselected), MSA ★, NDA, SOW, Order Form, DPA. All actions; Delete is limited to the document creator. Before steps: Validation (Close Date set, Block) → Prompt (`discount_pct`, `signer`) → Apex `PricingSnapshot` → `pricing_tier`. After step: Flow `Log_Proposal_Sent` (async).
4. **Q4 Promo Pricing**: *Draft*, active Oct 1 – Dec 31; formula row + Owner Region = North America.
5. **Sales — Standard**: any placement; user is in group Sales_Team; Proposal, NDA, SOW, Sales Contract; Validation (Amount set, Warn).
6. **Default**: Always; Proposal; Preview and Download.

There are lighter sets for Account (Key Accounts, Default), Quote (Discounted Quotes, Renewal Quotes, Default) and Case (Escalations). Contract has none, to show the empty state.

**Records:**
- PseudoCo – Enterprise Rollout: $184k, New Business, Proposal stage
- Acme – 2027 Renewal: $62k, Renewal
- Globex – Starter Pack: $18k, no Close Date
- Initech – Partner Resale: $45k

**Users:**
- Anand: VP_Sales, Deal_Desk, Sales_Team
- Sam: Account Executive, Sales_Team
- Pat: Partner Community User
- Jordan: Service User

**Expected test results:**

| Record + user + placement | Wins |
|---|---|
| PseudoCo + Anand + Record Page | Enterprise Sales |
| PseudoCo + Sam + Record Page | Sales — Standard |
| Acme + Sam + Embedded | Renewal Desk |
| Initech + Pat + Experience Cloud | Partner Portal |
| Globex + Jordan | Default |

## After the mockup

- Tech spec (markdown + Mermaid, in this folder): resolution engine, Apex interfaces (condition, before/after handlers), runtime LWC API (`@api` inputs, events on DOM/LMS/Flow outputs, platform events), caching, security, and where existing S-Docs pieces get reused.
- Open questions from data-model.md §9 are still unanswered: rule-based template lists, whether steps can swap templates, draft → publish revisions.
