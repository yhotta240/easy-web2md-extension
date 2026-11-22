import { getMessage } from "../../utils/i18n";

export function renderPreviewResult(result: string, fileName: string): void {
  const markdownPreview = document.getElementById("markdown-preview");
  if (!markdownPreview) return;

  const fileSizeKB = (new Blob([result]).size / 1024).toFixed(2);
  const downloadLabel = getMessage("downloadButton");
  markdownPreview.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
      <h2 class="h6 mb-0">${getMessage("markdownPreview")}</h2>
      <button id="download-md-button" class="btn btn-primary btn-sm" type="button"
        aria-label="${downloadLabel}" title="${downloadLabel}">
        <i class="bi bi-download" aria-hidden="true"></i>
      </button>
    </div>
    <details class="border rounded">
      <summary class="markdown-preview-summary d-flex align-items-center gap-2 rounded px-3 py-2">
        <span class="overflow-hidden">
          <span id="preview-filename" class="d-block text-truncate"></span>
          <span class="d-block small text-body-secondary">${fileSizeKB} KB / ${result.length} ${getMessage("characters")}</span>
        </span>
      </summary>
      <pre class="markdown-preview-code"><code id="markdown-code"></code></pre>
    </details>
  `;

  updatePreviewFilename(fileName);
  const code = markdownPreview.querySelector("#markdown-code");
  if (code) code.textContent = result;
}

export function updatePreviewFilename(fileName: string): void {
  const previewFilename = document.getElementById("preview-filename");
  if (!previewFilename) return;

  const name = `${fileName || "webpage"}.md`;
  previewFilename.title = name;
  previewFilename.textContent = name;
}
