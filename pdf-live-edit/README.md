# PDF Live Edit

Change the data in a PDF Upload document after it has been generated. The page opens from the S-Docs component on the Opportunity (row menu → **Edit data**). It is a separate Visualforce page, so it sits inside Lightning's header and app nav.

Open `index.html`. The dark bar at the bottom switches between the scenarios below; it is not part of the design.

## The model

- **Click to edit, in place.** A highlighted value turns into an input right where it sits on the page.
  - Enter or clicking away keeps the change. Tab keeps it and moves to the next field. Esc puts it back.
  - Picklists become a dropdown and dates a date picker.
  - Fields can't be moved, resized or deleted.
- **🔒 means no access.** A lock sits beside any field the person can't edit because of their field-level security. Other values that can never be edited (formulas, auto-numbers, the generated date, the owner's name) aren't highlighted, and say why on hover.
- **History lives on the field.** A history mark appears beside any field that changed since the document was generated. Clicking it shows that field's timeline: each version, who changed it, from what to what, whether Salesforce was updated too, and the reason given. The mark turns amber when Salesforce has changed the value since this version was made, and the timeline offers **Use this value**.
- **Salesforce is asked about once, at save.** Typing never asks where a change goes. The Save review lists each change with one box: *Also update the Opportunity / Account "PseudoCo, Inc." / Contact "Maya Chen" in Salesforce*. Unticked, the change stays in this document only.
- **Versions is just a list:** each PDF version, who made it and when, plus a one-line summary ("Edited 2 fields", "Generated from the template"), with open and download.

## Try

| Scenario | How |
|---|---|
| Edit inline, and see every copy of the value update | Click Opportunity on page 1, type, then press Tab. The footer on all 3 pages changes too |
| Too long for the space | Make Contact Title long. It fits on page 1 but is cut off on page 3, and the message says so |
| Bad input | Type `not-an-email` into Email and press Enter. The field stays open with the error |
| Field history | Click the mark beside Phone or Payment Terms (edited in version 2) |
| Changed in Salesforce | The amber marks beside Seats and Billing Street → **Use this value** |
| No edit access | Priya: 🔒 on Discount. Switch to Jordan: Discount opens up, and Account and Contact fields get 🔒 |
| Salesforce rejects a write-back | Set Close Date to a past date, Save, tick *Also update the Opportunity*, then Save version 3 |
| Refresh vs. document-only values | **Refresh from Salesforce** lists the document-only values it will replace |
| Locked while out for signature | Document → *Sent for signature* |
| Undo | ↶ in Changes, ⌘/Ctrl+Z, or Undo on the Discard toast |

## How it maps to the real build

- **Snapshot.** CedarEngine doesn't save the data today. It only bakes the values into the HTML in `SDoc__c.Data__c`. Live Edit needs a per-version `document-data.json` holding each element's raw value, formatted value, type, format and placements.
- **Field history.** It is the per-version change list (element, from, to, scope, who, when, reason) read back for one element. Store it with each version so a field's timeline is a single query.
- **Save.** Each save:
  - writes a new data snapshot;
  - creates a new `ContentVersion` on the same ContentDocument (as CedarEngine's refresh path already does);
  - for ticked changes, updates the records in user mode, all in one transaction. If any update fails, nothing is saved.
- **Refresh.** Regenerates from live data and doesn't carry document-only values forward. The field history is what keeps them from being lost silently.
- **Editability.** Follows the editing user's field-level security plus the field's describe: `isUpdateable`, not calculated, not auto-number, not compound. Fields that are more than one hop away (Owner.Name) are read only.
