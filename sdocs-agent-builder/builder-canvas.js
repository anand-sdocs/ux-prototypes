// =====================================================================
// Canvas-first agent builder.
//
// Replaces the seven-step wizard: you land on a canvas showing the whole
// agent — who it is, what starts it, and every step and decision — and
// configure whatever you select in the right-hand panel.
//
// Reading order, top of canvas down:
//   [Agent]            identity, guardrails, model
//   [Trigger] ...      one node per enabled trigger, all merging
//   [Step] / [Decision] ...
//
// Built on the free @joint/core (MPL-2.0) + @joint/layout-directed-graph.
// =====================================================================

// The wizard (builder.js) is loaded alongside this file so the canvas can open
// its real task sub-flows. Both scripts declare a top-level `state`, which in
// classic scripts share one lexical scope, so everything here lives inside an
// IIFE: no renaming, no collisions, and the wizard's globals stay reachable.
(function () {

// ---------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------
const DECISION_KINDS = {
  rule:     { label: 'Rule condition', color: '#b8860b', tint: '#fff8e1' },
  decision: { label: 'Agent decision', color: '#7d3ac1', tint: '#f4edfb' },
  approval: { label: 'Human approval', color: '#c62828', tint: '#fdecea' },
};

const CAUTION_LABELS = ['Act freely', 'Balanced', 'Always ask'];

let nodeSeq = 1;
let edgeSeq = 1;
const nid = (p) => p + (nodeSeq++);

let state = {
  agent: {
    name: '',
    role: '',
    tone: 'Professional',
    voice: 'First person (I/we)',
    caution: 1,
    guardrails: '',
    modelId: (LLM_MODELS.find(m => m.default) || LLM_MODELS[0]).id,
  },
  // trigger key -> config; presence means enabled. Manual is always on.
  triggers: { manual: {} },
  nodes: [],   // { id, kind: 'task'|'rule'|'decision'|'approval'|'end', type?, title, desc, config }
  edges: [],   // { from, to, label? }
};

let selected = null;      // { type: 'agent' | 'trigger' | 'node', id }
const undoStack = [];

function snapshot() {
  undoStack.push(JSON.stringify({ state: state, seq: nodeSeq }));
  if (undoStack.length > 60) undoStack.shift();
}

function findNode(id) { return state.nodes.find(n => n.id === id); }
function firstStepId() {
  // the node every trigger flows into
  const targets = new Set(state.edges.map(e => e.to));
  const head = state.nodes.find(n => !targets.has(n.id));
  return head ? head.id : null;
}
function isDecision(kind) { return kind === 'rule' || kind === 'decision' || kind === 'approval'; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------------
// Summaries shown on the node cards
// ---------------------------------------------------------------------
function stepSummary(node) {
  const c = node.config || {};
  switch (node.type) {
    case 'extract': {
      const n = (c.schema || []).length;
      const skill = c.skillId ? SKILLS.find(x => x.id === c.skillId) : null;
      if (skill) return skill.name + ' — ' + n + ' field' + (n === 1 ? '' : 's');
      if (!c.fileName) return 'Upload a sample, or start from a skill';
      return 'From "' + c.fileName + '" — ' + (n ? n + ' field' + (n === 1 ? '' : 's') : 'no schema yet');
    }
    case 'generate': {
      if (!c.templateId) return 'Choose a document type';
      // ops-library templates aren't in DOCUMENT_TEMPLATES; the wizard's
      // resolver looks in both, plus the custom case
      const tpl = window.getTemplateForConfig ? window.getTemplateForConfig(c) : null;
      const label = c.templateId === 'custom'
        ? (c.customLabel || 'Custom document')
        : (tpl || {}).label;
      const els = Object.values(c.dataElements || {}).filter(function (x) { return x.included; }).length;
      const vz = Object.values(c.visualizations || {}).filter(function (x) { return x.included; }).length;
      return (label || 'Document') + (els ? ' — ' + els + ' data element' + (els === 1 ? '' : 's') : '') +
        (vz ? ', ' + vz + ' chart' + (vz === 1 ? '' : 's') : '');
    }
    case 'analyze':
      if (c.mode === 'playbook') return 'Playbook — ' + (c.playbookName || 'not chosen yet');
      if (c.mode === 'threshold') {
        const n = (c.rules || []).length;
        return n ? n + ' condition' + (n === 1 ? '' : 's') : 'No conditions yet';
      }
      return 'Pick how it should analyse';
    case 'save': {
      const p = DESTINATION_PLATFORMS.find(x => x.id === c.platformId);
      return p ? 'To ' + p.name : 'Pick a destination';
    }
    case 'notify': {
      const ch = NOTIFY_CHANNELS.find(x => x.id === c.channelId);
      if (!ch) return 'Pick a channel';
      return 'Via ' + ch.name + (c.recipient ? ' to ' + c.recipient : '');
    }
    default: return '';
  }
}

function triggerSummary(key) {
  const c = state.triggers[key] || {};
  switch (key) {
    case 'manual':   return 'Anyone with access can run it';
    case 'slack':    return 'Mentions in ' + (c.channelPattern || '#any-channel');
    case 'email':    return c.filterValue ? 'Subject contains "' + c.filterValue + '"' : 'Any mail to the agent inbox';
    case 'webhook':  return 'POST to the generated URL';
    case 'schedule': return (c.frequency || 'Daily') + (c.weekday ? ' · ' + c.weekday : '') + ' at ' + (c.time || '09:00');
    default: return '';
  }
}

// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// Node HTML
// ---------------------------------------------------------------------
function initials(name) {
  const parts = (name || 'Agent').trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]).join('').toUpperCase() || 'AG';
}

function agentHtml() {
  const a = state.agent;
  const model = LLM_MODELS.find(m => m.id === a.modelId);
  const sources = connectedSources();
  return '<div class="fc-agent-inner">' +
      '<div class="fc-agent-avatar">' + esc(initials(a.name)) + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-agent-kicker">Agent</div>' +
        '<div class="fc-agent-title">' + esc(a.name || 'Untitled agent') + '</div>' +
        '<div class="fc-agent-meta">' +
          '<span class="fc-agent-pill">' + esc(model ? model.name : 'No model') + '</span>' +
          '<span class="fc-agent-pill">' + esc(CAUTION_LABELS[a.caution]) + '</span>' +
          (sources.length ? '<span class="fc-agent-pill">' + sources.length + ' source' + (sources.length === 1 ? '' : 's') + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
}

function triggerHtml(key) {
  const t = TRIGGER_TYPES[key];
  return '<div class="fc-trigger-inner">' +
      '<div class="fc-trigger-icon" style="background:' + t.color + '">' + t.letter + '</div>' +
      '<div class="fc-trigger-body">' +
        '<div class="fc-trigger-title">' + esc(t.label) + '</div>' +
        '<div class="fc-trigger-desc">' + esc(triggerSummary(key)) + '</div>' +
      '</div>' +
    '</div>';
}

function stepHtml(node) {
  const t = TASK_TYPES[node.type] || { color: '#5e6670', label: '?' };
  return '<div class="fc-node" style="border:none;box-shadow:none;padding:0;">' +
      '<div class="fc-node-icon" style="background:' + t.color + '">' + t.label[0] + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-node-title">' + esc(node.title) + '</div>' +
        '<div class="fc-node-desc">' + esc(stepSummary(node)) + '</div>' +
      '</div>' +
    '</div>';
}

function hexHtml(node) {
  const k = DECISION_KINDS[node.kind];
  return '<div class="fc-hex-inner">' +
      '<div class="fc-hex-icon" style="background:' + k.tint + ';color:' + k.color + '">' + DECISION_ICON[node.kind] + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-hex-kicker" style="color:' + k.color + '">' + k.label + '</div>' +
        '<div class="fc-node-title">' + esc(node.title) + '</div>' +
      '</div>' +
    '</div>';
}

function connectedSources() {
  const ids = new Set();
  state.nodes.forEach(n => {
    const c = n.config || {};
    if (c.platformId) ids.add(c.platformId);
  });
  Object.keys(state.triggers).forEach(k => { if (k === 'slack' || k === 'email') ids.add(k); });
  // anything connected from inside a sub-flow (e.g. Generate's source priority)
  const wiz = window.wizardState && window.wizardState.connectors;
  if (wiz) Object.keys(wiz).forEach(function (id) { if (wiz[id]) ids.add(id); });
  return [...ids];
}

// ---------------------------------------------------------------------
// Graph assembly
// ---------------------------------------------------------------------
const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

const paper = new joint.dia.Paper({
  el: document.getElementById('paper'),
  model: graph,
  cellViewNamespace: joint.shapes,
  width: '100%', height: '100%',
  gridSize: 1,
  background: { color: '#f4f6f9' },
  // Guided editing: layout owns position, so nothing is hand-draggable.
  interactive: { elementMove: false, linkMove: false },
  defaultConnectionPoint: { name: 'boundary' },
});

const ACCENT = '#0176d3';

function selKey(type, id) { return type + ':' + (id == null ? '' : id); }
function isSelected(type, id) {
  return selected && selected.type === type && String(selected.id) === String(id);
}

function styleSelected(cell, on, color) {
  cell.attr('body/stroke', on ? (color || ACCENT) : '#dddbda');
  cell.attr('body/strokeWidth', on ? 2.5 : 1.5);
}

function buildCells() {
  const cells = [];

  // --- agent ---
  const agentCell = new CardNode({ id: 'agent' });
  agentCell.attr('content/html', agentHtml());
  agentCell.set('fcRef', { type: 'agent', id: null });
  styleSelected(agentCell, isSelected('agent', null));
  cells.push(agentCell);

  // --- triggers (one node each, all merging into the first step) ---
  const head = firstStepId();
  const keys = Object.keys(state.triggers);
  keys.forEach(key => {
    const c = new CardNode({ id: 'trig:' + key, size: { width: 250, height: 62 } });
    c.attr('fo', { x: 13, y: 0, width: 224, height: 62 });
    c.attr('content/html', triggerHtml(key));
    c.set('fcRef', { type: 'trigger', id: key });
    styleSelected(c, isSelected('trigger', key));
    cells.push(c);
    cells.push(edgeLink('agent', 'trig:' + key));
    if (head) cells.push(edgeLink('trig:' + key, head));
  });

  // --- ghost "add trigger" sitting in the trigger rank ---
  const addTrig = new GhostNode({ id: 'trig:add', size: { width: 160, height: 62 } });
  addTrig.attr('fo', { x: 8, y: 0, width: 144, height: 62 });
  addTrig.attr('content/html',
    '<div class="fc-addtrigger-inner"><span style="width:14px;height:14px;display:flex;">' + PLUS_ICON + '</span>Add a trigger</div>');
  addTrig.set('fcRef', { type: 'addTrigger', id: null });
  cells.push(addTrig);
  cells.push(edgeLink('agent', 'trig:add', null, true));

  // --- steps and decisions ---
  state.nodes.forEach(n => {
    let c;
    if (isDecision(n.kind)) {
      c = new HexNode({ id: n.id });
      c.attr('content/html', hexHtml(n));
      styleSelected(c, isSelected('node', n.id), DECISION_KINDS[n.kind].color);
    } else if (n.kind === 'end') {
      c = new PillNode({ id: n.id, attrs: { label: { text: 'End' } } });
    } else {
      c = new CardNode({ id: n.id });
      c.attr('content/html', stepHtml(n));
      styleSelected(c, isSelected('node', n.id));
    }
    c.set('fcRef', { type: 'node', id: n.id });
    cells.push(c);
  });

  // Give every edge a stable id so an unfilled branch can be addressed.
  state.edges.forEach(function (e) { if (!e.id) e.id = 'e' + (edgeSeq++); });

  state.edges.forEach(function (e) {
    if (e.to) { cells.push(edgeLink(e.from, e.to, e.label)); return; }
    // an unfilled branch: terminate it in its own "Add a step" so it's
    // obvious which path a click extends
    const gid = 'open:' + e.id;
    const g = new GhostNode({ id: gid, size: { width: 200, height: 52 } });
    g.attr('fo', { x: 8, y: 0, width: 184, height: 52 });
    g.attr('content/html',
      '<div class="fc-addtrigger-inner"><span style="width:14px;height:14px;display:flex;">' +
      PLUS_ICON + '</span>Add a step</div>');
    g.set('fcRef', { type: 'addEdge', id: e.id });
    cells.push(g);
    cells.push(edgeLink(e.from, gid, e.label, true));
  });

  // --- a dashed "add a step" after every leaf, or the flow dead-ends ---
  state.nodes.forEach(n => {
    if (n.kind === 'end') return;
    if (state.edges.some(e => e.from === n.id)) return;
    const gid = 'add:' + n.id;
    const g = new GhostNode({ id: gid, size: { width: 200, height: 52 } });
    g.attr('fo', { x: 8, y: 0, width: 184, height: 52 });
    g.attr('content/html',
      '<div class="fc-addtrigger-inner"><span style="width:14px;height:14px;display:flex;">' + PLUS_ICON + '</span>Add a step</div>');
    g.set('fcRef', { type: 'addAfter', id: n.id });
    cells.push(g);
    cells.push(edgeLink(n.id, gid, null, true));
  });

  // --- empty state: nothing to run yet ---
  if (!state.nodes.length) {
    const ph = new GhostNode({ id: 'placeholder', size: { width: 250, height: 58 } });
    ph.attr('fo', { x: 8, y: 0, width: 234, height: 58 });
    ph.attr('content/html',
      '<div class="fc-placeholder-inner"><span style="width:14px;height:14px;display:flex;">' + PLUS_ICON + '</span>Add your first step</div>');
    ph.set('fcRef', { type: 'addFirst', id: null });
    cells.push(ph);
    keys.forEach(key => cells.push(edgeLink('trig:' + key, 'placeholder', null, true)));
  }

  return cells;
}

function edgeLink(from, to, label, ghost) {
  const link = new joint.shapes.standard.Link({
    source: { id: from }, target: { id: to },
    router: { name: 'manhattan', args: { padding: 18, startDirections: ['bottom'], endDirections: ['top'] } },
    connector: { name: 'rounded', args: { radius: 10 } },
    attrs: {
      line: {
        stroke: ghost ? '#dfe2e6' : '#c2c6cc',
        strokeWidth: 2,
        strokeDasharray: ghost ? '5 4' : null,
        targetMarker: ghost ? null
          : { type: 'path', d: 'M 9 -4.5 0 0 9 4.5 z', fill: '#c2c6cc', stroke: 'none' },
      },
    },
  });
  if (label) {
    link.labels([{
      // Negative = measured back from the TARGET. Branches share a vertical
      // stub just below the fork, so a label placed near the source lands on
      // top of its sibling; at the target end the paths have diverged and each
      // chip sits over the node it actually leads to.
      position: { distance: -30 },
      markup: [{ tagName: 'rect', selector: 'labelBody' }, { tagName: 'text', selector: 'labelText' }],
      attrs: {
        labelText: { text: label, fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                     fill: '#5e6670', textAnchor: 'middle', textVerticalAnchor: 'middle' },
        labelBody: { ref: 'labelText', fill: '#ffffff', stroke: '#dddbda', strokeWidth: 1, rx: 6, ry: 6,
                     x: 'calc(x-8)', y: 'calc(y-4)', width: 'calc(w+16)', height: 'calc(h+8)' },
      },
    }]);
  }
  link.set('edgeFrom', from);
  link.set('edgeTo', to);
  link.set('insertable', !ghost && from !== 'agent');
  return link;
}

function render(keepView) {
  const t = paper.translate(), s = paper.scale().sx;
  graph.resetCells(buildCells());
  joint.layout.DirectedGraph.layout(graph, {
    dagre: dagre, graphlib: graphlib,
    rankDir: 'TB', nodeSep: 42, rankSep: 54, marginX: 40, marginY: 40,
    setLinkVertices: false,
  });
  if (keepView) { paper.scale(s, s); paper.translate(t.tx, t.ty); }
  renderMinimap();
  renderInspector();
  document.getElementById('agent-name-input').value = state.agent.name;
}

// ---------------------------------------------------------------------
// Viewport: zoom, pan, fit, minimap
// ---------------------------------------------------------------------
let zoom = 1;

function setZoom(z, ox, oy) {
  zoom = Math.max(0.25, Math.min(2, z));
  paper.scale(zoom, zoom, ox, oy);
  document.getElementById('zoom-label').textContent = Math.round(zoom * 100) + '%';
  updateViewport();
}

function fit() {
  paper.transformToFitContent({ padding: 55, maxScale: 1, minScale: 0.25, useModelGeometry: true });
  zoom = paper.scale().sx;
  document.getElementById('zoom-label').textContent = Math.round(zoom * 100) + '%';
  updateViewport();
}

const minimap = new joint.dia.Paper({
  el: document.getElementById('minimap'), model: graph,
  cellViewNamespace: joint.shapes, width: 170, height: 210,
  interactive: false, background: { color: '#fbfcfd' },
});
const viewportEl = document.createElement('div');
viewportEl.className = 'fc-minimap-viewport';
document.getElementById('minimap').appendChild(viewportEl);

function renderMinimap() {
  minimap.transformToFitContent({ padding: 8, useModelGeometry: true });
  updateViewport();
}

function updateViewport() {
  const area = paper.getArea();
  const s = minimap.scale().sx, t = minimap.translate();
  viewportEl.style.left = (area.x * s + t.tx) + 'px';
  viewportEl.style.top = (area.y * s + t.ty) + 'px';
  viewportEl.style.width = (area.width * s) + 'px';
  viewportEl.style.height = (area.height * s) + 'px';
}

minimap.on('blank:pointerdown cell:pointerdown', (evt, x, y) => {
  const el = document.getElementById('paper');
  paper.translate(el.clientWidth / 2 - x * zoom, el.clientHeight / 2 - y * zoom);
  updateViewport();
});

let panning = null;
paper.on('blank:pointerdown', (evt) => {
  panning = { x: evt.clientX, y: evt.clientY, t: paper.translate() };
  closeMenus();
  select(null);
});
document.addEventListener('mousemove', (evt) => {
  if (!panning) return;
  paper.translate(panning.t.tx + (evt.clientX - panning.x), panning.t.ty + (evt.clientY - panning.y));
  updateViewport();
});
document.addEventListener('mouseup', () => { panning = null; });
document.getElementById('paper').addEventListener('wheel', (evt) => {
  if (!evt.ctrlKey && !evt.metaKey) return;
  evt.preventDefault();
  setZoom(zoom - evt.deltaY * 0.002);
}, { passive: false });

document.getElementById('btn-zoom-in').onclick = () => setZoom(zoom + 0.15);
document.getElementById('btn-zoom-out').onclick = () => setZoom(zoom - 0.15);
document.getElementById('btn-fit').onclick = fit;
document.getElementById('btn-undo').onclick = () => {
  if (!undoStack.length) return toast('Nothing to undo');
  const prev = JSON.parse(undoStack.pop());
  state = prev.state; nodeSeq = prev.seq; selected = null;
  render(true);
};

// ---------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------
function select(ref) {
  selected = ref;
  render(true);
}

paper.on('element:pointerclick', (view) => {
  closeMenus();
  const ref = view.model.get('fcRef');
  if (!ref) return;
  if (ref.type === 'addTrigger') return openTriggerMenu(view);
  if (ref.type === 'addFirst') return openInsertMenuAt(view, null);
  if (ref.type === 'addAfter') return openInsertMenuAt(view, ref.id);
  if (ref.type === 'addEdge') return openInsertMenuOnEdge(view, ref.id);
  select(ref);
});

// ---------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------
function panelShell(chipHtml, title, kicker, bodyHtml) {
  return '<div class="fc-insp-head">' +
      '<div class="fc-insp-head-row">' + chipHtml + '<h3>' + esc(title) + '</h3></div>' +
      '<div class="fc-inspector-kind" style="margin:8px 0 0;">' + esc(kicker) + '</div>' +
    '</div>' +
    '<div class="fc-insp-body">' + bodyHtml + '</div>';
}

function renderInspector() {
  const el = document.getElementById('inspector');
  if (!selected) {
    el.innerHTML = '<div class="fc-inspector-empty" style="padding:40px 22px;">' +
      'Select the agent, a trigger, a step or a decision to configure it.<br><br>' +
      'Hover a connector to reveal the <strong>+</strong> that inserts a step or a branch.</div>';
    return;
  }
  if (selected.type === 'agent') return renderAgentPanel(el);
  if (selected.type === 'trigger') return renderTriggerPanel(el, selected.id);
  const node = findNode(selected.id);
  if (!node) { selected = null; return renderInspector(); }
  if (isDecision(node.kind)) return renderDecisionPanel(el, node);
  return renderStepPanel(el, node);
}

function bind(id, evt, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evt, fn);
}

// --- agent -------------------------------------------------------------
// Providers in the order they first appear, so the dropdown groups stay
// stable if LLM_MODELS grows.
function modelProviders() {
  const out = [];
  LLM_MODELS.forEach(function (m) { if (out.indexOf(m.provider) === -1) out.push(m.provider); });
  return out;
}

function renderAgentPanel(el) {
  const a = state.agent;
  const model = LLM_MODELS.find(function (m) { return m.id === a.modelId; });
  const chip = '<div class="fc-agent-avatar" style="width:34px;height:34px;border-radius:10px;font-size:12px;">' +
    esc(initials(a.name)) + '</div>';

  const tones = ['Professional', 'Friendly', 'Concise', 'Formal'];
  const voices = ['First person (I/we)', 'Third person (the agent)', 'Neutral/passive'];
  const sources = connectedSources();

  const body =
    '<div class="fc-field"><label>Agent name</label>' +
      '<input type="text" id="a-name" value="' + esc(a.name) + '" placeholder="e.g. Renewal Deal Extractor"></div>' +
    '<div class="fc-field"><label>Role &amp; description</label>' +
      '<textarea id="a-role" rows="4" placeholder="What is it responsible for, and when should it act?">' + esc(a.role) + '</textarea></div>' +

    '<div class="fc-insp-section-label">Model</div>' +
    '<div class="fc-field"><select id="a-model">' +
      modelProviders().map(function (prov) {
        return '<optgroup label="' + esc(prov) + '">' +
          LLM_MODELS.filter(function (m) { return m.provider === prov; }).map(function (m) {
            return '<option value="' + m.id + '"' +
              (a.modelId === m.id ? ' selected' : '') + (m.enabled ? '' : ' disabled') + '>' +
              esc(m.name) + (m.enabled ? '' : ' — disabled by your admin') + '</option>';
          }).join('') + '</optgroup>';
      }).join('') +
    '</select>' +
    (model
      ? '<div class="fc-hint">' + esc(model.description) + ' · ' + esc(model.contextWindow) + ' context.</div>'
      : '') +
    '</div>' +

    '<div class="fc-insp-section-label">Guardrails</div>' +
    '<div class="fc-field"><label>Tone</label><div class="fc-chips">' +
      tones.map(t => '<button class="fc-chip' + (a.tone === t ? ' on' : '') + '" data-tone="' + esc(t) + '">' + esc(t) + '</button>').join('') +
    '</div></div>' +
    '<div class="fc-field"><label>Voice</label><div class="fc-chips">' +
      voices.map(v => '<button class="fc-chip' + (a.voice === v ? ' on' : '') + '" data-voice="' + esc(v) + '">' + esc(v.split(' (')[0]) + '</button>').join('') +
    '</div></div>' +
    '<div class="fc-field"><label>Caution level</label><div class="fc-slider-row">' +
      '<input type="range" id="a-caution" min="0" max="2" step="1" value="' + a.caution + '">' +
      '<span class="fc-slider-value" id="a-caution-val">' + CAUTION_LABELS[a.caution] + '</span></div>' +
      '<div class="fc-hint">How often it should stop and ask you before acting.</div></div>' +
    '<div class="fc-field"><label>Additional guardrails</label>' +
      '<textarea id="a-guard" rows="3" placeholder="Anything it should never do.">' + esc(a.guardrails) + '</textarea></div>' +

    '<div class="fc-insp-section-label">Connected sources</div>' +
    (sources.length
      ? sources.map(id => {
          const c = CONNECTORS.find(x => x.id === id) || DESTINATION_PLATFORMS.find(x => x.id === id) || { name: id };
          return '<div class="fc-field-row"><strong>' + esc(c.name) + '</strong>' +
            '<span class="fc-connected-tag" style="margin-left:auto;">Connected</span></div>';
        }).join('')
      : '<div class="fc-muted-note">Nothing connected yet. Sources are connected from the step that needs them.</div>');

  el.innerHTML = panelShell(chip, a.name || 'Untitled agent', 'Agent', body);

  bind('a-name', 'input', e => { state.agent.name = e.target.value; softRefresh('agent'); });
  bind('a-role', 'input', e => { state.agent.role = e.target.value; });
  bind('a-guard', 'input', e => { state.agent.guardrails = e.target.value; });
  bind('a-caution', 'input', e => {
    state.agent.caution = Number(e.target.value);
    document.getElementById('a-caution-val').textContent = CAUTION_LABELS[state.agent.caution];
    softRefresh('agent');
  });
  el.querySelectorAll('[data-tone]').forEach(b => b.onclick = () => { snapshot(); state.agent.tone = b.dataset.tone; renderInspector(); });
  el.querySelectorAll('[data-voice]').forEach(b => b.onclick = () => { snapshot(); state.agent.voice = b.dataset.voice; renderInspector(); });
  bind('a-model', 'change', function (e) {
    snapshot(); state.agent.modelId = e.target.value; renderInspector(); softRefresh('agent');
  });
}

// Update a single node's HTML without a full relayout — keeps typing smooth.
function softRefresh(kindOrId) {
  if (kindOrId === 'agent') {
    const c = graph.getCell('agent');
    if (c) c.attr('content/html', agentHtml());
    document.getElementById('agent-name-input').value = state.agent.name;
    return;
  }
  const cell = graph.getCell(kindOrId);
  if (!cell) return;
  const node = findNode(kindOrId);
  if (node) cell.attr('content/html', isDecision(node.kind) ? hexHtml(node) : stepHtml(node));
}

// --- trigger -----------------------------------------------------------
function renderTriggerPanel(el, key) {
  const t = TRIGGER_TYPES[key];
  const c = state.triggers[key] || (state.triggers[key] = {});
  const chip = '<div class="fc-trigger-icon" style="width:34px;height:34px;border-radius:10px;background:' + t.color + '">' + t.letter + '</div>';

  let body = '<div class="fc-muted-note" style="margin:0 0 16px;">' + esc(t.description) + '</div>';

  if (key === 'slack') {
    body += '<div class="fc-field"><label>Watch channel</label>' +
      '<input type="text" id="t-slack" value="' + esc(c.channelPattern || '#deal-approvals') + '" placeholder="#channel or *"></div>';
  } else if (key === 'email') {
    body += '<div class="fc-field"><label>Filter</label><select id="t-email-type">' +
      EMAIL_FILTER_TYPES.map(f => '<option value="' + f.id + '"' + (c.filterType === f.id ? ' selected' : '') + '>' + esc(f.label) + '</option>').join('') +
      '</select></div>' +
      '<div class="fc-field"><label>Value</label>' +
      '<input type="text" id="t-email-val" value="' + esc(c.filterValue || '') + '" placeholder="e.g. Claim submission"></div>';
  } else if (key === 'schedule') {
    body += '<div class="fc-field"><label>Frequency</label><select id="t-freq">' +
      SCHEDULE_FREQUENCIES.map(f => '<option' + (c.frequency === f ? ' selected' : '') + '>' + f + '</option>').join('') +
      '</select></div>' +
      '<div class="fc-field"><label>Day</label><select id="t-day">' +
      WEEKDAYS.map(d => '<option' + (c.weekday === d ? ' selected' : '') + '>' + d + '</option>').join('') +
      '</select></div>' +
      '<div class="fc-field"><label>Time</label>' +
      '<input type="time" id="t-time" value="' + esc(c.time || '09:00') + '"></div>';
  } else if (key === 'webhook') {
    body += '<div class="fc-field"><label>Endpoint</label>' +
      '<input type="text" readonly value="https://hooks.sdocs.com/a/' + esc((state.agent.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '"></div>' +
      '<div class="fc-field"><label>Sample payload</label>' +
      '<textarea rows="6" readonly style="font-family:ui-monospace,monospace;font-size:11px;">' + esc(MOCK_WEBHOOK_PAYLOAD) + '</textarea></div>';
  } else {
    body += '<div class="fc-muted-note">Manual runs are always available and can’t be turned off.</div>';
  }

  if (key !== 'manual') {
    body += '<button class="fc-deep-link fc-danger" id="t-remove" style="margin-top:18px;">Remove this trigger</button>';
  }

  el.innerHTML = panelShell(chip, t.label, 'Trigger', body);

  const touch = () => { const c2 = graph.getCell('trig:' + key); if (c2) c2.attr('content/html', triggerHtml(key)); };
  bind('t-slack', 'input', e => { c.channelPattern = e.target.value; touch(); });
  bind('t-email-type', 'change', e => { c.filterType = e.target.value; touch(); });
  bind('t-email-val', 'input', e => { c.filterValue = e.target.value; touch(); });
  bind('t-freq', 'change', e => { c.frequency = e.target.value; touch(); });
  bind('t-day', 'change', e => { c.weekday = e.target.value; touch(); });
  bind('t-time', 'input', e => { c.time = e.target.value; touch(); });
  bind('t-remove', 'click', () => {
    snapshot();
    delete state.triggers[key];
    selected = null;
    render(true);
    toast(t.label + ' trigger removed');
  });
}

// --- step --------------------------------------------------------------
function sourceOption(c, selectedId, attr) {
  const logo = c.logo
    ? '<img src="' + c.logo + '" alt="">'
    : esc(c.initials || (c.name || '?').slice(0, 2).toUpperCase());
  return '<button class="fc-option' + (selectedId === c.id ? ' on' : '') + '" ' + attr + '="' + c.id + '">' +
      '<div class="fc-option-logo">' + logo + '</div>' +
      '<div class="fc-option-body"><div class="fc-option-title">' + esc(c.name) + '</div>' +
        (c.category ? '<div class="fc-option-desc">' + esc(c.category) + '</div>' : '') + '</div>' +
      (c.connected === false ? '<span class="fc-disconnected-tag">Connect</span>' : '<span class="fc-connected-tag">Connected</span>') +
    '</button>';
}

function renderStepPanel(el, node) {
  const t = TASK_TYPES[node.type];
  const c = node.config || (node.config = {});
  const chip = '<div class="fc-node-icon" style="width:34px;height:34px;border-radius:10px;background:' + t.color + '">' + t.label[0] + '</div>';

  let body = '<div class="fc-field"><label>Step name</label>' +
    '<input type="text" id="s-title" value="' + esc(node.title) + '"></div>';

  if (node.type === 'extract') {
    // Extract isn't a connection — the document arrives from the trigger or an
    // earlier step. What you configure is the schema: seed it from a sample
    // document or an existing extraction skill, then confirm the fields.
    const extractSkills = SKILLS.filter(x => x.taskType === 'extract');
    body += '<div class="fc-insp-section-label">Sample document</div>' +
      '<div class="dropzone' + (c.fileName ? ' uploaded' : '') + '" id="s-drop" style="padding:16px;font-size:12.5px;">' +
        (c.fileName
          ? '<div class="upload-file-row"><div class="upload-file-icon">PDF</div><div><strong>' + esc(c.fileName) + '</strong>' +
            '<div style="color:var(--text-muted);font-size:11.5px;">2.4 MB · uploaded</div></div></div>'
          : 'Click to simulate uploading a sample (contract, claim form, invoice…).') +
      '</div>';

    if (extractSkills.length) {
      body += '<div class="fc-insp-section-label">Or start from a skill</div>' +
        extractSkills.map(sk =>
          '<button class="fc-option' + (c.skillId === sk.id ? ' on' : '') + '" data-skill="' + sk.id + '">' +
            '<div class="fc-option-logo" style="background:' + sk.color + ';color:#fff;border:none;">' + esc(sk.name[0]) + '</div>' +
            '<div class="fc-option-body"><div class="fc-option-title">' + esc(sk.name) + '</div>' +
              '<div class="fc-option-desc">' + esc(sk.description) + '</div></div>' +
            '<span class="fc-option-tick">' + (c.skillId === sk.id ? 'In use' : 'Use') + '</span>' +
          '</button>').join('');
    }

    body += '<div class="fc-insp-section-label">What should it pull out?</div>' +
      '<div class="fc-field"><textarea id="s-desc" rows="3" placeholder="Plain language is fine — e.g. Insurance claim form with claimant name, policy number, claim amount, and incident description.">' +
        esc(c.description || '') + '</textarea></div>' +
      '<button class="fc-deep-link" id="s-gen">' + ((c.schema || []).length ? 'Regenerate schema' : 'Generate schema') + '</button>';

    if ((c.schema || []).length) {
      body += '<div class="fc-insp-section-label">Schema (' + c.schema.length + ' fields)</div>' +
        '<table class="schema-table"><thead><tr><th>Field</th><th>Type</th><th></th></tr></thead><tbody>' +
        c.schema.map(function (f, i) {
          return '<tr><td><code style="font-size:11.5px;">' + esc(f.name) + '</code></td>' +
            '<td><span class="type-tag">' + esc(f.type) + '</span></td>' +
            '<td><button class="fc-chip" data-delfield="' + i + '" title="Remove field" ' +
              'style="padding:1px 7px;line-height:1.3;">&times;</button></td></tr>';
        }).join('') +
        '</tbody></table>';
    }

  } else if (node.type === 'generate') {
    // Choosing a document type is the first of four steps, and "Something
    // else" branches into a template search — so this defers to the wizard's
    // sub-flow rather than pretending a flat list is the whole story.
    const tpl = window.getTemplateForConfig && c.templateId ? window.getTemplateForConfig(c) : null;
    const els = Object.values(c.dataElements || {}).filter(function (x) { return x.included; }).length;
    const vizs = Object.values(c.visualizations || {}).filter(function (x) { return x.included; }).length;

    body += '<div class="fc-insp-section-label">Document</div>';
    if (tpl) {
      body += '<div class="fc-field-row" style="padding:10px 11px;">' +
          '<strong>' + esc(c.templateId === 'custom' ? (c.customLabel || 'Custom document') : tpl.label) + '</strong>' +
        '</div>' +
        '<div class="fc-hint">' + els + ' data element' + (els === 1 ? '' : 's') +
          (vizs ? ', ' + vizs + ' chart' + (vizs === 1 ? '' : 's') : '') + '.</div>' +
        '<button class="fc-deep-link" id="s-deep" style="margin-top:12px;">Edit the full setup \u2192</button>';
    } else {
      body += '<div class="fc-hint" style="margin-bottom:10px;">Pick the S-Docs template this step produces, ' +
          'start from a skill, or search what your ops team has published.</div>' +
        '<button class="fc-deep-link" id="s-deep">Choose a document type \u2192</button>';
    }

  } else if (node.type === 'analyze') {
    body += '<div class="fc-insp-section-label">How should it analyse?</div>' +
      '<div class="fc-chips" style="margin-bottom:14px;">' +
        '<button class="fc-chip' + (c.mode === 'threshold' ? ' on' : '') + '" data-mode="threshold">Thresholds</button>' +
        '<button class="fc-chip' + (c.mode === 'playbook' ? ' on' : '') + '" data-mode="playbook">Playbook</button>' +
      '</div>';
    if (c.mode === 'threshold') {
      body += (c.rules || []).map((r, i) =>
        '<div class="fc-path-row"><select data-rule-field="' + i + '">' +
          PLAYBOOK_FIELDS.map(f => '<option' + (r.field === f ? ' selected' : '') + '>' + f + '</option>').join('') +
        '</select><select data-rule-op="' + i + '" style="width:64px;">' +
          PLAYBOOK_OPERATORS.map(o => '<option' + (r.operator === o ? ' selected' : '') + '>' + o + '</option>').join('') +
        '</select><input data-rule-val="' + i + '" value="' + esc(r.value) + '" style="width:60px;"></div>').join('') +
        '<button class="fc-deep-link" id="s-addrule">Add a condition</button>';
    } else if (c.mode === 'playbook') {
      body += '<div class="fc-field"><label>Playbook</label><input type="text" id="s-playbook" value="' +
        esc(c.playbookName || '') + '" placeholder="e.g. Pricing playbook"></div>' +
        '<div class="fc-muted-note">Authoring the categories and weighted questions opens the full playbook editor.</div>';
    }

  } else if (node.type === 'save') {
    body += '<div class="fc-insp-section-label">Where should it be saved?</div>' +
      DESTINATION_PLATFORMS.map(p => sourceOption(p, c.platformId, 'data-dest')).join('');

  } else if (node.type === 'notify') {
    body += '<div class="fc-insp-section-label">Channel</div>' +
      NOTIFY_CHANNELS.map(ch =>
        '<button class="fc-option' + (c.channelId === ch.id ? ' on' : '') + '" data-chan="' + ch.id + '">' +
          '<div class="fc-option-logo" style="background:' + ch.color + ';color:#fff;border:none;">' + ch.initials + '</div>' +
          '<div class="fc-option-body"><div class="fc-option-title">' + esc(ch.name) + '</div></div></button>').join('');
    if (c.channelId) {
      body += '<div class="fc-field" style="margin-top:12px;"><label>Send to</label><select id="s-recip">' +
        (NOTIFY_RECIPIENTS[c.channelId] || []).map(r =>
          '<option' + (c.recipient === r ? ' selected' : '') + '>' + esc(r) + '</option>').join('') +
        '</select></div>' +
        '<div class="fc-field"><label>Message</label><textarea id="s-msg" rows="3" placeholder="What should it say?">' +
        esc(c.message || '') + '</textarea></div>';
    }
  }

  body += '<button class="fc-deep-link fc-danger" id="s-delete" style="margin-top:20px;">Delete this step</button>';
  el.innerHTML = panelShell(chip, node.title, t.label + ' step', body);

  bind('s-title', 'input', e => { node.title = e.target.value; softRefresh(node.id); });
  bind('s-playbook', 'input', e => { c.playbookName = e.target.value; softRefresh(node.id); });
  bind('s-msg', 'input', e => { c.message = e.target.value; });
  bind('s-recip', 'change', e => { c.recipient = e.target.value; softRefresh(node.id); });
  bind('s-desc', 'input', function (e) { c.description = e.target.value; });
  bind('s-drop', 'click', function () {
    snapshot();
    c.fileName = 'sample_document.pdf';
    renderInspector(); softRefresh(node.id);
  });
  bind('s-gen', 'click', function () {
    snapshot();
    c.schema = EXTRACT_SAMPLE_SCHEMA.map(function (f) { return Object.assign({}, f); });
    c.fileName = c.fileName || 'sample_document.pdf';
    renderInspector(); softRefresh(node.id);
    toast('Generated a ' + c.schema.length + '-field schema');
  });
  el.querySelectorAll('[data-skill]').forEach(function (b) {
    b.onclick = function () {
      snapshot();
      const sk = SKILLS.find(function (x) { return x.id === b.dataset.skill; });
      c.skillId = sk.id;
      c.schema = (sk.payload.schema || []).map(function (f) { return Object.assign({}, f); });
      c.fileName = c.fileName || 'sample_document.pdf';
      node.title = sk.name.replace(/ Skill$/, '');
      renderInspector(); softRefresh(node.id);
      toast('Using ' + sk.name);
    };
  });
  el.querySelectorAll('[data-delfield]').forEach(function (b) {
    b.onclick = function () {
      snapshot();
      c.schema.splice(Number(b.dataset.delfield), 1);
      renderInspector(); softRefresh(node.id);
    };
  });
  bind('s-addrule', 'click', () => {
    snapshot();
    c.rules = (c.rules || []).concat([{ field: PLAYBOOK_FIELDS[1], operator: '<', value: '95' }]);
    renderInspector(); softRefresh(node.id);
  });
  bind('s-delete', 'click', () => deleteNode(node.id));

  el.querySelectorAll('[data-dest]').forEach(b => b.onclick = () => {
    snapshot(); c.platformId = b.dataset.dest;
    renderInspector(); softRefresh(node.id); softRefresh('agent');
  });
  bind('s-deep', 'click', function () { openDeepSetup(node); });
  el.querySelectorAll('[data-chan]').forEach(b => b.onclick = () => {
    snapshot(); c.channelId = b.dataset.chan;
    c.recipient = (NOTIFY_RECIPIENTS[c.channelId] || [])[0] || '';
    renderInspector(); softRefresh(node.id);
  });
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    snapshot(); c.mode = b.dataset.mode;
    if (c.mode === 'threshold' && !c.rules) c.rules = [{ field: PLAYBOOK_FIELDS[4], operator: '=', value: 'High' }];
    renderInspector(); softRefresh(node.id);
  });
  el.querySelectorAll('[data-rule-field]').forEach(s => s.onchange = () => { c.rules[+s.dataset.ruleField].field = s.value; softRefresh(node.id); });
  el.querySelectorAll('[data-rule-op]').forEach(s => s.onchange = () => { c.rules[+s.dataset.ruleOp].operator = s.value; softRefresh(node.id); });
  el.querySelectorAll('[data-rule-val]').forEach(s => s.oninput = () => { c.rules[+s.dataset.ruleVal].value = s.value; softRefresh(node.id); });
}

// --- decision ----------------------------------------------------------
function renderDecisionPanel(el, node) {
  const k = DECISION_KINDS[node.kind];
  const c = node.config || (node.config = {});
  const chip = '<div class="fc-hex-icon" style="width:34px;height:34px;border-radius:10px;background:' + k.tint + ';color:' + k.color + '">' +
    DECISION_ICON[node.kind] + '</div>';
  const outgoing = state.edges.filter(e => e.from === node.id);

  let body = '<div class="fc-field"><label>Question</label>' +
    '<input type="text" id="d-title" value="' + esc(node.title) + '"></div>';

  if (node.kind === 'rule') {
    body += '<div class="fc-field"><label>Check</label>' +
      '<select id="d-field">' + PLAYBOOK_FIELDS.map(f => '<option' + (c.field === f ? ' selected' : '') + '>' + f + '</option>').join('') + '</select></div>' +
      '<div class="fc-field"><label>Operator</label>' +
      '<select id="d-op">' + PLAYBOOK_OPERATORS.map(o => '<option' + (c.operator === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
      '<div class="fc-field"><label>Value</label>' +
      '<input type="text" id="d-val" value="' + esc(c.value || '') + '" placeholder="e.g. High"></div>' +
      '<div class="fc-hint">A deterministic fork on data an earlier step produced.</div>';
  } else if (node.kind === 'decision') {
    body += '<div class="fc-field"><label>What the agent decides</label>' +
      '<textarea id="d-prompt" rows="4" placeholder="e.g. Decide whether this contract needs legal review, based on the role and guardrails.">' +
      esc(c.prompt || '') + '</textarea>' +
      '<div class="fc-hint">The model picks one outgoing path at run time using the agent’s role and guardrails.</div></div>';
  } else {
    body += '<div class="fc-field"><label>Who approves?</label>' +
      '<select id="d-approver">' + ['Deal desk', 'Legal', 'Record owner', 'Manager'].map(a =>
        '<option' + (c.approver === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></div>' +
      '<div class="fc-field"><label>Ask via</label><select id="d-channel">' +
        NOTIFY_CHANNELS.map(ch => '<option value="' + ch.id + '"' + (c.channelId === ch.id ? ' selected' : '') + '>' + esc(ch.name) + '</option>').join('') +
      '</select></div>';
  }

  body += '<div class="fc-insp-section-label">Outgoing paths (' + outgoing.length + ')</div>' +
    outgoing.map((e, i) => {
      const target = e.to ? findNode(e.to) : null;
      const where = target ? target.title : (e.to ? 'End' : 'not set yet');
      return '<div class="fc-path-row' + (e.to ? '' : ' is-open') + '">' +
        '<span class="fc-branch-dot" style="background:' + k.color + '"></span>' +
        '<input data-edge="' + i + '" value="' + esc(e.label || '') + '" placeholder="Label">' +
        '<span class="fc-path-target">→ ' + esc(where) + '</span></div>';
    }).join('') +
    '<button class="fc-deep-link fc-danger" id="d-delete" style="margin-top:20px;">Delete this decision</button>';

  el.innerHTML = panelShell(chip, node.title, k.label, body);

  bind('d-title', 'input', e => { node.title = e.target.value; softRefresh(node.id); });
  bind('d-field', 'change', e => { c.field = e.target.value; });
  bind('d-op', 'change', e => { c.operator = e.target.value; });
  bind('d-val', 'input', e => { c.value = e.target.value; });
  bind('d-prompt', 'input', e => { c.prompt = e.target.value; });
  bind('d-approver', 'change', e => { c.approver = e.target.value; });
  bind('d-channel', 'change', e => { c.channelId = e.target.value; });
  bind('d-delete', 'click', () => deleteNode(node.id));
  el.querySelectorAll('[data-edge]').forEach(inp => {
    inp.onchange = () => { outgoing[+inp.dataset.edge].label = inp.value; render(true); };
  });
}

// ---------------------------------------------------------------------
// Deep setup — reuses the wizard's real multi-step sub-flows
//
// Generate is four steps (document type, data elements, source priority,
// preview) and its "Something else" path opens a template search; Analyze
// carries the whole playbook editor. Rebuilding those in the side panel
// would duplicate ~600 lines of builder.js and let the two drift, so the
// canvas opens the wizard's own modal and writes the result back.
// ---------------------------------------------------------------------
let deepNode = null;

// builder.js paints the wizard's vertical task list; nothing to paint here.
window.renderFlowCanvas = function () {};

// builder.js calls this when a sub-flow is confirmed. Its own version appends
// to state.tasks; ours applies the config to the node that opened it.
window.saveTaskConfig = function (type, config) {
  if (deepNode) {
    snapshot();
    deepNode.config = config;
    const el = document.getElementById('subflow-overlay');
    if (el) el.classList.remove('show');
    softRefresh(deepNode.id);
    renderInspector();
    toast('Saved');
  }
  deepNode = null;
};

function openDeepSetup(node) {
  if (typeof window.renderSubflow !== 'function') return toast('Setup unavailable');
  deepNode = node;
  // seed anything the sub-flow expects but a canvas-created node lacks
  const blank = window.defaultConfigFor ? window.defaultConfigFor(node.type) : {};
  node.config = Object.assign({}, blank, node.config || {});
  window.renderSubflow(node.type, node.config, 0);
  document.getElementById('subflow-overlay').classList.add('show');
}

// ---------------------------------------------------------------------
// Adding and removing nodes
// ---------------------------------------------------------------------
const INSERT_OPTIONS = [
  { kind: 'task', type: 'extract',  label: 'Extract' },
  { kind: 'task', type: 'generate', label: 'Generate' },
  { kind: 'task', type: 'analyze',  label: 'Analyze' },
  { kind: 'task', type: 'save',     label: 'Save' },
  { kind: 'task', type: 'notify',   label: 'Notify' },
  { kind: 'rule',     label: 'Rule condition' },
  { kind: 'decision', label: 'Agent decision' },
  { kind: 'approval', label: 'Human approval' },
];

function addBtnTool() {
  return new joint.linkTools.Button({
    markup: [
      { tagName: 'circle', selector: 'button',
        attributes: { r: 11, fill: '#ffffff', stroke: '#dddbda', 'stroke-width': 1.5, cursor: 'pointer' } },
      { tagName: 'path',
        attributes: { d: 'M -4.5 0 4.5 0 M 0 -4.5 0 4.5', stroke: '#5e6670', 'stroke-width': 1.8, 'pointer-events': 'none' } },
    ],
    distance: '50%',
    action: function (evt, linkView) {
      evt.stopPropagation();
      openInsertMenu(evt, linkView.model);
    },
  });
}

paper.on('link:mouseenter', (linkView) => {
  if (!linkView.model.get('insertable')) return;
  linkView.addTools(new joint.dia.ToolsView({ tools: [addBtnTool()] }));
});
paper.on('link:mouseleave', (linkView) => {
  if (!document.getElementById('insert-menu').classList.contains('show')) linkView.removeTools();
});

let insertCtx = null;   // { from, to } or null for "first step"

function menuOptionHtml(o, i) {
  const color = o.kind === 'task' ? TASK_TYPES[o.type].color : DECISION_KINDS[o.kind].color;
  const chip = o.kind === 'task'
    ? '<div class="fc-node-icon" style="background:' + color + '">' + o.label[0] + '</div>'
    : '<div class="fc-hex-icon" style="background:' + DECISION_KINDS[o.kind].tint + ';color:' + color + '">' + DECISION_ICON[o.kind] + '</div>';
  return '<div class="fc-insert-option" data-i="' + i + '">' + chip + o.label + '</div>';
}

function showMenu(id, x, y, html, onPick) {
  const menu = document.getElementById(id);
  menu.innerHTML = html;
  menu.style.left = Math.min(x, window.innerWidth - 240) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 350) + 'px';
  menu.classList.add('show');
  menu.querySelectorAll('.fc-insert-option').forEach(opt => {
    opt.onclick = () => onPick(opt.dataset);
  });
}

function openInsertMenu(evt, link) {
  insertCtx = { from: link.get('edgeFrom'), to: link.get('edgeTo') };
  showMenu('insert-menu', evt.clientX, evt.clientY,
    '<div class="fc-insert-menu-head">Insert here</div>' + INSERT_OPTIONS.map(menuOptionHtml).join(''),
    d => insertNode(INSERT_OPTIONS[+d.i]));
}

// Fill in a branch that has no target yet.
function openInsertMenuOnEdge(view, edgeId) {
  insertCtx = { edgeId: edgeId };
  const rect = view.el.getBoundingClientRect();
  const edge = state.edges.find(function (e) { return e.id === edgeId; });
  showMenu('insert-menu', rect.left, rect.bottom + 6,
    '<div class="fc-insert-menu-head">' +
      (edge && edge.label ? esc(edge.label) + ' → add' : 'Add a step') +
    '</div>' + INSERT_OPTIONS.map(menuOptionHtml).join(''),
    function (d) { insertNode(INSERT_OPTIONS[+d.i]); });
}

// afterId === null means "this is the first step"; otherwise append after it.
function openInsertMenuAt(view, afterId) {
  insertCtx = afterId ? { after: afterId } : null;
  const rect = view.el.getBoundingClientRect();
  showMenu('insert-menu', rect.left, rect.bottom + 6,
    '<div class="fc-insert-menu-head">Add a step</div>' + INSERT_OPTIONS.map(menuOptionHtml).join(''),
    d => insertNode(INSERT_OPTIONS[+d.i]));
}

function openTriggerMenu(view) {
  const available = Object.keys(TRIGGER_TYPES).filter(k => !state.triggers[k]);
  if (!available.length) return toast('Every trigger is already enabled');
  const rect = view.el.getBoundingClientRect();
  showMenu('trigger-menu', rect.left, rect.bottom + 6,
    '<div class="fc-insert-menu-head">Start this agent when…</div>' +
    available.map((k, i) => {
      const t = TRIGGER_TYPES[k];
      return '<div class="fc-insert-option" data-key="' + k + '">' +
        '<div class="fc-trigger-icon" style="background:' + t.color + '">' + t.letter + '</div>' + esc(t.label) + '</div>';
    }).join(''),
    d => {
      snapshot();
      state.triggers[d.key] = {};
      selected = { type: 'trigger', id: d.key };
      closeMenus();
      render(true);
      toast(TRIGGER_TYPES[d.key].label + ' trigger added');
    });
}

function closeMenus() {
  document.getElementById('insert-menu').classList.remove('show');
  document.getElementById('trigger-menu').classList.remove('show');
  paper.removeTools();
  insertCtx = null;
}
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.fc-insert-menu') && !e.target.closest('.joint-link')) closeMenus();
});

function makeNode(option) {
  const id = nid('n');
  if (option.kind === 'task') {
    return { id, kind: 'task', type: option.type, title: option.label, desc: '', config: defaultConfig(option.type) };
  }
  return { id, kind: option.kind, title: option.kind === 'approval' ? 'Approval needed?' : 'Which path?', config: {} };
}

function defaultConfig(type) {
  switch (type) {
    case 'extract': return { fileName: null, description: '', schema: [], skillId: null };
    case 'generate': return { templateId: null };
    case 'analyze': return { mode: null, rules: [] };
    case 'save': return { platformId: null };
    case 'notify': return { channelId: null, recipient: '', message: '' };
    default: return {};
  }
}

function insertNode(option) {
  snapshot();
  const node = makeNode(option);
  state.nodes.push(node);

  if (!insertCtx) {
    // first step in an empty flow — nothing to rewire
  } else if (insertCtx.edgeId) {
    const edge = state.edges.find(function (e) { return e.id === insertCtx.edgeId; });
    if (edge) edge.to = node.id;
  } else if (insertCtx.after) {
    state.edges.push({ from: insertCtx.after, to: node.id });
  } else {
    const { from, to } = insertCtx;
    if (String(from).startsWith('trig:')) {
      // new node becomes the head; every trigger re-points to it on render
      state.edges.push({ from: node.id, to: to });
    } else {
      const edge = state.edges.find(e => e.from === from && e.to === to);
      const kept = edge ? edge.label : undefined;
      state.edges = state.edges.filter(e => e !== edge);
      state.edges.push({ from: from, to: node.id, label: kept });
      state.edges.push({ from: node.id, to: to });
    }
  }

  if (isDecision(node.kind)) {
    // A decision needs at least two paths, and they must be DISTINCT edges.
    // Pointing both at one End made dagre stack them on top of each other,
    // which read as a single branch. `to: null` marks a path that hasn't been
    // filled in yet; buildCells gives each one its own "Add a step".
    const yes = node.kind === 'approval' ? 'Approved' : 'Yes';
    const no = node.kind === 'approval' ? 'Rejected' : 'No';
    const outs = state.edges.filter(function (e) { return e.from === node.id; });
    if (outs.length) outs[0].label = yes;
    else state.edges.push({ from: node.id, to: null, label: yes });
    state.edges.push({ from: node.id, to: null, label: no });
  }

  closeMenus();
  selected = { type: 'node', id: node.id };
  render(true);
}

function deleteNode(id) {
  const node = findNode(id);
  if (!node) return;
  snapshot();
  const incoming = state.edges.filter(function (e) { return e.to === id; });
  const outgoing = state.edges.filter(function (e) { return e.from === id; });
  state.edges = state.edges.filter(function (e) { return e.from !== id && e.to !== id; });
  if (incoming.length && outgoing.length) {
    state.edges.push({ from: incoming[0].from, to: outgoing[0].to, label: incoming[0].label });
  } else if (incoming.length) {
    // nothing downstream — leave each branch open so it shows "Add a step"
    incoming.forEach(function (e) { state.edges.push({ from: e.from, to: null, label: e.label }); });
  }
  state.nodes = state.nodes.filter(n => n.id !== id);
  // drop End nodes nothing points at any more
  const reached = new Set(state.edges.map(e => e.to));
  state.nodes = state.nodes.filter(n => n.kind !== 'end' || reached.has(n.id));
  selected = null;
  render(true);
  toast('Step removed');
}

// ---------------------------------------------------------------------
// Build with AI — drafts a flow, then hands over the canvas
// ---------------------------------------------------------------------
const AI_EXAMPLES = [
  'Monitor Slack for contract requests, extract key terms, check against my pricing playbook, and route anything high-risk to the deal desk.',
  'Read incoming claim forms from email, extract the claim details, and flag anything under 95% confidence for review.',
  'Every Monday, generate a summary of the renewal pipeline and post it to Slack.',
];

function draftFromPrompt(text) {
  const p = (text || '').toLowerCase();
  const has = (...words) => words.some(w => p.includes(w));

  state.triggers = { manual: {} };
  if (has('slack')) state.triggers.slack = { channelPattern: '#deal-approvals' };
  if (has('email', 'inbox', 'mail')) state.triggers.email = { filterType: 'subject_contains', filterValue: 'Claim' };
  if (has('every monday', 'weekly', 'every week')) state.triggers.schedule = { frequency: 'Weekly', weekday: 'Monday', time: '09:00' };
  else if (has('every day', 'daily', 'schedule')) state.triggers.schedule = { frequency: 'Daily', time: '09:00' };
  if (has('webhook', 'api call')) state.triggers.webhook = {};

  state.nodes = []; state.edges = [];
  const chain = [];
  const push = (n) => { state.nodes.push(n); chain.push(n); return n; };

  if (has('extract', 'contract', 'claim', 'form', 'document', 'terms')) {
    push({ id: nid('n'), kind: 'task', type: 'extract', title: 'Extract key details',
      config: { sourceId: has('slack') ? 'slack' : has('email', 'mail') ? 'email' : 'gdrive', fields: EXTRACT_SAMPLE_SCHEMA.slice(0, 4) } });
  }
  if (has('playbook', 'check', 'risk', 'score', 'confidence', 'criteria', 'against')) {
    push({ id: nid('n'), kind: 'task', type: 'analyze', title: 'Score it',
      config: has('playbook') ? { mode: 'playbook', playbookName: 'Pricing playbook' }
                              : { mode: 'threshold', rules: [{ field: 'accuracy_score', operator: '<', value: '95' }] } });
  }
  if (has('summary', 'summarize', 'generate', 'draft', 'quote', 'proposal', 'report')) {
    push({ id: nid('n'), kind: 'task', type: 'generate', title: 'Draft the document',
      config: { templateId: DOCUMENT_TEMPLATES[0].id } });
  }

  // chain what we have so far
  for (let i = 0; i < chain.length - 1; i++) state.edges.push({ from: chain[i].id, to: chain[i + 1].id });

  const needsFork = has('flag', 'review', 'high-risk', 'high risk', 'route', 'approval', 'escalate', 'under');
  const tail = chain[chain.length - 1];

  if (needsFork && tail) {
    const dec = { id: nid('n'), kind: 'rule', title: 'Needs a human?',
      config: { field: has('confidence', 'accuracy') ? 'accuracy_score' : 'risk_score',
                operator: has('confidence', 'accuracy') ? '<' : '=', value: has('confidence', 'accuracy') ? '95' : 'High' } };
    state.nodes.push(dec);
    state.edges.push({ from: tail.id, to: dec.id });

    const notify = { id: nid('n'), kind: 'task', type: 'notify', title: 'Send it for review',
      config: { channelId: has('slack') ? 'slack' : 'email',
                recipient: has('slack') ? '#legal-review' : 'deals-desk@acmecorp.com', message: '' } };
    const save = { id: nid('n'), kind: 'task', type: 'save', title: 'File the result',
      config: { platformId: has('hubspot') ? 'hubspot' : 'salesforce' } };
    const end = { id: nid('end'), kind: 'end', title: 'End', config: {} };
    state.nodes.push(notify, save, end);
    state.edges.push({ from: dec.id, to: notify.id, label: 'Yes' });
    state.edges.push({ from: dec.id, to: save.id, label: 'No' });
    state.edges.push({ from: notify.id, to: end.id });
    state.edges.push({ from: save.id, to: end.id });
  } else if (tail) {
    const last = has('slack', 'post', 'notify', 'alert')
      ? { id: nid('n'), kind: 'task', type: 'notify', title: 'Post the result',
          config: { channelId: 'slack', recipient: '#ops-alerts', message: '' } }
      : { id: nid('n'), kind: 'task', type: 'save', title: 'File the result',
          config: { platformId: 'salesforce' } };
    state.nodes.push(last);
    state.edges.push({ from: tail.id, to: last.id });
  }

  if (!state.agent.name) {
    state.agent.name = has('claim') ? 'Claims Intake Agent'
      : has('renewal', 'pipeline') ? 'Renewal Summary Agent'
      : has('contract') ? 'Contract Review Agent' : 'New Agent';
  }
  state.agent.role = text;
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
document.getElementById('agent-name-input').addEventListener('input', (e) => {
  state.agent.name = e.target.value;
  softRefresh('agent');
  if (selected && selected.type === 'agent') {
    const f = document.getElementById('a-name');
    if (f) f.value = e.target.value;
  }
});

document.getElementById('btn-create').onclick = () => {
  if (!state.agent.name.trim()) return toast('Give the agent a name first');
  if (!state.nodes.length) return toast('Add at least one step');
  toast('Agent created — prototype stops here');
};

function startScratch() {
  state.triggers = { manual: {} };
  render();
  requestAnimationFrame(fit);
}

window.addEventListener('resize', () => { updateViewport(); });

function initAiOverlay() {
  const ov = document.getElementById('ai-overlay');
  document.getElementById('ai-examples').innerHTML =
    AI_EXAMPLES.map((x, i) => '<button class="fc-ai-chip" data-i="' + i + '">' + esc(x) + '</button>').join('');
  ov.querySelectorAll('.fc-ai-chip').forEach(c => c.onclick = () => {
    document.getElementById('ai-prompt').value = AI_EXAMPLES[+c.dataset.i];
  });
  document.getElementById('ai-skip').onclick = () => { ov.classList.remove('show'); startScratch(); };
  document.getElementById('ai-go').onclick = () => {
    const text = document.getElementById('ai-prompt').value.trim();
    if (!text) return toast('Describe what the agent should do');
    document.getElementById('ai-status').classList.add('show');
    setTimeout(() => {
      draftFromPrompt(text);
      document.getElementById('ai-status').classList.remove('show');
      ov.classList.remove('show');
      selected = { type: 'agent', id: null };
      render();
      requestAnimationFrame(fit);
      toast('Drafted — review and edit anything on the canvas');
    }, 1100);
  };
  ov.classList.add('show');
}

if (new URLSearchParams(location.search).get('mode') === 'ai') initAiOverlay();
else startScratch();

// A handle for poking at the prototype from the console.
window.fc = {
  get state() { return state; },
  render: render, fit: fit, select: select, findNode: findNode,
};

})();
