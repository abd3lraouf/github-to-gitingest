# GitHub to Gitingest + Copy README

<p align="center">
  <a href="https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js"><img src="https://img.shields.io/badge/Install-Userscript-2ea44f?style=for-the-badge&logo=tampermonkey&logoColor=white" alt="Install userscript"></a>
  <img src="https://img.shields.io/badge/version-3.1-1f6feb?style=for-the-badge" alt="Version 3.1">
  <img src="https://img.shields.io/badge/license-MIT-8250df?style=for-the-badge" alt="MIT License">
</p>

A Tampermonkey/Greasemonkey userscript that adds two native-styled buttons to GitHub **repository** pages:

- **Gitingest** — opens the repo on [gitingest.com](https://gitingest.com), which converts GitHub repositories into LLM-friendly text digests, perfect for feeding codebases to AI assistants.
- **Copy README** — copies the repository's README as raw Markdown to your clipboard.

<p align="center">
  <img src="screenshot.png" alt="The Gitingest and Copy README buttons sitting natively beside Notifications, Fork, and Star in the GitHub repository header" width="640">
</p>

## Features

- Two buttons styled with GitHub's own [Primer](https://primer.style/) design tokens, so they match the active theme (light / dark / dimmed) and sit natively beside Watch / Fork / Star.
- **Copy README** fetches the raw file from `raw.githubusercontent.com` (a CDN with no API rate limit) — it uses the exact README link on the page when available, then falls back to common filenames at the `HEAD` ref, so it resolves the right file regardless of name, casing, or default branch (`main`/`master`) and copies raw Markdown, not rendered HTML. Shows inline **Copied** / **No README** / **Failed** feedback.
- Runs on repository pages only — user/org profiles and GitHub app routes (settings, notifications, explore, …) are excluded.
- Handles GitHub's SPA (Turbo/PJAX) navigation — the buttons persist and re-insert across page changes.

## Installation

1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) (Chrome/Edge/Firefox/Safari).
2. Click the install button:

   [![Install userscript](https://img.shields.io/badge/Install-Userscript-2ea44f?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js)

3. Confirm **Install** in the manager's dialog. Updates are delivered automatically from this repo.

## How it works

1. Resolves the current page to an `{owner, repo}` pair, bailing on non-repo routes.
2. Injects Primer-tokenized styles and finds the best anchor point (classic `pagehead-actions`, the React repo-title header, or the code-view breadcrumb).
3. **Gitingest** links to `gitingest.com/{owner}/{repo}`.
4. **Copy README** resolves the raw README from `raw.githubusercontent.com` — the exact path shown on the page if available, otherwise common filenames at the `HEAD` ref — and writes the Markdown to the clipboard.

## Credits

Based on the original script by [Doiiars](https://greasyfork.org/en/scripts/527278).

## License

MIT
