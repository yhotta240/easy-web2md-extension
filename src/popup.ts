import { PopupPanel } from './components/popupPanel';

class PopupManager {
  private panel: PopupPanel;
  private isEnabled: boolean = false; // 有効フラグ
  private settings: any = {}; // 設定
  private enabledElement: HTMLInputElement | null; // チェックボックス
  private messageDiv: HTMLElement | null; // メッセージ表示エリア
  private manifestData: chrome.runtime.Manifest; // マニフェストデータ
  private fileName: HTMLInputElement;
  private filenameCheckbox: HTMLInputElement;
  private savedFileName: string = '';
  private keepFilename: boolean = false;

  // コンストラクタ
  constructor() {
    this.panel = new PopupPanel();
    this.enabledElement = document.getElementById('enabled') as HTMLInputElement;
    this.messageDiv = document.getElementById('message');
    this.manifestData = chrome.runtime.getManifest();
    this.fileName = document.getElementById('filename-input') as HTMLInputElement;
    this.filenameCheckbox = document.getElementById('filename-checkbox') as HTMLInputElement;

    this.loadInitialState();
    this.addEventListeners();
  }

  // 初期状態の読み込み
  private loadInitialState(): void {
    chrome.storage.local.get(['settings', 'isEnabled'], (data) => {
      if (this.enabledElement) {
        this.isEnabled = data.isEnabled || false;
        this.enabledElement.checked = this.isEnabled;
      }
      if (data.settings) {
        this.settings = data.settings;
        console.log("settings", this.settings);
      }
      this.showMessage(this.isEnabled ? `${this.manifestData.name} は有効になっています` : `${this.manifestData.name} は無効になっています`);
    });
  }

  // イベントリスナーの追加
  private addEventListeners(): void {
    if (this.enabledElement) {
      this.enabledElement.addEventListener('change', (event) => {
        this.isEnabled = (event.target as HTMLInputElement).checked;
        chrome.storage.local.set({ isEnabled: this.isEnabled }, () => {
          this.showMessage(this.isEnabled ? `${this.manifestData.name} は有効になっています` : `${this.manifestData.name} は無効になっています`);
        });
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      this.initializeUI();
    });

    const clearButton = document.getElementById('clear-button');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (this.messageDiv) {
          this.messageDiv.innerHTML = '<p class="m-0"></p>';
        }
      });
    }
  }

  // UIの初期化
  private initializeUI(): void {
    const title = document.getElementById('title');
    if (title) {
      title.textContent = this.manifestData.name;
    }
    const titleHeader = document.getElementById('title-header');
    const name = "簡単Webページマークダウン化 - Easy Web Markdown";
    if (titleHeader) {
      titleHeader.textContent = name;
    }
    const enabledLabel = document.getElementById('enabled-label');
    if (enabledLabel) {
      enabledLabel.textContent = `${this.manifestData.name} を有効にする`;
    }

    const newTabButton = document.getElementById('new-tab-button');
    if (newTabButton) {
      newTabButton.addEventListener('click', () => {
        chrome.tabs.create({ url: 'popup/popup.html' });
      });
    }

    this.setupDownloadTab();
    this.setupInfoTab();
  }

  // ダウンロードタブの作成
  private setupDownloadTab(): void {
    const siteUrlInput = document.getElementById('site-url-input') as HTMLInputElement;
    const siteUrlButton = document.getElementById('site-url-button') as HTMLButtonElement;

    const getActiveTabUrlAndProcess = (): void => {
      this.getActiveTabUrl((baseUrl: string, hostname: string, url: URL) => {
        if (baseUrl) {
          siteUrlInput.value = url.href;
          this.showMessage(``);
          const filename_header = hostname.replace(/\./g, '_');
          // TODO: isSaveFilename と saveFilename の実装が必要です
          // if (isSaveFilename) {
          //   this.fileName!.value = saveFilename;
          // } else {
          this.fileName!.value = filename_header;
          // }

        }
      });
    };
    getActiveTabUrlAndProcess();

    siteUrlButton.addEventListener('click', getActiveTabUrlAndProcess);
    siteUrlInput.addEventListener('input', () => {
      const value = siteUrlInput.value.trim();
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
      if (!urlPattern.test(value)) {
        this.showMessage(`無効なURLです: ${value}`);
        return;
      }
      const url = new URL(value);
      if (!url || !url.hostname) return;
      const hostname = url.hostname;
      this.fileName.value = hostname.replace(/\./g, '_');
      this.showMessage(``);

    });

    document.getElementById('url-clear-button')!.onclick = () => {
      siteUrlInput.value = '';
      siteUrlInput.focus();
    };

  }

  // 情報タブの初期化
  private setupInfoTab(): void {
    const extensionLink = document.getElementById('extension_link') as HTMLAnchorElement;
    if (extensionLink) {
      extensionLink.href = `chrome://extensions/?id=${chrome.runtime.id}`;
      this.clickURL(extensionLink);
    }

    this.clickURL(document.getElementById('issue-link'));
    this.clickURL(document.getElementById('store_link'));
    this.clickURL(document.getElementById('github-link'));

    const extensionId = document.getElementById('extension-id');
    if (extensionId) {
      extensionId.textContent = chrome.runtime.id;
    }
    const extensionName = document.getElementById('extension-name');
    if (extensionName) {
      extensionName.textContent = this.manifestData.name;
    }
    const extensionVersion = document.getElementById('extension-version');
    if (extensionVersion) {
      extensionVersion.textContent = this.manifestData.version;
    }
    const extensionDescription = document.getElementById('extension-description');
    if (extensionDescription) {
      extensionDescription.textContent = this.manifestData.description ?? '';
    }

    chrome.permissions.getAll((result) => {
      let siteAccess: string;
      if (result.origins && result.origins.length > 0) {
        if (result.origins.includes("<all_urls>")) {
          siteAccess = "すべてのサイト";
        } else {
          siteAccess = result.origins.join("<br>");
        }
      } else {
        siteAccess = "クリックされた場合のみ";
      }
      const siteAccessElement = document.getElementById('site-access');
      if (siteAccessElement) {
        siteAccessElement.innerHTML = siteAccess;
      }
    });

    chrome.extension.isAllowedIncognitoAccess((isAllowedAccess) => {
      const incognitoEnabled = document.getElementById('incognito-enabled');
      if (incognitoEnabled) {
        incognitoEnabled.textContent = isAllowedAccess ? '有効' : '無効';
      }
    });
  }

  /** * アクティブなブラウザタブのURLを取得し，コールバック関数を実行する
   * @param {function} callback コールバック関数
   * @returns {void}
   */
  private getActiveTabUrl(callback: (baseUrl: string, hostname: string, url: URL) => void): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      if (!tabs[0].url) return;
      const url = new URL(tabs[0].url);
      const baseUrl = url.origin;
      const hostname = url.hostname;
      callback(baseUrl, hostname, url);
    });
  }

  /**
   * URLをクリック
   * @param link
   * @returns
   */
  private clickURL(link: HTMLElement | string | null): void {
    if (!link) return;

    const url = (link instanceof HTMLElement && link.hasAttribute('href')) ? (link as HTMLAnchorElement).href : (typeof link === 'string' ? link : null);
    if (!url) return;

    if (link instanceof HTMLElement) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        chrome.tabs.create({ url });
      });
    }
  }

  /**
   * メッセージを出力する
   * @param message 出力するメッセージ
   * @param timestamp 出力時刻（省略すると現在日時を使用）
   */
  private showMessage(message: string, timestamp: string = this.dateTime()) {
    this.panel.messageOutput(timestamp, message);
  }

  /**
   * 現在日時を取得
   * @returns 現在日時
   */
  private dateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

}

new PopupManager();