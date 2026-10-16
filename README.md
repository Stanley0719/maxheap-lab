# Hash Lab 鏈結雜湊表

免安裝、免建置的互動式資料結構教學頁。輸入剛好 15 個整數，即可觀察雜湊函式 `key % 13` 如何將資料分配到 13 個 bucket，並以鏈結法保存碰撞。頁面也提供隨機資料、key 查找與分布統計。

## 本機使用

直接以瀏覽器開啟 `index.html` 即可。數字可用逗號或空格分隔，支援負數、重複值與安全範圍內的整數。負數餘數會正規化到 `0` 至 `12`。

## GitHub Pages 部署

將變更推送到 GitHub repository 的 `main` 分支，`.github/workflows/pages.yml` 會自動發布。GitHub Pages 的來源需設為 **GitHub Actions**；完成後可在 repository 的 **Settings → Pages** 查看網址。

## 雜湊表

| 項目 | 說明 |
| --- | --- |
| Bucket 數量 | 13 |
| 雜湊函式 | `key % 13` |
| 碰撞處理 | Separate chaining（鏈結法） |
| 查找平均時間 | O(1)，視負載因子與分布而定 |
| 查找最壞時間 | O(n)，所有 key 落在同一 bucket 時 |