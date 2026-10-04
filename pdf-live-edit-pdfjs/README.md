# PDF Live Edit on PDF.js

The same Live Edit as [`../pdf-live-edit`](../pdf-live-edit/), with the page drawn by **PDF.js from a real PDF**. Every editing behaviour runs on an HTML overlay above it. Use this one as the reference for how the two fit together.

Open it through a web server: the "ux-prototypes" preview at `http://localhost:4173/pdf-live-edit-pdfjs/`, or GitHub Pages. PDF.js can't load a PDF from a `file://` page, and the page says so if you try.

## Two layers per page

```
.lp-page  (width = zoom; aspect-ratio = PDF page size; container for pt units)
├── canvas.lp-pdf    PDF.js draws template.pdf — labels, headings, rules. No values.
└── div.lp-overlay   one absolutely positioned box per merge field, at the stored % position
    ├── .lp-f        a value: live text, click to edit inline
    ├── .lp-mark     lock / history mark, placed after the text's last character
    └── .lp-sf       a signer field (kit field object), read only
```

- **Positions.** The overlay's coordinates are the same percentages CedarEngine stores on `Merge_Data__c` (`Page_X__c`, `Page_Y__c`, width, height). The overlay never needs to know where the PDF's own text is.
- **Text size.** Font sizes are in PDF points. On each page, `1pt = 100cqw / page width in points`, and the page width comes from `page.view`. That keeps overlay text the same size as the PDF's at any zoom. The thumbnails are the same two layers at 112px wide.
- **Zoom.**
  - The overlay is in % and points, so it follows instantly.
  - The canvas stretches until it is redrawn at the new size about 120ms later.
  - Each redraw goes to a fresh canvas that replaces the old one when it finishes, so there's never a blank page and two renders never share a canvas.
- **Edits re-render the overlay only.** PDF.js draws each page once per zoom level, never per keystroke.
- **Fonts.** The template embeds Arial, and the overlay uses Arial, so values and labels match. A customer's PDF will use its own fonts. The overlay can only match the font the generated PDF will use: CedarEngine's `Blob.toPDF` prints Arial Unicode MS.

## The parts

| File | What it is |
|---|---|
| `template.pdf` | A 3-page US Letter Order Form: printed content only, as uploaded to a PDF Upload template |
| `tools/dump-layout.mjs`, `tools/make_template_pdf.py` | Builds `template.pdf` from the `bg` layout in `data.js` (ReportLab, Arial embedded). The baseline maths matches CSS line boxes |
| `vendor/pdfjs/` | PDF.js 4.10.38 (Apache-2.0), loaded as an ES module. The worker must be served from the same site as the page |
| `app.js` | `loadPdf()` loads the PDF and builds the page shells; `paint()` renders a page; `overlayHTML()` builds the fields; the editing, history and save behaviour is the same as `pdf-live-edit` |

Rebuild the PDF after changing the layout:

```
node tools/dump-layout.mjs | python3 tools/make_template_pdf.py template.pdf
```

The **View** control in the prototype bar is a reference tool, not part of the design:
- **PDF only:** hides the overlay, showing the raw template.
- **Field boxes:** outlines every placement, so you can see how it lines up with the PDF.

## Taking it into Salesforce

- **Getting the PDF bytes.** `PDFUploadTemplateEditor.page` already fetches the template from `/services/data/vXX.X/sobjects/ContentVersion/{id}/VersionData` (same origin, no CORS) and passes PDF.js a blob URL. Live Edit can do the same, swapping in its own URL for `TEMPLATE_URL`.
- **Shipping PDF.js.** Put `pdf.min.mjs` and `pdf.worker.min.mjs` in a static resource and point `workerSrc` at the resource URL. A worker from another domain is blocked.
- **Visualforce quirks.**
  - Keep the `Array.prototype` enumerability fix that `PDFUploadTemplateEditor.page` already has. PDF.js breaks on VF's `Array.prototype.remove`.
  - VF pages can't use `<script type="module">` in older API versions. Check this, or use the PDF.js legacy (UMD) build.
- **Page sizes.** CedarEngine prints every page at 8.5×11. Read `page.view` per page, and warn when a template isn't Letter portrait instead of stretching it.
- **Data.** The values, history and versions come from the per-version data snapshot described in `../pdf-live-edit/README.md`. The PDF is only the background.
