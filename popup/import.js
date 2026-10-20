// Firefoxは browser.*、Chrome系は chrome.* を使う（どちらもPromiseを返す）
const ext = globalThis.browser ?? globalThis.chrome;

const fileInput = document.getElementById("import-file");
const statusElement = document.getElementById("import-status");

function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = "status " + type;
}

fileInput.addEventListener("change", async function () {
  const file = fileInput.files[0];
  if (!file) return;

  let importData;
  try {
    importData = JSON.parse(await file.text());
  } catch (error) {
    showStatus("ファイルを読み込めませんでした。エクスポートしたファイルを選んでください。", "error");
    return;
  }

  // 「移行データエクスポート」で書き出したファイルかを確認
  if (
    !importData ||
    importData.app !== "shinobigami-autofill" ||
    typeof importData.data !== "object" ||
    importData.data === null ||
    Array.isArray(importData.data)
  ) {
    showStatus("この拡張機能の移行データではないようです。", "error");
    return;
  }

  // 効果(文字列)だけを読み込む
  const entries = Object.entries(importData.data).filter(
    ([key, value]) => typeof key === "string" && key !== "" && typeof value === "string"
  );
  if (entries.length === 0) {
    showStatus("読み込めるデータがありませんでした。", "error");
    return;
  }

  try {
    const current = await ext.storage.local.get(null);
    const overwriteCount = entries.filter(([key]) => key in current).length;
    await ext.storage.local.set(Object.fromEntries(entries));
    showStatus(
      `${entries.length}件を読み込みました（うち上書き${overwriteCount}件）。このタブは閉じて大丈夫です。`,
      "ok"
    );
  } catch (error) {
    console.error("インポートにエラー:", error);
    showStatus("保存に失敗しました。", "error");
  } finally {
    fileInput.value = "";
  }
});
