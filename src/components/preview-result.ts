import { getMessage } from "../utils/i18n";

export function renderPreviewResult(result: string, fileName: string): void {
  const markdownPreview = document.getElementById("markdown-preview");
  if (!markdownPreview) return;

  const charCount = result.length;
  const fileSizeKB = (new Blob([result]).size / 1024).toFixed(2);

  // 結果表示用のUIを生成 (横長カードレイアウト、Bootstrap適用)
  markdownPreview.innerHTML = `
    <p class="m-0 fw-bold my-2">${getMessage("markdownPreview")}</p>
    <div class="card w-100">
      <div class="card-body p-2 d-flex align-items-center gap-1">
        <div class="flex-shrink-0 d-flex align-items-center justify-content-center">
          <i class="bi bi-file-earmark-text" style="font-size: 28px; color: #6c757d;"></i>
        </div>

        <div class="flex-grow-1 text-truncate">
          <div id="preview-filename" class="fw-bold text-truncate" title="${fileName}.md">${fileName}.md</div>
          <div class="text-muted small">${fileSizeKB} KB / ${charCount} ${getMessage("characters")}</div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button id="download-md-button" class="btn btn-primary btn-sm">
            <i class="bi bi-download"></i>
          </button>
          <button id="accordion-toggle" class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-content" aria-expanded="false" aria-controls="accordion-content">
            ▼
          </button>
        </div>
      </div>

      <div id="accordion-content" class="accordion-collapse collapse border-top">
        <div class="card-body p-0">
          <pre class="m-0"><code id="markdown-code" class="d-block p-2" style="max-height: 300px; overflow-y: auto;"></code></pre>
        </div>
      </div>
    </div>
  `;

  // マークダウンの内容を安全にセット
  const codeElement = document.getElementById("markdown-code");
  if (codeElement) codeElement.textContent = result;

  // アコーディオンの開閉に合わせて矢印を変更するイベントリスナー
  const accordionToggle = document.getElementById("accordion-toggle");
  const accordionContent = document.getElementById("accordion-content");
  accordionContent?.addEventListener("show.bs.collapse", () => {
    if (accordionToggle) accordionToggle.textContent = "▲";
  });
  accordionContent?.addEventListener("hide.bs.collapse", () => {
    if (accordionToggle) accordionToggle.textContent = "▼";
  });
}
