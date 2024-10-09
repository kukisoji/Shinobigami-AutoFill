document.addEventListener('DOMContentLoaded', function () {
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', async function () {
      console.log("作業開始ぃ！");

      // アクティブなタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // コンテントスクリプトをアクティブなタブにインジェクト
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js']
        });
      } catch (error) {
        console.error('スクリプトのインジェクトにエラー:', error);
      }

      // コンテントスクリプトにメッセージを送信
      try {
        chrome.tabs.sendMessage(tab.id, { action: 'searchArrayAndOutput' });
      } catch (error) {
        console.error('メッセージの送信にエラー:', error);
        // エラーを処理する、例えばスクリプトをインジェクトして再試行する
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js']
        });
        chrome.tabs.sendMessage(tab.id, { action: 'searchArrayAndOutput' });
      }
    });
  }
});