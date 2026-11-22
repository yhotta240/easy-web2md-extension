import { getMessage } from "../../utils/i18n";

export function renderPreviewResult(result: string, fileName: string): void {
  const markdownPreview = document.getElementById("markdown-preview");
  if (!markdownPreview) return;

  const fileSizeKB = (new Blob([result]).size / 1024).toFixed(2);
  const copyLabel = getMessage("copyMarkdownButton");
  const downloadLabel = getMessage("downloadButton");
  markdownPreview.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
      <h2 class="h6 mb-0">${getMessage("markdownPreview")}</h2>
      <span id="markdown-copy-status" class="small text-body-secondary" role="status"></span>
    </div>
    <div class="position-relative border rounded">
      <details>
        <summary class="markdown-preview-summary d-flex align-items-center gap-2 rounded ps-3 py-2">
          <span class="overflow-hidden">
            <span id="preview-filename" class="d-block text-truncate"></span>
            <span class="d-block small text-body-secondary">${fileSizeKB} KB / ${result.length} ${getMessage("characters")}</span>
          </span>
        </summary>
        <pre class="markdown-preview-code"><code id="markdown-code"></code></pre>
      </details>
      <div class="markdown-preview-actions position-absolute top-0 end-0 mt-2 me-2 d-flex">
        <button id="copy-md-button" class="btn btn-sm border-0 text-body" type="button"
          aria-label="${copyLabel}" title="${copyLabel}">
          <i class="bi bi-copy" aria-hidden="true"></i>
        </button>
        <button id="download-md-button" class="btn btn-sm border-0 text-body" type="button"
          aria-label="${downloadLabel}" title="${downloadLabel}">
          <i class="bi bi-download" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;

  updatePreviewFilename(fileName);
  const code = markdownPreview.querySelector("#markdown-code");
  if (code) code.textContent = result;

  const copyStatus = markdownPreview.querySelector("#markdown-copy-status");
  markdownPreview.querySelector("#copy-md-button")?.addEventListener("click", async () => {
    if (!copyStatus) return;
    copyStatus.textContent = "";
    try {
      await navigator.clipboard.writeText(result);
      copyStatus.textContent = getMessage("copyMarkdownSuccess");
    } catch {
      copyStatus.textContent = getMessage("copyMarkdownFailed");
    }
  });
}

export function updatePreviewFilename(fileName: string): void {
  const previewFilename = document.getElementById("preview-filename");
  if (!previewFilename) return;

  const name = `${fileName || "webpage"}.md`;
  previewFilename.title = name;
  previewFilename.textContent = name;
}
