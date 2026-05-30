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

  return String(result);
}
