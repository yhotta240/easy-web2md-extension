/**
 * 文字列コンテンツをファイルとしてダウンロードします。
 * @param content ダウンロードするコンテンツ
 * @param fileName ファイル名 (拡張子なし)
 * @returns ダウンロード処理が成功した場合は true、失敗した場合は false を返します。
 */
export function downloadFile(content: string, fileName: string): boolean {
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `${fileName}.md`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("ダウンロード中にエラーが発生しました:", error);
    return false;
  }
}
