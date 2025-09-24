import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from 'express-session';
import path from "path";
import { fileURLToPath } from "url";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";

// --- 1. 初始設定 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 啟用 dayjs 插件
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// --- 2. Express App 初始化 ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. MongoDB 連線 ---
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("❌ 致命錯誤：找不到 MONGODB_URI 環境變數。");
  process.exit(1);
}
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB 連線成功"))
  .catch(err => {
    console.error("❌ MongoDB 連線失敗:", err.message);
    process.exit(1);
  });

// --- 4. Mongoose Schema & Model ---
const eventSchema = new mongoose.Schema({
  title: String,
  category: String,
  location: String,
  organizer: String,
  startDate: Date,
  endDate: Date,
  linkUrl: String,
  imageUrl: String,
  isFree: Boolean,
  isRecommended: { type: Boolean, default: false },
  address: String,
  description: String,
  likes: { type: Number, default: 0 },
  comments: [{ author: String, body: String, date: { type: Date, default: Date.now } }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'archived'],
    default: 'pending'
  },
  source: String
});
const Event = mongoose.model("Event", eventSchema);

// --- 5. Middleware 設定 (順序很重要！) ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

// --- 6. 路由 (Routes) ---

// 權限檢查 Middleware (保鑣)
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/login');
  }
};

// --- 前台頁面路由 ---
app.get("/", async (req, res) => {
  try {
    const recommendedEvents = await Event.find({ status: 'approved', isRecommended: true }).sort({ startDate: 1 });
    const recommendedIds = recommendedEvents.map(e => e._id);

    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    
    const todayEvents = await Event.find({
      status: 'approved',
      startDate: { $gte: today, $lt: tomorrow },
      _id: { $nin: recommendedIds }
    }).sort({ startDate: 1 });

    const futureEvents = await Event.find({
      status: 'approved',
      startDate: { $gte: tomorrow },
      _id: { $nin: recommendedIds }
    }).sort({ startDate: 1 }).limit(12);
 // 👇👇👇 【新增】查詢正在進行中的長期活動 👇👇👇
    const ongoingEvents = await Event.find({
      status: 'approved',
      startDate: { $lte: today }, // 開始日期 <= 今天
      endDate: { $gte: today },   // 結束日期 >= 今天
      _id: { $nin: recommendedIds }
    }).sort({ startDate: 1 });
    res.render("index", {
      recommendedEvents,
      todayEvents,
      futureEvents, // 👈 修正：傳遞正確的 futureEvents 變數
      ongoingEvents, // 👈 修正：傳遞從資料庫查到的 ongoingEvents
      // 確保所有 EJS 樣板中用到的變數都有傳遞，即使是空的
      tomorrowEvents: futureEvents.filter(e => dayjs(e.startDate).isSame(tomorrow, 'day')), // 從 futureEvents 篩選出明天的
      weekendEvents: [],
    });
  } catch (err) {
    console.error("❌ 載入首頁失敗:", err);
    res.status(500).send("伺服器錯誤");
  }
});
// 👇👇👇 請在這裡貼上新的路由 👇👇👇
// 我們的故事頁面
app.get('/story', (req, res) => {
  res.render('story');
});
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('login', { error: '密碼錯誤！' });
  }
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});
app.get("/admin", isAdmin, async (req, res) => {
  try {
    const eventsToManage = await Event.find({ status: { $in: ['pending', 'approved', 'archived'] } })
      .sort({ status: -1, startDate: 1 });
    res.render("admin", { events: eventsToManage });
  } catch (err) {
    console.error("❌ 載入管理頁面失敗:", err);
    res.status(500).send("無法載入管理頁面");
  }
});

// --- API 路由 ---
app.post('/api/events', isAdmin, async (req, res) => {
  try {
    const newEvent = new Event({ ...req.body, status: 'pending' });
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(400).json({ message: "儲存失敗：" + err.message });
  }
});

app.put("/api/events/:id/like", async (req, res) => { /* ... 保持不變 ... */ });
app.post("/api/events/:id/comments", async (req, res) => { /* ... 保持不變 ... */ });
app.post("/api/events/:id/approve", isAdmin, async (req, res) => { 
  console.log(`[API] 收到核准請求 for ID: ${req.params.id}`); // 日誌 1
  try {
    console.log(`[DB] 正在執行 findByIdAndUpdate...`); // 日誌 2
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    console.log(`[DB] findByIdAndUpdate 完成!`); // 日誌 3
    res.json(event);
  } catch (err) {
    console.error(`[API ERROR] 核准失敗 for ID: ${req.params.id}`, err);
    res.status(500).json({ error: "核准失敗" });
  }
 });
app.post("/api/events/:id/reject", isAdmin, async (req, res) => { /* ... 保持不變 ... */ });

// app.post("/api/events/:id/unpublish", isAdmin, async (req, res) => { /* ... 保持不變 ... */ });
// app.post("/api/events/:id/republish", isAdmin, async (req, res) => { /* ... 保持不變 ... */ });

// 下架活動 (狀態改為 'archived')
app.post("/api/events/:id/unpublish", isAdmin, async (req, res) => {
  console.log(`[API] 收到下架請求 for ID: ${req.params.id}`); // 加上偵錯日誌
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
    res.json(event);
  } catch (err) {
    console.error(`[API ERROR] 下架失敗 for ID: ${req.params.id}`, err);
    res.status(500).json({ error: "下架失敗" });
  }
});

// 重新上架活動 (狀態改回 'approved')
app.post("/api/events/:id/republish", isAdmin, async (req, res) => {
  console.log(`[API] 收到上架請求 for ID: ${req.params.id}`); // 加上偵錯日誌
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json(event);
  } catch (err) {
    console.error(`[API ERROR] 上架失敗 for ID: ${req.params.id}`, err);
    res.status(500).json({ error: "上架失敗" });
  }
});
// 切換活動的「精選推薦」狀態
app.post("/api/events/:id/toggle-recommend", isAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "找不到該活動" });
    }
    // 將 isRecommended 的布林值反轉 (true 變成 false, false 變成 true)
    event.isRecommended = !event.isRecommended;
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: "更新精選狀態失敗" });
  }
});

// backend/server.js

// ===== 搜尋路由 =====
app.get('/search', async (req, res) => {
  try {
    // 從 URL 查詢參數中獲取使用者輸入的搜尋條件
    const { category, location, address, date } = req.query;
    
    // 建立一個基礎的查詢物件，預設只搜尋「已上架」的活動
    let query = { status: 'approved' };

    // 動態地建立查詢條件
    if (category) {
      // 使用 $regex 進行模糊搜尋，'i' 表示不分大小寫
      query.category = { $regex: category, $options: 'i' };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (address) {
      query.address = { $regex: address, $options: 'i' };
    }
    if (date) {
      // 如果提供了日期，找出在該日期「正在進行中」的活動
      const searchDate = dayjs(date).startOf('day').toDate();
      query.startDate = { $lte: searchDate }; // 活動開始日期 <= 搜尋日期
      query.endDate = { $gte: searchDate };   // 活動結束日期 >= 搜尋日期
    }

    // 執行查詢
    const searchResults = await Event.find(query).sort({ startDate: 1 });

    // 渲染一個新的頁面來顯示結果
    res.render('searchResults', {
      results: searchResults,
      query: req.query // 將搜尋條件傳回，方便在頁面上顯示
    });

  } catch (err) {
    console.error("❌ 搜尋失敗:", err);
    res.status(500).send("伺服器錯誤");
  }
});
// --- 7. 啟動伺服器 ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));