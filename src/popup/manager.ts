import meta from "../../public/manifest.meta.json";
import { DEFAULT_SETTINGS, type ElementExclusions, type Settings } from "../settings";
import { downloadFile } from "../utils/file-downloader";
import { parseHtmlContent } from "../utils/html-parser";
import { getMessage, initializeI18n } from "../utils/i18n";
import {
  addLog,
  clearLogs,
  getLogs,
  LOG_STORAGE_KEY,
  type LogEntry,
  type LogLevel,
} from "../utils/logger";
import { toMarkdown } from "../utils/markdown-converter";
import { getSettings, setSettings } from "../utils/storage";
import { getActiveTabUrl } from "../utils/tab";
import { setupDocumentTab } from "./components/document";
import { setupInfoTab } from "./components/info";
import { setupMoreMenu } from "./components/menu";
import { PopupPanel } from "./components/panel";
import { renderPreviewResult, updatePreviewFilename } from "./components/preview";
import { initShareMenu } from "./components/share";
import { applyTheme, setupThemeMenu } from "./components/theme";
import { setupVersionTab } from "./components/version";
import type { ManifestMetadata, SharePlatform, Theme } from "./types";

export class PopupManager {
  private panel: PopupPanel;
  private settings: Settings = DEFAULT_SETTINGS;
  private manifestData: chrome.runtime.Manifest;
  private manifestMetadata: ManifestMetadata;
  private fileNameInput: HTMLInputElement | null;
  private saveFilenameCheckbox: HTMLInputElement | null;
  private url: URL | null = null;
  private conversionId = 0;

  constructor() {
    this.panel = new PopupPanel();
    this.manifestData = chrome.runtime.getManifest();
    this.manifestMetadata = meta || {};
    this.fileNameInput = document.getElementById("filename-input") as HTMLInputElement | null;
    this.saveFilenameCheckbox = document.getElementById(
      "filename-checkbox",
    ) as HTMLInputElement | null;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.panel.setClearCallback(async () => {
      await clearLogs();
    });

    try {
      const logs = await getLogs();
      if (logs.length > 0) {
        this.panel.loadLogs(logs, this.manifestMetadata.issues_url);
      }
      this.watchStorageLogs();
    } catch (err) {
      console.error(getMessage("errorLoadLogs"), err);
      this.watchStorageLogs();
    }

    try {
      this.settings = await getSettings();
      if (this.saveFilenameCheckbox) {
        this.saveFilenameCheckbox.checked = !!this.settings.saveFilename;
      }
      if (this.settings.saveFilename && this.fileNameInput && this.settings.fileName) {
        this.fileNameInput.value = this.settings.fileName;
      }
    } catch {
      await this.showLog(getMessage("errorLoadSettings"), "error");
    }

    initializeI18n();
    this.addEventListeners();
    this.setupUI();
    this.setupDownloadTab();
  }

  private watchStorageLogs(): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[LOG_STORAGE_KEY]) {
        const rawEntries = changes[LOG_STORAGE_KEY]?.newValue;
        const entries: LogEntry[] = Array.isArray(rawEntries) ? rawEntries : [];
        this.panel.loadLogs(entries, this.manifestMetadata.issues_url);
      }
    });
  }

  private addEventListeners(): void {
    // テーマ設定のイベントリスナー
    setupThemeMenu(async (value: Theme) => {
      try {
        applyTheme(value);
        await this.showLog(getMessage("themeChanged", value));
      } catch {
        await this.showLog(getMessage("errorSaveTheme"), "error");
      }
    });

    // シェアメニューの初期化
    initShareMenu(async (platform: SharePlatform, success: boolean) => {
      const platformNames: Record<SharePlatform, string> = {
        twitter: getMessage("platformTwitter"),
        facebook: getMessage("platformFacebook"),
        copy: getMessage("platformClipboard"),
      };
      if (success) {
        if (platform === "copy") {
          await this.showLog(getMessage("shareCopied"));
        } else {
          await this.showLog(getMessage("shareCompleted", platformNames[platform]));
        }
      } else {
        await this.showLog(getMessage("shareFailed"), "error");
      }
    });

    this.fileNameInput?.addEventListener("input", (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.settings.fileName = target.value;
      updatePreviewFilename(target.value);
      setSettings(this.settings);
    });

    this.saveFilenameCheckbox?.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.settings.saveFilename = target.checked;
      if (target.checked) {
        // 現在のファイル名を保存する
        this.settings.fileName = (this.fileNameInput as HTMLInputElement).value || "";
      } else {
        this.settings.fileName = "";
      }
      setSettings(this.settings);
    });
  }

  // ダウンロードタブの作成
  private async setupDownloadTab(): Promise<void> {
    const siteUrlInput = document.getElementById("site-url-input") as HTMLInputElement;
    const siteUrlButton = document.getElementById("site-url-button") as HTMLButtonElement;
    const minImageSizeInput = document.getElementById("min-image-size") as HTMLInputElement;
    const minLinkCountInput = document.getElementById("min-link-count") as HTMLInputElement;
    const useFullUrlsInput = document.getElementById("use-full-urls") as HTMLInputElement;
    const preferDisplayedSizeInput = document.getElementById(
      "prefer-displayed-image-size",
    ) as HTMLInputElement;

    const applyConversionSettings = (changes: Partial<Settings>) => {
      this.settings = { ...this.settings, ...changes };
      void setSettings(this.settings).catch(() =>
        this.showLog(getMessage("errorSaveConversionSettings"), "error"),
      );
      document
        .querySelectorAll<HTMLButtonElement>("#copy-md-button, #download-md-button")
        .forEach((button) => {
          button.disabled = true;
        });
      void this.handleConversion().catch(() => this.showLog(getMessage("warningNoAccess"), "warn"));
    };

    const setupNumberSetting = (
      input: HTMLInputElement,
      setting: "minImageSize" | "minLinkCount",
    ) => {
      input.value = String(this.settings[setting]);
      input.addEventListener("change", () => {
        if (!input.reportValidity()) return;
        const value = input.valueAsNumber;
        const nextValue = Number.isNaN(value) ? DEFAULT_SETTINGS[setting] : value;
        input.value = String(nextValue);
        if (nextValue !== this.settings[setting]) applyConversionSettings({ [setting]: nextValue });
      });
    };
    setupNumberSetting(minImageSizeInput, "minImageSize");
    setupNumberSetting(minLinkCountInput, "minLinkCount");
    minLinkCountInput.disabled = !this.settings.excludeLinkBlocks;

    preferDisplayedSizeInput.checked = this.settings.preferDisplayedImageSize;
    preferDisplayedSizeInput.addEventListener("change", () => {
      applyConversionSettings({ preferDisplayedImageSize: preferDisplayedSizeInput.checked });
    });

    useFullUrlsInput.checked = this.settings.useFullUrls;
    useFullUrlsInput.addEventListener("change", () => {
      applyConversionSettings({ useFullUrls: useFullUrlsInput.checked });
    });

    document
      .querySelectorAll<HTMLInputElement>('#element-exclusions input[type="checkbox"]')
      .forEach((input) => {
        const setting = input.name as Exclude<keyof ElementExclusions, "minLinkCount">;
        input.checked = this.settings[setting];
        input.addEventListener("change", () => {
          if (setting === "excludeLinkBlocks") minLinkCountInput.disabled = !input.checked;
          applyConversionSettings({ [setting]: input.checked });
        });
      });

    const getActiveTabUrlAndProcess = async (): Promise<void> => {
      try {
        const { url, tabTitle } = await getActiveTabUrl();

        if (!url || !tabTitle || !this.fileNameInput) {
          return;
        }
        console.log("アクティブなタブのURL:", url);
        this.url = url;

        siteUrlInput.value = url.href;
        // ファイル名を設定（保存済みファイル名がある場合は上書きしない）
        if (!this.settings.saveFilename || !this.settings.fileName) {
          this.fileNameInput.value = tabTitle.replace(/\./g, "_");
        }

        await this.handleConversion();
      } catch {
        this.showLog(getMessage("errorGetActiveTabUrl"), "error");
      }
    };

    await getActiveTabUrlAndProcess();

    siteUrlButton.addEventListener("click", () => {
      void getActiveTabUrlAndProcess();
    });
    siteUrlInput.addEventListener("input", () => {
      const value = siteUrlInput.value.trim();
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
      if (!urlPattern.test(value)) {
        this.showLog(`${getMessage("invalidUrl")}${value}`, "warn");
        return;
      }
      const url = new URL(value);
      if (!url?.hostname) return;
      const hostname = url.hostname;
      this.showLog(getMessage("urlChanged", [value, hostname]));
      if (this.fileNameInput) {
        this.fileNameInput.value = hostname.replace(/\./g, "_");
      }
    });

    // クリアボタンのイベントリスナー
    const urlClearButton = document.getElementById("url-clear-button");
    const filenameClearButton = document.getElementById("filename-clear-button");
    urlClearButton?.addEventListener("click", () => {
      siteUrlInput.value = "";
      siteUrlInput.focus();
    });
    filenameClearButton?.addEventListener("click", () => {
      if (this.fileNameInput) {
        this.fileNameInput.value = "";
        this.fileNameInput.dispatchEvent(new Event("input"));
        this.fileNameInput.focus();
      }
    });
  }

  // HTMLをMarkdownに変換
  private async handleConversion(): Promise<void> {
    const conversionId = ++this.conversionId;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id || !activeTab.url?.startsWith("http")) {
      this.showLog(getMessage("warningCannotGetHtml"), "warn");
      return;
    }

    try {
      // content script から HTML を取得
      const responseContent = await chrome.tabs.sendMessage(activeTab.id, {
        action: "get-page-content",
        minImageSize: this.settings.minImageSize,
        preferDisplayedImageSize: this.settings.preferDisplayedImageSize,
      });
      if (!responseContent?.html) {
        this.showLog(getMessage("errorNoHtml"), "error");
        return;
      }

      if (conversionId !== this.conversionId) return;
      await this.handleHtml(
        responseContent.html,
        conversionId,
        responseContent.baseUrl ?? activeTab.url,
      );
    } catch {
      this.showLog(getMessage("warningNoAccess"), "warn");
    }
  }

  // 解析結果を表示
  private setupPreview(result: string): void {
    const fileName = this.fileNameInput?.value || "webpage";
    // プレビューUIを描画
    renderPreviewResult(result, fileName);

    // ダウンロードボタンのイベントリスナー
    document.getElementById("download-md-button")?.addEventListener("click", () => {
      const fileName = this.fileNameInput?.value || "webpage";
      if (downloadFile(result, fileName)) {
        this.showLog(getMessage("downloadComplete"));
      } else {
        this.showLog(getMessage("downloadFailed"), "error");
      }
    });
  }

  // HTML を Markdown に変換してプレビューを表示
  private async handleHtml(html: string, conversionId: number, baseUrl: string): Promise<void> {
    await this.showLog(getMessage("parsingHtml"));
    const cleanedHtml = parseHtmlContent(
      html,
      this.settings,
      this.settings.useFullUrls ? baseUrl : undefined,
    );

    await this.showLog(getMessage("convertingToMarkdown"));
    const markdown = await toMarkdown(cleanedHtml);
    if (conversionId !== this.conversionId) return;

    this.setupPreview(markdown);
    await this.showLog(
      `${getMessage("conversionComplete")} (${this.url?.hostname} ${markdown.length} ${getMessage("characters")})`,
    );
  }

  private setupUI(): void {
    const short_name = this.manifestData.short_name || this.manifestData.name;
    const title = document.getElementById("title");
    if (title) {
      title.textContent = short_name;
    }
    const titleHeader = document.getElementById("title-header");
    if (titleHeader) {
      titleHeader.textContent = short_name;
    }

    setupMoreMenu();
    setupInfoTab(this.manifestData, this.manifestMetadata);
    setupDocumentTab();
    setupVersionTab(this.manifestData.version);
  }

  private async showLog(message: string, level: LogLevel = "info", error?: unknown): Promise<void> {
    const detail = error instanceof Error ? error.message : error ? String(error) : undefined;
    try {
      await addLog(message, level, "popup", detail);
    } catch (e) {
      console.error("ログ保存エラー", e);
    }
  }
}
