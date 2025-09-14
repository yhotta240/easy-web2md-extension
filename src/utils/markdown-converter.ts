import TurndownService from 'turndown'; 
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: '-',
});

// GFMプラグインを適用
turndownService.use(gfm);

// 空リンクを削除
turndownService.addRule('removeEmptyLinks', {
    filter: (node) => node.nodeName === 'A' && !node.textContent.trim(),
    replacement: () => ''
});

// 見出しの前後に改行を追加
turndownService.addRule('headings', {
    filter: ['h1','h2','h3','h4','h5','h6'],
    replacement: (content, node) => {
        const hLevel = Number(node.nodeName.charAt(1));
        const hPrefix = '#'.repeat(hLevel);
        return `\n\n${hPrefix} ${content.trim()}\n\n`;
    }
});

// コードブロック対応 (言語指定あり)
turndownService.addRule('fencedCodeBlock', {
    filter: (node, options) => options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
    replacement: (content, node) => {
        const codeNode = node.firstChild as HTMLElement;
        const language = (codeNode.getAttribute('class') || '').replace(/language-/, '');
        const code = codeNode.textContent?.trim() || '';
        return `\n\n\`\`\`${language || ''}\n${code}\n\`\`\`\n\n`;
    }
});

// figure/figcaption
turndownService.addRule('figure', {
    filter: 'figure',
    replacement: (content) => `\n\n${content.trim()}\n\n`
});
turndownService.addRule('figcaption', {
    filter: 'figcaption',
    replacement: (content) => `\n_${content.trim()}_\n`
});

// リストの前後の改行を整える
turndownService.addRule('lists', {
    filter: ['ul', 'ol'],
    replacement: (content) => `\n${content.trim()}\n`
});

// table前後の余分な改行を削除
turndownService.addRule('tables', {
    filter: 'table',
    replacement: (content) => `\n${content.trim()}\n`
});

export function toMarkdown(html: string): string {
    let markdown = turndownService.turndown(html);
    // 3つ以上連続する改行を2つにまとめ、先頭・末尾の空白除去
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
}
