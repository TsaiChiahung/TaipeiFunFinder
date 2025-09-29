// backend/server.js (最終完整正確版)
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

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// --- 2. Express App 初始化 ---
const app = express();
const PORT = process.env.PORT || 3000;

// 【修正點 1】告訴 Express 它正運行在一個代理伺服器 (Render) 後面
app.set('trust proxy', 1);

// --- 3. MongoDB 連線 ---
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB 連線成功"))
  .catch(err => console.error("❌ MongoDB 連線失敗:", err.message));

// --- 4. Mongoose Schema & Model ---
const eventSchema = new mongoose.Schema({
  title: String, category: String, location: String, organizer: String,
  startDate: Date, endDate: Date, linkUrl: String, imageUrl: String,
  isFree: Boolean, isRecommended: { type: Boolean, default: false },
  address: String, description: String, likes: { type: Number, default: 0 },
  comments: [{ author: String, body: String, date: { type: Date, default: Date.now } }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'archived'], default: 'pending' },
  source: String
});
const Event = mongoose.model("Event", eventSchema);

// --- 5. Middleware 設定 (順序很重要！) ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend/public")));

// 【修正點 2】使用唯一的、正確的 Session 設定
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: 'auto',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// (可選) 全域監聽器，用於偵錯
app.use((req, res, next) => {
  console.log(`[監聽器] 收到請求: ${req.method} ${req.originalUrl}`);
  next();
});

// --- 6. 路由 (Routes) ---

// 權限檢查 Middleware (保鑣)
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/login');
  }
};

// ==========================================================
//  公開 API 路由 (不需要登入)
// ==========================================================
app.post('/api/events', async (req, res) => {
  console.log('\n--- 收到新增活動請求 ---');
  try {
    const newEventData = { ...req.body };
    if (!newEventData.endDate) {
      newEventData.endDate = newEventData.startDate;
    }
    const newEvent = new Event({ ...newEventData, status: 'pending' });
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(400).json({ message: "儲存失敗：" + err.message });
  }
});
app.put("/api/events/:id/like", async (req, res) => { /* ... */ });
app.post("/api/events/:id/comments", async (req, res) => { /* ... */ });

// ==========================================================
//  前台頁面路由 (不需要登入)
// ==========================================================
app.get("/", async (req, res) => {
  try {
    const recommendedEvents = await Event.find({ status: 'approved', isRecommended: true }).sort({ startDate: 1 });
    const recommendedIds = recommendedEvents.map(e => e._id);
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    const todayEvents = await Event.find({ status: 'approved', startDate: { $gte: today, $lt: tomorrow }, _id: { $nin: recommendedIds } }).sort({ startDate: 1 });
    const futureEvents = await Event.find({ status: 'approved', startDate: { $gte: tomorrow }, _id: { $nin: recommendedIds } }).sort({ startDate: 1 }).limit(12);
    const ongoingEvents = await Event.find({ status: 'approved', startDate: { $lt: today }, endDate: { $gte: today }, _id: { $nin: recommendedIds } }).sort({ startDate: 1 });
    res.render("index", { recommendedEvents, todayEvents, futureEvents, ongoingEvents, tomorrowEvents: futureEvents.filter(e => dayjs(e.startDate).isSame(tomorrow, 'day')), weekendEvents: [] });
  } catch (err) { res.status(500).send("伺服器錯誤"); }
});
app.get('/story', (req, res) => res.render('story'));
// backend/server.js

// ... 在 app.get('/story', ...) 之後，加入這個新路由 ...

// ===== 所有活動頁面 (含分頁功能) =====
app.get('/events', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // 獲取當前頁碼，預設為第 1 頁
    const eventsPerPage = 12; // 設定每頁顯示 12 筆活動
    const skip = (page - 1) * eventsPerPage;

    // 建立基礎查詢，只找「已上架」且「尚未過期」的活動
    const today = dayjs().startOf('day').toDate();
    const query = { 
      status: 'approved',
      endDate: { $gte: today } // 我們只顯示尚未結束的活動
    };

    // 查詢當前頁面的活動
    const events = await Event.find(query)
      .sort({ startDate: 1 }) // 依照開始日期排序
      .skip(skip) // 跳過前面頁面的活動
      .limit(eventsPerPage); // 限制回傳的活動數量

    // 計算總共有多少筆活動，用來計算總頁數
    const totalEvents = await Event.countDocuments(query);
    const totalPages = Math.ceil(totalEvents / eventsPerPage);

    // 渲染 events.ejs 頁面，並傳入需要的資料
    res.render('events', {
      events: events,
      currentPage: page,
      totalPages: totalPages,
      title: "所有活動" // 設定頁面標題
    });

  } catch (err) {
    console.error("❌ 載入所有活動頁面失敗:", err);
    res.status(500).send("伺服器錯誤");
  }
});
app.get('/search', async (req, res) => {
  try {
    const { category, location, address, date } = req.query;
    let query = { status: 'approved' };
    if (category) query.category = { $regex: category, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (address) query.address = { $regex: address, $options: 'i' };
    if (date) {
      const searchDate = dayjs(date).startOf('day').toDate();
      query.startDate = { $lte: searchDate };
      query.endDate = { $gte: searchDate };
    }
    const searchResults = await Event.find(query).sort({ startDate: 1 });
    res.render('searchResults', { results: searchResults, query: req.query });
  } catch (err) { res.status(500).send("伺服器錯誤"); }
});

// ==========================================================
//  管理員登入/登出路由
// ==========================================================
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

// ==========================================================
//  管理後台路由 (全部都需要 isAdmin 權限！)
// ==========================================================
app.get("/admin", isAdmin, async (req, res) => {
  try {
    const eventsToManage = await Event.find({ status: { $in: ['pending', 'approved', 'archived'] } }).sort({ status: -1, startDate: 1 });
    res.render("admin", { events: eventsToManage });
  } catch (err) { res.status(500).send("無法載入管理頁面"); }
});
app.post("/api/events/:id/approve", isAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json(event);
  } catch (err) { res.status(500).json({ error: "核准失敗" }); }
});
app.post("/api/events/:id/reject", isAdmin, async (req, res) => { /* 這裡應該要有駁回邏輯 */ });
app.post("/api/events/:id/unpublish", isAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
    res.json(event);
  } catch (err) { res.status(500).json({ error: "下架失敗" }); }
});
app.post("/api/events/:id/republish", isAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json(event);
  } catch (err) { res.status(500).json({ error: "上架失敗" }); }
});
app.post("/api/events/:id/toggle-recommend", isAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "找不到該活動" });
    event.isRecommended = !event.isRecommended;
    await event.save();
    res.json(event);
  } catch (err) { res.status(500).json({ error: "更新精選狀態失敗" }); }
});

// --- 7. 啟動伺服器 ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));