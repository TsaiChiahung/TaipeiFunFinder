// frontend/js/app.js (最終版：處理日期範圍)
document.addEventListener('DOMContentLoaded', () => {
    // 取得所有需要的 HTML 元素
    const recommendedContainer = document.getElementById('recommended-container');
    const ongoingContainer = document.getElementById('ongoing-container');
    const otherEventsContainer = document.getElementById('other-events-container');
    const searchInput = document.getElementById('search-input');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    let allEvents = [];

    // 核心篩選函式：處理日期範圍的重疊
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        // 取得使用者選擇的日期範圍
        const filterStartDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const filterEndDate = endDateInput.value ? new Date(endDateInput.value) : null;
        if(filterStartDate) filterStartDate.setHours(0,0,0,0);
        if(filterEndDate) filterEndDate.setHours(0,0,0,0);

        const filteredEvents = allEvents.filter(event => {
            // 文字篩選 (不變)
            const matchesSearch = 
                event.title.toLowerCase().includes(searchTerm) || 
                event.location.toLowerCase().includes(searchTerm) ||
                event.organizer.toLowerCase().includes(searchTerm) ||
                event.category.toLowerCase().includes(searchTerm);

            // **新的日期範圍重疊篩選邏輯**
            const eventStartDate = new Date(event.startDate);
            const eventEndDate = new Date(event.endDate);
            eventStartDate.setHours(0,0,0,0);
            eventEndDate.setHours(0,0,0,0);
            
            let matchesDate = true; // 預設為 true
            // 檢查日期範圍是否有重疊
            if (filterStartDate && filterEndDate) {
                // 邏輯：活動的結束不能早於篩選的開始，且活動的開始不能晚於篩選的結束
                matchesDate = eventEndDate >= filterStartDate && eventStartDate <= filterEndDate;
            } else if (filterStartDate) {
                matchesDate = eventEndDate >= filterStartDate;
            } else if (filterEndDate) {
                matchesDate = eventStartDate <= filterEndDate;
            }

            return matchesSearch && matchesDate;
        });
        renderEvents(filteredEvents);
    }

    // 渲染主函式：處理推薦、長期、短期三種分類
    function renderEvents(events) {
        recommendedContainer.innerHTML = '';
        ongoingContainer.innerHTML = '';
        otherEventsContainer.innerHTML = '';

        // 策展邏輯：分出「推薦」活動
        // ** 新的、更有彈性的推薦邏輯 **
           const recommendedEvents = events.filter(event => event.isRecommended);
           const nonRecommendedEvents = events.filter(event => !event.isRecommended);

        recommendedEvents.forEach(event => recommendedContainer.appendChild(createEventCard(event)));
        if (recommendedEvents.length === 0) recommendedContainer.innerHTML = '<p>暫無推薦活動。</p>';

        // **新的策展邏輯：從非推薦活動中，再分出「長期」與「短期」**
        const ONGOING_THRESHOLD_DAYS = 3; // 定義超過3天的活動為「長期」
        
        const ongoingEvents = nonRecommendedEvents.filter(event => {
            const duration = (new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24);
            return duration >= ONGOING_THRESHOLD_DAYS;
        });

        const shortTermEvents = nonRecommendedEvents.filter(event => {
            const duration = (new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24);
            return duration < ONGOING_THRESHOLD_DAYS;
        });

        ongoingEvents.forEach(event => ongoingContainer.appendChild(createEventCard(event)));
        if (ongoingEvents.length === 0) ongoingContainer.innerHTML = '<p>暫無長期活動。</p>';

        // 對「短期」活動進行日期分組 (沿用之前的邏輯)
        renderShortTermGroups(shortTermEvents);
    }

   // 專門渲染短期活動分組的函式
    function renderShortTermGroups(shortTermEvents) {
        // 1. 定義時間邊界 (使用真實的當前日期)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 將時間設為當天的零點，方便比較

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // 本週末：從今天開始到本週日 (如果今天就是週日，則指下個週日)
        const endOfThisWeek = new Date(today);
        endOfThisWeek.setDate(today.getDate() + (7 - today.getDay()) % 7);
        // 如果今天是週六或週日，本週末會包含今天。
        // 如果今天是週日 (getDay() = 0)，(7 - 0) % 7 = 0，所以 endOfThisWeek 還是今天。
        // 我們讓它至少包含到下週日。
        if (today.getDay() === 0) { // 如果今天是星期天
             // endOfThisWeek 已經設定為今天，那麼接下來的判斷會正確
        } else {
             endOfThisWeek.setDate(today.getDate() + (7 - today.getDay()));
        }
        endOfThisWeek.setHours(0, 0, 0, 0);


        // 下週活動：從下週一到下下週日
        const startOfNextWeek = new Date(endOfThisWeek);
        startOfNextWeek.setDate(endOfThisWeek.getDate() + 1); // 下週一
        startOfNextWeek.setHours(0, 0, 0, 0);

        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // 下週日
        endOfNextWeek.setHours(0, 0, 0, 0);
        
        // 2. 建立不同時間區間的「桶子」
        const groups = {
            today: [],
            tomorrow: [],
            thisWeekend: [],
            nextWeek: [],
            future: []
        };

        // 3. 將「短期」活動放入對應的桶子
        shortTermEvents.forEach(event => {
            const eventDate = new Date(event.startDate); // 我們用 startDate 來判斷短期活動的歸屬
            eventDate.setHours(0, 0, 0, 0); // 標準化時間

            if (eventDate.getTime() === today.getTime()) {
                groups.today.push(event);
            } else if (eventDate.getTime() === tomorrow.getTime()) {
                groups.tomorrow.push(event);
            } else if (eventDate >= today && eventDate <= endOfThisWeek) {
                 // 這個判斷條件包含了週六和週日。
                 // 如果今天是週五，它會包含週五、週六、週日。
                 // 如果今天是週六，它會包含週六、週日。
                 // 如果今天是週日，它只會包含今天。
                if (eventDate.getDay() === 0 || eventDate.getDay() === 6) { // 只將週六、週日歸入本週末
                    if (eventDate.getTime() !== today.getTime() && eventDate.getTime() !== tomorrow.getTime()) { // 避免與今天/明天重複
                       groups.thisWeekend.push(event);
                    }
                }
            } else if (eventDate >= startOfNextWeek && eventDate <= endOfNextWeek) {
                groups.nextWeek.push(event);
            } else if (eventDate > endOfNextWeek) {
                groups.future.push(event);
            }
        });

        // 👇 在這裡加上排序的程式碼
          // 使用 sort() 方法，根據 startDate 來排序「未來活動」桶子裡的內容
          groups.future.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        // 4. 根據桶子裡的內容，動態產生 HTML
        const groupOrder = [
            { title: '今天', events: groups.today },
            { title: '明天', events: groups.tomorrow },
            { title: '本週末', events: groups.thisWeekend },
            { title: '下週活動', events: groups.nextWeek },
            { title: '未來活動', events: groups.future }
        ];

        let hasOtherEvents = false;
        groupOrder.forEach(group => {
            if (group.events.length > 0) {
                hasOtherEvents = true;
                const titleElement = document.createElement('h2');
                titleElement.className = 'category-title';
                titleElement.textContent = group.title;
                otherEventsContainer.appendChild(titleElement);

                const gridContainer = document.createElement('div');
                gridContainer.className = 'events-grid other-grid';
                group.events.forEach(event => {
                    gridContainer.appendChild(createEventCard(event));
                });
                otherEventsContainer.appendChild(gridContainer);
            }
        });

        if (!hasOtherEvents && shortTermEvents.length > 0) { // 如果 filteredEvents 為空，則顯示無活動
             otherEventsContainer.innerHTML = '<p>暫無其他符合條件的短期活動。</p>';
        } else if (shortTermEvents.length === 0 && ongoingContainer.children.length === 0 && recommendedContainer.children.length === 0) {
            // 如果所有活動區塊都沒內容，才顯示整體無活動
            otherEventsContainer.innerHTML = '<p>目前沒有任何活動。</p>';
        }
    }
   // 輔助函式：建立卡片 (升級版，加入按讚按鈕)
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    // ... (原本的日期、價格標籤邏輯不變)
    let dateDisplay = '';
    if (event.startDate === event.endDate) {
        dateDisplay = `<p><strong>日期:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>`;
    } else {
        dateDisplay = `<p><strong>展期:</strong> ${new Date(event.startDate).toLocaleDateString()} ~ ${new Date(event.endDate).toLocaleDateString()}</p>`;
    }
    const priceTag = event.isFree ? '<span class="tag free">免費</span>' : '<span class="tag paid">付費</span>';
    
    card.innerHTML = `
        <a href="${event.linkUrl}" target="_blank" rel="noopener noreferrer" class="card-link">
            <img src="${event.imageUrl}" alt="${event.title}">
            <div class="card-content">
                <h2>${event.title}</h2>
                ${dateDisplay}
                <p><strong>類別:</strong> ${event.category}</p>
                <p><strong>地點:</strong> ${event.location}</p>
                <p><strong>主辦:</strong> ${event.organizer}</p>
                <div class="tags-container">${priceTag}</div>
            </div>
        </a>
        <div class="card-footer">
            <button class="like-btn" data-id="${event._id}">
                ❤️ <span class="like-count">${event.likes || 0}</span>
            </button>
            <button class="comment-btn" data-id="${event._id}">
                💬 留言
            </button>
        </div>
    `;
    return card;
}
    

    // 獲取活動資料的函式 (不變)
    async function fetchEvents() {
        const apiUrl = 'http://localhost:3000/api/events';
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) { throw new Error('網路回應錯誤'); }
            const events = await response.json();
            allEvents = events;
            renderEvents(allEvents);

        } catch (error) {
            console.error('無法獲取活動資料:', error);
        }
    }

    // 監聽所有篩選器的變動 (不變)
   document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById('comment-modal');
  const closeModalBtn = document.querySelector('.modal-close-btn');

  if (modal && closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  } else {
    console.warn("Modal 或 close 按鈕沒找到");
  }
});
    startDateInput.addEventListener('change', applyFilters);
    endDateInput.addEventListener('change', applyFilters);

    // 程式進入點
    fetchEvents();
// ==========================================================
// --- 留言功能相關程式碼 (請貼上這整段) ---
// ==========================================================

const modal = document.getElementById('comment-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.querySelector('.modal-close-btn');

// 函式：開啟留言視窗並填入內容
function openCommentModal(event) {
    modalBody.innerHTML = `
        <h3>${event.title} 的留言</h3>
        <hr>
        <div class="comments-list">
            ${event.comments && event.comments.length > 0 ? event.comments.map(comment => `
                <div class="comment-item">
                    <p><strong>${comment.author || '匿名'}：</strong>${comment.body}</p>
                    <small>${new Date(comment.date).toLocaleString()}</small>
                </div>
            `).join('') : '<p>還沒有任何留言。</p>'}
        </div>
        <hr>
        <form id="comment-form" data-id="${event._id}">
            <textarea name="comment" placeholder="在這裡輸入你的留言..." required></textarea>
            <button type="submit">送出留言</button>
        </form>
    `;
    modal.style.display = 'flex';
}

// 函式：關閉留言視窗
function closeCommentModal() {
    modal.style.display = 'none';
}

// 監聽 Modal 關閉按鈕
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeCommentModal);
}
// 監聽 Modal 背景點擊
modal.addEventListener('click', (e) => {
    if (e.target === modal) { // 如果點擊的是半透明背景本身
        closeCommentModal();
    }
});

// 監聽 Modal 內表單的提交事件
modal.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (e.target.id === 'comment-form') {
        const form = e.target;
        const eventId = form.dataset.id;
        const commentText = form.comment.value.trim();

        if (!commentText) return;

        try {
            const response = await fetch(`http://localhost:3000/api/events/${eventId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: commentText })
            });

            if (!response.ok) throw new Error('留言失敗');

            const updatedEvent = await response.json();
            
            const eventIndex = allEvents.findIndex(event => event._id === eventId);
            if(eventIndex !== -1) {
                allEvents[eventIndex] = updatedEvent;
            }

            openCommentModal(updatedEvent);

        } catch (error) {
            console.error('提交留言時發生錯誤:', error);
            alert(error.message);
        }
    }
});

// --- 留言功能相關程式碼結束 ---
// 使用事件委派來處理所有按讚按鈕的點擊事件
// 使用事件委派來處理所有按讚和留言按鈕的點擊事件 (偵錯版本)
document.querySelector('main').addEventListener('click', async (e) => {
    // --- 檢查點 1 ---
    console.log("🖱️ Main 區塊被點擊了！");

    // --- 檢查按讚按鈕 ---
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
        e.preventDefault();
        const eventId = likeBtn.dataset.id;
        try {
            const response = await fetch(`http://localhost:3000/api/events/${eventId}/like`, { method: 'PUT' });
            if (!response.ok) { throw new Error('按讚失敗'); }
            const updatedEvent = await response.json();
            const likeCountSpan = likeBtn.querySelector('.like-count');
            likeCountSpan.textContent = updatedEvent.likes;
        } catch (error) {
            console.error('按讚時發生錯誤:', error);
        }
        return; // 按讚邏輯處理完畢，結束
    }

    // --- 檢查留言按鈕 ---
    const commentBtn = e.target.closest('.comment-btn');
    if (commentBtn) {
        // --- 檢查點 2 ---
        console.log("💬 留言按鈕被辨識到了！");
        e.preventDefault();
        const eventId = commentBtn.dataset.id;
        
        // --- 檢查點 3 ---
        console.log("從按鈕上讀取到的 Event ID 是:", eventId);

        const eventData = allEvents.find(event => event._id === eventId);
        
        // --- 檢查點 4 ---
        console.log("在 allEvents 陣列中尋找對應的資料:", eventData);

        if (eventData) {
            // --- 檢查點 5 ---
            console.log("🚀 準備為活動開啟 Modal:", eventData.title);
            openCommentModal(eventData);
        } else {
            console.error("❌ 錯誤：無法在 allEvents 陣列中找到 ID 為 " + eventId + " 的活動資料。");
        }
    }
});

});
