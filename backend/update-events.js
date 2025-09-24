import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Event from './models/Event.js'; // 假設你已經將 Event Schema 獨立出來

// --- 設定 ---
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
const dbURI = process.env.MONGODB_URI;
// backend/update-events.js

// --- Schema & Model (與 server.js 保持一致) ---
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  location: String,
  address: String,
  description: String, // 👈 加上這一行
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
    default: 'pending'
  },
  source: String, // 加上來源欄位
  likes: { type: Number, default: 0 },
  comments: [{ author: String, body: String, date: Date }]
});

// --- API 來源設定 ---
const sources = [
  {
    name: "文化局",
    url: "https://data.taipei/api/v1/dataset/4a4058aa-c890-404e-8df5-c1e43d809c48?scope=resourceAquire",
    map: (e) => ({
      title: e.title || "未命名活動",
      location: e.location || "未提供地點",
      address: e.address || "",
      startDate: e.startDate || e.beginDate || null,
      endDate: e.endDate || e.endDate || null,
      description: e.description || "",
      imageUrl: e.imageUrl || "",
      linkUrl: e.webSales || "",
      isFree: e.isFree === 'Y',
      category: "藝文",
      source: "文化局",
    }),
  },
  {
    name: "觀光傳播局",
    url: "https://data.taipei/api/v1/dataset/52b46d73-3054-47c6-8292-2d33411b785a?scope=resourceAquire",
    map: (e) => ({
      title: e.name || "未命名活動",
      location: e.distric || "未提供地點",
      address: e.address || "",
      startDate: e.start_date || null,
      endDate: e.end_date || null,
      description: e.description || "",
      imageUrl: e.files?.split(';')[0] || "",
      linkUrl: e.url || "",
      isFree: !e.charge,
      category: e.category || "觀光",
      source: "觀光傳播局",
    }),
  },
];

// --- 主要執行函式 ---
const fetchAndSaveEvents = async () => {
  if (!dbURI) {
    console.error('❌ 錯誤：找不到 MONGODB_URI。');
    return;
  }

  await mongoose.connect(dbURI);
  console.log('✅ MongoDB 連線成功');

  let newEventsCount = 0;

  try {
    for (const source of sources) {
      console.log(`📡 正在從 [${source.name}] 抓取資料...`);
      const response = await axios.get(source.url);
      const items = response.data.result.results;

      for (const item of items) {
        const mappedEvent = source.map(item);

        // 關鍵！檢查是否已存在 (用標題和開始日期做唯一性判斷)
        const existingEvent = await Event.findOne({
          title: mappedEvent.title,
          startDate: mappedEvent.startDate,
        });

        if (!existingEvent) {
          // 如果不存在，則新增到資料庫，狀態為 'pending'
          const event = new Event({
            ...mappedEvent,
            status: 'pending', // 新抓取的活動預設為待審核
            isRecommended: false,
          });
          await event.save();
          newEventsCount++;
        }
      }
    }
    console.log(`\n🎉 抓取完成！總共新增了 ${newEventsCount} 筆新活動。`);

  } catch (error) {
    console.error('❌ 抓取過程中發生錯誤:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 資料庫連線已關閉。');
  }
};

fetchAndSaveEvents();