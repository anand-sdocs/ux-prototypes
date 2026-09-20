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
let selectedIndex = null;

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

function stepCardHtml(step, index) {
  const t = TASK_TYPES[step.type] || { color: '#5e6670', label: '?' };
  return '<div class="fc-node" style="border:none;box-shadow:none;padding:0;">' +
      '<div class="fc-node-icon" style="background:' + t.color + '">' + t.label[0] + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-node-title">' + esc(step.label) + '</div>' +
        '<div class="fc-node-desc">' + esc(t.label) + ' · ' + esc(step.duration) + '</div>' +
      '</div>' +
      '<span class="ac-status ac-status--' + esc(step.status) + '" title="' +
        esc(STATUS_LABEL[step.status] || step.status) + '"></span>' +
    '</div>';
}

function statusColor(status) {
  return status === 'success' ? '#2e7d32'
    : status === 'hitl' ? '#b8860b'
    : status === 'error' ? '#c62828' : '#c2c6cc';
}

function build() {
  const cells = [];

  const trig = new FC.PillNode({
    id: 'trigger',
    size: { width: 330, height: 46 },
    attrs: { body: { fill: '#5e6670' }, label: { text: trail.trigger, fill: '#ffffff' } },
  });
  cells.push(trig);

  trail.steps.forEach(function (step, i) {
    const id = 's' + i;
    const cell = new FC.CardNode({ id: id });
    cell.attr('content/html', stepCardHtml(step, i));
    // the run's own outcome colours the card's edge
    cell.attr('body/stroke', i === selectedIndex ? '#0176d3' : '#dddbda');
    cell.attr('body/strokeWidth', i === selectedIndex ? 2.5 : 1.5);
    cell.set('stepIndex', i);
    cells.push(cell);
    cells.push(FC.makeLink(i === 0 ? 'trigger' : 's' + (i - 1), id, {
      color: statusColor(step.status),
    }));
  });

  const end = new FC.PillNode({
    id: 'end',
    size: { width: 130, height: 40 },
    attrs: {
      body: { fill: trail.status === 'hitl' ? '#f0e2b6' : '#c9ccd1' },
      label: { text: trail.status === 'hitl' ? 'Awaiting review' : 'Done', fill: '#5e6670' },
    },
  });
  cells.push(end);
  if (trail.steps.length) {
    cells.push(FC.makeLink('s' + (trail.steps.length - 1), 'end', {
      color: statusColor(trail.steps[trail.steps.length - 1].status),
    }));
  }

  graph.resetCells(cells);
  FC.layout(graph);
  renderMinimap();
}

paper.on('element:pointerclick', function (view) {
  const i = view.model.get('stepIndex');
  if (i == null) return;
  selectedIndex = i;
  build();
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
  if (selectedIndex == null) {
    el.innerHTML = '<div class="ac-detail-empty">Select a step on the canvas to see the prompt it sent, ' +
      'what came back, and the decisions it made.</div>';
    return;
  }
  const step = trail.steps[selectedIndex];
  const t = TASK_TYPES[step.type] || { color: '#5e6670', label: '?' };

  el.innerHTML =
    '<div class="fc-insp-head">' +
      '<div class="fc-insp-head-row">' +
        '<div class="fc-node-icon" style="width:34px;height:34px;border-radius:10px;background:' + t.color + '">' +
          t.label[0] + '</div>' +
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
  document.getElementById('btn-open-builder').href = 'builder-canvas.html';
}

const sel = document.getElementById('agent-select');
sel.innerHTML = Object.keys(AUDIT_TRAILS).map(function (id) {
  return '<option value="' + id + '"' + (id === agentId ? ' selected' : '') + '>' + esc(agentName(id)) + '</option>';
}).join('');
sel.onchange = function () {
  agentId = sel.value;
  trail = AUDIT_TRAILS[agentId];
  selectedIndex = null;
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

renderHeader();
build();
renderDetail();
requestAnimationFrame(fit);

})();
