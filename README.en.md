# Easy Web to Markdown

## Overview

Easy Web to Markdown is a Chrome extension that converts the currently viewed web page to Markdown format with a single click and lets you download the result.

## Features

- One-click conversion: Click the extension icon to convert the currently displayed page to Markdown.
- Markdown preview: View the converted Markdown inside the popup.
- Automatic filename: The download filename is generated automatically based on the page's domain.
- Easy download: Save the generated Markdown as a `.md` file from the preview's "Download" tab.

## Usage

1. Open the web page you want to convert to Markdown.
2. Click the Easy Web to Markdown icon in Chrome's toolbar.
3. The popup opens and the page content is automatically converted to Markdown.
4. Check the preview in the "Download" tab and, if needed, change the filename.
5. Click the "Download" button to save the Markdown file.

## Language Support

This extension supports the following languages:

- Japanese
- English

The language is selected automatically based on the browser settings.

## Development

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yhotta240/easy-web2md-extension.git
cd easy-web2md-extension
```

2. Install dependencies:

```bash
npm install
```

### Build

- Build (production):

```bash
npm run build
```

Build artifacts are output to the `dist` directory.

- Watch mode (development):

```bash
npm run watch
```

This rebuilds automatically when files change.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Japanese README

For the Japanese README, see README.md.
