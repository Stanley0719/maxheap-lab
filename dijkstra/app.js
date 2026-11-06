const vertices = ['A', 'B', 'C', 'D', 'E', 'F'];
const edges = [
  { left: 'A', right: 'B', weight: 2 },
  { left: 'A', right: 'C', weight: 5 },
  { left: 'B', right: 'C', weight: 1 },
  { left: 'B', right: 'D', weight: 4 },
  { left: 'C', right: 'E', weight: 2 },
  { left: 'D', right: 'E', weight: 1 },
  { left: 'D', right: 'F', weight: 3 },
  { left: 'E', right: 'F', weight: 6 },
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
  'C-E': [301, 284],
  'D-E': [363, 184],
  'D-F': [456, 127],
  'E-F': [456, 239],
};
const edgeKey = (left, right) => [left, right].sort().join('-');
const compareEntries = (left, right) => left.distance - right.distance || left.vertex.localeCompare(right.vertex);
const adjacency = new Map(vertices.map((vertex) => [vertex, []]));
edges.forEach((edge) => {
  adjacency.get(edge.left).push({ vertex: edge.right, weight: edge.weight });
  adjacency.get(edge.right).push({ vertex: edge.left, weight: edge.weight });
});
adjacency.forEach((neighbors) => neighbors.sort((left, right) => left.vertex.localeCompare(right.vertex)));

const elements = {
  svgEdges: document.querySelector('#graph-edges'),
  svgNodes: document.querySelector('#graph-nodes'),
  start: document.querySelector('#start-node'),
  target: document.querySelector('#target-node'),
  previous: document.querySelector('#previous-button'),
  step: document.querySelector('#step-button'),
  play: document.querySelector('#play-button'),
  reset: document.querySelector('#reset-button'),
  timeline: document.querySelector('#timeline-input'),
  timelineValue: document.querySelector('#timeline-value'),
  queue: document.querySelector('#queue-list'),
  queueCount: document.querySelector('#queue-count'),
  rows: document.querySelector('#distance-rows'),
  status: document.querySelector('#operation-status'),
  route: document.querySelector('#route-result'),
};

class MinPriorityQueue {
  constructor() {
    this.items = [];
  }

  push(entry) {
    this.items.push(entry);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareEntries(this.items[parent], this.items[index]) <= 0) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  pop() {
    if (this.items.length === 0) return null;
    const minimum = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && compareEntries(this.items[left], this.items[smallest]) < 0) smallest = left;
        if (right < this.items.length && compareEntries(this.items[right], this.items[smallest]) < 0) smallest = right;
        if (smallest === index) break;
        [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
        index = smallest;
      }
    }
    return minimum;
  }
}

let events = [];
let cursor = 0;
let timer = null;

function buildGraph() {
  edges.forEach((edge) => {
    const key = edgeKey(edge.left, edge.right);
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

function createDijkstraEvents(start, target) {
  const distances = new Map(vertices.map((vertex) => [vertex, Infinity]));
  const parents = new Map(vertices.map((vertex) => [vertex, null]));
  const settled = new Set();
  const queue = new MinPriorityQueue();
  const result = [];
  let pops = 0;
  let stale = 0;
  let successfulRelaxations = 0;
  let current = null;
  let activeEdge = null;

  const record = (type, message, details = {}) => {
    result.push({
      type,
      message,
      details,
      distances: new Map(distances),
      parents: new Map(parents),
      settled: new Set(settled),
      queue: [...queue.items].sort(compareEntries),
      current,
      activeEdge,
      pops,
      stale,
      successfulRelaxations,
    });
  };

  distances.set(start, 0);
  queue.push({ vertex: start, distance: 0 });
  record('start', `初始化：dist[${start}] = 0，其餘地點為 ∞。把 (0, ${start}) 放進優先佇列。`);

  while (queue.items.length > 0) {
    const entry = queue.pop();
    if (!entry) throw new Error('優先佇列為空時無法取出節點。');
    pops += 1;
    current = entry.vertex;
    activeEdge = null;

    if (settled.has(entry.vertex) || entry.distance !== distances.get(entry.vertex)) {
      stale += 1;
      record('stale', `取出 (${entry.distance}, ${entry.vertex})，但它已過期；目前 dist[${entry.vertex}] = ${distances.get(entry.vertex)}，略過。`);
      continue;
    }

    settled.add(entry.vertex);
    record('extract', `取出佇列最小值 (${entry.distance}, ${entry.vertex})；${entry.vertex} 的最短距離確定為 ${entry.distance}。`);

    adjacency.get(entry.vertex).forEach(({ vertex: neighbor, weight }) => {
      activeEdge = edgeKey(entry.vertex, neighbor);
      if (settled.has(neighbor)) {
        record('settled-neighbor', `檢查 ${entry.vertex} — ${neighbor}（${weight}）：${neighbor} 已確定，不再更新。`);
        return;
      }

      const candidate = distances.get(entry.vertex) + weight;
      const previous = distances.get(neighbor);
      if (candidate < previous) {
        distances.set(neighbor, candidate);
        parents.set(neighbor, entry.vertex);
        successfulRelaxations += 1;
        queue.push({ vertex: neighbor, distance: candidate });
        record('relax-success', `鬆弛 ${entry.vertex} — ${neighbor}：${distances.get(entry.vertex)} + ${weight} = ${candidate} < ${formatDistance(previous)}，更新 dist[${neighbor}] = ${candidate}、parent[${neighbor}] = ${entry.vertex}，加入佇列。`);
      } else {
        record('relax-noop', `鬆弛 ${entry.vertex} — ${neighbor}：${distances.get(entry.vertex)} + ${weight} = ${candidate}，不小於目前 ${formatDistance(previous)}，不更新。`);
      }
    });
  }

  current = null;
  activeEdge = null;
  const path = buildPath(start, target, parents, distances);
  const pathText = path ? path.join(' → ') : `沒有從 ${start} 到 ${target} 的可行路徑`;
  record('finish', `優先佇列清空。${start} 到 ${target} 的最短距離為 ${formatDistance(distances.get(target))}；沿 parent 回溯得到 ${pathText}。`, { path });
  return result;
}

function buildPath(start, target, parents, distances) {
  if (!Number.isFinite(distances.get(target))) return null;
  const path = [];
  let current = target;
  while (current !== null) {
    path.push(current);
    if (current === start) return path.reverse();
    current = parents.get(current);
  }
  return null;
}

function formatDistance(distance) {
  return Number.isFinite(distance) ? String(distance) : '∞';
}

function stopPlayback() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  elements.play.textContent = '▶ 自動播放';
  elements.play.setAttribute('aria-label', '自動播放演算法');
}

function render() {
  const event = events[cursor];
  if (!event) throw new Error(`找不到第 ${cursor} 個 Dijkstra 步驟。`);
  const target = elements.target.value;
  const finished = event.type === 'finish';
  const path = finished ? event.details.path : null;
  const pathEdges = new Set();
  if (path) {
    for (let index = 1; index < path.length; index += 1) {
      pathEdges.add(edgeKey(path[index - 1], path[index]));
    }
  }

  elements.svgEdges.querySelectorAll('.graph-edge').forEach((line) => {
    line.classList.toggle('is-path-edge', pathEdges.has(line.dataset.edge));
    line.classList.toggle('is-current-edge', event.activeEdge === line.dataset.edge && !pathEdges.has(line.dataset.edge));
  });
  elements.svgNodes.querySelectorAll('.graph-node').forEach((node) => {
    const vertex = node.dataset.vertex;
    node.classList.toggle('is-source', vertex === elements.start.value);
    node.classList.toggle('is-target', vertex === target);
    node.classList.toggle('is-settled', event.settled.has(vertex));
    node.classList.toggle('is-current', event.current === vertex);
    node.classList.toggle('is-on-path', Boolean(path?.includes(vertex)));
  });

  elements.queue.replaceChildren();
  event.queue.forEach((entry, index) => {
    const chip = document.createElement('span');
    chip.className = `queue-chip${index === 0 ? ' is-minimum' : ''}`;
    chip.textContent = `(${entry.distance}, ${entry.vertex})`;
    elements.queue.append(chip);
  });
  if (event.queue.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'queue-empty';
    empty.textContent = '佇列為空';
    elements.queue.append(empty);
  }
  elements.queueCount.textContent = `${event.queue.length} 項`;

  elements.rows.replaceChildren();
  vertices.forEach((vertex) => {
    const row = document.createElement('tr');
    if (event.current === vertex) row.classList.add('is-current-row');
    if (path?.includes(vertex)) row.classList.add('is-path-row');
    const status = event.settled.has(vertex) ? '已出堆' : event.queue.some((entry) => entry.vertex === vertex && entry.distance === event.distances.get(vertex)) ? '排隊中' : '未探索';
    [vertex, formatDistance(event.distances.get(vertex)), event.parents.get(vertex) ?? '—', status].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });
    elements.rows.append(row);
  });

  document.querySelector('#pop-count').textContent = String(event.pops);
  document.querySelector('#stale-count').textContent = String(event.stale);
  document.querySelector('#relax-count').textContent = String(event.successfulRelaxations);
  document.querySelector('#settled-count').textContent = String(event.settled.size);
  document.querySelector('#settled-total').textContent = `出堆 ${event.settled.size} / ${vertices.length}`;

  elements.status.textContent = event.message;
  elements.route.replaceChildren();
  if (path) {
    const routeLabel = document.createElement('span');
    routeLabel.textContent = `最短路徑：${path.join(' → ')}`;
    const routeDistance = document.createElement('strong');
    routeDistance.textContent = `${formatDistance(event.distances.get(target))}`;
    const unit = document.createElement('span');
    unit.textContent = '總距離';
    elements.route.append(routeLabel, routeDistance, unit);
    elements.route.hidden = false;
  } else {
    elements.route.hidden = true;
  }

  const lastStep = events.length - 1;
  elements.previous.disabled = cursor === 0;
  elements.step.disabled = finished;
  elements.timeline.max = String(lastStep);
  elements.timeline.value = String(cursor);
  elements.timelineValue.textContent = `${cursor} / ${lastStep}`;
  if (finished) stopPlayback();
}

function reset() {
  stopPlayback();
  events = createDijkstraEvents(elements.start.value, elements.target.value);
  cursor = 0;
  render();
}

function moveTo(nextCursor) {
  stopPlayback();
  cursor = Math.max(0, Math.min(events.length - 1, nextCursor));
  render();
}

function selectStart(vertex) {
  elements.start.value = vertex;
  reset();
}

elements.start.addEventListener('change', reset);
elements.target.addEventListener('change', reset);
elements.previous.addEventListener('click', () => moveTo(cursor - 1));
elements.step.addEventListener('click', () => moveTo(cursor + 1));
elements.reset.addEventListener('click', reset);
elements.timeline.addEventListener('input', () => moveTo(Number(elements.timeline.value)));
elements.play.addEventListener('click', () => {
  if (timer !== null) {
    stopPlayback();
    return;
  }
  if (cursor >= events.length - 1) cursor = 0;
  elements.play.textContent = 'Ⅱ 暫停';
  elements.play.setAttribute('aria-label', '暫停自動播放');
  render();
  timer = window.setInterval(() => {
    cursor += 1;
    render();
  }, 650);
});

buildGraph();
reset();
