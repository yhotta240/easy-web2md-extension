import { getMessage } from "../utils/i18n";
import { logInfo } from "../utils/logger";

console.log("background script");

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    logInfo(getMessage("extensionInstalled"), "background");
  } else if (details.reason === "update") {
    const prev = details.previousVersion ?? "?";
    const cur = chrome.runtime.getManifest().version;
    logInfo(getMessage("extensionUpdated", [prev, cur]), "background");
  }
});
