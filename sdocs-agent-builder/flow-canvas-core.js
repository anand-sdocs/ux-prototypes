// =====================================================================
// Shared flow-canvas core.
//
// The node vocabulary the agent builder and the run audit both draw with:
// geometry, the four shapes, the icon set, and the link factory. Kept in
// one place so a card on the audit page is the same card as on the
// builder canvas rather than a copy that drifts.
//
// Exposes window.FlowCanvas. Requires @joint/core to be loaded first.
// =====================================================================
(function () {

// Shapes — geometry carried over from the JointJS spike
// ---------------------------------------------------------------------
joint.dia.attributes.html = { set: function (html, refBBox, node) { node.innerHTML = html; } };
const XHTML = 'http://www.w3.org/1999/xhtml';

const CARD_W = 330, CARD_H = 78;
const HEX_NOTCH = 30, HEX_RADIUS = 11;

// Rounds every vertex of a polygon, clamping the radius to half the
// shorter adjacent edge so a short edge can't collapse the shape.
function roundedPolyPath(pts, r) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const p1 = { x: cur.x + (prev.x - cur.x) / inLen * rr, y: cur.y + (prev.y - cur.y) / inLen * rr };
    const p2 = { x: cur.x + (next.x - cur.x) / outLen * rr, y: cur.y + (next.y - cur.y) / outLen * rr };
    d += (i === 0 ? 'M ' : ' L ') + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2);
    d += ' Q ' + cur.x.toFixed(2) + ' ' + cur.y.toFixed(2) + ' ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
  }
  return d + ' Z';
}

function hexPath(w, h, notch, r) {
  return roundedPolyPath([
    { x: notch, y: 0 }, { x: w - notch, y: 0 }, { x: w, y: h / 2 },
    { x: w - notch, y: h }, { x: notch, y: h }, { x: 0, y: h / 2 },
  ], r);
}

const SOFT_SHADOW = { name: 'dropShadow', args: { dx: 0, dy: 2, blur: 3, color: 'rgba(0,0,0,0.07)' } };

function foMarkup(sel) {
  return { tagName: 'foreignObject', selector: 'fo',
    children: [{ tagName: 'div', namespaceURI: XHTML, selector: 'content', attributes: { class: 'fc-fo' } }] };
}

// A rounded rectangle whose contents are HTML (agent, trigger, step cards).
const CardNode = joint.dia.Element.define('fc.Card', {
  size: { width: CARD_W, height: CARD_H },
  attrs: {
    body: { width: 'calc(w)', height: 'calc(h)', rx: 12, ry: 12,
            fill: '#ffffff', stroke: '#dddbda', strokeWidth: 1.5, filter: SOFT_SHADOW },
    fo: { x: 15, y: 0, width: CARD_W - 30, height: CARD_H, overflow: 'visible' },
    content: { html: '' },
  },
}, { markup: [{ tagName: 'rect', selector: 'body' }, foMarkup()] });

// A flat-ended hexagon with softened corners — same footprint as a card,
// so decisions sit on the same grid instead of interrupting it.
const HexNode = joint.dia.Element.define('fc.Hex', {
  size: { width: CARD_W, height: CARD_H },
  attrs: {
    body: { d: hexPath(CARD_W, CARD_H, HEX_NOTCH, HEX_RADIUS),
            fill: '#ffffff', stroke: '#dddbda', strokeWidth: 1.5, filter: SOFT_SHADOW },
    fo: { x: 26, y: 0, width: CARD_W - 52, height: CARD_H, overflow: 'visible' },
    content: { html: '' },
  },
}, { markup: [{ tagName: 'path', selector: 'body' }, foMarkup()] });

const PillNode = joint.dia.Element.define('fc.Pill', {
  size: { width: 110, height: 40 },
  attrs: {
    body: { width: 'calc(w)', height: 'calc(h)', rx: 20, ry: 20, fill: '#c9ccd1', stroke: 'none' },
    label: { x: 'calc(w/2)', y: 'calc(h/2)', textAnchor: 'middle', textVerticalAnchor: 'middle',
             fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif', fill: '#5e6670' },
  },
}, { markup: [{ tagName: 'rect', selector: 'body' }, { tagName: 'text', selector: 'label' }] });

// Dashed affordance: "add a trigger", "add your first step".
const GhostNode = joint.dia.Element.define('fc.Ghost', {
  size: { width: 200, height: 52 },
  attrs: {
    body: { width: 'calc(w)', height: 'calc(h)', rx: 11, ry: 11,
            fill: '#ffffff', stroke: '#c2c6cc', strokeWidth: 1.5, strokeDasharray: '5 4' },
    fo: { x: 8, y: 0, width: 184, height: 52, overflow: 'visible' },
    content: { html: '' },
  },
}, { markup: [{ tagName: 'rect', selector: 'body' }, foMarkup()] });

// Feather-style icons at the stroke weight used across the prototype.
function ico(inner) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
const DECISION_ICON = {
  rule:     ico('<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>'),
  decision: ico('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  approval: ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>'),
};
const PLUS_ICON = ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');

// A connector between two nodes. `opts`: { label, ghost, color, dashed }.
function makeLink(from, to, opts) {
  opts = opts || {};
  const stroke = opts.color || (opts.ghost ? '#dfe2e6' : '#c2c6cc');
  const link = new joint.shapes.standard.Link({
    source: { id: from }, target: { id: to },
    router: { name: 'manhattan', args: { padding: 18, startDirections: ['bottom'], endDirections: ['top'] } },
    connector: { name: 'rounded', args: { radius: 10 } },
    attrs: {
      line: {
        stroke: stroke, strokeWidth: 2,
        strokeDasharray: (opts.ghost || opts.dashed) ? '5 4' : null,
        targetMarker: opts.ghost ? null
          : { type: 'path', d: 'M 9 -4.5 0 0 9 4.5 z', fill: stroke, stroke: 'none' },
      },
    },
  });
  if (opts.label) {
    link.labels([{
      // Measured back from the target: branches share a stub below the fork,
      // so a label near the source lands on its sibling.
      position: { distance: -30 },
      markup: [{ tagName: 'rect', selector: 'labelBody' }, { tagName: 'text', selector: 'labelText' }],
      attrs: {
        labelText: { text: opts.label, fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                     fill: '#5e6670', textAnchor: 'middle', textVerticalAnchor: 'middle' },
        labelBody: { ref: 'labelText', fill: '#ffffff', stroke: '#dddbda', strokeWidth: 1, rx: 6, ry: 6,
                     x: 'calc(x-8)', y: 'calc(y-4)', width: 'calc(w+16)', height: 'calc(h+8)' },
      },
    }]);
  }
  return link;
}

// Top-to-bottom dagre layout over the whole graph.
function layout(graph) {
  joint.layout.DirectedGraph.layout(graph, {
    dagre: dagre, graphlib: graphlib,
    rankDir: 'TB', nodeSep: 42, rankSep: 54, marginX: 40, marginY: 40,
    setLinkVertices: false,
  });
}

function escapeText(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

window.FlowCanvas = {
  CARD_W: CARD_W, CARD_H: CARD_H, HEX_NOTCH: HEX_NOTCH, HEX_RADIUS: HEX_RADIUS,
  roundedPolyPath: roundedPolyPath, hexPath: hexPath, SOFT_SHADOW: SOFT_SHADOW,
  CardNode: CardNode, HexNode: HexNode, PillNode: PillNode, GhostNode: GhostNode,
  ico: ico, DECISION_ICON: DECISION_ICON, PLUS_ICON: PLUS_ICON,
  makeLink: makeLink, layout: layout, esc: escapeText,
};

})();
