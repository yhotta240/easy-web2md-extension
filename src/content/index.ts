function getDisplayedImageSize(img: HTMLImageElement) {
  const style = getComputedStyle(img);
  return {
    width: style.width.endsWith("px")
      ? Number.parseFloat(style.width)
      : img.width || img.naturalWidth || undefined,
    height: style.height.endsWith("px")
      ? Number.parseFloat(style.height)
      : img.height || img.naturalHeight || undefined,
  };
}

function getPageHtml(minImageSize: number, preferDisplayedImageSize: boolean): string {
  const root = document.documentElement;
  if (minImageSize <= 0) return root.outerHTML;

  const copy = root.cloneNode(true) as HTMLElement;
  const copiedImages = copy.querySelectorAll("img");
  root.querySelectorAll("img").forEach((img, index) => {
    const { width, height } = preferDisplayedImageSize
      ? getDisplayedImageSize(img)
      : {
          width: img.naturalWidth || img.width || undefined,
          height: img.naturalHeight || img.height || undefined,
        };
    if (
      (width !== undefined && width < minImageSize) ||
      (height !== undefined && height < minImageSize)
    ) {
      copiedImages[index].remove();
    }
  });
  return copy.outerHTML;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "get-page-content") {
    sendResponse({
      html: getPageHtml(request.minImageSize ?? 0, request.preferDisplayedImageSize === true),
      baseUrl: document.baseURI,
    });
  }
  // 非同期でsendResponseを呼び出す場合はtrueを返す必要があります
  return true;
});
