# 資料結構實驗室

這個 repository 包含 MaxHeap 堆積排序、鏈結雜湊表、圖形 DFS/BFS、最小生成樹、Dijkstra 最短路徑，以及校園 RAG 問答六個互動教學頁。所有頁面都不需要安裝套件或建置工具。

## 頁面

- MaxHeap：直接開啟根目錄的 `index.html`，或前往 GitHub Pages 首頁。
- 鏈結雜湊表：開啟 `hash-table/index.html`，或前往 GitHub Pages 的 `/hash-table/` 路徑。
- 圖形 DFS/BFS：開啟 `graph-traversal/index.html`，或前往 GitHub Pages 的 `/graph-traversal/` 路徑。
- 最小生成樹：開啟 `minimum-spanning-tree/index.html`，或前往 GitHub Pages 的 `/minimum-spanning-tree/` 路徑。使用圖片中的六個校園地點與九條道路，可選任意起點逐步執行 Prim，或切換到 Kruskal 顯示全域最小生成樹。
- Dijkstra 最短路徑：開啟 `dijkstra/index.html`，或前往 GitHub Pages 的 `/dijkstra/` 路徑。使用六個地點與八條非負權重道路，可選起點與終點，逐步觀察優先佇列、距離鬆弛、前驅與最短路徑。
- 校園問答 RAG：開啟 `campus-rag/index.html`，或前往 GitHub Pages 的 `/campus-rag/` 路徑。使用圖片中的 10 段校園資料，以詞項檢索和 Min-Heap 取出前 k 筆，組合可檢查來源的提示與摘錄回答；這是純前端流程示範，不呼叫外部 LLM，無需 API 金鑰。

雜湊表可輸入剛好 15 個安全範圍內的整數，使用 `key % 13` 分配至 13 個 bucket，以鏈結法處理碰撞；另提供隨機資料、查找與分布統計。負數餘數會正規化至 `0` 到 `12`。圖形頁以 6 個頂點及指定 9 條無向邊呈現，可選擇 DFS 或 BFS、起點，並逐步或自動播放走訪過程。

## 本機使用

直接以瀏覽器開啟對應頁面的 `index.html` 即可。MaxHeap 支援最多 31 個整數；雜湊表支援負數、重複值及 15 個整數。

## GitHub Pages 部署

推送至 `main` 分支後，`.github/workflows/pages.yml` 會自動發布 repository 根目錄及子目錄。GitHub Pages 的來源需設為 **GitHub Actions**。