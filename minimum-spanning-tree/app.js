const vertices = ['A', 'B', 'C', 'D', 'E', 'F'];
const edges = [
  { left: 'A', right: 'B', weight: 4 },
  { left: 'A', right: 'C', weight: 2 },
  { left: 'B', right: 'C', weight: 1 },
  { left: 'B', right: 'D', weight: 5 },
  { left: 'C', right: 'D', weight: 8 },
  { left: 'C', right: 'E', weight: 10 },
  { left: 'D', right: 'E', weight: 2 },
  { left: 'D', right: 'F', weight: 6 },
  { left: 'E', right: 'F', weight: 3 },
];
const positions = {
  A: [76, 182],
  B: [214, 75],
  C: [214, 289],
  D: [387, 75],
  E: [387, 289],
  F: [526, 182],
};
const placeNames = {
  A: '校門',
  B: '圖書館',
  C: '餐廳',
  D: '系館',
  E: '宿舍',
  F: '體育館',
};
const weightLabels = {
  'A-B': [143, 131],
  'A-C': [139, 238],
  'B-C': [193, 185],
  'B-D': [300, 69],
  'C-D': [301, 187],
  'C-E': [301, 284],
  'D-E': [363, 184],
  'D-F': [456, 127],
  'E-F': [456, 239],
};
const edgeKey = (edge) => [edge.left, edge.right].sort().join('-');
const orderedEdges = [...edges].sort((a, b) => a.weight - b.weight || edgeKey(a).localeCompare(edgeKey(b)));

const elements = {
  svgEdges: document.querySelector('#graph-edges'),
  svgNodes: document.querySelector('#graph-nodes'),
  start: document.querySelector('#start-node'),
  step: document.querySelector('#step-button'),
  play: document.querySelector('#play-button'),
  reset: document.querySelector('#reset-button'),
  status: document.querySelector('#operation-status'),
  selectedEdges: document.querySelector('#selected-edges'),
  edgeCount: document.querySelector('#edge-count'),
  totalWeight: document.querySelector('#total-weight'),
};

let mode = 'prim';
let events = [];
let cursor = 0;
let timer = null;

function buildGraph() {
  edges.forEach((edge) => {
    const key = edgeKey(edge);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(positions[edge.left][0]));
    line.setAttribute('y1', String(positions[edge.left][1]));
    line.setAttribute('x2', String(positions[edge.right][0]));
    line.setAttribute('y2', String(positions[edge.right][1]));
    line.setAttribute('class', 'graph-edge');
    line.dataset.edge = key;
    elements.svgEdges.append(line);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const [labelX, labelY] = weightLabels[key];
    label.setAttribute('class', 'edge-weight');
    label.setAttribute('x', String(labelX));
    label.setAttribute('y', String(labelY));
    label.setAttribute('text-anchor', 'middle');
    label.textContent = String(edge.weight);
    elements.svgEdges.append(label);
  });

  vertices.forEach((vertex) => {
    const [x, y] = positions[vertex];
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'graph-node');
    group.setAttribute('transform', `translate(${x} ${y})`);
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `選擇 ${vertex} ${placeNames[vertex]}作為 Prim 起點`);
    group.dataset.vertex = vertex;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '24');
    circle.setAttribute('class', 'node-circle');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'node-label');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dy', '0.36em');
    label.textContent = vertex;
    const place = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    place.setAttribute('class', 'node-place');
    place.setAttribute('text-anchor', 'middle');
    place.setAttribute('y', vertex === 'B' || vertex === 'D' ? '-33' : '42');
    place.textContent = placeNames[vertex];
    group.append(circle, label, place);
    group.addEventListener('click', () => selectStart(vertex));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectStart(vertex);
      }
    });
    elements.svgNodes.append(group);
  });
}

function createPrimEvents(start) {
  const visited = new Set([start]);
  const result = [];
  while (visited.size < vertices.length) {
    const candidates = orderedEdges.filter((edge) => visited.has(edge.left) !== visited.has(edge.right));
    const selected = candidates[0];
    if (!selected) throw new Error('圖形不連通，無法建立最小生成樹。');
    const vertex = visited.has(selected.left) ? selected.right : selected.left;
    visited.add(vertex);
    result.push({
      edge: selected,
      vertex,
      frontier: candidates.map(edgeKey),
    });
  }
  return result;
}

function createKruskalEvents() {
  const parent = new Map(vertices.map((vertex) => [vertex, vertex]));
  const find = (vertex) => {
    let root = vertex;
    while (parent.get(root) !== root) root = parent.get(root);
    let current = vertex;
    while (parent.get(current) !== current) {
      const next = parent.get(current);
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const result = [];
  orderedEdges.forEach((edge) => {
    const leftRoot = find(edge.left);
    const rightRoot = find(edge.right);
    if (leftRoot === rightRoot) return;
    parent.set(rightRoot, leftRoot);
    result.push({ edge, vertex: null, frontier: [] });
  });
  if (result.length !== vertices.length - 1) throw new Error('圖形不連通，無法建立最小生成樹。');
  return result;
}

function stopPlayback() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  elements.play.textContent = '▶';
  elements.play.setAttribute('aria-label', '自動播放演算法');
}

function render() {
  const selected = events.slice(0, cursor);
  const selectedKeys = new Set(selected.map(({ edge }) => edgeKey(edge)));
  const current = cursor ? events[cursor - 1] : null;
  const total = selected.reduce((sum, { edge }) => sum + edge.weight, 0);
  const complete = cursor >= events.length;
  const frontier = complete ? [] : current?.frontier ?? [];

  elements.svgEdges.querySelectorAll('.graph-edge').forEach((line) => {
    line.classList.toggle('is-tree-edge', selectedKeys.has(line.dataset.edge));
    line.classList.toggle('is-frontier-edge', frontier.includes(line.dataset.edge) && !selectedKeys.has(line.dataset.edge));
  });
  elements.svgNodes.querySelectorAll('.graph-node').forEach((node) => {
    const vertex = node.dataset.vertex;
    node.classList.toggle('is-in-tree', vertex === elements.start.value && mode === 'prim'
      || selected.some(({ edge }) => edge.left === vertex || edge.right === vertex));
    node.classList.toggle('is-current', current?.vertex === vertex);
  });

  elements.selectedEdges.replaceChildren();
  selected.forEach(({ edge }) => {
    const chip = document.createElement('span');
    chip.className = 'edge-chip';
    chip.textContent = `${edge.left} — ${edge.right}  ${edge.weight}`;
    elements.selectedEdges.append(chip);
  });
  elements.edgeCount.textContent = `${cursor} / ${vertices.length - 1}`;
  elements.totalWeight.textContent = String(total);
  elements.step.disabled = complete;

  if (complete) {
    elements.status.textContent = `${mode === 'prim' ? 'Prim' : 'Kruskal'} 完成：連通 6 個地點且沒有環，最小總長度為 ${total}。`;
    stopPlayback();
  } else if (current) {
    elements.status.textContent = `第 ${cursor} 步：加入 ${current.edge.left} — ${current.edge.right}（長度 ${current.edge.weight}），連接地點 ${current.vertex ?? current.edge.right}。`;
  } else if (mode === 'prim') {
    elements.status.textContent = `從 ${elements.start.value}（${placeNames[elements.start.value]}）開始；每次選擇連接樹內外的最短道路。`;
  } else {
    elements.status.textContent = '從最短道路開始檢查；若加入會形成環，就略過該道路。';
  }
}

function reset() {
  stopPlayback();
  events = mode === 'prim' ? createPrimEvents(elements.start.value) : createKruskalEvents();
  cursor = 0;
  render();
}

function advance() {
  if (cursor >= events.length) return;
  cursor += 1;
  render();
}

function selectStart(vertex) {
  elements.start.value = vertex;
  if (mode !== 'prim') setMode('prim');
  else reset();
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('[data-mode]').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  elements.start.disabled = mode !== 'prim';
  reset();
}

function renderStartResults() {
  const container = document.querySelector('#start-results');
  vertices.forEach((start) => {
    const result = createPrimEvents(start);
    const total = result.reduce((sum, { edge }) => sum + edge.weight, 0);
    const card = document.createElement('article');
    card.className = 'summary-card';
    const heading = document.createElement('strong');
    heading.textContent = `${start} · ${placeNames[start]}`;
    const value = document.createElement('span');
    value.textContent = String(total);
    const caption = document.createElement('small');
    caption.textContent = '最小總長度';
    card.append(heading, value, caption);
    container.append(card);
  });
}

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});
elements.start.addEventListener('change', () => reset());
elements.step.addEventListener('click', advance);
elements.reset.addEventListener('click', reset);
elements.play.addEventListener('click', () => {
  if (timer !== null) {
    stopPlayback();
    return;
  }
  if (cursor >= events.length) reset();
  elements.play.textContent = 'Ⅱ';
  elements.play.setAttribute('aria-label', '暫停自動播放');
  timer = window.setInterval(advance, 720);
});

buildGraph();
renderStartResults();
reset();
