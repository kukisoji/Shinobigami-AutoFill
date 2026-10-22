// Firefoxは browser.*、Chrome系は chrome.* を使う（どちらもPromiseを返す）
const ext = globalThis.browser ?? globalThis.chrome;

// Android版Firefoxではポップアップが1画面のページとして開くので、スマホ向けの大きい表示にする
if (/Android/i.test(navigator.userAgent)) {
  document.documentElement.classList.add("mobile");
}

document.addEventListener("DOMContentLoaded", function () {
  const searchBtn = document.getElementById("search-btn");
  const newActionBtn = document.getElementById("gaba-check");

  async function injectContentScript(tabId) {
    // content.js側で二重実行を防いでいるので、何度注入しても問題ない
    // 先頭の「/」が無いと、Firefoxはpopup/からの相対パスとして探してしまう
    await ext.scripting.executeScript({
      target: { tabId: tabId },
      files: ["/content-scripts/content.js"],
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
      // 対象ページでは自動で読み込まれているので、失敗してもメッセージは送ってみる
      console.error("スクリプトのインジェクトにエラー:", error);
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

  // 移行データ(このブラウザに保存した忍法・背景の効果)のエクスポート
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const transferStatus = document.getElementById("transfer-status");

  if (exportBtn) {
    exportBtn.addEventListener("click", async function () {
      try {
        const data = await ext.storage.local.get(null);
        const count = Object.keys(data).length;
        if (count === 0) {
          transferStatus.textContent = "保存されたデータがありません";
          return;
        }
        const exportData = {
          app: "shinobigami-autofill",
          formatVersion: 1,
          exportedAt: new Date().toISOString(),
          data: data,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const today = new Date();
        const ymd =
          today.getFullYear() +
          String(today.getMonth() + 1).padStart(2, "0") +
          String(today.getDate()).padStart(2, "0");
        const link = document.createElement("a");
        link.href = url;
        link.download = `shinobigami-autofill-data-${ymd}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        transferStatus.textContent = `${count}件を書き出しました`;
      } catch (error) {
        console.error("エクスポートにエラー:", error);
        transferStatus.textContent = "書き出しに失敗しました";
      }
    });
  }

  // インポートはタブで開いたページで行う
  // (Firefoxではポップアップでファイル選択を開くとポップアップが閉じてしまうため)
  if (importBtn) {
    importBtn.addEventListener("click", async function () {
      await ext.tabs.create({ url: ext.runtime.getURL("/popup/import.html") });
      window.close();
    });
  }
});
