// backend/server.js

const express = require('express');
const cors = require('cors');
const events = require('./db.json'); // 讀取模擬的資料庫

const app = express();
const PORT = 3000; // API 伺服器將運行在 3000 port

// 使用 cors 中介軟體，允許來自任何來源的請求
app.use(cors());

// --- API 端點 (API Endpoint) ---
// 建立一個 GET 路由，路徑為 /api/events
// 當前端請求這個 URL 時，它會回傳所有活動的 JSON 資料
app.get('/api/events', (req, res) => {
  // 增加一點延遲，模擬真實網路請求
  setTimeout(() => {
    res.json(events);
  }, 500);
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`後端伺服器正在 http://localhost:${PORT} 上運行`);
});