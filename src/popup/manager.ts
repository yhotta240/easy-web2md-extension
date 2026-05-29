import meta from "../../public/manifest.meta.json";
import { renderPreviewResult } from "../components/preview-result";
import { DEFAULT_SETTINGS, type Settings } from "../settings";
import { downloadFile } from "../utils/file-downloader";
import { parseHtmlContent } from "../utils/html-parser";
import { getMessage } from "../utils/i18n";
import {
  addLog,
  clearLogs,
  getLogs,
  LOG_STORAGE_KEY,
  type LogEntry,
  type LogLevel,
} from "../utils/logger";
import { toMarkdown } from "../utils/markdown-converter";
import { getSettings, isEnabled, setEnabled, setSettings } from "../utils/storage";
import { getActiveTabUrl } from "../utils/tab";
import { setupDocumentTab } from "./components/document";
import { setupInfoTab } from "./components/info";
import { setupMoreMenu } from "./components/menu";
import { PopupPanel } from "./components/panel";
import { initShareMenu } from "./components/share";
import { applyTheme, setupThemeMenu } from "./components/theme";
import { setupVersionTab } from "./components/version";
import type { ManifestMetadata, SharePlatform, Theme } from "./types";

export class PopupManager {
  private panel: PopupPanel;
  private enabled: boolean = false;
  private settings: Settings = DEFAULT_SETTINGS;
  private manifestData: chrome.runtime.Manifest;
  private manifestMetadata: ManifestMetadata;
  private enabledElement: HTMLInputElement | null;
  private fileNameInput: HTMLInputElement | null;
  private saveFilenameCheckbox: HTMLInputElement | null;
  private url: URL | null = null;

  constructor() {
    this.panel = new PopupPanel();
    this.manifestData = chrome.runtime.getManifest();
    this.manifestMetadata = meta || {};
    this.enabledElement = document.getElementById("enabled") as HTMLInputElement | null;
    this.fileNameInput = document.getElementById("filename-input") as HTMLInputElement | null;
    this.saveFilenameCheckbox = document.getElementById(
      "filename-checkbox",
    ) as HTMLInputElement | null;

    this.setupUI();
    this.initialize();
    this.addEventListeners();
    this.setupDownloadTab();
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
      console.error("ログ読み込みエラー", err);
      this.watchStorageLogs(0);
    }

    try {
      this.settings = await getSettings();
      this.enabled = await isEnabled();
      if (this.enabledElement) this.enabledElement.checked = this.enabled;
      if (this.fileNameInput && this.settings.fileName) {
        this.fileNameInput.value = this.settings.fileName;
      }
      if (this.saveFilenameCheckbox) this.saveFilenameCheckbox.checked = !!this.settings.fileName;
    } catch {
      await this.showLog("設定の読み込みに失敗しました", "error");
    }
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
    this.enabledElement?.addEventListener("change", async (event) => {
      this.enabled = (event.target as HTMLInputElement).checked;
      try {
        await setEnabled(this.enabled);
        await this.showLog(
          this.enabled
            ? `${this.manifestData.short_name} は有効になりました`
            : `${this.manifestData.short_name} は無効になりました`,
        );
      } catch {
        await this.showLog("有効状態の保存に失敗しました", "error");
      }
    });

    // テーマ設定のイベントリスナー
    setupThemeMenu(async (value: Theme) => {
      try {
        applyTheme(value);
        await this.showLog(`テーマを ${value} に変更しました`);
      } catch {
        await this.showLog("テーマ設定の保存に失敗しました", "error");
      }
    });

    // シェアメニューの初期化
    initShareMenu(async (platform: SharePlatform, success: boolean) => {
      const platformNames: Record<SharePlatform, string> = {
        twitter: "X (Twitter)",
        facebook: "Facebook",
        copy: "クリップボード",
      };
      if (success) {
        if (platform === "copy") {
          await this.showLog("URLをコピーしました");
        } else {
          await this.showLog(`${platformNames[platform]}でシェアしました`);
        }
      } else {
        await this.showLog("シェアに失敗しました", "error");
      }
    });

    this.saveFilenameCheckbox?.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.settings.fileName = target.checked ? (this.fileNameInput as HTMLInputElement).value : "";
      this.showLog(
        `${getMessage("filenameChanged")}${this.settings.fileName}${getMessage("rememberSuffix")}${getMessage("changed")}`,
      );
      setSettings(this.settings);
    });
  }

  // ダウンロードタブの作成
  private async setupDownloadTab(): Promise<void> {
    const siteUrlInput = document.getElementById("site-url-input") as HTMLInputElement;
    const siteUrlButton = document.getElementById("site-url-button") as HTMLButtonElement;

    const getActiveTabUrlAndProcess = async (): Promise<void> => {
      try {
        const { hostname, url } = await getActiveTabUrl();

        if (!url || !hostname || !this.fileNameInput) {
          return;
        }
        this.url = url;

        siteUrlInput.value = url.href;
        // ファイル名を設定
        this.fileNameInput.value = hostname.replace(/\./g, "_");

        await this.handleConversion();
      } catch {
        this.showLog("アクティブなタブのURL取得に失敗しました", "error");
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
      this.showLog(`URLが変更されました: ${value}, ホスト名: ${hostname}`);
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
    const fileName = this.fileNameInput?.value || "download";

    // プレビューUIを描画
    renderPreviewResult(result, fileName);

    // ダウンロードボタンのイベントリスナー
    document.getElementById("download-md-button")?.addEventListener("click", () => {
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
    const markdown = toMarkdown(cleanedHtml);

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
    const enabledLabel = document.getElementById("enabled-label");
    if (enabledLabel) {
      enabledLabel.textContent = `${short_name} を有効にする`;
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
