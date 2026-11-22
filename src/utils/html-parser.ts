import { DEFAULT_SETTINGS, type ElementExclusions } from "../settings";

function isLinkOnlyBlock(block: Element, minLinkCount: number): boolean {
  if (block.querySelectorAll("a[href]").length < minLinkCount) return false;
  if (block.querySelector("img, picture, h1, h2, h3, h4, h5, h6, pre, code, table, blockquote")) {
    return false;
  }

  const textNodes = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let text = textNodes.nextNode();
  while (text) {
    if (
      !text.parentElement?.closest("a[href]") &&
      /[^\s|｜・·•,、/／]/u.test(text.textContent ?? "")
    ) {
      return false;
    }
    text = textNodes.nextNode();
  }
  return true;
}

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

  if (exclusions.excludeLinkBlocks) {
    doc.querySelectorAll("p, ul, ol, div:has(> a[href], > span > a[href])").forEach((block) => {
      if (block.isConnected && isLinkOnlyBlock(block, exclusions.minLinkCount)) block.remove();
    });
  }

  if (!doc.body) {
    return "";
  }
  return doc.body.innerHTML;
}
