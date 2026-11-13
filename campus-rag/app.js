const documents = [
  { id: "D1", text: "海大餐廳平日早餐供餐時間是 11:00 到 13:30，晚餐是 17:00 到 19:00。" },
  { id: "D2", text: "餐廳可以用學生證儲值付款，也可以付現金。" },
  { id: "D3", text: "圖書館平日開放到晚上 22:00，週末開放到 17:00。" },
  { id: "D4", text: "大學部學生一次可以借 10 本書，借期是 30 天。" },
  { id: "D5", text: "借的書逾期未還，每本每天罰 5 元。" },
  { id: "D6", text: "宿舍門禁時間是晚上 23:30，晚歸要先登記。" },
  { id: "D7", text: "宿舍費用每學期 12000 元，開學前要繳費。" },
  { id: "D8", text: "校車每 20 分鐘一班，從校門開到基隆火車站。" },
  { id: "D9", text: "體育館平日開放到 21:00，進場要帶學生證。" },
  { id: "D10", text: "機車停車證每學期 500 元，要在網路上申請。" },
];

const stopWords = new Set(["可以", "請問", "請", "一下", "怎麼", "如何", "多少", "嗎", "呢", "是", "的", "了", "到", "在", "哪裡", "什麼", "誰", "為什麼", "何處"]);
const topicAnchors = [
  { pattern: /餐廳|吃飯|用餐|早餐|晚餐/u, documentPattern: /餐廳|供餐/u },
  { pattern: /圖書館/u, documentPattern: /圖書館/u },
  { pattern: /借書|圖書(?!館)|借幾本|借多久/u, documentPattern: /借.{0,5}(本書|借期|天)|本書/u },
  { pattern: /宿舍|門禁|晚歸/u, documentPattern: /宿舍|門禁/u },
  { pattern: /校車|火車站|交通/u, documentPattern: /校車|火車站/u },
  { pattern: /體育館|運動/u, documentPattern: /體育館/u },
  { pattern: /機車|停車|停車證/u, documentPattern: /機車|停車證/u },
];
const segmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("zh-Hant", { granularity: "word" })
  : null;
const queryForm = document.querySelector("#question-form");
const questionInput = document.querySelector("#question-input");
const documentList = document.querySelector("#document-list");
const queryTerms = document.querySelector("#query-terms");
const vectorStatus = document.querySelector("#vector-status");
const topKSelect = document.querySelector("#top-k");
const retrievedList = document.querySelector("#retrieved-list");
const retrievalStatus = document.querySelector("#retrieval-status");
const promptOutput = document.querySelector("#prompt-output");
const answerOutput = document.querySelector("#answer-output");
const answerSource = document.querySelector("#answer-source");

function tokenize(text) {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("zh-Hant");
  const chunks = segmenter
    ? [...segmenter.segment(normalized)].filter((part) => part.isWordLike).map((part) => part.segment)
    : normalized.match(/[\p{Script=Han}]+|[a-z0-9:]+/gu) || [];
  const terms = new Set();

  for (const chunk of chunks) {
    if (/^[\p{Script=Han}]+$/u.test(chunk)) {
      terms.add(chunk);
    } else if (chunk.length > 1) {
      terms.add(chunk);
    }
  }

  return [...terms].filter((term) => !stopWords.has(term));
}

function expandQuery(query, terms) {
  const expanded = new Set(terms);
  const expansions = [
    { pattern: /餐廳|吃飯|用餐|早餐|晚餐/u, terms: ["供餐", "時間"] },
    { pattern: /時間|幾點|何時|開放|營業/u, terms: ["時間", "平日", "週末", "晚上", "開放"] },
    { pattern: /借書|圖書(?!館)|借幾本|借多久/u, terms: ["借", "本書", "借期", "天"] },
    { pattern: /多少錢|費用|收費|罰/u, terms: ["費用", "元", "繳費", "罰"] },
    { pattern: /宿舍|門禁|晚歸/u, terms: ["宿舍", "門禁", "登記"] },
    { pattern: /校車|火車站|交通/u, terms: ["校車", "分鐘", "車站"] },
    { pattern: /體育館|運動|學生證/u, terms: ["體育館", "開放", "學生證"] },
    { pattern: /機車|停車|停車證/u, terms: ["機車", "停車證", "申請"] },
  ];

  for (const expansion of expansions) {
    if (expansion.pattern.test(query)) {
      for (const term of expansion.terms) expanded.add(term);
    }
  }
  return [...expanded];
}

function scoreDocument(document, queryTerms, query) {
  const terms = new Set(tokenize(document.text));
  let score = 0;

  for (const term of queryTerms) {
    if (!terms.has(term)) continue;
    const documentFrequency = documents.filter((candidate) => tokenize(candidate.text).includes(term)).length;
    const inverseFrequency = Math.log(1 + (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
    score += inverseFrequency * (term.length > 2 ? 1.5 : 1);
  }

  for (const anchor of topicAnchors) {
    if (anchor.pattern.test(query) && anchor.documentPattern.test(document.text)) score += 4;
  }
  if (/時間|幾點|何時|開放|營業/u.test(query) && /\d{1,2}:\d{2}/u.test(document.text)) score += 1.5;
  return score;
}

class MinHeap {
  constructor(limit) {
    this.limit = limit;
    this.items = [];
  }

  add(item) {
    if (this.items.length < this.limit) {
      this.items.push(item);
      this.siftUp(this.items.length - 1);
      return;
    }
    if (item.score <= this.items[0].score) return;
    this.items[0] = item;
    this.siftDown(0);
  }

  siftUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].score <= this.items[index].score) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  siftDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.items.length && this.items[left].score < this.items[smallest].score) smallest = left;
      if (right < this.items.length && this.items[right].score < this.items[smallest].score) smallest = right;
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

function renderDocuments() {
  for (const entry of documents) {
    const item = document.createElement("li");
    item.className = "document-item";
    const id = document.createElement("strong");
    id.textContent = entry.id;
    const text = document.createElement("p");
    text.textContent = entry.text;
    item.append(id, text);
    documentList.append(item);
  }
}

function renderQueryVector(terms) {
  queryTerms.replaceChildren();
  for (const term of terms.slice(0, 10)) {
    const chip = document.createElement("span");
    chip.className = "term-chip";
    chip.textContent = term;
    queryTerms.append(chip);
  }
  vectorStatus.textContent = `${terms.length} 個檢索詞`;
}

function generateAnswer(question, match) {
  const { id } = match.document;

  if (id === "D1") return "海大餐廳平日供應時間：早餐 11:00–13:30，晚餐 17:00–19:00。";
  if (id === "D2") return "餐廳可使用學生證儲值付款，也可以付現金。";
  if (id === "D3") {
    if (/週末|假日/u.test(question)) return "圖書館週末開放到 17:00。";
    if (/平日|週間/u.test(question)) return "圖書館平日開放到晚上 22:00。";
    return "圖書館平日開放到晚上 22:00，週末開放到 17:00。";
  }
  if (id === "D4") {
    const asksDuration = /多久|幾天|借期|期限/u.test(question);
    const asksCount = /幾本|多少本|數量/u.test(question);
    if (asksDuration) return "大學部學生借書期限是 30 天。";
    if (asksCount) return "大學部學生一次最多可以借 10 本書。";
    return "大學部學生一次可以借 10 本書，借期 30 天。";
  }
  if (id === "D5") return "圖書逾期未還，每本每天罰 5 元。";
  if (id === "D6") return "宿舍門禁時間是晚上 23:30；晚歸需要先登記。";
  if (id === "D7") return "宿舍費用是每學期 12,000 元，需在開學前繳費。";
  if (id === "D8") return "校車每 20 分鐘一班，行駛路線是校門到基隆火車站。";
  if (id === "D9") return "體育館平日開放到 21:00，進場需攜帶學生證。";
  if (id === "D10") return "機車停車證每學期 500 元，需在線上申請。";
  return "目前沒有足夠資料回答這個問題。";
}

function renderResults(question, matches) {
  retrievedList.replaceChildren();

  if (matches.length === 0 || matches[0].score < 0.5) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "找不到足夠相關的文件；請換個問法再試一次。";
    retrievedList.append(emptyState);
    retrievalStatus.textContent = "沒有文件達到相關度門檻";
    promptOutput.textContent = "未找到足夠相關的文件，因此不會生成缺乏依據的回答。";
    answerOutput.textContent = "目前知識庫沒有足夠資料回答這個問題。";
    answerSource.textContent = "無可引用來源";
    return;
  }

  matches.forEach((match, index) => {
    const item = document.createElement("div");
    item.className = "retrieved-item";
    const meta = document.createElement("div");
    meta.className = "retrieved-meta";
    const rank = document.createElement("strong");
    rank.textContent = `#${index + 1} ${match.document.id}`;
    const score = document.createElement("span");
    score.textContent = `相關度 ${match.score.toFixed(2)}`;
    const text = document.createElement("p");
    text.textContent = match.document.text;
    meta.append(rank, score);
    item.append(meta, text);
    retrievedList.append(item);
  });

  const contexts = matches.map(({ document }) => `[${document.id}] ${document.text}`).join("\n");
  promptOutput.textContent = [
    "你是校園問答助理。請只根據以下資料回答；若資料不足，請明確說明。回答需標示引用文件編號。",
    `問題：${question}`,
    "檢索資料：",
    contexts,
    "請用繁體中文簡潔回答，勿補充資料中沒有的事實。",
  ].join("\n\n");
  answerOutput.textContent = generateAnswer(question, matches[0]);
  answerSource.textContent = matches.map(({ document }) => document.id).join("、");
  retrievalStatus.textContent = `檢索完成：從 10 段文件取出前 ${matches.length} 名`;
}

function search(question) {
  const terms = tokenize(question);
  if (terms.length === 0) {
    queryTerms.replaceChildren();
    vectorStatus.textContent = "尚未計算";
    retrievalStatus.textContent = "請輸入包含有效詞項的問題";
    retrievedList.replaceChildren();
    promptOutput.textContent = "請先輸入問題，再檢索校園文件。";
    answerOutput.textContent = "尚未產生回答。";
    answerSource.textContent = "等待檢索";
    questionInput.focus();
    return;
  }

  renderQueryVector(terms);
  const expandedTerms = expandQuery(question, terms);
  const heap = new MinHeap(Number(topKSelect.value));
  const activeAnchors = topicAnchors.filter((anchor) => anchor.pattern.test(question));

  for (const document of documents) {
    if (activeAnchors.length > 0 && !activeAnchors.some((anchor) => anchor.documentPattern.test(document.text))) continue;
    const score = scoreDocument(document, expandedTerms, question);
    if (score > 0) heap.add({ document, score });
  }

  const matches = heap.items.slice().sort((first, second) => second.score - first.score);
  renderResults(question, matches);
}

renderDocuments();
queryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  search(questionInput.value.trim());
});
topKSelect.addEventListener("change", () => search(questionInput.value.trim()));

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset.question;
    search(questionInput.value);
  });
});

search(questionInput.value.trim());
