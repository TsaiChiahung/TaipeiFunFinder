// MongoDB Atlas 全功能診斷工具
const dns = require("dns");
const net = require("net");
const mongoose = require("mongoose");
const https = require("https");

// Cluster 設定
const CLUSTER = "taipeifunfinder.been3vd.mongodb.net";

// ⚠️ 換成你在 Atlas 建的 Database User 帳密與資料庫名稱
const USER = "tsaichicloud";
const PASS = "txfun2025";
const DB   = "taipeifunfinder";

const URI = `mongodb+srv://${USER}:${encodeURIComponent(PASS)}@${CLUSTER}/${DB}?retryWrites=true&w=majority`;

// 取得本機公共 IP
function getPublicIP() {
  return new Promise((resolve) => {
    https.get("https://api.ipify.org?format=json", (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const ip = JSON.parse(data).ip;
          resolve(ip);
        } catch (e) {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

// 測試 SRV 記錄
async function testSRV() {
  return new Promise((resolve) => {
    console.log("=== 測試 1: DNS SRV 查詢 ===");
    dns.resolveSrv(`_mongodb._tcp.${CLUSTER}`, (err, addresses) => {
      if (err) {
        console.error("❌ SRV 查詢失敗:", err.message);
        console.log("👉 建議: 確認網路能解析 SRV 記錄，或換 Google DNS (8.8.8.8) / Cloudflare (1.1.1.1)");
      } else if (addresses.length === 0) {
        console.warn("⚠️ SRV 查詢回傳空結果");
        console.log("👉 建議: Cluster 名稱可能錯誤，或 DNS 被網路阻擋");
      } else {
        console.log("✅ SRV 查詢成功:", addresses);
      }
      resolve();
    });
  });
}

// 測試 TCP 連線
async function testTCP() {
  return new Promise((resolve) => {
    console.log("\n=== 測試 2: TCP 連線到 27017 ===");
    const socket = net.createConnection(27017, CLUSTER);

    socket.on("connect", () => {
      console.log("✅ 成功連到 27017 port!");
      socket.end();
      resolve();
    });

    socket.on("error", (err) => {
      console.error("❌ TCP 連線失敗:", err.message);
      console.log("👉 建議: 可能是防火牆或網路阻擋了 27017 port");
      resolve();
    });

    socket.setTimeout(5000, () => {
      console.error("⏰ TCP 連線逾時");
      console.log("👉 建議: 檢查網路品質或 Atlas Cluster 狀態");
      socket.destroy();
      resolve();
    });
  });
}

// Mongoose 連線測試
async function testMongoose() {
  console.log("\n=== 測試 3: Mongoose 連線 ===");
  try {
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Mongoose 成功連線到 MongoDB Atlas!");
  } catch (err) {
    console.error("❌ Mongoose 連線失敗:", err.message);

    if (err.message.includes("bad auth")) {
      console.log("👉 建議: 檢查 Database User 帳號密碼是否正確（不是 Atlas 登入帳號）");
    } else if (err.message.includes("authentication")) {
      console.log("👉 建議: DB User 權限不足或密碼需 encodeURIComponent");
    } else if (err.message.includes("ECONN")) {
      console.log("👉 建議: IP 沒加入 Atlas 白名單 (Network Access)");
    } else if (err.message.includes("ENOTFOUND")) {
      console.log("👉 建議: DNS SRV 查詢失敗，網路可能阻擋了查詢");
    } else {
      console.log("👉 提示: 查看 Atlas Cluster Logs 或 Network Access 設定，確認 IP 是否在白名單");
    }
  } finally {
    await mongoose.disconnect();
  }
}

// 顯示本機公共 IP 提示白名單
async function checkWhitelistHint() {
  const ip = await getPublicIP();
  if (ip) {
    console.log(`\n🌐 你的公共 IP: ${ip}`);
    console.log(`👉 如果 Mongoose 連線失敗，請將此 IP 加入 Atlas Cluster 的 Network Access 白名單`);
  } else {
    console.log("\n⚠️ 無法取得公共 IP");
    console.log("👉 如果 Mongoose 連線失敗，請確認你的網路能對外訪問");
  }
}

async function main() {
  await testSRV();
  await testTCP();
  await testMongoose();
  await checkWhitelistHint();
  console.log("\n🎯 測試完成");
}

main();
