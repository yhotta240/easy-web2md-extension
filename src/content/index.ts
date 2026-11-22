function getDisplayedImageSize(img: HTMLImageElement): { width: number; height: number } {
  const style = getComputedStyle(img);
  const width = style.width.endsWith("px") ? Number.parseFloat(style.width) : img.width;
  const height = style.height.endsWith("px") ? Number.parseFloat(style.height) : img.height;
  return { width: width || img.naturalWidth, height: height || img.naturalHeight };
}

function getPageHtml(minImageSize: number, preferDisplayedImageSize: boolean): string {
  const root = document.documentElement;
  if (minImageSize <= 0) return root.outerHTML;

  const copy = root.cloneNode(true) as HTMLElement;
  const copiedImages = copy.querySelectorAll("img");
  root.querySelectorAll("img").forEach((img, index) => {
    const { width, height } = preferDisplayedImageSize
      ? getDisplayedImageSize(img)
      : { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
    if ((width > 0 && width < minImageSize) || (height > 0 && height < minImageSize)) {
      copiedImages[index].remove();
    }
  });
  return copy.outerHTML;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "get-page-content") {
    sendResponse({
      html: getPageHtml(request.minImageSize ?? 0, request.preferDisplayedImageSize === true),
    });
  }
  // 非同期でsendResponseを呼び出す場合はtrueを返す必要があります
  return true;
});
