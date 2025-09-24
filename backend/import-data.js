import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- 設定 ---
// 載入位於專案根目錄的 .env 檔案
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
const dbURI = process.env.MONGODB_URI;

// 在 ESM 中取得 __dirname 的標準方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Schema & Model (與 server.js 保持一致) ---
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  location: String,
  address: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  organizer: String,
  linkUrl: String,
  isFree: Boolean,
  imageUrl: String,
  isRecommended: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // 從本地檔案匯入的，預設為 approved
  },
  likes: { type: Number, default: 0 },
  comments: [{ author: String, body: String, date: Date }]
});

const Event = mongoose.model('Event', eventSchema);

// --- 主要執行函式 ---
const importData = async () => {
  if (!dbURI) {
    console.error('❌ 錯誤：找不到 MONGODB_URI。請檢查你的 .env 檔案是否在專案根目錄。');
    return; // 直接退出
  }

  const connectionOptions = {
    family: 4, // 處理網路問題
  };

// ... importData 函式的前面部分 ...
    try {
        await mongoose.connect(dbURI, connectionOptions);
        console.log('✅ 成功連接到 MongoDB Atlas...');

        await Event.deleteMany({});
        console.log('🧹 舊有 events 資料已清除...');
        
        console.log('📖 正在讀取 db.json...');
        const eventsPath = path.join(__dirname, 'db.json');
        let eventsToImport = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
        
        // 在插入前，移除會造成衝突的 "id" 欄位
        eventsToImport = eventsToImport.map(event => {
          const { id, ...rest } = event; // 將 id 挑出來，其餘的放進 rest
          return rest; // 只回傳沒有 id 的其餘部分
        });
        
        await Event.insertMany(eventsToImport);
        console.log('🚚 新資料已成功匯入！');

    } catch (error) {
        // 👇 這裡是 catch 區塊
        // 如果 try 區塊中的任何一個 await 步驟出錯，程式就會跳到這裡
        console.error('❌ 匯入過程中發生錯誤:', error);

    } finally {
        // 👇 這裡是 finally 區塊
        // 無論 try 成功或 catch 捕捉到錯誤，這段程式碼最後都一定會執行
        await mongoose.disconnect();
        console.log('🔌 資料庫連線已關閉。');
    }
};

// --- 執行 ---
importData();