// debug-mongo.js
import Docker from "dockerode";
import mongoose from "mongoose";

const docker = new Docker();

// 環境變數 (docker-compose.yml 裡的帳密 & DB)
const MONGO_USER = process.env.MONGO_USER || "tsaichicloud";
const MONGO_PASS = process.env.MONGO_PASS || "txfun2025";
const MONGO_DB   = process.env.MONGO_DB   || "TaipeiFunFinderDB";

// DEBUG_MODE: true = 用寫死的 URI
const DEBUG_MODE = process.env.DEBUG_MODE === "true";

async function checkMongoContainer() {
  try {
    // 抓取 mongo 容器
    const containers = await docker.listContainers();
    const mongoContainer = containers.find(c =>
      c.Names.some(name => name.includes("taipeifun_mongo"))
    );

    if (!mongoContainer) {
      console.error("❌ 找不到 mongo 容器 (taipeifun_mongo)");
      return;
    }

    console.log(`📦 偵測到容器: ${mongoContainer.Names[0]} (狀態: ${mongoContainer.State})`);

    // 動態 hostPort
    const hostPort =
      mongoContainer.Ports.find(p => p.PrivatePort === 27017)?.PublicPort || 27017;

    // 切換模式
    const uri = DEBUG_MODE
      ? "mongodb://tsaichicloud:txfun2025@localhost:27017/TaipeiFunFinderDB?authSource=admin"
      : `mongodb://${MONGO_USER}:${MONGO_PASS}@localhost:${hostPort}/${MONGO_DB}?authSource=admin`;

    console.log(`🔗 嘗試連線 URI: ${uri}`);

    // 測試連線
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB 連線成功!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ MongoDB 連線失敗:", err.message);
  }
}

checkMongoContainer();
