import meta from "../../public/manifest.meta.json";
import { DEFAULT_SETTINGS, type Settings } from "../settings";
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
import { renderPreviewResult } from "./components/preview";
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
      const visibleCount = logs.filter((e) => !e.hidden).length;
      if (logs.length > 0) {
        this.panel.loadLogs(logs, this.manifestMetadata.issues_url);
      }
      this.watchStorageLogs(visibleCount);
    } catch (err) {
      console.error(getMessage("errorLoadLogs"), err);
      this.watchStorageLogs(0);
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

  private watchStorageLogs(knownLength: number): void {
    let currentLength = knownLength;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[LOG_STORAGE_KEY]) {
        const rawEntries = changes[LOG_STORAGE_KEY]?.newValue;
        const entries: LogEntry[] = Array.isArray(rawEntries) ? rawEntries : [];
        const visible = entries.filter((e) => !e.hidden);
        const newEntries = visible.slice(currentLength);
        for (const entry of newEntries) {
          this.panel.messageOutput(
            entry.message,
            entry.timestamp,
            entry.level,
            entry.source,
            this.manifestMetadata.issues_url,
          );
        }
        currentLength = visible.length;
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
      const previewFilename = document.getElementById("preview-filename");
      if (previewFilename) {
        previewFilename.title = `${target.value}.md`;
        previewFilename.textContent = `${target.value}.md`;
      }
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
        this.fileNameInput.focus();
      }
    });
  }

  // HTMLをMarkdownに変換
  private async handleConversion(): Promise<void> {
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
      });
      if (!responseContent?.html) {
        this.showLog(getMessage("errorNoHtml"), "error");
        return;
      }

      this.handleHtml(responseContent.html);
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
  private async handleHtml(html: string): Promise<void> {
    await this.showLog(getMessage("parsingHtml"));
    const cleanedHtml = parseHtmlContent(html);

    await this.showLog(getMessage("convertingToMarkdown"));
    const markdown = await toMarkdown(cleanedHtml);

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
