// Prints the template's page layout (the static, printed content) from data.js
// as JSON, for make_template_pdf.py. Only `bg` items are printed into the PDF;
// field values are never in the template — PDF Live Edit lays them on top.
//
//   node tools/dump-layout.mjs | python3 tools/make_template_pdf.py template.pdf
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const ctx = { window: {} };
vm.runInNewContext(src, ctx);
const pages = ctx.window.LP_DATA.PAGES.map(p => ({ n: p.n, bg: p.bg }));
process.stdout.write(JSON.stringify({ width: 612, height: 792, pages }, null, 1));
