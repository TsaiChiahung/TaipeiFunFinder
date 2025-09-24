// /frontend/public/js/add-event.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-event-form');
    const imageUrlInput = document.getElementById('imageUrl');
    const imagePreview = document.getElementById('image-preview');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // 防止表單直接提交導致頁面刷新

            // 收集表單資料
            const formData = new FormData(form);
            const eventData = {};
            formData.forEach((value, key) => {
                eventData[key] = value;
            });
            
            // 處理 checkbox 的值 (直接用 checked 屬性判斷)
            eventData.isFree = document.getElementById('isFree').checked;

            // 如果結束日期為空，則設為與開始日期相同
            if (!eventData.endDate) {
                eventData.endDate = eventData.startDate;
            }

            try {
                // 發送 POST 請求到後端 API
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(eventData),
                });

                if (response.ok) {
                    alert('活動新增成功！');
                    window.location.href = '/'; // 成功後跳轉回首頁
                } else {
                    const errorData = await response.json();
                    alert(`新增失敗：${errorData.message || '未知錯誤'}`);
                }
            } catch (error) {
                console.error('提交時發生錯誤:', error);
                alert('提交時發生網路錯誤，請稍後再試。');
            }
        });
    }

    // 圖片預覽功能
    if (imageUrlInput && imagePreview) {
        imageUrlInput.addEventListener('input', () => {
            const url = imageUrlInput.value;
            if (url) {
                imagePreview.src = url;
                imagePreview.style.display = 'block';
            } else {
                imagePreview.style.display = 'none';
            }
        });
    }
});