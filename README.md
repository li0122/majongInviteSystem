# 麻將配對 (Mahjong Match)

行動 App + 後端服務，提供以下核心能力：

- Email + OTP 驗證登入
- 持續 GPS 定位上報（支援配對半徑 15KM）
- 金額等級 + 時間的即時桌友媒合
- 成團後自動計算集合點，推薦最近且營業中的商家
- 透過 FCM 推播通知「邀請中」與「成團結果」

## 專案結構

- `app/`: Flutter 行動端
- `backend/`: Node.js + Express + MongoDB 後端

## 功能對應需求

### A. 用戶系統與安全

- OTP 驗證：
  - `POST /api/auth/request-otp`
  - `POST /api/auth/verify-otp`
- GPS 上報：
  - `POST /api/auth/location`
- 背景定位：
  - App 端已接入連續定位串流。實機需額外啟用平台權限（見下方設定）。

### B. 媒合主頁面

- 金額等級：`30/10`, `50/20`, `100/20`, `200/50`, `300/100`
- 時間選擇：App 端提供時間選擇器
- 配對觸發：`POST /api/matchmaking/start`
- 推播通知：
  - 發起配對後通知 15KM 內鄰近候選玩家
  - 成團後通知 4 人集合資訊

### C. 商家與地點演算法

- Mock 店家資料：`backend/src/data/venues.ts`
- 成團後計算：
  - 以 4 位玩家座標做幾何中位數（Weiszfeld）近似最小總距離點
  - 從可營業店家中挑選離該點最近者
- 回傳集合資訊：地點名稱 + 導航連結（Google Maps）

## 後端啟動

1. 進入目錄：

```bash
cd backend
```

2. 安裝依賴：

```bash
npm install
```

3. 建立環境變數：

```bash
cp .env.example .env
```

4. 啟動開發伺服器：

```bash
npm run dev
```

5. 檢查健康狀態：

```bash
curl http://localhost:4000/health
```

## Flutter App 啟動

1. 進入目錄：

```bash
cd app
```

2. 安裝依賴：

```bash
flutter pub get
```

3. 啟動 App（Android Emulator）：

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

4. iOS Simulator 可改為：

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:4000/api
```

## 主要 API 規格

### 1) 請求 OTP

`POST /api/auth/request-otp`

```json
{
  "email": "player@example.com"
}
```

### 2) 驗證 OTP

`POST /api/auth/verify-otp`

```json
{
  "email": "player@example.com",
  "otp": "123456",
  "fcmToken": "device_token"
}
```

### 3) 更新定位

`POST /api/auth/location`

```json
{
  "userId": "<mongo_user_id>",
  "lat": 25.033,
  "lon": 121.565
}
```

### 4) 開始配對

`POST /api/matchmaking/start`

```json
{
  "userId": "<mongo_user_id>",
  "stakeLevel": "100/20",
  "startTime": "2026-03-27T13:00:00.000Z",
  "lat": 25.033,
  "lon": 121.565
}
```

## Firebase / 推播設定

- 後端：
  - 在 `.env` 設定 `FIREBASE_PROJECT_ID`
  - 將 Firebase Service Account JSON 做 base64 後填入 `FIREBASE_SERVICE_ACCOUNT_BASE64`
- App：
  - 需完成 Firebase 專案綁定（Android `google-services.json` / iOS `GoogleService-Info.plist`）
  - 程式中已呼叫通知權限請求與 token 取得

## 背景定位平台設定（必要）

### Android

- 需在 `AndroidManifest.xml` 加入：
  - `ACCESS_FINE_LOCATION`
  - `ACCESS_COARSE_LOCATION`
  - `ACCESS_BACKGROUND_LOCATION`
- 若要長時間背景追蹤，建議搭配前景服務通知。

### iOS

- 在 `Info.plist` 加入：
  - `NSLocationWhenInUseUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription`
- 開啟 Background Modes 的 `Location updates`。

## 注意事項

- 目前 OTP 若未設定 SMTP，會走 mock 模式並輸出到後端 console。
- 店家資料目前為 mock，可改成 MongoDB 集合。
- 媒合採同金額、時間窗 ±60 分鐘、半徑 15KM。
