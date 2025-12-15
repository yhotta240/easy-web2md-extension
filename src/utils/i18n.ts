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
      } else {
        console.warn(`Missing i18n message for key: ${key}`);
      }
    }
  });

  // Find all elements with data-i18n-html attribute (for innerHTML)
  // Note: Only use this for trusted content from locale files
  const htmlElements = document.querySelectorAll('[data-i18n-html]');
  htmlElements.forEach((element) => {
    const key = element.getAttribute('data-i18n-html');
    if (key) {
      const message = getMessage(key);
      if (message) {
        // Only use innerHTML for locale messages with simple HTML like <code> tags
        // This is safe because messages.json is part of the extension package
        element.innerHTML = message;
      } else {
        console.warn(`Missing i18n message for key: ${key}`);
      }
    }
  });
}
