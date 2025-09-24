import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// 從 .env 讀取 MONGODB_URI
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ 沒有找到 MONGODB_URI，請確認 .env 檔案有設定");
  process.exit(1);
}

console.log("使用的 URI:", uri);

try {
  // 顯示目前外部 IP (方便檢查是不是被 Atlas 擋掉)
  const ipRes = await axios.get("https://api.ipify.org?format=json");
  console.log("目前外部 IP:", ipRes.data.ip);
} catch (err) {
  console.warn("⚠️ 無法抓取外部 IP:", err.message);
}

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("✅ 成功連線到 MongoDB Atlas!");
  process.exit(0);
} catch (err) {
  console.error("❌ 連線失敗:", err.message);
  process.exit(1);
}


