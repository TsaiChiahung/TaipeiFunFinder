// test-mongo.js
import dns from "dns";
import net from "net";
import mongoose from "mongoose";
import fetch from "node-fetch";

const uri = process.env.MONGODB_URI || "mongodb+srv://user:pass@taipeifunfinder.been3vd.mongodb.net/TaipeiFunFinderDB";

console.log("=== MongoDB 連線測試工具 ===");

// --- Step 1: 取得公開 IP (先試 HTTPS，失敗再用 HTTP)
async function getPublicIP() {
  try {
    const res = await fetch("https://api.ipify.org/?format=json", { timeout: 5000 });
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.warn("⚠️ HTTPS API 失敗，改用 HTTP:", err.message);
    try {
      const res = await fetch("http://api64.ipify.org?format=json", { timeout: 5000 });
      const data = await res.json();
      return data.ip;
    } catch (err2) {
      console.error("❌ 仍然無法偵測公開 IP:", err2.message);
      return null;
    }
  }
}

// --- Step 2: 測試 DNS SRV 查詢
async function testDNS(host) {
  return new Promise((resolve) => {
    dns.resolveSrv(`_mongodb._tcp.${host}`, (err, addresses) => {
      if (err) {
        console.error(`❌ DNS SRV 查詢失敗: ${err.message}`);
        return resolve([]);
      }
      console.log("✅ DNS SRV 查詢成功:", addresses);
      resolve(addresses);
    });
  });
}

// --- Step 3: 測試 TCP Port
async function testPort(host, port = 27017) {
  return new Promise((resolve) => {
    const socket = net.connect(port, host);
    socket.on("connect", () => {
      console.log(`✅ 連線成功 ${host}:${port}`);
      socket.end();
      resolve(true);
    });
    socket.on("error", (err) => {
      console.error(`❌ 連線失敗 ${host}:${port} - ${err.message}`);
      resolve(false);
    });
  });
}

// --- Step 4: 測試 MongoDB 連線 (帶憑證 fallback)
async function testMongo(uri) {
  console.log("\n🚀 測試實際連線...");

  try {
    console.log("🔗 嘗試連線 MongoDB (安全模式)...");
    await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB 連線成功 (安全模式)");
    await mongoose.disconnect();
    return;
  } catch (err) {
    console.error("❌ MongoDB 連線失敗:", err.message);
  }

  // fallback: 忽略憑證
  try {
    console.log("🔗 嘗試連線 MongoDB (忽略憑證模式)...");
    await mongoose.connect(uri, {
      family: 4,
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB 連線成功 (忽略憑證模式)");
  } catch (err) {
    console.error("❌ MongoDB 仍然無法連線:", err.message);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

// --- 主程式 ---
(async () => {
  console.log("🌍 偵測公開 IP...");
  const ip = await getPublicIP();
  if (ip) console.log("你的公開 IPv4:", ip, "\n👉 請確認已加入 Atlas 白名單");

  const clusterHost = uri.match(/@([^/]+)/)?.[1];
  if (!clusterHost) {
    console.error("❌ 無法解析 MongoDB Cluster Host，請檢查 MONGODB_URI");
    return;
  }

  console.log(`\n🔍 測試 DNS/Port (${clusterHost})...`);
  const srvRecords = await testDNS(clusterHost);

  if (srvRecords.length > 0) {
    for (const rec of srvRecords) {
      await testPort(rec.name, rec.port);
    }
  } else {
    // fallback: 直接測試 cluster host
    await testPort(clusterHost, 27017);
  }

  await testMongo(uri);
})();

