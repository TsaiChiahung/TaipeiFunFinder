import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// === 取得當前目錄 ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 載入 .env (專案根目錄) ===
dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log("📂 dotenv loaded:", process.env); // Debug 全部環境變數
console.log("📂 process.env.MONGODB_URI =", process.env.MONGODB_URI);

const app = express();
const PORT = process.env.PORT || 3000;

// === MongoDB 連線設定 ===
// 如果沒有設定 MONGODB_URI，根據 NODE_ENV 切換
let mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  if (process.env.NODE_ENV === "docker") {
    // ✅ Docker Compose 裡面要用 service name "mongo"
    mongoURI =
      "mongodb://tsaichicloud:txfun2025@mongo:27017/TaipeiFunFinderDB?authSource=admin";
  } else {
    // ✅ 本機環境
    mongoURI =
      "mongodb://tsaichicloud:txfun2025@localhost:27017/TaipeiFunFinderDB?authSource=admin";
  }
}

console.log("📂 Loaded MONGODB_URI:", mongoURI);

// === 嘗試連線 MongoDB ===
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB 連線成功"))
  .catch((err) => {
    console.error("❌ MongoDB 連線失敗:", err.message);
    process.exit(1); // 連線失敗直接退出
  });

// === 測試首頁 ===
app.get("/", (req, res) => {
  res.send("🚀 TaipeiFunFinder API 運作中");
});

// === 啟動伺服器 ===
app.listen(PORT, () => {
  console.log(`🚀 Server 已啟動: http://localhost:${PORT}`);
});
