// backend/test-connection.js
const { MongoClient, ServerApiVersion } = require('mongodb');

// 👇 請在這裡貼上你從 Compass 複製的、已驗證過的那串「完整」連線字串
//    並確保密碼已正確填寫。
const uri = "mongodb+srv://tsaichicloud:txfun2025@taipeifunfinder.been3vd.mongodb.net/TaipeiFunFinderDB?retryWrites=true&w=majority&appName=TaipeiFunFinder&tlsAllowInvalidCertificates=true";

// 建立一個 MongoClient，並加入一個特殊的設定
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  family: 4 // 👈 這行是新的關鍵。它強制 Node.js 只使用 IPv4 進行網路連線。
});

async function run() {
  try {
    // 連接到伺服器
    console.log("🚀 正在嘗試使用 MongoDB Driver 直接連線...");
    await client.connect();
    
    // 確認連線成功
    await client.db("admin").command({ ping: 1 });
    console.log("✅ 恭喜！你已成功連接到 MongoDB！");
    console.log("   這代表你的網路、帳密、IP設定都沒有問題。");

  } catch (err) {
    console.error("❌ 連線測試失敗，SHIT, 以下是詳細錯誤報告：");
    console.error(err); // 印出最詳細的錯誤物件
  } finally {
    // 確保在結束或出錯時關閉連線
    await client.close();
    console.log("🔌 已關閉資料庫連線。");
  }
}

// 執行測試
run();