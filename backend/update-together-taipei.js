// backend/update-together-taipei.js (偽裝瀏覽器最終版)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoURI = process.env.MONGODB_URI;

const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema);

const API_URL = 'https://together.taipei/api/post/list';

const mapEventData = (apiEvent) => {
  const content = apiEvent.content || '';
  const imgMatch = content.match(/<img src="([^"]+)"/);
  const imageUrl = imgMatch ? imgMatch[1] : (apiEvent.files && apiEvent.files.length > 0 ? apiEvent.files[0].url : '');

  return {
    title: apiEvent.title,
    category: apiEvent.categoryName || '綜合',
    location: apiEvent.locationName || '未提供',
    address: apiEvent.address || apiEvent.locationName || '詳見活動官網',
    description: apiEvent.summary || '',
    startDate: apiEvent.startDate ? new Date(apiEvent.startDate) : null,
    endDate: apiEvent.endDate ? new Date(apiEvent.endDate) : null,
    organizer: apiEvent.groupName || '臺北通',
    linkUrl: `https://together.taipei/HEOTPR/mobile/post/${apiEvent.id}`,
    imageUrl: imageUrl,
    isFree: !apiEvent.isCharge,
    status: 'pending',
    source: '臺北通',
  };
};

const fetchAndSaveEvents = async () => {
  if (!mongoURI) {
    console.error("❌ 找不到 MONGODB_URI");
    return;
  }

  await mongoose.connect(mongoURI);
  console.log("✅ MongoDB 連線成功");

  let newEventsCount = 0;
  let duplicateCount = 0;
  let currentPage = 1;
  let totalPages = 1;

  try {
    do {
      console.log(`- 正在抓取第 ${currentPage} / ${totalPages} 頁的資料...`);
      
      const response = await axios.post(
        API_URL, 
        { // 這是我們要傳送的資料 (Payload)
          page: currentPage,
          pageSize: 20,
          query: "",
          sort: "new",
          isCharge: null
        }, 
        { // 👇👇👇 關鍵修正！在這裡加上 headers 設定來偽裝成瀏覽器 👇👇👇
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
          }
        }
      );

      const data = response.data.data;
      const events = data.rows;
      totalPages = data.totalPages;

      for (const apiEvent of events) {
        const mappedEvent = mapEventData(apiEvent);
        if (!mappedEvent.title || !mappedEvent.startDate) {
          continue;
        }
        const existingEvent = await Event.findOne({
          title: mappedEvent.title,
          startDate: mappedEvent.startDate
        });
        if (existingEvent) {
          duplicateCount++;
        } else {
          const newEvent = new Event(mappedEvent);
          await newEvent.save();
          newEventsCount++;
        }
      }
      currentPage++;
    } while (currentPage <= totalPages);

    console.log("\n--------------------");
    console.log("✅ 資料抓取完成！");
    console.log(`✨ 成功新增 ${newEventsCount} 筆新活動。`);
    console.log(`🤷‍♂️ 發現 ${duplicateCount} 筆重複活動並已跳過。`);
    console.log("--------------------");

  } catch (error) {
    // 檢查是否有更詳細的錯誤訊息
    if (error.response) {
      console.error(`❌ 抓取過程中發生錯誤: 伺服器回應 ${error.response.status} 錯誤`);
      console.error('詳細內容:', error.response.data);
    } else {
      console.error("❌ 抓取過程中發生錯誤:", error.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 連線已關閉");
  }
};

fetchAndSaveEvents();