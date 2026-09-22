// =====================================================================
// Run audit, drawn on the same flow canvas as the builder.
//
// The builder answers "what will this agent do"; this answers "what did
// it actually do on run X". Same node vocabulary (flow-canvas-core.js),
// so a step looks the same in both — here it carries a run status and
// a duration, and selecting it shows the prompt, the response and the
// decisions the agent made rather than its configuration.
// =====================================================================
(function () {

const FC = window.FlowCanvas;
const esc = FC.esc;

const STATUS_LABEL = {
  success: 'Succeeded',
  hitl: 'Waiting on a person',
  error: 'Failed',
  skipped: 'Skipped',
};

let agentId = new URLSearchParams(location.search).get('agent') || 'a1';
if (!AUDIT_TRAILS[agentId]) agentId = Object.keys(AUDIT_TRAILS)[0];
let trail = AUDIT_TRAILS[agentId];
let selectedNodeId = null;

function agentName(id) {
  const a = AGENTS.find(function (x) { return x.id === id; });
  return a ? a.name : id;
}

// ---------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------
const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

const paper = new joint.dia.Paper({
  el: document.getElementById('paper'),
  model: graph,
  cellViewNamespace: joint.shapes,
  width: '100%', height: '100%',
  gridSize: 1,
  background: { color: '#f4f6f9' },
  interactive: false,          // a run is a record; nothing here is editable
  defaultConnectionPoint: { name: 'boundary' },
});

const DECISION_KINDS = {
  rule:     { label: 'Evaluate criteria', color: '#b8860b', tint: '#fff8e1' },
  approval: { label: 'Ask a person', color: '#c62828', tint: '#fdecea' },
};
const OPERATOR_WORDS = { '=': 'is', '>': '>', '<': '<', '>=': '\u2265', '<=': '\u2264', 'contains': 'contains' };

function isDecision(kind) { return kind === 'rule' || kind === 'approval'; }

function statusColor(status) {
  return status === 'success' ? '#2e7d32'
    : status === 'hitl' ? '#b8860b'
    : status === 'error' ? '#c62828' : '#c2c6cc';
}

// The designed flow, or a straight line built from the run when an agent has
// no definition — so a trail without a flow still renders.
function flowFor(id) {
  if (AGENT_FLOWS[id]) return AGENT_FLOWS[id];
  return {
    trigger: null,
    nodes: trail.steps.map(function (st, i) {
      return { id: 'n' + i, kind: 'task', type: st.type, title: st.label };
    }),
    edges: trail.steps.slice(1).map(function (_, i) { return { from: 'n' + i, to: 'n' + (i + 1) }; }),
  };
}

function runPath(id) {
  if (RUN_PATHS[id]) return RUN_PATHS[id];
  return trail.steps.map(function (_, i) { return 'n' + i; });
}

// Trail entry for a flow node, matched on the label the flow was built with.
function stepFor(node) {
  return trail.steps.find(function (st) { return st.label === node.title; }) || null;
}

function decisionSummary(node) {
  const c = node.config || {};
  if (node.kind === 'approval') {
    const ch = NOTIFY_CHANNELS.find(function (x) { return x.id === c.channelId; });
    return (c.approver || 'Someone') + (ch ? ', asked via ' + ch.name : '');
  }
  if (!c.field) return '';
  return c.field + ' ' + (OPERATOR_WORDS[c.operator] || c.operator) + ' ' + c.value;
}

function taskHtml(node, step, visited) {
  const t = TASK_TYPES[node.type] || { color: '#5e6670', label: '?' };
  const dim = visited ? '' : ' ac-dim';
  return '<div class="fc-node' + dim + '" style="border:none;box-shadow:none;padding:0;">' +
      '<div class="fc-node-icon" style="background:' + t.color + '">' + t.label[0] + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-node-title">' + esc(node.title) + '</div>' +
        '<div class="fc-node-desc">' + esc(visited && step ? t.label + ' \u00b7 ' + step.duration : 'Did not run') + '</div>' +
      '</div>' +
      (visited && step
        ? '<span class="ac-status ac-status--' + esc(step.status) + '" title="' + esc(STATUS_LABEL[step.status] || step.status) + '"></span>'
        : '<span class="ac-status ac-status--skipped" title="Did not run"></span>') +
    '</div>';
}

function hexHtml(node, visited) {
  const k = DECISION_KINDS[node.kind];
  const dim = visited ? '' : ' ac-dim';
  return '<div class="fc-hex-inner' + dim + '">' +
      '<div class="fc-hex-icon" style="background:' + k.tint + ';color:' + k.color + '">' + FC.DECISION_ICON[node.kind] + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-hex-kicker" style="color:' + k.color + '">' + k.label + '</div>' +
        '<div class="fc-node-title">' + esc(node.title) + '</div>' +
        '<div class="fc-node-desc">' + esc(decisionSummary(node)) + '</div>' +
      '</div>' +
    '</div>';
}

function agentHtml() {
  return '<div class="fc-agent-inner">' +
      '<div class="fc-agent-avatar">' + esc(agentName(agentId).split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase()) + '</div>' +
      '<div class="fc-node-body"><div class="fc-agent-kicker">Agent</div>' +
      '<div class="fc-agent-title">' + esc(agentName(agentId)) + '</div>' +
      '<div class="fc-agent-meta"><span class="fc-agent-pill">' + esc(trail.runId) + '</span>' +
      '<span class="fc-agent-pill">' + esc(trail.totalDuration) + '</span></div></div></div>';
}

function build() {
  const flow = flowFor(agentId);
  const path = runPath(agentId);
  const visited = {};
  path.forEach(function (id) { visited[id] = true; });

  const cells = [];

  // the agent, then the trigger that actually started this run
  const agentCell = new FC.CardNode({ id: 'agent' });
  agentCell.attr('content/html', agentHtml());
  agentCell.attr('body/stroke', '#dddbda');
  cells.push(agentCell);

  const trig = new FC.CardNode({ id: 'trigger', size: { width: 330, height: 62 } });
  trig.attr('fo', { x: 15, y: 0, width: 300, height: 62 });
  trig.attr('content/html',
    '<div class="fc-trigger-inner"><div class="fc-trigger-icon" style="background:#5e6670">\u25B6</div>' +
      '<div class="fc-trigger-body"><div class="fc-trigger-title">Triggered by</div>' +
      '<div class="fc-trigger-desc">' + esc(trail.trigger) + '</div></div></div>');
  trig.attr('body/stroke', '#2e7d32');
  trig.attr('body/strokeWidth', 2.5);
  cells.push(trig);
  cells.push(FC.makeLink('agent', 'trigger', { color: '#2e7d32' }));

  const head = flow.nodes.find(function (n) {
    return !flow.edges.some(function (e) { return e.to === n.id; });
  });
  if (head) cells.push(FC.makeLink('trigger', head.id, { color: visited[head.id] ? '#2e7d32' : '#dfe2e6' }));

  flow.nodes.forEach(function (n) {
    const step = stepFor(n);
    const on = !!visited[n.id];
    let cell;
    if (isDecision(n.kind)) {
      cell = new FC.HexNode({ id: n.id });
      cell.attr('content/html', hexHtml(n, on));
    } else {
      cell = new FC.CardNode({ id: n.id });
      cell.attr('content/html', taskHtml(n, step, on));
    }
    // the route this run took is drawn in its outcome colour and thicker;
    // everything it skipped fades back
    cell.attr('body/stroke', on ? statusColor(step ? step.status : 'success') : '#e3e5e8');
    cell.attr('body/strokeWidth', on ? 2.5 : 1.5);
    cell.attr('body/opacity', on ? 1 : 0.6);
    cell.set('flowNode', n);
    cell.set('visited', on);
    cells.push(cell);
  });

  flow.edges.forEach(function (e) {
    // an edge counts as taken only if both ends are, and consecutively
    const i = path.indexOf(e.from), j = path.indexOf(e.to);
    const taken = i !== -1 && j !== -1 && j === i + 1;
    cells.push(FC.makeLink(e.from, e.to, {
      label: e.label,
      color: taken ? '#2e7d32' : '#dfe2e6',
      dashed: !taken,
    }));
  });

  // every terminal branch ends somewhere explicit
  const leaves = flow.nodes.filter(function (n) {
    return !flow.edges.some(function (e) { return e.from === n.id; });
  });
  const endReached = trail.status !== 'hitl';
  const end = new FC.PillNode({
    id: 'end',
    size: { width: 150, height: 42 },
    attrs: {
      body: { fill: endReached ? '#2e7d32' : '#f0e2b6' },
      label: { text: endReached ? 'End of flow' : 'Paused \u2014 awaiting a person',
               fill: endReached ? '#ffffff' : '#5e6670', fontSize: 11.5 },
    },
  });
  cells.push(end);
  leaves.forEach(function (n) {
    const on = !!visited[n.id];
    cells.push(FC.makeLink(n.id, 'end', {
      color: on && endReached ? '#2e7d32' : '#dfe2e6',
      dashed: !(on && endReached),
    }));
  });

  graph.resetCells(cells);
  FC.layout(graph);
  renderMinimap();
}

paper.on('element:pointerclick', function (view) {
  const node = view.model.get('flowNode');
  if (!node) return;
  selectedNodeId = node.id;
  build();
  // keep the selected node visibly picked out on top of the run styling
  const cell = graph.getCell(node.id);
  if (cell) { cell.attr('body/stroke', '#0176d3'); cell.attr('body/strokeWidth', 3); }
  renderDetail();
});

// ---------------------------------------------------------------------
// Viewport
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
document.getElementById('btn-zoom-in').onclick = function () { setZoom(zoom + 0.15); };
document.getElementById('btn-zoom-out').onclick = function () { setZoom(zoom - 0.15); };
document.getElementById('btn-fit').onclick = fit;

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

let panning = null;
paper.on('blank:pointerdown', function (evt) {
  panning = { x: evt.clientX, y: evt.clientY, t: paper.translate() };
});
document.addEventListener('mousemove', function (evt) {
  if (!panning) return;
  paper.translate(panning.t.tx + (evt.clientX - panning.x), panning.t.ty + (evt.clientY - panning.y));
  updateViewport();
});
document.addEventListener('mouseup', function () { panning = null; });
window.addEventListener('resize', updateViewport);

// ---------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------
function responseHtml(response) {
  if (!response) return '';
  if (response.kind === 'structured') {
    return '<div class="ac-pre">' + esc(JSON.stringify(response.content, null, 2)) + '</div>';
  }
  return '<div class="ac-quote">' + esc(response.content) + '</div>';
}

function sourceComparisonHtml(sc) {
  if (!sc || !sc.dataElements) return '';
  return '<div class="ac-block-label">Where each value came from</div>' +
    sc.dataElements.map(function (el) {
      return '<div class="ac-element">' +
          '<div class="ac-element-head">' + esc(el.label) + '</div>' +
          el.candidates.map(function (c) {
            const won = c.platform === el.chosenPlatform;
            return '<div class="ac-candidate' + (won ? ' won' : '') + '">' +
                '<div class="ac-candidate-head">' +
                  '<span class="ac-candidate-platform">' + esc(c.platform) + '</span>' +
                  (won ? '<span class="ac-won-tag">Used</span>' : '') +
                  '<span class="ac-confidence">' + c.confidence + '%</span>' +
                '</div>' +
                '<div style="color:var(--text-muted);line-height:1.45;">' +
                  esc(c.response.kind === 'structured' ? JSON.stringify(c.response.content) : c.response.content) +
                '</div>' +
              '</div>';
          }).join('') +
          '<div class="ac-chosen"><strong>' + esc(el.chosenValue) + '</strong>' + esc(el.reason) + '</div>' +
        '</div>';
    }).join('');
}

function renderDetail() {
  const el = document.getElementById('inspector');
  const flow = flowFor(agentId);
  const node = selectedNodeId ? flow.nodes.find(function (n) { return n.id === selectedNodeId; }) : null;

  if (!node) {
    el.innerHTML = '<div class="ac-detail-empty">This is the flow the agent was built with. ' +
      'The route this run took is drawn solid and outlined; anything it skipped is faded.<br><br>' +
      'Select a step to see the prompt it sent, what came back, and the decisions it made.</div>';
    return;
  }

  const step = stepFor(node);
  const onPath = runPath(agentId).indexOf(node.id) !== -1;

  // a fork, or a step this run never reached — there is no prompt to show
  if (!step) {
    const isFork = isDecision(node.kind);
    const k = isFork ? DECISION_KINDS[node.kind] : null;
    const chip = isFork
      ? '<div class="fc-hex-icon" style="width:34px;height:34px;border-radius:10px;background:' + k.tint + ';color:' + k.color + '">' + FC.DECISION_ICON[node.kind] + '</div>'
      : '<div class="fc-node-icon" style="width:34px;height:34px;border-radius:10px;background:' + ((TASK_TYPES[node.type] || {}).color || '#5e6670') + '">' +
        ((TASK_TYPES[node.type] || { label: '?' }).label[0]) + '</div>';

    el.innerHTML =
      '<div class="fc-insp-head"><div class="fc-insp-head-row">' + chip + '<h3>' + esc(node.title) + '</h3></div>' +
        '<div class="ac-step-meta"><span class="ac-pill ac-pill--' + (onPath ? 'success' : 'skipped') + '">' +
          (onPath ? 'On the route taken' : 'Not taken on this run') + '</span></div></div>' +
      '<div class="fc-insp-body">' +
        (isFork
          ? '<div class="ac-block-label">What it evaluated</div><div class="ac-quote">' + esc(decisionSummary(node) || 'No criteria recorded') + '</div>' +
            '<div class="ac-block-label">Where it went</div><div class="ac-quote">' + esc(takenBranchText(flow, node)) + '</div>'
          : '<div class="ac-quote">This step is part of the agent\u2019s flow but the run did not reach it, so there is nothing recorded against it.</div>') +
      '</div>';
    return;
  }

  const t = TASK_TYPES[step.type] || { color: '#5e6670', label: '?' };
  el.innerHTML =
    '<div class="fc-insp-head">' +
      '<div class="fc-insp-head-row">' +
        '<div class="fc-node-icon" style="width:34px;height:34px;border-radius:10px;background:' + t.color + '">' + t.label[0] + '</div>' +
        '<h3>' + esc(step.label) + '</h3>' +
      '</div>' +
      '<div class="ac-step-meta">' +
        '<span class="ac-pill ac-pill--' + esc(step.status) + '">' + esc(STATUS_LABEL[step.status] || step.status) + '</span>' +
        '<span>' + esc(step.startedAt) + '</span><span>&middot;</span><span>' + esc(step.duration) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="fc-insp-body">' +
      (step.prompt ? '<div class="ac-block-label">Prompt sent</div><div class="ac-pre">' + esc(step.prompt) + '</div>' : '') +
      (step.response ? '<div class="ac-block-label">Response</div>' + responseHtml(step.response) : '') +
      (step.decisions && step.decisions.length
        ? '<div class="ac-block-label">Decisions it made</div><ul class="ac-decisions">' +
          step.decisions.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>'
        : '') +
      sourceComparisonHtml(step.sourceComparison) +
    '</div>';
}

// Which way a fork actually went on this run.
function takenBranchText(flow, node) {
  const path = runPath(agentId);
  const i = path.indexOf(node.id);
  if (i === -1 || i === path.length - 1) return 'This run did not reach the fork.';
  const nextId = path[i + 1];
  const edge = flow.edges.find(function (e) { return e.from === node.id && e.to === nextId; });
  const target = flow.nodes.find(function (n) { return n.id === nextId; });
  return 'Took the "' + (edge && edge.label ? edge.label : 'only') + '" path, to ' + (target ? target.title : nextId) + '.';
}

// ---------------------------------------------------------------------
// Header + boot
// ---------------------------------------------------------------------
function renderHeader() {
  document.getElementById('run-meta').innerHTML =
    '<span class="ac-pill ac-pill--' + esc(trail.status) + '">' +
      esc(trail.status === 'hitl' ? 'Needs review' : trail.status) + '</span>' +
    '<span>' + esc(trail.runId) + '</span><span>&middot;</span>' +
    '<span>' + esc(trail.startedAt) + '</span><span>&middot;</span>' +
    '<span>' + esc(trail.totalDuration) + '</span><span>&middot;</span>' +
    '<span>' + esc(trail.trigger) + '</span>';
  document.getElementById('btn-open-builder').href = 'builder.html';
}

const sel = document.getElementById('agent-select');
sel.innerHTML = Object.keys(AUDIT_TRAILS).map(function (id) {
  return '<option value="' + id + '"' + (id === agentId ? ' selected' : '') + '>' + esc(agentName(id)) + '</option>';
}).join('');
sel.onchange = function () {
  agentId = sel.value;
  trail = AUDIT_TRAILS[agentId];
  selectedNodeId = null;
  history.replaceState(null, '', '?agent=' + agentId);
  renderHeader(); build(); renderDetail(); requestAnimationFrame(fit);
};

document.getElementById('legend').innerHTML = [
  { s: 'success', label: 'Succeeded' },
  { s: 'hitl', label: 'Waiting on a person' },
  { s: 'error', label: 'Failed' },
].map(function (r) {
  return '<div class="ac-legend-row"><span class="ac-status ac-status--' + r.s + '"></span>' + r.label + '</div>';
}).join('');

// A row in the gallery links to a specific step ("...  ANALYZE  9 min ago"),
// so land on that step rather than making the reader find it again.
const wantedStep = new URLSearchParams(location.search).get('step');
if (wantedStep) {
  const match = flowFor(agentId).nodes.find(function (n) { return n.type === wantedStep; });
  if (match) selectedNodeId = match.id;
}

renderHeader();
build();
renderDetail();
requestAnimationFrame(fit);

})();
