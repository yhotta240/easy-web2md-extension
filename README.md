# 簡単 Web ページマークダウン化 - Easy Web to Markdown

English version: [README.en.md](README.en.md)

## 概要

閲覧している Web ページをワンクリックで Markdown 形式に変換し，ダウンロードできる Chrome 拡張機能です．

## 特徴

- **ワンクリック変換**: 拡張機能のアイコンをクリックするだけで，表示しているページが Markdown に変換されます．
- **Markdown プレビュー**: 変換された Markdown をポップアップ内で確認できます．
- **ファイル名自動設定**: ページのドメイン名を元に，ダウンロードするファイル名を自動で設定します．
- **簡単ダウンロード**: プレビュー画面の「ダウンロード」ボタンから，`.md`ファイルをすぐに保存できます．

## 使い方

1.  Markdown に変換したい Web ページを開きます．
2.  Chrome のツールバーにある「簡単 Web ページマークダウン化」のアイコンをクリックします．
3.  ポップアップが開かれ，自動的にページの内容が Markdown に変換されます．
4.  「ダウンロード」タブでプレビューを確認し，必要に応じてファイル名を変更します．
5.  「ダウンロード」ボタンをクリックすると，Markdown ファイルが保存されます．

## 言語サポート

この拡張機能は以下の言語に対応しています：

- 日本語 (Japanese)
- 英語 (English)

言語はブラウザの設定に基づいて自動的に選択されます．

## 開発

### 前提条件

- [Node.js](https://nodejs.org/) (v18 以上推奨)
- [npm](https://www.npmjs.com/)

### セットアップ

1.  リポジトリをクローンします．
    ```bash
    git clone https://github.com/yhotta240/easy-web2md-extension.git
    cd easy-web2md-extension
    ```
2.  依存関係をインストールします．
    ```bash
    npm install
    ```

### ビルド

- 通常ビルド:

  ```bash
  npm run build
  ```

  `dist`ディレクトリにビルド成果物が出力されます．

- 監視モードでのビルド:
  ```bash
  npm run watch
  ```
  ファイルの変更を検知して自動的に再ビルドします．

## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています．
