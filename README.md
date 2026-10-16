# 資料結構實驗室

這個 repository 包含 MaxHeap 堆積排序、鏈結雜湊表，以及圖形 DFS/BFS 三個互動教學頁。所有頁面都不需要安裝套件或建置工具。

## 頁面

- MaxHeap：直接開啟根目錄的 `index.html`，或前往 GitHub Pages 首頁。
- 鏈結雜湊表：開啟 `hash-table/index.html`，或前往 GitHub Pages 的 `/hash-table/` 路徑。
- 圖形 DFS/BFS：開啟 `graph-traversal/index.html`，或前往 GitHub Pages 的 `/graph-traversal/` 路徑。

雜湊表可輸入剛好 15 個安全範圍內的整數，使用 `key % 13` 分配至 13 個 bucket，以鏈結法處理碰撞；另提供隨機資料、查找與分布統計。負數餘數會正規化至 `0` 到 `12`。圖形頁以 6 個頂點及指定 9 條無向邊呈現，可選擇 DFS 或 BFS、起點，並逐步或自動播放走訪過程。

## 本機使用

直接以瀏覽器開啟對應頁面的 `index.html` 即可。MaxHeap 支援最多 31 個整數；雜湊表支援負數、重複值及 15 個整數。

## GitHub Pages 部署

推送至 `main` 分支後，`.github/workflows/pages.yml` 會自動發布 repository 根目錄及子目錄。GitHub Pages 的來源需設為 **GitHub Actions**。