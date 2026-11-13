const documents = [
  { id: "A1", text: "我叫張博智，性別男性。" },
  { id: "A2", text: "我出生於 2006 年。公開簡介不列出完整出生日期。" },
  { id: "A3", text: "我高中就讀私立天主教恆毅中學。" },
  { id: "A4", text: "我目前就讀國立臺灣海洋大學通訊與導航工程學系。" },
  { id: "A5", text: "我的強項是英文。多益（TOEIC）955 分，取得金色證書；並通過全民英檢中級。" },
  { id: "A6", text: "我居住於新北市。公開簡介不列出居住行政區。" },
  { id: "A7", text: "我的興趣是看電影和學日文。" },
  { id: "A8", text: "我會打羽毛球，也會彈鋼琴。" },
  { id: "A9", text: "我假日在 Q Burger 打工。" },
  { id: "A10", text: "趣味小知識：滅霸的爸爸叫做滅建國。" },
];

const stopWords = new Set(["你", "我", "的", "是", "有", "嗎", "呢", "請問", "一下", "什麼", "哪些", "怎麼", "可以", "會", "誰", "哪裡", "哪間"]);
const topicAnchors = [
  { pattern: /姓名|名字|叫什麼|怎麼稱呼|性別|男生|女生/u, documentPattern: /張博智|性別/u },
  { pattern: /出生|生日|年齡|幾歲|哪一年/u, documentPattern: /出生於/u },
  { pattern: /高中|恆毅|中學/u, documentPattern: /高中就讀|恆毅/u },
  { pattern: /大學|科系|系所/u, documentPattern: /國立臺灣海洋大學/u },
  { pattern: /學校|就讀/u, documentPattern: /就讀/u },
  { pattern: /英文|多益|toeic|英檢|語言|強項|專長/u, documentPattern: /英文|多益|全民英檢/u },
  { pattern: /住哪|居住|家住|新北|新莊/u, documentPattern: /居住於/u },
  { pattern: /興趣|電影|日文|休閒/u, documentPattern: /興趣/u },
  { pattern: /羽毛球|打球|鋼琴|才藝|運動|會什麼/u, documentPattern: /羽毛球|鋼琴/u },
  { pattern: /工作|打工|假日|q.?burger/u, documentPattern: /打工/u },
  { pattern: /滅霸|滅建國|爸爸|父親/u, documentPattern: /滅霸/u },
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
    : normalized.match(/[\p{Script=Han}]+|[a-z0-9]+/gu) || [];
  return [...new Set(chunks)].filter((term) => !stopWords.has(term) && term.length > 1);
}

function scoreDocument(entry, queryTerms, question) {
  const documentTerms = new Set(tokenize(entry.text));
  let score = 0;

  for (const term of queryTerms) {
    if (!documentTerms.has(term)) continue;
    const frequency = documents.filter((candidate) => tokenize(candidate.text).includes(term)).length;
    score += Math.log(1 + (documents.length - frequency + 0.5) / (frequency + 0.5));
  }
  for (const anchor of topicAnchors) {
    if (anchor.pattern.test(question) && anchor.documentPattern.test(entry.text)) score += 4;
  }
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
      this.#siftUp(this.items.length - 1);
    } else if (item.score > this.items[0].score) {
      this.items[0] = item;
      this.#siftDown(0);
    }
  }

  #siftUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].score <= this.items[index].score) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  #siftDown(index) {
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

function generateAnswer(question, matches) {
  const entry = matches[0].document;
  if (/興趣.*才藝|才藝.*興趣/u.test(question)) {
    const hobby = matches.find((match) => match.document.id === "A7");
    const skills = matches.find((match) => match.document.id === "A8");
    if (hobby && skills) return "我的興趣是看電影和學日文；我會打羽毛球，也會彈鋼琴。";
  }

  switch (entry.id) {
    case "A1": return /性別|男生|女生/u.test(question) ? "我是男性。" : "我叫張博智。";
    case "A2": return /生日/u.test(question) ? "我出生於 2006 年；公開簡介不列出完整出生日期。" : "我出生於 2006 年，公開簡介不提供完整生日，因此無法由此確認精確年齡。";
    case "A3": return "我高中就讀私立天主教恆毅中學。";
    case "A4": return "我目前就讀國立臺灣海洋大學通訊與導航工程學系。";
    case "A5": return "我的強項是英文：多益 955 分並取得金色證書，也通過全民英檢中級。";
    case "A6": return "我居住於新北市；公開簡介不提供更詳細的居住區域。";
    case "A7": return "我的興趣是看電影和學日文。";
    case "A8": return "我會打羽毛球，也會彈鋼琴。";
    case "A9": return "我假日在 Q Burger 打工。";
    case "A10": return "趣味小知識：滅霸的爸爸叫做滅建國。";
    default: return "目前沒有足夠的簡介資料回答這個問題。";
  }
}

function renderResults(question, matches) {
  retrievedList.replaceChildren();
  if (matches.length === 0 || matches[0].score < 0.2) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "簡介中找不到足夠相關的資料，請換個問法再試一次。";
    retrievedList.append(emptyState);
    retrievalStatus.textContent = "沒有文件達到相關度門檻";
    promptOutput.textContent = "未找到可引用的個人簡介內容，因此不產生沒有根據的回答。";
    answerOutput.textContent = "目前簡介資料不足以回答這個問題。";
    answerSource.textContent = "無可引用來源";
    return;
  }

  for (const [index, match] of matches.entries()) {
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
  }

  const context = matches.map(({ document }) => `[${document.id}] ${document.text}`).join("\n");
  promptOutput.textContent = [
    "你是個人簡介問答助理，只能根據檢索資料回答，並標示來源；資料未提及時請明確說明。 ",
    `問題：${question}`,
    "檢索資料：",
    context,
  ].join("\n\n").trim();
  answerOutput.textContent = generateAnswer(question, matches);
  answerSource.textContent = matches.map(({ document }) => document.id).join("、");
  retrievalStatus.textContent = `檢索完成：從 10 段簡介取出前 ${matches.length} 名`;
}

function search(question) {
  const terms = tokenize(question);
  if (terms.length === 0) {
    queryTerms.replaceChildren();
    vectorStatus.textContent = "尚未計算";
    retrievalStatus.textContent = "請輸入包含有效詞項的問題";
    retrievedList.replaceChildren();
    promptOutput.textContent = "請輸入問題，再檢索個人簡介。";
    answerOutput.textContent = "尚未產生回答。";
    answerSource.textContent = "等待檢索";
    return;
  }

  renderQueryVector(terms);
  const activeAnchors = topicAnchors.filter((anchor) => anchor.pattern.test(question));
  const heap = new MinHeap(Number(topKSelect.value));

  for (const entry of documents) {
    if (activeAnchors.length > 0 && !activeAnchors.some((anchor) => anchor.documentPattern.test(entry.text))) continue;
    const score = scoreDocument(entry, terms, question);
    if (score > 0) heap.add({ document: entry, score });
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
