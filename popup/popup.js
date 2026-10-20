// Firefoxは browser.*、Chrome系は chrome.* を使う（どちらもPromiseを返す）
const ext = globalThis.browser ?? globalThis.chrome;

document.addEventListener("DOMContentLoaded", function () {
  const searchBtn = document.getElementById("search-btn");
  const newActionBtn = document.getElementById("gaba-check");

  async function injectContentScript(tabId) {
    // content.js側で二重実行を防いでいるので、何度注入しても問題ない
    await ext.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content-scripts/content.js"],
    });
  }

  async function sendMessageToContentScript(action) {
    const [tab] = await ext.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) return;

    try {
      await injectContentScript(tab.id);
    } catch (error) {
      console.error("スクリプトのインジェクトにエラー:", error);
      return;
    }

    try {
      await ext.tabs.sendMessage(tab.id, { action: action });
    } catch (error) {
      // content.jsは返信しないため、Chromeでは「返信なし」のエラーになることがある
      console.warn("メッセージ送信の結果:", error);
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", async function () {
      console.log("検索と出力開始！");
      await sendMessageToContentScript("searchArrayAndOutput");
    });
  }

  if (newActionBtn) {
    newActionBtn.addEventListener("click", async function () {
      await sendMessageToContentScript("GabaCheckStart");
    });
  }
});
