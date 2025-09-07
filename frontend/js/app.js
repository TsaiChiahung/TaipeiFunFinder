// frontend/js/app.js
document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('events-container');

  // 服務生去廚房的 API URL 點餐
  async function fetchEvents() {
    const apiUrl = 'http://localhost:3000/api/events';
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) { throw new Error('網路回應錯誤'); }
      const events = await response.json();
      displayEvents(events); // 拿到菜餚，開始擺盤
    } catch (error) {
      console.error('無法獲取活動資料:', error);
      eventsContainer.innerHTML = '<p>抱歉，載入活動失敗，請稍後再試。</p>';
    }
  }

  // 擺盤的函式
  function displayEvents(events) {
    eventsContainer.innerHTML = ''; // 先清空「載入中」的提示
    events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'event-card';

      const priceTag = event.isFree 
        ? '<span class="tag free">免費</span>'
        : '<span class="tag paid">付費</span>';

      card.innerHTML = `
        <img src="${event.imageUrl}" alt="${event.title}">
        <div class="event-card-content">
          <h2>${event.title}</h2>
          <p><strong>類別:</strong> ${event.category}</p>
          <p><strong>地點:</strong> ${event.location}</p>
          <p><strong>地址:</strong> ${event.address}</p> <p><strong>日期:</strong> ${event.date}</p>    
           <div>${priceTag}</div>
        </div>
      `;
      eventsContainer.appendChild(card);
    });
  }

  fetchEvents(); // 頁面載入後，服務生立刻出發去點餐
});