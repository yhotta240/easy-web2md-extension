function getPageHtml(minImageSize: number): string {
  const root = document.documentElement;
  if (minImageSize <= 0) return root.outerHTML;

  const copy = root.cloneNode(true) as HTMLElement;
  const copiedImages = copy.querySelectorAll("img");
  root.querySelectorAll("img").forEach((img, index) => {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if ((width > 0 && width < minImageSize) || (height > 0 && height < minImageSize)) {
      copiedImages[index].remove();
    }
  });
  return copy.outerHTML;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "get-page-content") {
    sendResponse({ html: getPageHtml(request.minImageSize ?? 0) });
  }
  // 非同期でsendResponseを呼び出す場合はtrueを返す必要があります
  return true;
});
