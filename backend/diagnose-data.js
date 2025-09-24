// backend/diagnose-data.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 設定 (與 server.js 完全一致) ---
// 載入 .env 檔案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 定義一個非常寬鬆的 Schema 來讀取任何資料
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema);

const mongoURI = process.env.MONGODB_URI;

const runDiagnostics = async () => {
  if (!mongoURI) {
    console.error("❌ 找不到 MONGODB_URI，請檢查 .env 檔案。");
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ 資料庫連線成功。\n");
    
    console.log("--- 正在讀取所有活動的『真實狀態』---");
    // 抓取「所有」活動，只選擇 title 和 status 欄位
    const allEvents = await Event.find({}, 'title status');
    
    if (allEvents.length === 0) {
      console.log("資料庫中沒有任何活動。");
    } else {
      // 將結果用表格方式印出，方便閱讀
      const report = allEvents.map(e => ({
        _id: e._id,
        title: e.title,
        status: e.status === undefined ? '!!! 欄位不存在 !!!' : (e.status || '空字串 ""')
      }));
      console.table(report);
      console.log(`\n總共找到 ${allEvents.length} 筆活動。`);
    }

  } catch (error) {
    console.error("❌ 診斷過程中發生錯誤:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 資料庫連線已關閉。");
  }
};

runDiagnostics();