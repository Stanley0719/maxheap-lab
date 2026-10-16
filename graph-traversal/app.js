const vertices = ['A', 'B', 'C', 'D', 'E', 'F'];
const edges = [
  ['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'D', 8],
  ['C', 'E', 10], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3],
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
const adjacency = new Map(vertices.map((vertex) => [vertex, []]));
edges.forEach(([left, right]) => {
  adjacency.get(left).push(right);
  adjacency.get(right).push(left);
});
adjacency.forEach((neighbors) => neighbors.sort());

const elements = {
  svgEdges: document.querySelector('#graph-edges'),
  svgNodes: document.querySelector('#graph-nodes'),
  start: document.querySelector('#start-node'),
  step: document.querySelector('#step-button'),
  play: document.querySelector('#play-button'),
  reset: document.querySelector('#reset-button'),
  status: document.querySelector('#operation-status'),
  order: document.querySelector('#visit-order'),
  stepCount: document.querySelector('#step-count'),
  frontierLabel: document.querySelector('#frontier-label'),
  frontier: document.querySelector('#frontier-list'),
  frontierCount: document.querySelector('#frontier-count'),
};

let mode = 'dfs';
let events = [];
let cursor = 0;
let timer = null;

function buildGraph() {
  edges.forEach(([left, right, weight]) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(positions[left][0]));
    line.setAttribute('y1', String(positions[left][1]));
    line.setAttribute('x2', String(positions[right][0]));
    line.setAttribute('y2', String(positions[right][1]));
    line.setAttribute('class', 'graph-edge');
    line.dataset.edge = `${left}-${right}`;
    elements.svgEdges.append(line);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const [labelX, labelY] = weightLabels[`${left}-${right}`];
    label.setAttribute('class', 'edge-weight');
    label.setAttribute('x', String(labelX));
    label.setAttribute('y', String(labelY));
    label.setAttribute('text-anchor', 'middle');
    label.textContent = `${weight} 分`;
    elements.svgEdges.append(label);
  });

  vertices.forEach((vertex) => {
    const [x, y] = positions[vertex];
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'graph-node');
    group.setAttribute('transform', `translate(${x} ${y})`);
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `選擇 ${vertex} ${placeNames[vertex]}作為起點`);
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

function createTraversal(start) {
  const result = [];
  const visited = new Set();

  if (mode === 'bfs') {
    const queue = [start];
    const parent = new Map([[start, null]]);
    visited.add(start);
    while (queue.length) {
      const vertex = queue.shift();
      adjacency.get(vertex).forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        parent.set(neighbor, vertex);
        queue.push(neighbor);
      });
      result.push({ vertex, parent: parent.get(vertex), frontier: [...queue] });
    }
    return result;
  }

  const stack = [{ vertex: start, parent: null, entered: false, nextNeighbor: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (!frame.entered) {
      frame.entered = true;
      visited.add(frame.vertex);
      result.push({
        vertex: frame.vertex,
        parent: frame.parent,
        frontier: stack.map(({ vertex }) => vertex),
      });
    }
    const neighbors = adjacency.get(frame.vertex);
    if (frame.nextNeighbor === neighbors.length) {
      stack.pop();
      continue;
    }
    const neighbor = neighbors[frame.nextNeighbor];
    frame.nextNeighbor += 1;
    if (!visited.has(neighbor)) stack.push({ vertex: neighbor, parent: frame.vertex, entered: false, nextNeighbor: 0 });
  }
  return result;
}

function stopPlayback() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  elements.play.textContent = '▶';
  elements.play.setAttribute('aria-label', '自動播放走訪');
}

function render() {
  const completed = cursor >= events.length;
  const current = cursor ? events[cursor - 1] : null;
  const visited = new Set(events.slice(0, cursor).map(({ vertex }) => vertex));
  const treeEdges = new Set(events.slice(0, cursor)
    .filter(({ parent }) => parent)
    .map(({ vertex, parent }) => [parent, vertex].sort().join('-')));

  elements.svgNodes.querySelectorAll('.graph-node').forEach((node) => {
    const vertex = node.dataset.vertex;
    node.classList.toggle('is-visited', visited.has(vertex));
    node.classList.toggle('is-current', current?.vertex === vertex);
    node.classList.toggle('is-start', vertex === elements.start.value);
  });
  elements.svgEdges.querySelectorAll('.graph-edge').forEach((edge) => {
    edge.classList.toggle('is-tree-edge', treeEdges.has(edge.dataset.edge));
  });

  elements.order.replaceChildren();
  events.slice(0, cursor).forEach(({ vertex }, index) => {
    const item = document.createElement('span');
    item.className = `visit-chip${index === cursor - 1 ? ' is-current' : ''}`;
    item.textContent = vertex;
    elements.order.append(item);
  });

  const frontier = current?.frontier ?? [elements.start.value];
  elements.frontierLabel.textContent = mode === 'dfs' ? '目前遞迴路徑' : '待訪問佇列';
  elements.frontierCount.textContent = String(frontier.length);
  elements.frontier.replaceChildren();
  frontier.forEach((vertex, index) => {
    const item = document.createElement('span');
    item.className = `frontier-chip${mode === 'bfs' && index === 0 ? ' is-next' : ''}`;
    item.textContent = vertex;
    elements.frontier.append(item);
  });

  elements.stepCount.textContent = `${cursor} / ${events.length}`;
  elements.step.disabled = completed;
  if (completed && cursor) {
    elements.status.textContent = `已完成 ${mode.toUpperCase()}，共走訪 ${cursor} 個地點。`;
    stopPlayback();
  } else if (current) {
    elements.status.textContent = `第 ${cursor} 步：走訪 ${current.vertex}${current.parent ? `，由 ${current.parent} 前往` : '（起點）'}。`;
  } else {
    elements.status.textContent = `從 ${elements.start.value} 開始，選擇下一步探索的地點。`;
  }
}

function resetTraversal() {
  stopPlayback();
  events = createTraversal(elements.start.value);
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
  resetTraversal();
}

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach((choice) => {
      const selected = choice === button;
      choice.classList.toggle('is-selected', selected);
      choice.setAttribute('aria-pressed', String(selected));
    });
    resetTraversal();
  });
});

elements.start.addEventListener('change', () => resetTraversal());
elements.step.addEventListener('click', advance);
elements.reset.addEventListener('click', resetTraversal);
elements.play.addEventListener('click', () => {
  if (timer !== null) {
    stopPlayback();
    return;
  }
  if (cursor >= events.length) resetTraversal();
  elements.play.textContent = 'Ⅱ';
  elements.play.setAttribute('aria-label', '暫停自動播放');
  timer = window.setInterval(advance, 720);
});

buildGraph();
resetTraversal();