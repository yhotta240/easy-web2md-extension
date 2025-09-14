console.log("Easy Web Markdown - Content Script");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get-page-content") {
    // ページの完全なHTMLを返す
    sendResponse({ html: document.documentElement.outerHTML });
  }
  // 非同期でsendResponseを呼び出す場合はtrueを返す必要があります
  return true;
});
