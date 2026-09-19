// =====================================================================
// JointJS flow spike — evaluating the FREE @joint/core (MPL-2.0) for the
// Agent Builder "Tasks & decisions" canvas.
//
// The question this answers: can the open-source core reach the fidelity
// of jointjs.com/demos/marketing-automation without the paid JointJS+
// plugins? Each paid plugin we skipped is marked FREE SUBSTITUTE below.
//
// Nothing here is wired into builder.js / ai-builder.js / audit.js.
// =====================================================================

// ---------------------------------------------------------------------
// 1. Proposed graph model (replaces today's flat `state.tasks` array).
//    Nodes carry a `kind`; edges carry an optional branch `label`.
// ---------------------------------------------------------------------
const NODE_KINDS = {
  trigger:  { label: 'Trigger',         color: '#5e6670' },
  task:     { label: 'Task',            color: '#0176d3' },
  rule:     { label: 'Rule condition',  color: '#b8860b', tint: '#fff8e1' },
  agent:    { label: 'Agent decision',  color: '#7d3ac1', tint: '#f4edfb' },
  approval: { label: 'Human approval',  color: '#c62828', tint: '#fdecea' },
  end:      { label: 'End',             color: '#5e6670' },
};

let FLOW = {
  nodes: [
    { id: 'trig', kind: 'trigger', title: 'Slack message or Manual run',
      desc: 'Any enabled trigger starts the same flow' },

    { id: 'n1', kind: 'task', type: 'extract', title: 'Extract contract terms',
      desc: 'From renewal_contract.pdf — 8 fields incl. term, ACV, discount' },

    { id: 'n2', kind: 'task', type: 'analyze', title: 'Score against pricing playbook',
      desc: 'Playbook — 4 categories, 17 questions' },

    { id: 'd1', kind: 'rule', title: 'Overall risk?',
      desc: 'risk_score from the playbook analysis' },

    { id: 'a1', kind: 'approval', title: 'Deal desk approval',
      desc: 'Pause and ask a human before committing' },

    { id: 'n3', kind: 'task', type: 'generate', title: 'Draft renewal quote',
      desc: 'Renewal Quote template — 12 data elements, 2 charts' },

    { id: 'n4', kind: 'task', type: 'save', title: 'Save to Salesforce',
      desc: 'Opportunity → Contract record' },

    { id: 'n5', kind: 'task', type: 'notify', title: 'Notify #legal-review',
      desc: 'Via Slack, with the flagged clauses attached' },

    { id: 'end', kind: 'end', title: 'End', desc: '' },
  ],
  edges: [
    { from: 'trig', to: 'n1' },
    { from: 'n1',   to: 'n2' },
    { from: 'n2',   to: 'd1' },
    { from: 'd1',   to: 'a1', label: 'High' },
    { from: 'd1',   to: 'n3', label: 'Low / Medium' },
    { from: 'a1',   to: 'n4', label: 'Approved' },
    { from: 'a1',   to: 'n5', label: 'Rejected' },
    { from: 'n3',   to: 'n4' },
    { from: 'n4',   to: 'end' },
    { from: 'n5',   to: 'end' },
  ],
};

// ---------------------------------------------------------------------
// 2. Custom `html` attribute — lets an SVG node host real HTML so the
//    existing card styling is reused verbatim. Free core extension point.
// ---------------------------------------------------------------------
joint.dia.attributes.html = {
  set: function (html, refBBox, node) { node.innerHTML = html; },
};

const XHTML = 'http://www.w3.org/1999/xhtml';

// --- Task card: HTML in a foreignObject -------------------------------
const TaskNode = joint.dia.Element.define('agent.Task', {
  size: { width: 330, height: 78 },
  attrs: {
    fo: { width: 'calc(w)', height: 'calc(h)', overflow: 'visible' },
    content: { html: '' },
  },
}, {
  markup: [{
    tagName: 'foreignObject', selector: 'fo',
    children: [{ tagName: 'div', namespaceURI: XHTML, selector: 'content' }],
  }],
});

// --- Decision hexagon (rule / agent / approval) -----------------------
// A flat-ended hexagon with softened corners rather than the conventional
// sharp diamond: same "this is a fork" read, but it sits on the same
// horizontal baseline and width as the task cards instead of fighting them.
const HEX_W = 330, HEX_H = 78, HEX_NOTCH = 30, HEX_RADIUS = 11;

// Rounds every vertex of a polygon with a quadratic curve, clamping the
// radius so a short edge can't collapse the shape.
function roundedPolyPath(pts, r) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur  = pts[i];
    const next = pts[(i + 1) % n];
    const inLen  = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const p1 = { x: cur.x + (prev.x - cur.x) / inLen  * rr, y: cur.y + (prev.y - cur.y) / inLen  * rr };
    const p2 = { x: cur.x + (next.x - cur.x) / outLen * rr, y: cur.y + (next.y - cur.y) / outLen * rr };
    d += (i === 0 ? 'M ' : ' L ') + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2);
    d += ' Q ' + cur.x.toFixed(2) + ' ' + cur.y.toFixed(2) + ' ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
  }
  return d + ' Z';
}

function hexPath(w, h, notch, r) {
  return roundedPolyPath([
    { x: notch,     y: 0     },
    { x: w - notch, y: 0     },
    { x: w,         y: h / 2 },
    { x: w - notch, y: h     },
    { x: notch,     y: h     },
    { x: 0,         y: h / 2 },
  ], r);
}

const HexNode = joint.dia.Element.define('agent.Hex', {
  size: { width: HEX_W, height: HEX_H },
  attrs: {
    body: {
      d: hexPath(HEX_W, HEX_H, HEX_NOTCH, HEX_RADIUS),
      fill: '#ffffff', stroke: '#dddbda', strokeWidth: 1.5,
      filter: { name: 'dropShadow', args: { dx: 0, dy: 2, blur: 3, color: 'rgba(0,0,0,0.07)' } },
    },
    fo: { x: 24, y: 0, width: HEX_W - 48, height: HEX_H, overflow: 'visible' },
    content: { html: '' },
  },
}, {
  markup: [
    { tagName: 'path', selector: 'body' },
    { tagName: 'foreignObject', selector: 'fo',
      children: [{ tagName: 'div', namespaceURI: XHTML, selector: 'content' }] },
  ],
});

// --- Trigger / End pill -----------------------------------------------
const PillNode = joint.dia.Element.define('agent.Pill', {
  size: { width: 250, height: 46 },
  attrs: {
    body: {
      width: 'calc(w)', height: 'calc(h)', rx: 23, ry: 23,
      fill: '#5e6670', stroke: 'none',
    },
    label: {
      x: 'calc(w/2)', y: 'calc(h/2)', textAnchor: 'middle', textVerticalAnchor: 'middle',
      fontSize: 12.5, fontWeight: 700, fontFamily: 'Inter, sans-serif', fill: '#ffffff',
      textWrap: { width: -28, height: -10, ellipsis: true },
    },
  },
}, {
  markup: [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'text', selector: 'label' },
  ],
});

// ---------------------------------------------------------------------
// 3. Graph + paper
// ---------------------------------------------------------------------
const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

const paper = new joint.dia.Paper({
  el: document.getElementById('paper'),
  model: graph,
  cellViewNamespace: joint.shapes,
  width: '100%',
  height: '100%',
  gridSize: 1,
  background: { color: '#f4f6f9' },
  // Guided editor: positions are always computed by auto-layout, so nothing
  // is hand-draggable and the paid Snaplines/Halo/Selection plugins are moot.
  interactive: { elementMove: false, linkMove: false },
  defaultConnectionPoint: { name: 'boundary' },
});

let selectedId = null;

function taskCardHtml(node) {
  const t = TASK_TYPES[node.type] || { color: '#5e6670', label: '?' };
  const sel = node.id === selectedId ? ' is-selected' : '';
  return (
    '<div class="spike-node' + sel + '">' +
      '<div class="spike-node-icon" style="background:' + t.color + '">' + t.label[0] + '</div>' +
      '<div class="spike-node-body">' +
        '<div class="spike-node-title">' + esc(node.title) + '</div>' +
        '<div class="spike-node-desc">' + esc(node.desc) + '</div>' +
      '</div>' +
    '</div>'
  );
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// Feather-style icons, matching the stroke weight used elsewhere in the prototype.
function ico(inner) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
const DECISION_ICON = {
  rule:     ico('<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>'),
  agent:    ico('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  approval: ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>'),
};

function isDecision(kind) { return kind === 'rule' || kind === 'agent' || kind === 'approval'; }

// Hexagon contents: icon chip + kicker + title, same rhythm as a task card.
function hexNodeHtml(node) {
  const k = NODE_KINDS[node.kind];
  return '<div class="spike-hex-inner">' +
      '<div class="spike-hex-icon" style="background:' + k.tint + ';color:' + k.color + '">' +
        DECISION_ICON[node.kind] + '</div>' +
      '<div class="spike-node-body">' +
        '<div class="spike-hex-kicker" style="color:' + k.color + '">' + k.label + '</div>' +
        '<div class="spike-node-title">' + esc(node.title) + '</div>' +
      '</div>' +
    '</div>';
}

function makeCell(node) {
  if (node.kind === 'task') {
    const cell = new TaskNode({ id: node.id });
    cell.attr('content/html', taskCardHtml(node));
    return cell;
  }
  if (node.kind === 'trigger' || node.kind === 'end') {
    const isEnd = node.kind === 'end';
    return new PillNode({
      id: node.id,
      size: isEnd ? { width: 110, height: 40 } : { width: 270, height: 46 },
      attrs: {
        body: { fill: isEnd ? '#c9ccd1' : '#5e6670' },
        label: { text: node.title, fill: isEnd ? '#5e6670' : '#ffffff' },
      },
    });
  }
  // rule | agent | approval — same hexagon, different accent + icon
  const isSel = node.id === selectedId;
  const cell = new HexNode({ id: node.id });
  cell.attr('body/stroke', isSel ? NODE_KINDS[node.kind].color : '#dddbda');
  cell.attr('body/strokeWidth', isSel ? 2.5 : 1.5);
  cell.attr('content/html', hexNodeHtml(node));
  return cell;
}

function makeLink(edge) {
  const link = new joint.shapes.standard.Link({
    source: { id: edge.from },
    target: { id: edge.to },
    router: { name: 'manhattan', args: { padding: 18, startDirections: ['bottom'], endDirections: ['top'] } },
    connector: { name: 'rounded', args: { radius: 10 } },
    attrs: {
      line: {
        stroke: '#c2c6cc', strokeWidth: 2,
        targetMarker: { type: 'path', d: 'M 9 -4.5 0 0 9 4.5 z', fill: '#c2c6cc', stroke: 'none' },
      },
    },
  });
  if (edge.label) {
    link.labels([{
      position: { distance: 0.45 },
      markup: [
        { tagName: 'rect', selector: 'labelBody' },
        { tagName: 'text', selector: 'labelText' },
      ],
      attrs: {
        labelText: {
          text: edge.label, fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif',
          fill: '#5e6670', textAnchor: 'middle', textVerticalAnchor: 'middle',
        },
        labelBody: {
          ref: 'labelText', fill: '#ffffff', stroke: '#dddbda', strokeWidth: 1, rx: 6, ry: 6,
          x: 'calc(x-8)', y: 'calc(y-4)', width: 'calc(w+16)', height: 'calc(h+8)',
        },
      },
    }]);
  }
  link.set('edgeFrom', edge.from);
  link.set('edgeTo', edge.to);
  return link;
}

// ---------------------------------------------------------------------
// 4. Build + auto-layout (free @joint/layout-directed-graph → dagre)
// ---------------------------------------------------------------------
function render() {
  graph.resetCells(
    FLOW.nodes.map(makeCell).concat(FLOW.edges.map(makeLink))
  );
  runLayout();
  renderMinimap();
}

function runLayout() {
  joint.layout.DirectedGraph.layout(graph, {
    dagre: dagre,
    graphlib: graphlib,
    rankDir: 'TB',
    nodeSep: 46,
    rankSep: 56,
    marginX: 40,
    marginY: 40,
    setLinkVertices: false,
  });
}

// ---------------------------------------------------------------------
// 5. Zoom / pan / fit  —  FREE SUBSTITUTE for paid ui.PaperScroller
// ---------------------------------------------------------------------
let zoom = 1;

function setZoom(z, ox, oy) {
  zoom = Math.max(0.25, Math.min(2, z));
  paper.scale(zoom, zoom, ox, oy);
  document.getElementById('zoom-label').textContent = Math.round(zoom * 100) + '%';
  updateViewport();
}

function fit() {
  paper.transformToFitContent({ padding: 50, maxScale: 1, minScale: 0.25, useModelGeometry: true });
  zoom = paper.scale().sx;
  document.getElementById('zoom-label').textContent = Math.round(zoom * 100) + '%';
  updateViewport();
}

document.getElementById('btn-zoom-in').onclick = function () { setZoom(zoom + 0.15); };
document.getElementById('btn-zoom-out').onclick = function () { setZoom(zoom - 0.15); };
document.getElementById('btn-fit').onclick = fit;
document.getElementById('btn-relayout').onclick = function () { runLayout(); fit(); };

// drag-to-pan on blank canvas
let panning = null;
paper.on('blank:pointerdown', function (evt, x, y) {
  panning = { x: evt.clientX, y: evt.clientY, t: paper.translate() };
  closeInsertMenu();
  select(null);
});
document.addEventListener('mousemove', function (evt) {
  if (!panning) return;
  paper.translate(panning.t.tx + (evt.clientX - panning.x), panning.t.ty + (evt.clientY - panning.y));
  updateViewport();
});
document.addEventListener('mouseup', function () { panning = null; });

paper.on('paper:pinch', function (evt, ox, oy, scale) { setZoom(zoom * scale, ox, oy); });
document.getElementById('paper').addEventListener('wheel', function (evt) {
  if (!evt.ctrlKey && !evt.metaKey) return;
  evt.preventDefault();
  setZoom(zoom - evt.deltaY * 0.002);
}, { passive: false });

// ---------------------------------------------------------------------
// 6. Minimap  —  FREE SUBSTITUTE for paid ui.Navigator (~40 lines)
// ---------------------------------------------------------------------
const minimap = new joint.dia.Paper({
  el: document.getElementById('minimap'),
  model: graph,
  cellViewNamespace: joint.shapes,
  width: 170, height: 210,
  interactive: false,
  background: { color: '#fbfcfd' },
});

const viewportEl = document.createElement('div');
viewportEl.className = 'spike-minimap-viewport';
document.getElementById('minimap').appendChild(viewportEl);

function renderMinimap() {
  minimap.transformToFitContent({ padding: 8, useModelGeometry: true });
  updateViewport();
}

function updateViewport() {
  const area = paper.getArea();                 // model coords of main viewport
  const s = minimap.scale().sx;
  const t = minimap.translate();
  viewportEl.style.left   = (area.x * s + t.tx) + 'px';
  viewportEl.style.top    = (area.y * s + t.ty) + 'px';
  viewportEl.style.width  = (area.width * s) + 'px';
  viewportEl.style.height = (area.height * s) + 'px';
}

minimap.on('blank:pointerdown cell:pointerdown', function (evt, x, y) {
  // centre the main paper on the clicked model point
  const el = document.getElementById('paper');
  paper.translate(
    el.clientWidth / 2 - x * zoom,
    el.clientHeight / 2 - y * zoom
  );
  updateViewport();
});

// ---------------------------------------------------------------------
// 7. Inspector  —  FREE SUBSTITUTE for paid ui.Inspector
//    In the real build this hosts the existing subflow forms.
// ---------------------------------------------------------------------
function findNode(id) {
  return FLOW.nodes.filter(function (n) { return n.id === id; })[0];
}

function select(id) {
  const prev = selectedId;
  selectedId = id;
  [prev, id].forEach(function (nid) {
    if (!nid) return;
    const node = findNode(nid);
    const cell = graph.getCell(nid);
    if (!node || !cell) return;
    if (node.kind === 'task') {
      cell.attr('content/html', taskCardHtml(node));
    } else if (isDecision(node.kind)) {
      const on = nid === selectedId;
      cell.attr('body/stroke', on ? NODE_KINDS[node.kind].color : '#dddbda');
      cell.attr('body/strokeWidth', on ? 2.5 : 1.5);
    }
  });
  renderInspector();
}

function renderInspector() {
  const el = document.getElementById('inspector');
  const node = selectedId ? findNode(selectedId) : null;

  if (!node) {
    el.innerHTML = '<div class="spike-inspector-empty">Select a step or a decision on the canvas to configure it.<br><br>' +
      'Hover a connector to reveal the <strong>+</strong> that inserts a step or a branch.</div>';
    return;
  }

  const kind = NODE_KINDS[node.kind];
  const accent = node.kind === 'task' ? (TASK_TYPES[node.type] || {}).color : kind.color;
  const outgoing = FLOW.edges.filter(function (e) { return e.from === node.id; });

  let html =
    '<div class="spike-inspector-head">' +
      (node.kind === 'task'
        ? '<div class="spike-node-icon" style="background:' + accent + '">' +
            (TASK_TYPES[node.type] || { label: '?' }).label[0] + '</div>'
        : '<div class="spike-hex-icon" style="background:' + (kind.tint || '#eef0f2') + ';color:' + accent + '">' +
            (DECISION_ICON[node.kind] || '') + '</div>') +
      '<h3>' + esc(node.title) + '</h3>' +
    '</div>' +
    '<div class="spike-inspector-kind">' + kind.label + '</div>' +
    '<div class="spike-field"><label>Label</label>' +
      '<input type="text" id="insp-title" value="' + esc(node.title) + '"></div>' +
    '<div class="spike-field"><label>Description</label>' +
      '<textarea id="insp-desc" rows="3">' + esc(node.desc) + '</textarea></div>';

  if (node.kind === 'rule') {
    html += '<div class="spike-field"><label>Condition</label>' +
      '<select><option>risk_score is High</option><option>confidence &lt; 95%</option>' +
      '<option>discount &gt; 10%</option></select>' +
      '<div class="spike-hint">Deterministic fork on extracted data — this replaces the free-text <code>condition</code> string at builder.js:1660.</div></div>';
  }
  if (node.kind === 'agent') {
    html += '<div class="spike-field"><label>What the agent decides</label>' +
      '<textarea rows="3" placeholder="e.g. Decide whether this contract needs legal review, based on the role and guardrails."></textarea>' +
      '<div class="spike-hint">The model picks one outgoing path at run time. New concept — not in the schema today.</div></div>';
  }
  if (node.kind === 'approval') {
    html += '<div class="spike-field"><label>Approver</label>' +
      '<select><option>Deal desk</option><option>Legal</option><option>Record owner</option></select>' +
      '<div class="spike-hint">Gives the Guardrails caution slider something visible to control.</div></div>';
  }

  if (outgoing.length) {
    html += '<div class="spike-field"><label>Outgoing paths (' + outgoing.length + ')</label>' +
      outgoing.map(function (e) {
        const target = findNode(e.to);
        return '<div class="spike-branch-row">' +
          '<span class="spike-branch-dot" style="background:' + accent + '"></span>' +
          '<strong>' + esc(e.label || 'Always') + '</strong>' +
          '<span style="color:var(--text-muted)">→ ' + esc(target ? target.title : e.to) + '</span>' +
        '</div>';
      }).join('') + '</div>';
  }

  if (node.kind === 'task') {
    html += '<button class="spike-deep-link" id="insp-deep">Open the full ' +
      esc((TASK_TYPES[node.type] || {}).label || '') + ' setup →</button>' +
      '<div class="spike-hint" style="margin-top:8px;">Deep multi-step wizards stay as the existing modal; the panel handles quick edits.</div>';
  }

  html += '<button class="spike-deep-link" id="insp-delete" style="margin-top:14px;color:var(--error-color);">Delete this step</button>';

  el.innerHTML = html;

  document.getElementById('insp-title').oninput = function (e) {
    pushUndo();
    node.title = e.target.value;
    refreshNode(node);
  };
  document.getElementById('insp-desc').oninput = function (e) {
    pushUndo();
    node.desc = e.target.value;
    refreshNode(node);
  };
  const deep = document.getElementById('insp-deep');
  if (deep) deep.onclick = function () { alert('Stub: opens the existing subflow modal from builder.js'); };
  document.getElementById('insp-delete').onclick = function () { deleteNode(node.id); };
}

function refreshNode(node) {
  const cell = graph.getCell(node.id);
  if (!cell) return;
  if (node.kind === 'task') cell.attr('content/html', taskCardHtml(node));
  else if (isDecision(node.kind)) cell.attr('content/html', hexNodeHtml(node));
  else cell.attr('label/text', node.title);
}

paper.on('element:pointerclick', function (view) {
  closeInsertMenu();
  select(view.model.id);
});

// ---------------------------------------------------------------------
// 8. Insert "+" on connectors  —  FREE SUBSTITUTE for paid ui.Stencil.
//    Guided editing: you never draw a link by hand.
// ---------------------------------------------------------------------
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

paper.on('link:mouseenter', function (linkView) {
  linkView.addTools(new joint.dia.ToolsView({ tools: [addBtnTool()] }));
});
paper.on('link:mouseleave', function (linkView) {
  if (!document.getElementById('insert-menu').classList.contains('show')) linkView.removeTools();
});

let insertTarget = null;

const INSERT_OPTIONS = [
  { kind: 'task', type: 'extract',  label: 'Extract' },
  { kind: 'task', type: 'generate', label: 'Generate' },
  { kind: 'task', type: 'analyze',  label: 'Analyze' },
  { kind: 'task', type: 'save',     label: 'Save' },
  { kind: 'task', type: 'notify',   label: 'Notify' },
  { kind: 'rule',     label: 'Rule condition' },
  { kind: 'agent',    label: 'Agent decision' },
  { kind: 'approval', label: 'Human approval' },
];

function openInsertMenu(evt, link) {
  insertTarget = link;
  const menu = document.getElementById('insert-menu');
  menu.innerHTML = '<div class="spike-insert-menu-head">Insert here</div>' +
    INSERT_OPTIONS.map(function (o, i) {
      const color = o.kind === 'task' ? TASK_TYPES[o.type].color : NODE_KINDS[o.kind].color;
      const chip = o.kind === 'task'
        ? '<div class="spike-node-icon" style="background:' + color + '">' + o.label[0] + '</div>'
        : '<div class="spike-hex-icon" style="background:' + NODE_KINDS[o.kind].tint + ';color:' + color + '">' +
            DECISION_ICON[o.kind] + '</div>';
      return '<div class="spike-insert-option" data-i="' + i + '">' + chip + o.label + '</div>';
    }).join('');

  menu.style.left = Math.min(evt.clientX, window.innerWidth - 230) + 'px';
  menu.style.top = Math.min(evt.clientY, window.innerHeight - 340) + 'px';
  menu.classList.add('show');

  menu.querySelectorAll('.spike-insert-option').forEach(function (opt) {
    opt.onclick = function () { insertNode(INSERT_OPTIONS[Number(opt.dataset.i)]); };
  });
}

function closeInsertMenu() {
  document.getElementById('insert-menu').classList.remove('show');
  paper.removeTools();
  insertTarget = null;
}
document.addEventListener('mousedown', function (e) {
  if (!e.target.closest('.spike-insert-menu') && !e.target.closest('.joint-link')) closeInsertMenu();
});

let idSeq = 100;

function insertNode(option) {
  if (!insertTarget) return;
  pushUndo();

  const from = insertTarget.get('edgeFrom');
  const to = insertTarget.get('edgeTo');
  const id = 'x' + (idSeq++);

  const node = option.kind === 'task'
    ? { id: id, kind: 'task', type: option.type, title: option.label, desc: 'Not configured yet' }
    : { id: id, kind: option.kind, title: option.label + '?', desc: '' };

  FLOW.nodes.push(node);

  // rewire: from -> new -> to
  const edge = FLOW.edges.filter(function (e) { return e.from === from && e.to === to; })[0];
  const keptLabel = edge ? edge.label : undefined;
  FLOW.edges = FLOW.edges.filter(function (e) { return e !== edge; });
  FLOW.edges.push({ from: from, to: id, label: keptLabel });

  if (option.kind === 'task') {
    FLOW.edges.push({ from: id, to: to });
  } else {
    // a decision needs at least two outgoing paths — the second one dead-ends
    // in a new End node so the graph stays valid
    const endId = 'x' + (idSeq++);
    FLOW.nodes.push({ id: endId, kind: 'end', title: 'End', desc: '' });
    FLOW.edges.push({ from: id, to: to, label: 'Yes' });
    FLOW.edges.push({ from: id, to: endId, label: 'No' });
  }

  closeInsertMenu();
  selectedId = id;
  render();
  renderInspector();
}

function deleteNode(id) {
  const node = findNode(id);
  if (!node || node.kind === 'trigger') return;
  pushUndo();
  const incoming = FLOW.edges.filter(function (e) { return e.to === id; });
  const outgoing = FLOW.edges.filter(function (e) { return e.from === id; });
  FLOW.edges = FLOW.edges.filter(function (e) { return e.from !== id && e.to !== id; });
  // stitch the first incoming to the first outgoing so the flow stays connected
  if (incoming.length && outgoing.length) {
    FLOW.edges.push({ from: incoming[0].from, to: outgoing[0].to, label: incoming[0].label });
  }
  FLOW.nodes = FLOW.nodes.filter(function (n) { return n.id !== id; });
  selectedId = null;
  render();
  renderInspector();
}

// ---------------------------------------------------------------------
// 9. Undo  —  FREE SUBSTITUTE for paid dia.CommandManager (~12 lines)
// ---------------------------------------------------------------------
const undoStack = [];
function pushUndo() {
  undoStack.push(JSON.stringify(FLOW));
  if (undoStack.length > 50) undoStack.shift();
}
document.getElementById('btn-undo').onclick = function () {
  if (!undoStack.length) return;
  FLOW = JSON.parse(undoStack.pop());
  selectedId = null;
  render();
  renderInspector();
};

// ---------------------------------------------------------------------
// 10. Legend + boot
// ---------------------------------------------------------------------
document.getElementById('legend').innerHTML = [
  { c: '#0176d3', label: 'Step', shape: '' },
  { c: '#b8860b', label: 'Rule condition', shape: 'hex' },
  { c: '#7d3ac1', label: 'Agent decision', shape: 'hex' },
  { c: '#c62828', label: 'Human approval', shape: 'hex' },
].map(function (r) {
  return '<div class="spike-legend-row"><span class="spike-legend-swatch ' + r.shape +
    '" style="background:' + r.c + '"></span>' + r.label + '</div>';
}).join('');

render();
renderInspector();
fit();
