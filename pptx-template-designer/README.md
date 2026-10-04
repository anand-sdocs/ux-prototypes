# PowerPoint Template Designer

Prototype of turning an uploaded PowerPoint deck into an S-Docs template in the browser, without rebuilding PowerPoint on the web.

- **Upload a .pptx** (or use the sample proposal). The slides are drawn by [@aiden0z/pptx-renderer](https://github.com/aiden0z/pptx-renderer) 1.3.0 (Apache-2.0). Our own layer of clickable shapes sits on top, matched by PowerPoint's shape IDs.
- **Bind by hand:** click a text box, then a field, and the field replaces all of its text. To replace only some words, select them on the slide (or in the text in the right-hand panel), then click the field. In a table, click into a cell, then a field, to replace that cell's text. Dragging a field onto a text box works like clicking. Select a picture to take its image from a field, or a chart to take its numbers from a related list. To make one slide per related record, select the slide (no shape) and switch **Repeat** on in the right-hand panel, then choose the related list. That list's fields then appear at the top of Fields, above the Opportunity's, and a bar above the slide shows how many copies the sample record makes. Selecting a related-list table does the same for its repeating row. Any slide or shape can also be shown only when a condition holds.
- **Related lists:** click a related list (or drag it onto the slide) to add a PowerPoint table whose second row repeats once per record. Pick the columns (heading, field, order), which records it shows (filter, sort, limit), how it lays out (rows per slide, heading on every slide, header-row and banded-row style), and what happens when there are none (heading only, hide the table, leave out the slide). An existing table in the deck can be turned into a related-list table the same way.
- **Template JSON** (top bar) shows what's saved, and updates as you work: the JSON for everything structural, and a list of the merge fields typed into the .pptx text.
- **Undo and redo** (masthead buttons, ⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Y) cover every edit: text, fields, tables, columns, repeats, bindings and conditions. A burst of typing is one step, and undo jumps to the slide that changed. Each step is a snapshot of the slides' XML and the template JSON, the only two things the designer changes. While the cursor is in a text field, the shortcuts are that field's own text undo.
- **Preview** is a read-only check of how the template expands for a sample record. Documents are generated from records later, in a separate flow; `generate.js` stands in for that flow here.
- **Shell:** S-Docs UI kit editor layout (`vendor/sdocs-kit/`).

Open `index.html` (it also works straight from disk). A **guided walkthrough** runs on top: pick a scenario in the yellow bar, follow the guide in the corner (it notices when each step is done), or click **Show me**. Link straight to one with `?scenario=`:

| Scenario | `?scenario=` |
|---|---|
| 1 · Upload a PowerPoint as the base | `upload` |
| 2 · Add merge fields | `fields` |
| 3 · Add a related list to an empty slide | `related` |
| 4 · Add a repeating slide | `repeat` |
| 5 · Show a whole slide only when… | `slidecond` |
| 6 · Show one element only when… | `elemcond` |
| 7 · Preview the finished template | `preview` |

The sample's "Investment summary" slide is left empty so a related-list table can be added to it. Orchard Fresh Foods, one of the sample records, has no logo on file, to show the logo condition.

## What is saved

There are two parts:

1. **The .pptx itself.** Text merge fields (`{{Opportunity.Account.Name}}`, optionally with a format: `{{Opportunity.Amount | $#,##0}}`) are typed into its text runs. Everything else in the file is left byte-for-byte as uploaded.
2. **The template JSON** (`template.js`). It holds everything structural:
   - which slide repeats per related record
   - which table row repeats, and how many rows fit per slide
   - which picture comes from an image field, and how it fits
   - where a chart gets its numbers
   - when a slide or shape is shown

   Slides are keyed by PowerPoint's slide ID (`p:sldId/@id`) and shapes by their shape ID (`p:cNvPr/@id`). PowerPoint keeps both when the deck is edited and saved again.

The renderer's own model is never saved, so the renderer could be replaced without changing saved templates.

## Files

| File | What it is |
|---|---|
| `index.src.html`, `styles.css`, `app.js` | The designer. `index.html` and `app.bundle.js` are built from these |
| `ooxml.js` | Package and XML helpers: parts, relationships, content types, shape lookup, image sizes |
| `canvas-text.js` | Maps text selected on the drawn slide back to a paragraph and character range in the slide XML |
| `text.js` | Paragraph text across runs: splice edits into the right run, find and replace `{{tokens}}` that PowerPoint split over several runs |
| `template.js` | Template JSON shape and checks |
| `generate.js` | The generator: template + JSON + record → .pptx. It is the JavaScript stand-in for the Apex generator, written as local edits of the uploaded XML so it can be ported step for step |
| `table-ops.js` | Related-list tables in the slide XML: insert a table, add, remove, move and re-point columns, PowerPoint's header-row and banded-row switches |
| `example.js` | The finished design for the sample deck (scenario 7) |
| `tour.js` | The guided walkthrough: scenario bar, guide, and the seven scenarios. It drives the designer through a small hooks object from `app.js` |
| `data.js` | Sample Opportunities with 5, 2 and 9 line items |
| `sample/` | The sample deck (built by `build-sample-deck.js` with PptxGenJS) and sample images. `sample-assets.js` is generated from them |
| `vendor-src/` | Build and tests |

## Build and test

```bash
cd vendor-src && npm install && npm run build
```

```bash
cd vendor-src && npm test
```

`npm test` checks the text splicing, generates the finished example for all three records, and builds a related-list table (columns edited, sorted, limited, left out when empty) for all three. It writes the decks to `vendor-src/out/`, so they can be opened in PowerPoint or checked with an OOXML validator.

## Known gaps

- The renderer doesn't apply chart data-label number formats (`c:dLbls/c:numFmt`), so labels show raw numbers. PowerPoint applies them.
- Merge-field chips on the slide show the field's name, which can be longer or shorter than the value it becomes. A name too long for its text box ends in an ellipsis; hover for the full name and token.
- Copies of a repeated slide don't carry speaker notes; the first copy keeps them.
- Text that no longer fits its box after merging isn't shrunk.
- Charts: the first series is bound. Other series in a bound chart are removed.
- Upload gives shapes with duplicate IDs a new ID, as PowerPoint does when it saves (PptxGenJS, for one, writes them).
- A related-list table can't yet be moved or resized in the designer. It goes in the first empty space under the title, or where it's dropped.
