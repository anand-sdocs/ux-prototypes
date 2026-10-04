const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.SK + "/scripts/apply_theme.js");
const THEME = { name: "Halcyon", headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: { dk1: "1B2631", lt1: "FFFFFF", dk2: "0B3954", lt2: "EEF3F6", accent1: "065A82", accent2: "F4A261",
    accent3: "2A9D8F", accent4: "E76F51", accent5: "1C7293", accent6: "264653", hlink: "065A82", folHlink: "1C7293" } };
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Fleet modernization proposal"; pres.company = "Halcyon Cloud"; pres.author = "Halcyon Sales";
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: "Title dark", background: { color: THEME.colors.dk2 },
  objects: [
    { image: { x: 0.6, y: 0.5, w: 2.4, h: 0.64, path: "img/seller-logo.png" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 2.4, w: 7.6, h: 1.6, fontSize: 44, bold: true, color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 4.15, w: 7.6, h: 0.7, fontSize: 22, color: C.accent2, margin: 0 }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "Title only", background: { color: "FFFFFF" },
  margin: [0.5, 0.6, 0.8, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { image: { x: 11.55, y: 6.95, w: 1.15, h: 0.31, path: "img/seller-logo-dark.png" } },
  ],
  slideNumber: { x: 0.6, y: 6.95, w: 0.6, h: 0.3, fontSize: 10, color: "64748B" } });

// 1. Title
let s = pres.addSlide({ masterName: "Title dark" });
s.addText("Fleet modernization proposal", { placeholder: "title" });
s.addText("Prepared for Kestrel Logistics", { placeholder: "body" });
s.addText("Dana Whitfield · Account Executive · 4 October 2026", { x: 0.6, y: 5.1, w: 7.6, h: 0.4, fontSize: 14, color: "CBD5E1", margin: 0, isTextBox: true, objectName: "Prepared by" });
s.addImage({ path: "img/customer-logo-placeholder.png", x: 9.4, y: 2.2, w: 3.0, h: 3.0, objectName: "Customer logo", altText: "Customer logo" });

// 2. Executive summary
s = pres.addSlide({ masterName: "Title only" });
s.addText("Executive summary", { placeholder: "title" });
const stats = [["$412,500", "Total investment"], ["5", "Solutions in scope"], ["30 Nov 2026", "Target go-live decision"]];
stats.forEach(([v, l], i) => {
  const x = 0.6 + i * 4.1;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 3.8, h: 1.9, fill: { color: C.background2 }, line: { color: C.background2 }, rectRadius: 0.12, objectName: `Stat card ${i + 1}` });
  s.addText(v, { x: x + 0.3, y: 1.8, w: 3.2, h: 0.9, fontSize: 36, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: `Stat value ${i + 1}` });
  s.addText(l, { x: x + 0.3, y: 2.7, w: 3.2, h: 0.5, fontSize: 14, color: "475569", margin: 0, isTextBox: true, objectName: `Stat label ${i + 1}` });
});
s.addText([
  { text: "Kestrel Logistics runs 1,200 vehicles across 14 depots. ", options: { breakLine: false } },
  { text: "This proposal replaces three separate tracking tools with one platform, cuts route planning time and gives operations one view of the fleet.", options: {} },
], { x: 0.6, y: 3.9, w: 12.1, h: 1.2, fontSize: 16, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: "Summary" });
s.addText("Dana Whitfield will be your main contact through rollout.", { x: 0.6, y: 5.3, w: 12.1, h: 0.5, fontSize: 14, italic: true, color: "475569", margin: 0, isTextBox: true, objectName: "Owner note" });

// 3. Pricing table
s = pres.addSlide({ masterName: "Title only" });
s.addText("Investment summary", { placeholder: "title" });
// the line-items table is added in the designer, as a related list
s.addText("Prices in USD. Valid for 30 days.", { x: 0.6, y: 6.3, w: 8, h: 0.4, fontSize: 11, color: "64748B", margin: 0, isTextBox: true, objectName: "Price note" });

// 4. Chart
s = pres.addSlide({ masterName: "Title only" });
s.addText("Investment by solution area", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Total", labels: ["Tracking", "Planning", "Mobile", "Analytics", "Services"], values: [194400, 91000, 67500, 42600, 17000] }],
  { x: 0.6, y: 1.5, w: 7.6, h: 5.1, barDir: "bar", chartColors: [THEME.colors.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "$#,##0",
    dataLabelColor: "1B2631", dataLabelFontSize: 11, catAxisLabelColor: "475569", valAxisLabelColor: "475569", valAxisLabelFormatCode: "$#,##0",
    valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", objectName: "Spend chart" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.7, y: 1.6, w: 4.0, h: 4.9, fill: { color: C.background2 }, line: { color: C.background2 }, rectRadius: 0.12, objectName: "Callout card" });
s.addText([
  { text: "Tracking is 47% of spend", options: { bold: true, fontSize: 20, color: C.accent1, breakLine: true } },
  { text: "Fleet Tracker covers all 1,200 vehicles from day one. Analytics and services scale with adoption.", options: { fontSize: 14, color: C.text1 } },
], { x: 9.0, y: 1.9, w: 3.4, h: 4.3, valign: "top", margin: 0, paraSpaceAfter: 10, isTextBox: true, objectName: "Callout text" });

// 5. Product spotlight
s = pres.addSlide({ masterName: "Title only" });
s.addText("Fleet Tracker", { placeholder: "title" });
s.addImage({ path: "img/product-placeholder.png", x: 0.6, y: 1.6, w: 6.0, h: 4.5, objectName: "Product image", altText: "Product image" });
s.addText("Live GPS, geofencing and driver safety scores for every vehicle, with alerts sent to dispatch in seconds.", { x: 7.1, y: 1.6, w: 5.6, h: 2.0, fontSize: 18, color: C.text1, valign: "top", margin: 0, isTextBox: true, objectName: "Product description" });
s.addText([
  { text: "Quantity  ", options: { color: "64748B" } }, { text: "1,200", options: { bold: true, breakLine: true } },
  { text: "Line total  ", options: { color: "64748B" } }, { text: "$194,400.00", options: { bold: true } },
], { x: 7.1, y: 4.0, w: 5.6, h: 1.1, fontSize: 16, color: C.text1, margin: 0, paraSpaceAfter: 6, isTextBox: true, objectName: "Product figures" });

// 6. Special terms (conditional)
s = pres.addSlide({ masterName: "Title only" });
s.addText("Multi-year terms", { placeholder: "title" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.6, w: 12.1, h: 2.4, fill: { color: "FDF1E7" }, line: { color: "FDF1E7" }, rectRadius: 0.12, objectName: "Terms card" });
s.addText([
  { text: "3-year commitment, 10% discount on Fleet Tracker", options: { bold: true, fontSize: 22, color: "9A4A12", breakLine: true } },
  { text: "Pricing is locked for the term. Annual true-up for vehicles added after go-live.", options: { fontSize: 16, color: C.text1 } },
], { x: 1.0, y: 1.9, w: 11.3, h: 1.8, valign: "top", margin: 0, paraSpaceAfter: 8, isTextBox: true, objectName: "Terms text" });

// 7. Next steps
s = pres.addSlide({ masterName: "Title only" });
s.addText("Next steps", { placeholder: "title" });
[["1", "Technical review", "Your IT team and our solutions engineer, week of 12 October"], ["2", "Pilot", "Two depots, 150 vehicles, four weeks"], ["3", "Decision", "Contract signature by 30 November 2026"]].forEach(([n, h, d], i) => {
  const y = 1.6 + i * 1.35;
  s.addShape(pres.shapes.OVAL, { x: 0.6, y, w: 0.8, h: 0.8, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: `Step ${n} badge` });
  s.addText(n, { x: 0.6, y, w: 0.8, h: 0.8, fontSize: 20, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Step ${n} number` });
  s.addText([{ text: h, options: { bold: true, fontSize: 18, breakLine: true } }, { text: d, options: { fontSize: 14, color: "475569" } }],
    { x: 1.7, y: y - 0.05, w: 6.4, h: 0.95, color: C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `Step ${n} text` });
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.7, y: 1.6, w: 4.0, h: 3.5, fill: { color: C.background2 }, line: { color: C.background2 }, rectRadius: 0.12, objectName: "Contact card" });
s.addText([
  { text: "Your contact", options: { fontSize: 12, color: "64748B", breakLine: true } },
  { text: "Dana Whitfield", options: { fontSize: 22, bold: true, color: C.text2, breakLine: true } },
  { text: "Account Executive", options: { fontSize: 14, color: C.text1, breakLine: true } },
  { text: "dana.whitfield@halcyon.example", options: { fontSize: 14, color: C.accent1, breakLine: true } },
  { text: "+1 555 0100", options: { fontSize: 14, color: C.text1 } },
], { x: 9.0, y: 1.9, w: 3.4, h: 2.9, valign: "top", margin: 0, paraSpaceAfter: 6, isTextBox: true, objectName: "Contact text" });

(async () => {
  await pres.writeFile({ fileName: "fleet-proposal.pptx" });
  await applyTheme("fleet-proposal.pptx", THEME);
  console.log("written");
})();
