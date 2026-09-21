// Throwaway: the same agent drawn with the error path in two places, so the
// choice can be made by looking rather than by reading a description.
(function () {

const FC = window.FlowCanvas;
const esc = FC.esc;
const ERROR_RED = '#c62828';

const WARN_ICON = FC.ico('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>');

// A deliberately non-trivial flow: two triggers, a fork, and five steps, so
// each option is judged at the size a real agent reaches.
const STEPS = [
  { id: 'n1', type: 'extract',  title: 'Extract claim details',   desc: 'Claims Intake Skill — 6 fields' },
  { id: 'n2', type: 'analyze',  title: 'Score against playbook',  desc: 'Playbook — 4 categories' },
  { id: 'n4', type: 'generate', title: 'Draft the response',      desc: 'Claims Denial Letter' },
  { id: 'n5', type: 'save',     title: 'File to Salesforce',      desc: 'Claim (custom), 6 fields mapped' },
  { id: 'n6', type: 'notify',   title: 'Notify the adjuster',     desc: 'Via Slack to #claims' },
];

function card(id, type, title, desc) {
  const t = TASK_TYPES[type];
  const c = new FC.CardNode({ id: id });
  c.attr('content/html',
    '<div class="fc-node" style="border:none;box-shadow:none;padding:0;">' +
      '<div class="fc-node-icon" style="background:' + t.color + '">' + t.label[0] + '</div>' +
      '<div class="fc-node-body"><div class="fc-node-title">' + esc(title) + '</div>' +
      '<div class="fc-node-desc">' + esc(desc) + '</div></div></div>');
  return c;
}

function agentCard() {
  const c = new FC.CardNode({ id: 'agent' });
  c.attr('content/html',
    '<div class="fc-agent-inner">' +
      '<div class="fc-agent-avatar">CA</div>' +
      '<div class="fc-node-body"><div class="fc-agent-kicker">Agent</div>' +
      '<div class="fc-agent-title">Claims Intake Assistant</div>' +
      '<div class="fc-agent-meta"><span class="fc-agent-pill">Claude Sonnet 5</span>' +
      '<span class="fc-agent-pill">Balanced</span></div></div></div>');
  return c;
}

function triggerCard(id, key) {
  const t = TRIGGER_TYPES[key];
  const c = new FC.CardNode({ id: id, size: { width: 250, height: 62 } });
  c.attr('fo', { x: 13, y: 0, width: 224, height: 62 });
  c.attr('content/html',
    '<div class="fc-trigger-inner"><div class="fc-trigger-icon" style="background:' + t.color + '">' + t.letter + '</div>' +
      '<div class="fc-trigger-body"><div class="fc-trigger-title">' + esc(t.label) + '</div>' +
      '<div class="fc-trigger-desc">' + esc(t.description.split('.')[0]) + '</div></div></div>');
  return c;
}

function forkNode(id, title, summary) {
  const c = new FC.HexNode({ id: id });
  c.attr('body/stroke', '#b8860b');
  c.attr('content/html',
    '<div class="fc-hex-inner">' +
      '<div class="fc-hex-icon" style="background:#fff8e1;color:#b8860b">' + FC.DECISION_ICON.rule + '</div>' +
      '<div class="fc-node-body"><div class="fc-hex-kicker" style="color:#b8860b">Evaluate criteria</div>' +
      '<div class="fc-node-title">' + esc(title) + '</div>' +
      '<div class="fc-node-desc">' + esc(summary) + '</div></div></div>');
  return c;
}

// The handler itself — same node in both options, so only its placement differs.
function errorNode(id) {
  const c = new FC.CardNode({ id: id });
  c.attr('body/stroke', ERROR_RED);
  c.attr('body/strokeWidth', 1.5);
  c.attr('body/strokeDasharray', '6 4');
  c.attr('content/html',
    '<div class="fc-node" style="border:none;box-shadow:none;padding:0;">' +
      '<div class="fc-hex-icon" style="background:#fdecea;color:' + ERROR_RED + '">' + WARN_ICON + '</div>' +
      '<div class="fc-node-body">' +
        '<div class="fc-hex-kicker" style="color:' + ERROR_RED + '">If anything fails</div>' +
        '<div class="fc-node-title">Notify the owner and stop</div>' +
        '<div class="fc-node-desc">Nothing half-written is left behind</div>' +
      '</div></div>');
  return c;
}

function endPill(id) {
  return new FC.PillNode({ id: id, size: { width: 110, height: 40 }, attrs: { label: { text: 'Done' } } });
}

function errLink(from, to) {
  return FC.makeLink(from, to, { color: ERROR_RED, dashed: true });
}

// ---- the flow both options share -------------------------------------
function baseCells() {
  const cells = [agentCard(), triggerCard('t1', 'email'), triggerCard('t2', 'manual')];
  STEPS.forEach(function (s) { cells.push(card(s.id, s.type, s.title, s.desc)); });
  cells.push(forkNode('n3', 'Auto-approve?', 'claim_amount < 5000'));
  cells.push(endPill('end'));

  ['t1', 't2'].forEach(function (t) {
    cells.push(FC.makeLink('agent', t));
    cells.push(FC.makeLink(t, 'n1'));
  });
  cells.push(FC.makeLink('n1', 'n2'));
  cells.push(FC.makeLink('n2', 'n3'));
  cells.push(FC.makeLink('n3', 'n5', { label: 'Yes' }));
  cells.push(FC.makeLink('n3', 'n4', { label: 'No' }));
  cells.push(FC.makeLink('n4', 'n5'));
  cells.push(FC.makeLink('n5', 'n6'));
  cells.push(FC.makeLink('n6', 'end'));
  return cells;
}

function makePaper(elId, cells) {
  const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
  const paper = new joint.dia.Paper({
    el: document.getElementById(elId), model: graph, cellViewNamespace: joint.shapes,
    // A concrete height: Paper writes height:100% inline, which beats the
    // stylesheet, and the card has no fixed height for it to be 100% of.
    width: '100%', height: 620, gridSize: 1,
    background: { color: '#f4f6f9' }, interactive: false,
    defaultConnectionPoint: { name: 'boundary' },
  });
  graph.resetCells(cells);
  FC.layout(graph);
  requestAnimationFrame(function () {
    paper.transformToFitContent({ padding: 26, maxScale: 0.85, minScale: 0.2, useModelGeometry: true });
  });
  return paper;
}

// ---- Option 1: one handler below the flow, catching every step -------
const cellsA = baseCells();
cellsA.push(errorNode('err'));
STEPS.forEach(function (s) { cellsA.push(errLink(s.id, 'err')); });
makePaper('paper-a', cellsA);

// ---- Option 2: a branch off the agent, beside the triggers -----------
const cellsB = baseCells();
cellsB.push(errorNode('err'));
cellsB.push(errLink('agent', 'err'));
makePaper('paper-b', cellsB);

// ---- honest notes on each --------------------------------------------
document.getElementById('notes-a').innerHTML =
  '<ul>' +
    '<li><span class="good">Shows what it catches.</span> A dashed edge from every step that can fail, so the scope is literal rather than implied.</li>' +
    '<li><span class="good">Reads as a try/catch</span> wrapped around the flow — the handler is the last thing on the page, where a reader expects it.</li>' +
    '<li><span class="bad">Gets busier as the flow grows.</span> Five steps is five dashed edges; twenty steps is twenty. That is the real cost of this option.</li>' +
    '<li>Layout pushes it to the bottom rank, so it competes with the Done pill for that space.</li>' +
  '</ul>';

document.getElementById('notes-b').innerHTML =
  '<ul>' +
    '<li><span class="good">Stays one edge forever</span> — flow size does not change the picture at all.</li>' +
    '<li><span class="good">Visible immediately,</span> next to the triggers, so an admin sees failure handling before reading the steps.</li>' +
    '<li><span class="bad">Scope is implied, not drawn.</span> Nothing on the canvas says it applies to every step; you have to know that.</li>' +
    '<li>Reads as a property of the agent, which sits oddly beside triggers — those are ways a run <em>starts</em>, this is how one <em>ends</em>.</li>' +
  '</ul>';

})();
