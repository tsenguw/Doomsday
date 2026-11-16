# 末日三族（Doomsday）

4–8 人的卡牌桌遊線上版：帝國、共和國、公國三大族群爭奪最後的資源。

- 線上遊玩：https://tsenguw.github.io/Doomsday/
- 整個遊戲是單一檔案 `index.html`，不需要安裝或建置。

## 目前狀態

- 在這個網址上可以**單機練習**（與 3–7 位電腦對手）。
- **連線對戰**目前依賴 Claude 發佈頁面的資料同步功能，在 GitHub Pages 上無法使用；要在這裡連線需另外接上即時資料庫後端。

## 原始碼

- `src/engine.js`：規則引擎（純函式、狀態可序列化）
- `src/art.js`：卡牌向量圖案
- `src/template.html`：介面與同步層
- `python3 src/build.py`：把上面三個檔案合併成 `index.html`
