document.addEventListener('DOMContentLoaded', function () {
  const searchBtn = document.getElementById('search-btn');
  const researchBtn = document.getElementById('research-btn');
  const newActionBtn = document.getElementById('gaba-check');
  let isScriptInjected = false;

  async function sendMessageToContentScript(action) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!isScriptInjected) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js']
        });
        isScriptInjected = true;
      } catch (error) {
        console.error('スクリプトのインジェクトにエラー:', error);
      }
    }

    try {
      chrome.tabs.sendMessage(tab.id, { action: action });
    } catch (error) {
      console.error('メッセージの送信にエラー:', error);
      // スクリプトがインジェクトされていない場合、再度インジェクトしてメッセージを送信
      if (!isScriptInjected) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js']
        });
        isScriptInjected = true;
        chrome.tabs.sendMessage(tab.id, { action: action });
      }
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', async function () {
      console.log("検索と出力開始！");
      await sendMessageToContentScript('searchArrayAndOutput');
    });
  }

  if (researchBtn) {
    searchBtn.addEventListener('click', async function () {
      console.log("検索と再出力開始！");
      await sendMessageToContentScript('searchArrayAndOutput2');
    });
  }
  
  if (newActionBtn) {
    newActionBtn.addEventListener('click', async function () {
      await sendMessageToContentScript('GabaCheckStart');
    });
  }

  // ページリロード時にフラグをリセット
  window.addEventListener('beforeunload', () => {
    isScriptInjected = false;
  });
});
