# 末日三族（Doomsday）

4–8 人的卡牌桌遊線上版：帝國、共和國、公國三大族群爭奪最後的資源。

- 線上遊玩：https://tsenguw.github.io/Doomsday/
- 整個遊戲是單一檔案 `index.html`，不需要安裝或建置。

## 連線

- 從 GitHub Pages 開啟時，連線對戰使用 Firebase Realtime Database（專案 `doomsday-fb45a`），玩家不用登入，打開網址輸入暱稱即可建房或加入。
- 從 Claude 發佈的頁面開啟時，使用 Claude 頁面內建的資料同步。
- 也可以和 3–7 位電腦對手單機練習。

Firebase 需要的設定：

1. Realtime Database 已建立（網址 `https://doomsday-fb45a-default-rtdb.asia-southeast1.firebasedatabase.app`）。
2. Authentication 開啟「匿名」登入。
3. Realtime Database 的規則：

```json
{
  "rules": {
    "g": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "idx": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

`idx` 記錄每個房間最後活動時間，用來清除閒置超過 24 小時的房間（任何人開啟頁面時會順手清理）。

## 原始碼

- `src/engine.js`：規則引擎（純函式、狀態可序列化）
- `src/art.js`：卡牌向量圖案
- `src/template.html`：介面與同步層
- `python3 src/build.py`：把上面三個檔案合併成 `index.html`
