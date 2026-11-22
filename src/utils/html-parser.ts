import { DEFAULT_SETTINGS, type ElementExclusions } from "../settings";

export function parseHtmlContent(
  html: string,
  exclusions: ElementExclusions = DEFAULT_SETTINGS,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Markdown変換に不要な要素をセレクタで指定して削除
  const selectorsToRemove = [
    "script",
    "style",
    "noscript",
    "meta",
    "head",
    "button",
    "link",
    "iframe", // 埋め込みコンテンツ
    "svg", // アイコンなど
    '[role="search"]',
    '[aria-hidden="true"]', // スクリーンリーダーから隠されている要素
  ];
  if (exclusions.excludeSiteHeader) {
    selectorsToRemove.push(
      "body header:not(:is(main, article, section, nav, aside, footer) header)",
      '[role="banner"]',
    );
  }
  if (exclusions.excludeNavigation) selectorsToRemove.push("nav", '[role="navigation"]');
  if (exclusions.excludeSidebar) selectorsToRemove.push("aside", '[role="complementary"]');
  if (exclusions.excludeFooter) selectorsToRemove.push("footer");

  // .svg 画像を削除
  doc.querySelectorAll('img[src$=".svg"]').forEach((el) => {
    el.remove();
  });

  doc.querySelectorAll(selectorsToRemove.join(",")).forEach((el) => {
    el.remove();
  });

  doc.querySelectorAll("a").forEach((anchor) => {
    if (!anchor.textContent?.trim()) return;

    anchor.querySelectorAll("img").forEach((img) => {
      if (!img.getAttribute("alt")?.trim()) {
        img.remove();
      }
    });
  });

  if (!doc.body) {
    return "";
  }
  return doc.body.innerHTML;
}
