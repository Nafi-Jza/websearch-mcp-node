# WebSearch MCP Server

A powerful Model Context Protocol (MCP) server that provides full-featured web searching, scraping, and YouTube transcript extraction capabilities using Playwright. 

This server allows AI assistants (like Claude via Claude Code) to autonomously search the web, read articles, and fetch video transcripts without being blocked by CAPTCHAs or regional firewalls.

## Features

- 🔍 **DuckDuckGo Search**: Headed search using Playwright to bypass aggressive bot-protection and regional blocks (e.g., Internet Positif).
- 🕸️ **Headless Scraping**: Extracts clean Markdown from websites using Mozilla's Readability and Turndown.
- 🎥 **YouTube Transcripts**: Fetches auto-generated or manual transcripts with a fallback to Playwright extraction if the API fails.
- 🔓 **Manual Browser Interaction**: Allows the AI to open a headed browser window, pausing execution so you can manually solve CAPTCHAs or log into accounts.
- 🍪 **Persistent Profiles**: Maintains a `browser-profile` to save your cookies, logins, and session state across runs.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Playwright](https://playwright.dev/)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nafi-jza/websearch-mcp.git
   cd websearch-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration in Claude Code

To add this MCP server to your Claude Code setup, edit your `~/.claude.json` or project-level `.claude.json` file:

```json
{
  "mcpServers": {
    "websearch-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:/absolute/path/to/websearch-mcp/dist/index.js"
      ],
      "env": {}
    }
  }
}
```
*(Make sure to replace the path with your actual absolute path to the `dist/index.js` file)*

## Available Tools

Once configured, the following tools will be available to the AI:

- **`search`**: Search the web using DuckDuckGo.
  - *Input*: `{ query: string }`
- **`scrape`**: Load a webpage and extract its main content as Markdown.
  - *Input*: `{ url: string }`
- **`open_browser`**: Open a headed browser window to manually solve CAPTCHAs or log into sites. Pauses the MCP server until you close the browser.
  - *Input*: `{ url?: string }`
- **`youtube_transcript`**: Extract the transcript from a YouTube video.
  - *Input*: `{ target: string, lang?: string }`

## Architecture & How It Works

- **Bot Bypass**: Playwright is used to execute searches visibly (headed) which tricks most basic bot-protection systems and DNS blocks. 
- **Graceful Cleanup**: The server automatically manages Chromium contexts. It safely removes the default `about:blank` pages and closes browser instances strictly after automated executions to prevent memory leaks and zombie processes.
- **Logging & Output**: All activity is logged to `activity.log` in the root directory. Markdown outputs of scrapes are saved locally to the `outputs/` directory for historical reference.
