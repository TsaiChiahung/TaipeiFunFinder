#!/bin/bash
# start-dev.sh
# 一鍵啟動 MongoDB + 測試連線 + 啟動 Node.js 伺服器

echo "🚀 啟動 Docker MongoDB 容器..."
docker compose up -d

# 等待 MongoDB 啟動
echo "⏳ 等待 5 秒讓 MongoDB 容器啟動..."
sleep 5

# 測試 MongoDB 連線
echo "🔗 測試 MongoDB 連線..."
node backend/debug-mongo.js
if [ $? -ne 0 ]; then
  echo "❌ MongoDB 連線失敗，請檢查容器或帳密設定"
  exit 1
fi

# 啟動 Node.js 伺服器
echo "🚀 啟動 Node.js 伺服器..."
cd backend
node server.js

