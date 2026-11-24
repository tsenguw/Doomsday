# 末日爭奪戰（Doomsday）

4–6 人的卡牌桌遊線上版：魔王軍、勇者團、村民會三大族群爭奪最後的資源。

- 線上遊玩：https://tsenguw.github.io/Doomsday/
- 整個遊戲是單一檔案 `index.html`，不需要安裝或建置。

## 連線

- 從 GitHub Pages 開啟時，連線對戰使用 Firebase Realtime Database（專案 `doomsday-fb45a`），玩家不用登入，打開網址輸入暱稱即可建房或加入。
- 從 Claude 發佈的頁面開啟時，使用 Claude 頁面內建的資料同步。
- 也可以和 3–5 位電腦對手單機練習。
- 首頁有「新手教學」：單人腳本局，跟著提示親手完成一次個人勝利。
- 斷線重連：牌局狀態都存在房間資料裡；重新開啟網頁會自動回到原房間，換裝置可接手離線玩家的座位；房主離線約 40 秒後，由最早入座的在線真人自動接手房主。
- 末日倒數（四個階段）：第 4 輪糧食短缺（手牌裝備全部打出）、第 6 輪野獸襲擊（禁止轉生、市集封印，第 5 輪預告）、第 8 輪血月降臨（強制揭露身分，每回合可取回 1 張自己角色的裝備）、第 14 輪結束世界末日（全員死亡）。
- 可選規則「限時模式」：前 8 輪不限時，第 9 輪起每位玩家只有 20 秒思考時間，時間到強制換下一位。
- 遊戲結束時所有人都會看到結果視窗，可直接「再來一局」；最後一位玩家離開時房間會被刪除（另會清掉無人在座且閒置超過 30 分鐘的房間）。

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
