// backend/fetch-events.js
import mongoose from "mongoose";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ 請確認 .env 檔案裡已設定 MONGODB_URI");
  process.exit(1);
}

async function connectMongo(allowInvalidCert = false) {
  try {
    console.log(`🔗 嘗試連線 MongoDB (allowInvalidCert=${allowInvalidCert})...`);
    await mongoose.connect(uri, {
      tls: true,
      tlsAllowInvalidCertificates: allowInvalidCert
    });
    console.log("✅ MongoDB 連線成功");
    return true;
  } catch (err) {
    console.error("❌ MongoDB 連線失敗:", err.message);

    if (
      err.message.includes("self-signed certificate") &&
      allowInvalidCert === false
    ) {
      console.warn("⚠️ 偵測到憑證錯誤，自動重試 (tlsAllowInvalidCertificates=true)...");
      return await connectMongo(true);
    }

    return false;
  }
}

async function fetchEvents() {
  try {
    const res = await fetch("https://culture.gov.taipei/openapi.json");
    const data = await res.json();
    console.log(`📥 抓到 ${data.length} 筆活動資料`);
  } catch (err) {
    console.error("❌ 抓取活動失敗:", err.message);
  }
}

(async () => {
  const connected = await connectMongo();
  if (!connected) {
    console.error("🚫 無法連線到 MongoDB，程式結束。");
    process.exit(1);
  }

  await fetchEvents();
  await mongoose.disconnect();
})();

