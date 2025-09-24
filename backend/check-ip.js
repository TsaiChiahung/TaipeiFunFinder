// check-ip.js
const https = require('https');
const http = require('http');

function getPublicIPv4() {
    return new Promise((resolve, reject) => {
        // 先用 HTTPS 嘗試
        const options = { rejectUnauthorized: true }; // 預設驗證 SSL

        https.get('https://ifconfig.me/ip', options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const ip = data.trim();
                if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
                    resolve(ip);
                } else {
                    reject(new Error('無法取得有效 IPv4，內容: ' + ip));
                }
            });
        }).on('error', (err) => {
            console.warn('⚠️ HTTPS 失敗，可能是 SSL 憑證問題，嘗試 HTTP...', err.message);
            
            // 自動 fallback 到 HTTP
            http.get('http://ifconfig.me/ip', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const ip = data.trim();
                    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
                        resolve(ip);
                    } else {
                        reject(new Error('HTTP fallback 仍無法取得有效 IPv4，內容: ' + ip));
                    }
                });
            }).on('error', (err2) => {
                reject(new Error('HTTP fallback 也失敗: ' + err2.message));
            });
        });
    });
}

(async () => {
    console.log('🔎 正在偵測本機外網 IPv4...');
    try {
        const ipv4 = await getPublicIPv4();
        console.log(`✅ 你的外網 IPv4 是: ${ipv4}`);
        console.log('\n請將此 IP 加入 MongoDB Atlas 白名單：');
        console.log(`https://cloud.mongodb.com → Project → Cluster → Network Access → Add IP Address → ${ipv4}`);
        console.log('\n如果你希望臨時允許任何 IP，可以輸入 0.0.0.0/0（測試用，安全性低）');
    } catch (err) {
        console.error('❌ 無法偵測 IPv4:', err.message);
        console.log('建議你手動使用 curl 或瀏覽器查看你的外網 IPv4');
    }
})();
