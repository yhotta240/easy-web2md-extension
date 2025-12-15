/**
 * Get localized message
 * @param key Message key
 * @param substitutions Optional substitution values
 * @returns Localized message
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions);
}

/**
 * Initialize i18n for all elements with data-i18n attribute
 */
export function initializeI18n(): void {
  // Set page language
  document.documentElement.lang = chrome.i18n.getUILanguage();

  // Find all elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const message = getMessage(key);
      if (message) {
        // Check if element has data-i18n-attr to set attribute instead of textContent
        const attr = element.getAttribute('data-i18n-attr');
        if (attr) {
          element.setAttribute(attr, message);
        } else {
          element.textContent = message;
        }
      }
    }
  });

  // Find all elements with data-i18n-html attribute (for innerHTML)
  const htmlElements = document.querySelectorAll('[data-i18n-html]');
  htmlElements.forEach((element) => {
    const key = element.getAttribute('data-i18n-html');
    if (key) {
      const message = getMessage(key);
      if (message) {
        element.innerHTML = message;
      }
    }
  });
}
