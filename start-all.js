#!/usr/bin/env node
import { exec } from "child_process";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const SERVER_PATH = "./backend/server.js";

// --- 1. 啟動 Docker 容器 ---
function startDocker() {
  return new Promise((resolve, reject) => {
    console.log("🚀 啟動 Docker 容器...");
    exec("docker compose up -d", (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Docker 啟動失敗:", err.message);
        reject(err);
        return;
      }
      console.log(stdout);
      resolve();
    });
  });
}

// --- 2. 測試 MongoDB 連線 ---
async function testMongo() {
  console.log(`🔗 測試 MongoDB 連線: ${MONGO_URI}`);
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB 連線成功!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ MongoDB 連線失敗:", err.message);
    process.exit(1);
  }
}

// --- 3. 啟動 Node.js 伺服器 ---
function startServer() {
  console.log("🚀 啟動 Node.js 伺服器...");
  const serverProcess = exec(`node ${SERVER_PATH}`);

  serverProcess.stdout.on("data", (data) => {
    process.stdout.write(data);
  });

  serverProcess.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  serverProcess.on("close", (code) => {
    console.log(`Server 進程結束，代碼: ${code}`);
  });
}

// --- 主程序 ---
(async function main() {
  try {
    await startDocker();
    await testMongo();
    startServer();
  } catch (err) {
    console.error("❌ 啟動失敗:", err.message);
  }
})();

