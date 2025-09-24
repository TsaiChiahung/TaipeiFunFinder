// backend/server.js (ESM 版本)
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 讀取 .env
dotenv.config();
/*
// backend/server.js (MongoDB Mongoose 版本)
require('dotenv').config(); // 讀取 .env 檔
*/
/*const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); */
const app = express();
const PORT = process.env.PORT || 3000;

// --- 連接到 MongoDB ---
// 請將 "<password>" 換成你自己的資料庫密碼，並確保使用者名稱正確
/* 舊的連接直接寫密碼
const dbURI = 'mongodb+srv://tsaichicloud:txfun2025@taipeifunfinder.been3vd.mongodb.net/TaipeiFunFinderDB?retryWrites=true&w=majority&appName=TaipeiFunFinder';
*/
const dbURI = process.env.MONGODB_URI; //.env 給帳號密碼
if (!dbURI) {
  console.error('❌ 錯誤：找不到 MONGODB_URI，請確認 .env 已設定');
  process.exit(1); // 停止伺服器
}

try {
  await mongoose.connect(dbURI, {
    tls: true
  });
  console.log("✅ 已成功連接 MongoDB Atlas");
} catch (err) {
  console.error("❌ MongoDB 連線失敗:", err.message);
  process.exit(1);
}
/*
//舊的連線方式
mongoose.connect(dbURI, {
    family: 4, // 這是我們之前加的，強制使用 IPv4
    tls: true, // 確保啟用 TLS/SSL
    tlsAllowInvalidCertificates: true // 👈 這就是繞過憑證檢查的關鍵設定
})
    .then(() => console.log('✅✅✅ 最終成功連接到 MongoDB Atlas!!! ✅✅✅'))
    .catch(err => console.log('❌ MongoDB 連線失敗:', err));
*/
/*// 比較安全的連線方式
mongoose.connect(dbURI, {
    family: 4,              // 強制使用 IPv4
    useNewUrlParser: true,  // 避免舊 parser 警告
    useUnifiedTopology: true // 使用新的 topology 引擎
})
    .then(() => console.log('✅ 成功連接到 MongoDB Atlas!'))
    .catch(err => {
        console.error('❌ MongoDB 連線失敗:', err.message);
        process.exit(1); // 強制結束程式，避免 DB 沒連上還繼續跑
    });
*/
// --- 定義資料結構 (Schema) ---
const commentSchema = new mongoose.Schema({
    author: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

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
     // 👇 確保你的 Schema 中有這一段
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'], // 只能是這三種值之一
        default: 'pending' // 預設值為 'pending'
    },
    likes: { type: Number, default: 0 },
    comments: [commentSchema] // 留言是一個內嵌的陣列
});

// --- 建立資料模型 (Model) ---
const Event = mongoose.model('Event', eventSchema);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Endpoints ---
// GET 取得所有活動
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find({ status: 'approved' }).sort({ startDate: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST 新增一個活動 (安全穩固版)
app.post('/api/events', async (req, res) => {
    // 從 req.body 中，只挑選出我們確定需要的欄位
    const { 
        title, 
        category, 
        location, 
        address, 
        startDate, 
        endDate, 
        organizer, 
        linkUrl, 
        isFree, 
        imageUrl, 
        isRecommended 
    } = req.body;

    // 用挑選過的欄位來建立新的 Event 物件
    const event = new Event({
        title,
        category,
        location,
        address,
        startDate,
        endDate,
        organizer,
        linkUrl,
        isFree,
        imageUrl,
        isRecommended
        // 注意：我們沒有傳入 status，所以 Mongoose 會自動使用 Schema 中的 default 值 'pending'
    });

    try {
        const newEvent = await event.save();
        res.status(201).json(newEvent);
    } catch (err) {
        // 如果 title 或 startDate 等必要欄位缺失，這裡會捕捉到驗證錯誤
        res.status(400).json({ message: err.message });
    }
});

// PUT 按讚一個活動
app.put('/api/events/:id/like', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: '找不到該活動' });

        event.likes++; // 將讚數 +1
        const updatedEvent = await event.save();
        res.json(updatedEvent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST 為一個活動新增留言
app.post('/api/events/:id/comments', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: '找不到該活動' });

        const newComment = {
            author: req.body.author || '匿名使用者', // 簡單起見，先用匿名
            body: req.body.body
        };
        event.comments.push(newComment);
        const updatedEvent = await event.save();
        res.status(201).json(updatedEvent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. API 路由 (所有 /api/... 的路由都放在這裡)

// --- 服務前端靜態檔案 ---
/*const path = require('path'); */
// 告訴 Express 我們的前端檔案放在哪裡
app.use(express.static(path.join(__dirname, '../frontend')));

// 對於所有其他的 GET 請求，都回傳 index.html
// 這確保了使用者在重新整理頁面時不會出錯
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// 6. 啟動伺服器 (app.listen)
app.listen(PORT, () => {
    console.log(`後端伺服器正在 http://localhost:${PORT} 上運行`);
});

// server.js 內補充
// --- Admin 頁面 (審核活動) ---
app.get('/admin/events', async (req, res) => {
    try {
        const events = await Event.find({ status: 'pending' }).sort({ startDate: 1 });
        let html = `<h1>活動審核</h1><ul>`;
        events.forEach(e => {
            html += `
              <li>
                <b>${e.title}</b> (${e.startDate?.toISOString().slice(0,10)}) 
                <a href="/admin/events/${e._id}/approve">✅ 核准</a> 
                <a href="/admin/events/${e._id}/reject">❌ 拒絕</a>
              </li>
            `;
        });
        html += `</ul>`;
        res.send(html);
    } catch (err) {
        res.status(500).send('讀取失敗');
    }
});

// --- 核准/拒絕 ---
app.get('/admin/events/:id/approve', async (req, res) => {
    await Event.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/admin/events');
});

app.get('/admin/events/:id/reject', async (req, res) => {
    await Event.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.redirect('/admin/events');
});
