// ==UserScript==
// @name         GitHub to Gitingest + Copy README
// @namespace    https://github.com/abd3lraouf
// @version      3.1
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

    const SVG_NS = 'http://www.w3.org/2000/svg';

    /** Build an inline SVG octicon (16x16 viewBox) from one or more path strings. */
    function makeIcon(paths, viewBox = '0 0 16 16') {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('aria-hidden', 'true');
        for (const d of [].concat(paths)) {
            const p = document.createElementNS(SVG_NS, 'path');
            p.setAttribute('d', d);
            svg.appendChild(p);
        }
        return svg;
    }

    // Primer's crisp sparkle glyph, reused at two sizes to make the Gitingest mark.
    const SPARKLE_D = 'M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z';

    const ICONS = {
        /**
         * Gitingest "digest" mark: a primary Primer sparkle plus a small accent star,
         * both painted with an amber→orange→magenta gradient. The gradient lives in the
         * icon's own <defs>, so the mark keeps its brand color regardless of button state.
         */
        gitingest: () => {
            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('viewBox', '0 0 16 16');
            svg.setAttribute('width', '16');
            svg.setAttribute('height', '16');
            svg.setAttribute('aria-hidden', 'true');

            const defs = document.createElementNS(SVG_NS, 'defs');
            const grad = document.createElementNS(SVG_NS, 'linearGradient');
            grad.setAttribute('id', 'ghx-gitingest-grad');
            grad.setAttribute('x1', '1');
            grad.setAttribute('y1', '1');
            grad.setAttribute('x2', '15');
            grad.setAttribute('y2', '15');
            grad.setAttribute('gradientUnits', 'userSpaceOnUse');
            [['0', '#fbbf24'], ['0.55', '#f97316'], ['1', '#ec4899']].forEach(([offset, color]) => {
                const stop = document.createElementNS(SVG_NS, 'stop');
                stop.setAttribute('offset', offset);
                stop.setAttribute('stop-color', color);
                grad.appendChild(stop);
            });
            defs.appendChild(grad);
            svg.appendChild(defs);

            const FILL = 'url(#ghx-gitingest-grad)';
            // Primary sparkle, scaled down and nudged toward the lower-left…
            const main = document.createElementNS(SVG_NS, 'path');
            main.setAttribute('d', SPARKLE_D);
            main.setAttribute('fill', FILL);
            main.setAttribute('transform', 'translate(-0.6 0.9) scale(0.86)');
            svg.appendChild(main);
            // …leaving the top-right corner for a small accent star.
            const accent = document.createElementNS(SVG_NS, 'path');
            accent.setAttribute('d', SPARKLE_D);
            accent.setAttribute('fill', FILL);
            accent.setAttribute('transform', 'translate(10.2 0.1) scale(0.34)');
            svg.appendChild(accent);

            return svg;
        },
        // Octicon: book — mirrors GitHub's own README glyph, so the button reads as "the README".
        copy: () => makeIcon(
            'M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z'
        ),
        // Octicon: check-circle-fill — a solid confirmation mark for the copied state.
        check: () => makeIcon(
            'M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z'
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
