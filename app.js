const TABLE_SIZE = 13;
const REQUIRED_KEYS = 15;

const elements = {
  input: document.querySelector('#keys-input'),
  build: document.querySelector('#build-button'),
  random: document.querySelector('#random-button'),
  lookupInput: document.querySelector('#lookup-input'),
  lookup: document.querySelector('#lookup-button'),
  status: document.querySelector('#operation-status'),
  buckets: document.querySelector('#bucket-list'),
  keyCount: document.querySelector('#key-count'),
  storedCount: document.querySelector('#stored-count'),
  collisionCount: document.querySelector('#collision-count'),
  usedCount: document.querySelector('#used-count'),
  averageLength: document.querySelector('#average-length'),
};

let table = Array.from({ length: TABLE_SIZE }, () => []);

function hash(key) {
  return ((key % TABLE_SIZE) + TABLE_SIZE) % TABLE_SIZE;
}

function parseKeys() {
  const tokens = elements.input.value.trim().split(/[\s,，;；]+/).filter(Boolean);
  if (tokens.length !== REQUIRED_KEYS) {
    throw new Error(`請輸入剛好 ${REQUIRED_KEYS} 個整數，目前有 ${tokens.length} 個。`);
  }

  return tokens.map((token) => {
    if (!/^[+-]?\d+$/.test(token)) throw new Error(`「${token}」不是有效的整數。`);
    const key = Number(token);
    if (!Number.isSafeInteger(key)) throw new Error('請輸入安全範圍內的整數。');
    return key;
  });
}

function buildTable(keys) {
  const nextTable = Array.from({ length: TABLE_SIZE }, () => []);
  keys.forEach((key) => nextTable[hash(key)].push(key));
  table = nextTable;
}

function renderTable(match = null) {
  elements.buckets.replaceChildren();
  const allKeys = table.flat();
  const usedBuckets = table.filter((chain) => chain.length > 0).length;
  const collisions = table.reduce((total, chain) => total + Math.max(0, chain.length - 1), 0);

  table.forEach((chain, index) => {
    const row = document.createElement('div');
    row.className = `bucket-row${chain.length > 1 ? ' has-collision' : ''}`;

    const bucket = document.createElement('span');
    bucket.className = 'bucket-index';
    bucket.textContent = String(index).padStart(2, '0');
    bucket.setAttribute('aria-label', `索引 ${index}`);
    row.append(bucket);

    const formula = document.createElement('span');
    formula.className = 'bucket-formula';
    formula.textContent = `key % ${TABLE_SIZE}`;
    row.append(formula);

    const chainView = document.createElement('div');
    chainView.className = `chain${chain.length ? '' : ' chain-empty'}`;
    if (!chain.length) {
      const empty = document.createElement('span');
      empty.textContent = '空';
      chainView.append(empty);
    }

    chain.forEach((key, nodeIndex) => {
      if (nodeIndex > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'chain-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        chainView.append(arrow);
      }

      const node = document.createElement('span');
      node.className = `chain-node${nodeIndex === 0 ? ' chain-head' : ''}${match === key ? ' is-match' : ''}`;
      node.textContent = String(key);
      node.setAttribute('aria-label', `${nodeIndex === 0 ? '鏈結首節點，' : ''}key ${key}`);
      chainView.append(node);
    });

    row.append(chainView);
    const size = document.createElement('span');
    size.className = 'chain-size';
    size.textContent = chain.length ? `${chain.length} ${chain.length === 1 ? 'node' : 'nodes'}` : '—';
    row.append(size);
    elements.buckets.append(row);
  });

  elements.keyCount.textContent = `${allKeys.length} / ${REQUIRED_KEYS} 個 key`;
  elements.storedCount.textContent = String(allKeys.length);
  elements.collisionCount.textContent = String(collisions);
  elements.usedCount.textContent = String(usedBuckets);
  elements.averageLength.textContent = usedBuckets ? (allKeys.length / usedBuckets).toFixed(2) : '0.00';
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.dataset.state = isError ? 'error' : 'success';
}

function submitKeys() {
  try {
    const keys = parseKeys();
    buildTable(keys);
    renderTable();
    setStatus(`已插入 ${keys.length} 個 key。相同索引會沿鏈結串列保存。`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

elements.build.addEventListener('click', submitKeys);
elements.input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitKeys();
});

elements.random.addEventListener('click', () => {
  const keys = Array.from({ length: REQUIRED_KEYS }, () => Math.floor(Math.random() * 199) - 99);
  elements.input.value = keys.join(', ');
  buildTable(keys);
  renderTable();
  setStatus('隨機資料已插入，共 15 個 key。');
});

elements.lookup.addEventListener('click', () => {
  const token = elements.lookupInput.value.trim();
  if (!/^[+-]?\d+$/.test(token) || !Number.isSafeInteger(Number(token))) {
    setStatus('請輸入安全範圍內的整數 key。', true);
    return;
  }

  const key = Number(token);
  const index = hash(key);
  const found = table[index].includes(key);
  renderTable(found ? key : null);
  setStatus(
    found
      ? `找到 key ${key}：先計算 ${key} % ${TABLE_SIZE} = ${index}，再沿鏈結比對。`
      : `找不到 key ${key}：搜尋 bucket ${index} 的鏈結後沒有相符節點。`,
    !found,
  );
});

elements.lookupInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') elements.lookup.click();
});

buildTable(parseKeys());
renderTable();