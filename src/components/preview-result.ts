import { getMessage } from '../utils/i18n';

export function renderPreviewResult(result: string, fileName: string): void {
  const markdownPreview = document.getElementById('markdown-preview');
  if (!markdownPreview) return;

  const charCount = result.length;
  const fileSizeKB = (new Blob([result]).size / 1024).toFixed(2);

  // 結果表示用のUIを生成 (Bootstrap適用)
  markdownPreview.innerHTML = `
      <p class="m-0 fw-bold my-2">${getMessage('markdownPreview')}</p>
      <div class="card">
        <div class="card-header p-2">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center text-truncate me-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-text me-2 flex-shrink-0" viewBox="0 0 16 16">
                <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2.5h2.5L9.5 1z"/>
              </svg>
              <span class="fw-bold text-truncate" title="${fileName}.md">${fileName}.md</span>
            </div>
            <div class="d-flex align-items-center flex-shrink-0">
              <span class="badge bg-light text-dark me-2">${fileSizeKB} KB / ${charCount} ${getMessage('characters')}</span>
              <button id="download-md-button" class="btn btn-primary btn-sm me-1">${getMessage('downloadButton')}</button>
              <button id="accordion-toggle" class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-content" aria-expanded="false" aria-controls="accordion-content">
                ▼
              </button>
            </div>
          </div>
        </div>
        <div id="accordion-content" class="accordion-collapse collapse">
          <div class="card-body p-0">
            <pre class="m-0"><code id="markdown-code" class="d-block p-2" style="max-height: 300px; overflow-y: auto;"></code></pre>
          </div>
        </div>
      </div>
    `;

  // マークダウンの内容を安全にセット
  const codeElement = document.getElementById('markdown-code');
  if (codeElement) codeElement.textContent = result;

  // アコーディオンの開閉に合わせて矢印を変更するイベントリスナー
  const accordionToggle = document.getElementById('accordion-toggle');
  const accordionContent = document.getElementById('accordion-content');
  accordionContent?.addEventListener('show.bs.collapse', () => {
    if (accordionToggle) accordionToggle.textContent = '▲';
  });
  accordionContent?.addEventListener('hide.bs.collapse', () => {
    if (accordionToggle) accordionToggle.textContent = '▼';
  });
}