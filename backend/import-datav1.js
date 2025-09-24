// backend/import-data.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// =================================================================
//  👇 請在這裡貼上你 server.js 中那串「已知可以成功連線」的 dbURI
//  請確保使用者名稱、密碼、Cluster 位址都是最新的、正確的版本。
// =================================================================
const dbURI = 'mongodb+srv://tsaichicloud:txfun2025@taipeifunfinder.been3vd.mongodb.net/TaipeiFunFinderDB?retryWrites=true&w=majority&appName=TaipeiFunFinder';


// 再次定義 Event 的資料結構 (Schema)，確保和 server.js 一致
// 這樣可以讓這個腳本獨立運行，不依賴 server.js
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
    // 加上 status 欄位，讓匯入的資料有預設狀態
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    likes: { type: Number, default: 0 },
    comments: [{ author: String, body: String, date: Date }]
});

const Event = mongoose.model('Event', eventSchema);

// 讀取本地的 db.json 檔案
// path.join(__dirname, 'db.json') 確保無論在哪裡執行腳本，都能正確找到檔案
const eventsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf-8'));


// backend/import-data.js (優化後版本)

// ... (mongoose, fs, path, dbURI, eventSchema, Event model 的定義都一樣) ...


// 主要執行函式
const importData = async () => {
    const connectionOptions = {
        family: 4,
        tls: true,
        tlsAllowInvalidCertificates: true
    };

    try {
        await mongoose.connect(dbURI, connectionOptions);
        console.log('✅ 成功連接到 MongoDB Atlas...');

        await Event.deleteMany({});
        console.log('🧹 舊有 events 資料已清除...');
        
        // 👇 將讀取檔案的邏輯，統一放到 try 區塊內
        console.log('📖 正在讀取 db.json...');
        const eventsPath = path.join(__dirname, 'db.json');
        const eventsToImport = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
        
        // 使用剛剛讀取到的資料
        await Event.insertMany(eventsToImport);
        console.log('🚚 新資料已成功匯入！');

    } catch (error) {
        console.error('❌ 匯入過程中發生錯誤:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 資料庫連線已關閉。');
    }
};

// --- 執行 ---
importData();

// --- 執行 ---
importData();