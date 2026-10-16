# MaxHeap 堆積排序實驗室

一個免安裝、免建置的互動式 MaxHeap 教學頁面。可輸入自訂整數數列，建立最大堆積樹、插入隨機值、取出最大值，並比較堆積排序與氣泡排序的實際比較/交換次數及時間複雜度。

## 本機使用

直接以瀏覽器開啟 `index.html` 即可。字型會嘗試從 Google Fonts 載入；離線時仍可使用系統替代字型。

## GitHub Pages 部署

1. 將此資料夾推送到 GitHub repository 的 `main` 分支。
2. 在 repository 的 **Settings → Pages → Build and deployment**，將來源設為 **GitHub Actions**。
3. 推送到 `main` 後，`.github/workflows/pages.yml` 會自動發布；完成後可在 Pages 設定頁取得網站網址。

## 複雜度

| 操作 | 時間複雜度 |
| --- | --- |
| 建立 MaxHeap（Floyd 建堆） | O(n) |
| 讀取最大值 | O(1) |
| 插入 / 取出最大值 | O(log n) |
| 堆積排序 | O(n log n) |
| 氣泡排序（平均 / 最壞） | O(n²) |
| 氣泡排序（最佳，已排序且有提前停止） | O(n) |