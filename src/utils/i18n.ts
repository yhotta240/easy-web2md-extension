/**
 * ローカライズされたメッセージを取得します．
 * @param key メッセージのキー
 * @param substitutions 置換値（省略可）
 * @returns ローカライズされたメッセージ
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions);
}

/**
 * `data-i18n` 属性を持つ要素すべてに対して i18n を初期化します．
 */
export function initializeI18n(): void {
  // ページの言語を設定
  document.documentElement.lang = chrome.i18n.getUILanguage();

  // `data-i18n` 属性を持つ要素を取得
  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key) {
      const message = getMessage(key);
      if (message) {
        // `data-i18n-attr` があればテキストではなく指定属性に設定
        const attr = element.getAttribute("data-i18n-attr");
        if (attr) {
          element.setAttribute(attr, message);
        } else {
          element.textContent = message;
        }
      } else {
        console.warn(`Missing i18n message for key: ${key}`);
      }
    }
  });

  // `data-i18n-html` 属性を持つ要素を取得（innerHTML 用）
  // 注: ロケールファイル内の信頼できる内容のみで使用してください
  const htmlElements = document.querySelectorAll("[data-i18n-html]");
  htmlElements.forEach((element) => {
    const key = element.getAttribute("data-i18n-html");
    if (key) {
      const message = getMessage(key);
      if (message) {
        // `<code>` 等の簡単な HTML を含むロケールメッセージのみ innerHTML を使用する
        // `messages.json` は拡張に同梱されているため安全
        element.innerHTML = message;
      } else {
        console.warn(`Missing i18n message for key: ${key}`);
      }
    }
  });
}
