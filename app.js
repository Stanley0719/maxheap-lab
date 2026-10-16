const MAX_ITEMS = 31;

class MaxHeap {
  constructor(values = []) {
    this.values = [...values];
    for (let index = Math.floor(this.values.length / 2) - 1; index >= 0; index -= 1) {
      this.siftDown(index);
    }
  }

  get size() { return this.values.length; }
  get max() { return this.values[0]; }

  siftDown(start) {
    let index = start;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let largest = index;
      if (left < this.size && this.values[left] > this.values[largest]) largest = left;
      if (right < this.size && this.values[right] > this.values[largest]) largest = right;
      if (largest === index) return;
      [this.values[index], this.values[largest]] = [this.values[largest], this.values[index]];
      index = largest;
    }
  }

  insert(value) {
    this.values.push(value);
    let index = this.size - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent] >= this.values[index]) break;
      [this.values[parent], this.values[index]] = [this.values[index], this.values[parent]];
      index = parent;
    }
  }

  extractMax() {
    if (!this.size) return undefined;
    const maximum = this.max;
    const last = this.values.pop();
    if (this.size) {
      this.values[0] = last;
      this.siftDown(0);
    }
    return maximum;
  }
}

const elements = {
  input: document.querySelector('#sequence-input'),
  build: document.querySelector('#build-button'),
  random: document.querySelector('#random-button'),
  insert: document.querySelector('#insert-button'),
  extract: document.querySelector('#extract-button'),
  count: document.querySelector('#node-count'),
  status: document.querySelector('#operation-status'),
  canvas: document.querySelector('#tree-canvas'),
  edges: document.querySelector('#tree-edges'),
  levels: document.querySelector('#tree-levels'),
  empty: document.querySelector('#tree-empty'),
  array: document.querySelector('#array-values'),
  heapComparisons: document.querySelector('#heap-comparisons'),
  heapSwaps: document.querySelector('#heap-swaps'),
  bubbleComparisons: document.querySelector('#bubble-comparisons'),
  bubbleSwaps: document.querySelector('#bubble-swaps'),
  sampleSize: document.querySelector('#sample-size'),
};

let heap = new MaxHeap([42, 18, 35, 12, 9, 27, 31]);

function parseSequence() {
  const source = elements.input.value.trim();
  if (!source) return [];
  const tokens = source.split(/[\s,，;；]+/).filter(Boolean);
  if (tokens.length > MAX_ITEMS) throw new Error(`數列最多輸入 ${MAX_ITEMS} 個整數。`);
  return tokens.map((token) => {
    if (!/^[+-]?\d+$/.test(token)) throw new Error(`「${token}」不是有效的整數。`);
    const value = Number(token);
    if (!Number.isSafeInteger(value)) throw new Error('請輸入安全範圍內的整數。');
    return value;
  });
}

function heapSortStats(values) {
  const data = [...values];
  let comparisons = 0;
  let swaps = 0;
  function siftDown(size, start) {
    let index = start;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let largest = index;
      if (left < size) {
        comparisons += 1;
        if (data[left] > data[largest]) largest = left;
      }
      if (right < size) {
        comparisons += 1;
        if (data[right] > data[largest]) largest = right;
      }
      if (largest === index) return;
      [data[index], data[largest]] = [data[largest], data[index]];
      swaps += 1;
      index = largest;
    }
  }
  for (let index = Math.floor(data.length / 2) - 1; index >= 0; index -= 1) siftDown(data.length, index);
  for (let end = data.length - 1; end > 0; end -= 1) {
    [data[0], data[end]] = [data[end], data[0]];
    swaps += 1;
    siftDown(end, 0);
  }
  return { comparisons, swaps };
}

function bubbleSortStats(values) {
  const data = [...values];
  let comparisons = 0;
  let swaps = 0;
  for (let end = data.length - 1; end > 0; end -= 1) {
    let changed = false;
    for (let index = 0; index < end; index += 1) {
      comparisons += 1;
      if (data[index] > data[index + 1]) {
        [data[index], data[index + 1]] = [data[index + 1], data[index]];
        swaps += 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { comparisons, swaps };
}

function renderTree() {
  const values = heap.values;
  elements.levels.replaceChildren();
  elements.edges.replaceChildren();
  elements.empty.hidden = values.length > 0;
  elements.canvas.hidden = values.length === 0;
  elements.count.textContent = `${values.length} 個節點`;
  elements.insert.disabled = values.length >= MAX_ITEMS;
  elements.extract.disabled = values.length === 0;

  const levels = [];
  values.forEach((value, index) => {
    const depth = Math.floor(Math.log2(index + 1));
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push({ value, index });
  });

  levels.forEach((nodes, depth) => {
    const row = document.createElement('div');
    row.className = 'tree-level';
    row.dataset.depth = String(depth);
    nodes.forEach(({ value, index }) => {
      const node = document.createElement('span');
      node.className = `heap-node${index === 0 ? ' root' : ''}`;
      node.dataset.index = String(index);
      node.textContent = String(value);
      node.setAttribute('aria-label', index === 0 ? `根節點，最大值 ${value}` : `節點 ${value}`);
      row.append(node);
    });
    elements.levels.append(row);
  });

  elements.array.replaceChildren();
  values.forEach((value, index) => {
    const cell = document.createElement('span');
    cell.className = 'array-cell';
    cell.innerHTML = `<small>${index}</small>${value}`;
    elements.array.append(cell);
  });

  const heapStats = heapSortStats(values);
  const bubbleStats = bubbleSortStats(values);
  elements.heapComparisons.textContent = heapStats.comparisons.toLocaleString('zh-TW');
  elements.heapSwaps.textContent = heapStats.swaps.toLocaleString('zh-TW');
  elements.bubbleComparisons.textContent = bubbleStats.comparisons.toLocaleString('zh-TW');
  elements.bubbleSwaps.textContent = bubbleStats.swaps.toLocaleString('zh-TW');
  elements.sampleSize.textContent = `N = ${values.length}`;
  requestAnimationFrame(drawEdges);
}

function drawEdges() {
  const canvasRect = elements.canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return;
  elements.edges.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);
  elements.edges.setAttribute('width', String(canvasRect.width));
  elements.edges.setAttribute('height', String(canvasRect.height));
  for (let index = 1; index < heap.size; index += 1) {
    const parent = elements.levels.querySelector(`[data-index="${Math.floor((index - 1) / 2)}"]`);
    const child = elements.levels.querySelector(`[data-index="${index}"]`);
    if (!parent || !child) continue;
    const parentRect = parent.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(parentRect.left + parentRect.width / 2 - canvasRect.left));
    line.setAttribute('y1', String(parentRect.top + parentRect.height / 2 - canvasRect.top));
    line.setAttribute('x2', String(childRect.left + childRect.width / 2 - canvasRect.left));
    line.setAttribute('y2', String(childRect.top + childRect.height / 2 - canvasRect.top));
    line.setAttribute('class', 'tree-edge');
    elements.edges.append(line);
  }
}

function reportError(error) {
  elements.status.textContent = error.message;
  elements.status.dataset.state = 'error';
}

function updateStatus(message) {
  elements.status.textContent = message;
  delete elements.status.dataset.state;
}

elements.build.addEventListener('click', () => {
  try {
    heap = new MaxHeap(parseSequence());
    updateStatus(heap.size ? `已建立堆積，根節點 ${heap.max} 是目前最大值。` : '已清空堆積。輸入數列後重新建立。');
    renderTree();
  } catch (error) {
    reportError(error);
  }
});

elements.random.addEventListener('click', () => {
  const values = Array.from({ length: 10 }, () => Math.floor(Math.random() * 99) - 9);
  elements.input.value = values.join(', ');
  heap = new MaxHeap(values);
  updateStatus(`隨機數列已建立，根節點 ${heap.max} 是目前最大值。`);
  renderTree();
});

elements.insert.addEventListener('click', () => {
  const value = Math.floor(Math.random() * 199) - 99;
  heap.insert(value);
  elements.input.value = heap.values.join(', ');
  updateStatus(`已插入 ${value}，並向上調整堆積。`);
  renderTree();
});

elements.extract.addEventListener('click', () => {
  const maximum = heap.extractMax();
  elements.input.value = heap.values.join(', ');
  updateStatus(`已取出最大值 ${maximum}，並重新調整堆積。`);
  renderTree();
});

window.addEventListener('resize', () => requestAnimationFrame(drawEdges));
renderTree();