import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

export async function toMarkdown(html: string): Promise<string> {
  // HTML を Markdown へ変換
  const result = await unified()
    .use(rehypeParse) // HTML 文字列を解析
    .use(rehypeRemark) // HTML 形式から Markdown 形式へ変換
    .use(remarkGfm) // GFM（テーブルなど）の記法に対応
    .use(remarkStringify) // Markdown 文字列として出力
    .process(html);

  const raw = String(result);
  return sanitizeMarkdown(raw).trim();
}

function sanitizeMarkdown(md: string): string {
  // 改行を統一
  let s = md.replace(/\r\n/g, "\n");

  // 不要な要素を削除
  s = s.replace(/\[\s*\]\([^)]*\)/g, ""); // 空のリンクを削除
  s = s.replace(/<!--[\s\S]*?-->/g, ""); // HTMLコメントを削除

  // コードブロック外の1文字だけの行を削除
  const lines = s.split("\n");
  const out: string[] = [];
  let inCode = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inCode = !inCode;
      out.push(line);
      continue;
    }

    if (!inCode && line.trim().length === 1) continue;
    out.push(line);
  }

  // 連続改行を整理
  s = out.join("\n").replace(/\n{3,}/g, "\n\n");

  return s;
}
