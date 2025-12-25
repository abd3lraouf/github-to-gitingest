# GitHub to Gitingest Button

A Tampermonkey/Greasemonkey userscript that adds a **Gitingest** button to GitHub repository pages.

[Gitingest](https://gitingest.com) converts GitHub repositories into LLM-friendly text digests, perfect for feeding codebases to AI assistants.

## Features

- Adds a native-looking GitHub button next to the "Copy path" button
- Works on **all repository pages** including:
  - Main repo page: `github.com/owner/repo`
  - Subdirectories: `github.com/owner/repo/tree/main/src`
  - Files: `github.com/owner/repo/blob/main/README.md`
  - Branches: `github.com/owner/repo/tree/develop`
- Handles GitHub's SPA navigation (button persists across page changes)
- Uses GitHub's Primer design system for consistent styling

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox/Safari)
2. Click the link below to install:

   **[Install Script](https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js)**

3. Click "Install" in the Tampermonkey dialog

## Screenshot

The button appears next to the copy path button in the repository header:

```
konsist-documentation / advanced /  [📋] [Gitingest]
```

## How it works

1. Detects if you're on a GitHub repository page
2. Finds the breadcrumb/header area
3. Inserts a button styled like GitHub's native buttons
4. Clicking opens `gitingest.com` with the same path in a new tab

## Credits

Based on the original script by [Doiiars](https://greasyfork.org/en/scripts/527278).

## License

MIT
