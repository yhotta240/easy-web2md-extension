export function parseHtmlContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Markdown変換に不要な要素をセレクタで指定して削除
  const selectorsToRemove = [
    "script",
    "style",
    "noscript",
    "meta",
    "head",
    "link",
    "iframe", // 埋め込みコンテンツ
    "svg", // アイコンなど
    "nav", // ナビゲーションメニュー
    "aside", // サイドバー
    "footer", // フッター
    '[role="banner"]',
    '[role="navigation"]',
    '[role="search"]',
    '[role="complementary"]',
    '[aria-hidden="true"]', // スクリーンリーダーから隠されている要素
  ];

  // .svg 画像を削除
  doc.querySelectorAll('img[src$=".svg"]').forEach((el) => {
    el.remove();
  });

  doc.querySelectorAll(selectorsToRemove.join(",")).forEach((el) => {
    el.remove();
  });
  if (!doc.body) {
    return "";
  }
  return doc.body.innerHTML;
}
