// ==UserScript==
// @name         GitHub to Gitingest + Copy README
// @namespace    https://github.com/abd3lraouf
// @version      3.0
// @description  Adds native-styled GitHub buttons: open the repo in Gitingest and copy its README as raw Markdown
// @author       abd3lraouf
// @license      MIT
// @match        https://github.com/*
// @grant        none
// @homepageURL  https://github.com/abd3lraouf/github-to-gitingest
// @supportURL   https://github.com/abd3lraouf/github-to-gitingest/issues
// @contributionURL https://greasyfork.org/en/scripts/527278
// @downloadURL  https://github.com/abd3lraouf/github-to-gitingest/raw/refs/heads/main/github-to-gitingest.user.js
// @updateURL    https://github.com/abd3lraouf/github-to-gitingest/raw/refs/heads/main/github-to-gitingest.user.js
// ==/UserScript==

(function () {
    'use strict';

    const CONTAINER_ID = 'ghx-tools-container';
    const STYLE_ID = 'ghx-tools-styles';

    // Reserved first-path segments that look like "owner" but are GitHub app routes,
    // not repositories. Anything in here means "not a repo page".
    const RESERVED_OWNERS = new Set([
        'settings', 'organizations', 'orgs', 'users', 'search', 'explore',
        'marketplace', 'sponsors', 'notifications', 'new', 'login', 'signup',
        'features', 'pricing', 'enterprise', 'about', 'contact', 'topics',
        'trending', 'collections', 'events', 'codespaces', 'dashboard',
        'account', 'apps', 'stars', 'watching', 'issues', 'pulls', 'discussions'
    ]);

    /**
     * Resolve the current page to a repository, or null.
     *
     * A page is repo-relative only when the path is `/{owner}/{repo}[/...]` and
     * `owner` isn't one of GitHub's reserved app routes. This deliberately rejects
     * user/org profile pages (`/{owner}` — only one segment) so buttons appear
     * strictly on repository pages, per the "relative pages only" requirement.
     */
    function getRepoInfo() {
        const parts = location.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return null;               // profile / root — not a repo
        const [owner, repo] = parts;
        if (RESERVED_OWNERS.has(owner.toLowerCase())) return null;
        // `repo` can carry a trailing route like `/tree/main`; the first segment is the repo name.
        return { owner, repo };
    }

    /**
     * Inject styles once. Buttons consume GitHub's own Primer CSS variables so they
     * inherit the active theme (light/dark/dimmed) and match native button metrics
     * (28px tall, 6px radius, 12px/500 label) instead of imposing a custom look.
     */
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${CONTAINER_ID} {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-left: 8px;
                vertical-align: middle;
            }
            .ghx-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                height: 28px;
                padding: 0 12px;
                border-radius: 6px;
                font: 500 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
                white-space: nowrap;
                cursor: pointer;
                text-decoration: none;
                user-select: none;
                border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, #d1d9e0));
                background: var(--button-default-bgColor-rest, var(--bgColor-muted, #f6f8fa));
                color: var(--button-default-fgColor-rest, var(--fgColor-default, #1f2328));
                transition: background-color .15s ease, border-color .15s ease, color .15s ease;
            }
            .ghx-btn:hover {
                background: var(--button-default-bgColor-hover, #eef1f4);
                border-color: var(--button-default-borderColor-hover, var(--borderColor-muted, #d1d9e0));
            }
            .ghx-btn:active {
                background: var(--button-default-bgColor-active, #e6eaef);
            }
            .ghx-btn[disabled] {
                opacity: .6;
                cursor: default;
                pointer-events: none;
            }
            .ghx-btn svg {
                fill: currentColor;
                flex-shrink: 0;
            }
            /* Only the Gitingest glyph carries the brand accent; the label stays native. */
            .ghx-btn--gitingest svg { fill: #f97316; }
            /* Transient states for the copy action, using GitHub's semantic tokens. */
            .ghx-btn--success {
                color: var(--fgColor-success, var(--color-success-fg, #1a7f37));
                border-color: var(--fgColor-success, var(--color-success-fg, #1a7f37));
            }
            .ghx-btn--success svg { fill: currentColor; }
            .ghx-btn--error {
                color: var(--fgColor-danger, var(--color-danger-fg, #cf222e));
                border-color: var(--fgColor-danger, var(--color-danger-fg, #cf222e));
            }
        `;
        document.head.appendChild(style);
    }

    /** Build an inline SVG octicon (16x16 viewBox) from one or more path strings. */
    function makeIcon(paths, viewBox = '0 0 16 16') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('aria-hidden', 'true');
        for (const d of [].concat(paths)) {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', d);
            svg.appendChild(p);
        }
        return svg;
    }

    const ICONS = {
        // Sparkle/digest glyph (24-viewBox art scaled into a 16px box).
        gitingest: () => makeIcon(
            'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1zM19 13l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z',
            '0 0 24 24'
        ),
        // Octicon: copy
        copy: () => makeIcon([
            'M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z',
            'M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z'
        ]),
        // Octicon: check
        check: () => makeIcon(
            'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z'
        ),
        // Octicon: alert
        alert: () => makeIcon(
            'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'
        )
    };

    /** Swap a button's icon + label in place. */
    function setButton(btn, icon, label) {
        btn.replaceChildren(icon, Object.assign(document.createElement('span'), { textContent: label }));
    }

    /** Create the Gitingest link button (points at the repo root on gitingest.com). */
    function createGitingestButton({ owner, repo }) {
        const a = document.createElement('a');
        a.className = 'ghx-btn ghx-btn--gitingest';
        a.href = `https://gitingest.com/${owner}/${repo}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = 'Open in Gitingest — convert repo to LLM-friendly text';
        setButton(a, ICONS.gitingest(), 'Gitingest');
        return a;
    }

    /**
     * Create the "Copy README" button. On click it asks GitHub's REST API for the
     * repo's README in raw form — the API resolves the file's real name, folder, and
     * default branch server-side — then writes the Markdown to the clipboard, with
     * transient success/error feedback.
     */
    function createReadmeButton({ owner, repo }) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ghx-btn';
        btn.title = 'Copy this repository\'s README as raw Markdown';
        setButton(btn, ICONS.copy(), 'Copy README');

        let resetTimer = null;
        const flash = (cls, icon, label, ms = 2000) => {
            clearTimeout(resetTimer);
            btn.classList.remove('ghx-btn--success', 'ghx-btn--error');
            if (cls) btn.classList.add(cls);
            setButton(btn, icon, label);
            resetTimer = setTimeout(() => {
                btn.classList.remove('ghx-btn--success', 'ghx-btn--error');
                setButton(btn, ICONS.copy(), 'Copy README');
                btn.disabled = false;
            }, ms);
        };

        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            btn.disabled = true;
            clearTimeout(resetTimer);
            setButton(btn, ICONS.copy(), 'Copying…');
            try {
                const res = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/readme`,
                    { headers: { Accept: 'application/vnd.github.raw' } }
                );
                if (!res.ok) {
                    // 404 = no README; 403 = unauthenticated rate limit (60/hr).
                    throw new Error(res.status === 404 ? 'No README' : `HTTP ${res.status}`);
                }
                const markdown = await res.text();
                await navigator.clipboard.writeText(markdown);
                flash('ghx-btn--success', ICONS.check(), 'Copied');
            } catch (err) {
                const label = err.message === 'No README' ? 'No README' : 'Failed';
                flash('ghx-btn--error', ICONS.alert(), label);
                console.warn('[ghx] Copy README failed:', err);
            }
        });

        return btn;
    }

    /** Build the container holding both buttons. */
    function createContainer(repo) {
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.append(createGitingestButton(repo), createReadmeButton(repo));
        return container;
    }

    /**
     * Insert the buttons, trying anchor points from most to least ideal. Each strategy
     * returns true once it places the container, so we stop at the first that fits the
     * current layout (classic pagehead, React repo header, or the code-view breadcrumb).
     */
    function insertButton() {
        const repo = getRepoInfo();
        if (!repo) return;
        if (document.getElementById(CONTAINER_ID)) return;

        injectStyles();
        const container = createContainer(repo);

        // Strategy 1: classic actions list (Watch / Fork / Star) — sit alongside as an <li>.
        const actionsList = document.querySelector('ul.pagehead-actions');
        if (actionsList) {
            const li = document.createElement('li');
            li.appendChild(container);
            actionsList.prepend(li);
            return;
        }

        // Strategy 2: repo title header — after the visibility (Public/Private) label.
        const titleComponent = document.querySelector('#repo-title-component');
        if (titleComponent) {
            const label = titleComponent.querySelector('.Label');
            if (label && label.parentNode) {
                label.parentNode.insertBefore(container, label.nextSibling);
            } else {
                titleComponent.appendChild(container);
            }
            return;
        }

        // Strategy 3: code-view breadcrumb — next to the copy-path button.
        const breadcrumb = document.querySelector('[data-testid="breadcrumbs-filename"]');
        if (breadcrumb) {
            const copyBtn = breadcrumb.querySelector('button[data-component="IconButton"]');
            if (copyBtn && copyBtn.parentNode) {
                copyBtn.parentNode.insertBefore(container, copyBtn.nextSibling);
            } else {
                breadcrumb.appendChild(container);
            }
            return;
        }

        // Strategy 4: generic repo-header fallback.
        const header = document.querySelector('[data-testid="repository-container-header"]');
        const flex = header && header.querySelector('.d-flex');
        if (flex) flex.appendChild(container);
    }

    function removeButton() {
        const existing = document.getElementById(CONTAINER_ID);
        if (existing) {
            // Also drop the wrapping <li> we may have created in the classic layout.
            const li = existing.closest('li');
            (li && li.children.length === 1 ? li : existing).remove();
        }
    }

    // Debounced re-insert driven by the SPA mutation observer.
    let insertTimeout = null;
    function debouncedInsert() {
        if (document.getElementById(CONTAINER_ID)) return;
        if (insertTimeout) clearTimeout(insertTimeout);
        insertTimeout = setTimeout(insertButton, 50);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertButton);
    } else {
        insertButton();
    }

    // GitHub is a Turbo/PJAX SPA — re-insert on soft navigations and DOM churn.
    new MutationObserver(debouncedInsert).observe(document.body, { childList: true, subtree: true });

    ['turbo:load', 'turbo:render', 'pjax:end'].forEach((evt) => {
        document.addEventListener(evt, () => {
            removeButton();
            setTimeout(insertButton, 100);
        });
    });

    window.addEventListener('popstate', () => {
        removeButton();
        setTimeout(insertButton, 100);
    });
})();
