// ==UserScript==
// @name         GitHub to Gitingest + Copy README
// @namespace    https://github.com/abd3lraouf
// @version      3.3
// @description  Adds native GitHub buttons: open the repo in Gitingest and copy its README as raw Markdown — a split button with a dropdown picker when a repo has multiple READMEs
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
     * Inject the handful of styles we still own. The buttons themselves use GitHub's
     * native Primer classes (`btn`, `BtnGroup`, `SelectMenu`, …) so they inherit the
     * active theme and native metrics for free — we only need container layout and a
     * currentColor fallback for our octicons.
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
            /* Paint our octicons with the button's text color even if Primer's
               .octicon rule isn't on the page; the gradient sparkle keeps its own fill. */
            #${CONTAINER_ID} .octicon,
            #${CONTAINER_ID} .SelectMenu .octicon {
                fill: currentColor;
            }
            /* Drop the README picker below the split button. Primer leaves the
               absolutely-positioned SelectMenu at top:auto, which overlaps the button. */
            @media (min-width: 544px) {
                #${CONTAINER_ID} .SelectMenu { top: 100%; }
            }
        `;
        document.head.appendChild(style);
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';

    /** Build an inline SVG octicon (16x16 viewBox) from one or more path strings. */
    function makeIcon(paths, viewBox = '0 0 16 16') {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'octicon');
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
            svg.setAttribute('class', 'octicon');
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
        ),
        // Octicon: file — used for each entry in the multi-README picker.
        file: () => makeIcon(
            'M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 0 0-.011-.013l-2.914-2.914a.272.272 0 0 0-.013-.011Z'
        ),
        // Octicon: triangle-down — the dropdown caret shown when a repo has many READMEs.
        caret: () => makeIcon(
            'm4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z'
        ),
        // Octicon: x — close button in the picker header.
        x: () => makeIcon(
            'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z'
        )
    };

    /**
     * Fill a native .btn with a leading octicon + label, exactly like GitHub's own
     * buttons: the icon is a direct child with `octicon mr-2` and inherits Primer's
     * vertical alignment. No wrapper — that would change the button height and break
     * the BtnGroup seam.
     */
    function fillButton(btn, icon, label) {
        icon.classList.add('mr-2');
        btn.replaceChildren(icon, Object.assign(document.createElement('span'), { textContent: label }));
    }

    /** Create the Gitingest link button (native .btn pointing at gitingest.com). */
    function createGitingestButton({ owner, repo }) {
        const a = document.createElement('a');
        a.className = 'btn btn-sm';
        a.href = `https://gitingest.com/${owner}/${repo}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = 'Open in Gitingest — convert repo to LLM-friendly text';
        fillButton(a, ICONS.gitingest(), 'Gitingest');
        return a;
    }

    // Candidate README filenames, most common first. raw.githubusercontent.com is
    // case-sensitive, so the casings seen in the wild are listed explicitly.
    const README_CANDIDATES = [
        'README.md', 'readme.md', 'Readme.md',
        'README.markdown', 'README.rst', 'README.txt',
        'README.adoc', 'README.org', 'README'
    ];

    // Matches README, README.md, README.zh-CN.md, README_ja.md, readme-old.txt, … but
    // not unrelated names like READMEISH — a separator or end must follow "readme".
    const README_RE = /^readme([._-].*)?$/i;

    /**
     * Sort key that floats the "default" README to the front: unqualified / English
     * first, then by extension (Markdown ahead of the rest). Localized variants
     * (README-zh_CN.md, README.ja.md, …) sort after. Lower is earlier.
     */
    function readmeSortKey(name) {
        const dot = name.lastIndexOf('.');
        const ext = (dot > 0 ? name.slice(dot + 1) : '').toLowerCase();
        const stem = dot > 0 ? name.slice(0, dot) : name;
        // Qualifier = whatever follows "readme" once a leading separator is stripped.
        const q = stem.replace(/^readme/i, '').replace(/^[._-]/, '').toLowerCase();
        const localeRank = q === '' ? 0 : /^en([_-]|$)/.test(q) ? 1 : 2;   // plain → english → other
        const extRank = (ext === 'md' || ext === 'markdown') ? 0 : ext === '' ? 1 : 2;
        return [localeRank, extRank];
    }

    /** Stable signature of a discovered README set, for change detection on refresh. */
    function readmeSignature(list) {
        return list.map((r) => `${r.ref}/${r.path}`).join('|');
    }

    /**
     * Discover every root-level README the current page already exposes. The repo home
     * (and any tree page) lists each file as a `/{owner}/{repo}/blob/{ref}/{name}` link,
     * so this finds localized variants (README.md, README.zh-CN.md, …) with their exact
     * ref and casing and zero network requests. Returns [] when no listing is present.
     * The first entry is the "default" README (unqualified English Markdown when present).
     */
    function discoverReadmes(owner, repo) {
        const prefix = `/${owner}/${repo}/blob/`;
        const byPath = new Map();
        for (const a of document.querySelectorAll(`a[href^="${prefix}"]`)) {
            const rest = a.getAttribute('href').slice(prefix.length);
            const slash = rest.indexOf('/');
            if (slash < 0) continue;
            const ref = decodeURIComponent(rest.slice(0, slash));
            const path = rest.slice(slash + 1).split(/[#?]/)[0];
            if (path.includes('/')) continue;            // root-level files only
            if (!README_RE.test(path)) continue;
            if (!byPath.has(path)) byPath.set(path, { ref, path });
        }
        return [...byPath.values()].sort((a, b) => {
            const ka = readmeSortKey(a.path), kb = readmeSortKey(b.path);
            return ka[0] - kb[0] || ka[1] - kb[1] || a.path.localeCompare(b.path);
        });
    }

    /** Fetch one raw file from the CDN; throws on any non-OK response. */
    async function fetchRawPath(owner, repo, { ref, path }) {
        const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`);
        if (!res.ok) throw new Error('Failed');
        return res.text();
    }

    /**
     * Fallback resolver for pages that don't list files (e.g. the blob view): probe
     * common filenames at the `HEAD` ref, which GitHub resolves to the default branch
     * (main/master) server-side. Uses raw.githubusercontent.com — a CORS-enabled CDN
     * with none of the REST API's 60-request/hour unauthenticated limit (the 403).
     */
    async function fetchReadmeMarkdown(owner, repo) {
        for (const path of README_CANDIDATES) {
            try {
                const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`);
                if (res.ok) return res.text();
            } catch {
                // transient failure on one candidate — try the next
            }
        }
        throw new Error('No README');
    }

    /**
     * Build the "Copy README" control. Returns either a plain native button (0–1 README)
     * or a native split BtnGroup (2+ READMEs): a main button that copies the default
     * README plus a `<details>`/`SelectMenu` caret to pick a specific one. The returned
     * root carries a `data-ghx-sig` signature so the observer can tell when to rebuild.
     */
    function buildReadmeControl(owner, repo) {
        const readmes = discoverReadmes(owner, repo);
        const many = readmes.length > 1;

        const main = document.createElement('button');
        main.type = 'button';
        main.className = 'btn btn-sm ghx-readme-main' + (many ? ' BtnGroup-item' : '');
        main.title = 'Copy this repository\'s README as raw Markdown';
        fillButton(main, ICONS.copy(), 'Copy README');

        // Transient feedback lives on the main button, expressed with Primer utilities.
        let resetTimer = null;
        const paintIdle = () => {
            main.classList.remove('color-fg-success', 'color-fg-danger');
            fillButton(main, ICONS.copy(), 'Copy README');
            main.disabled = false;
        };
        const flash = (cls, icon, label, ms = 2000) => {
            clearTimeout(resetTimer);
            main.classList.remove('color-fg-success', 'color-fg-danger');
            if (cls) main.classList.add(cls);
            fillButton(main, icon, label);
            resetTimer = setTimeout(paintIdle, ms);
        };
        const copy = async (getMarkdown) => {
            if (main.disabled) return;
            main.disabled = true;
            clearTimeout(resetTimer);
            fillButton(main, ICONS.copy(), 'Copying…');
            try {
                const markdown = await getMarkdown();
                await navigator.clipboard.writeText(markdown);
                flash('color-fg-success', ICONS.check(), 'Copied');
            } catch (err) {
                flash('color-fg-danger', ICONS.alert(), err.message === 'No README' ? 'No README' : 'Failed');
                console.warn('[ghx] Copy README failed:', err);
            }
        };

        // Main button copies the default (first) README; falls back to a probe when the
        // page listed none (e.g. a blob subpage).
        main.addEventListener('click', () => {
            copy(() => readmes.length >= 1
                ? fetchRawPath(owner, repo, readmes[0])
                : fetchReadmeMarkdown(owner, repo));
        });

        if (!many) {
            main.dataset.ghxSig = readmeSignature(readmes);
            return main;
        }

        // Split button: native BtnGroup + a details/SelectMenu picker (like Fork).
        const group = document.createElement('div');
        group.className = 'BtnGroup d-flex ghx-readme-group';
        group.dataset.ghxSig = readmeSignature(readmes);

        const details = document.createElement('details');
        details.className = 'details-reset details-overlay BtnGroup-parent d-inline-block position-relative';

        // `float-none` matches GitHub's own split summary — BtnGroup-item floats left,
        // which misaligns it inside the non-flex <details> parent without this reset.
        const summary = document.createElement('summary');
        summary.className = 'btn btn-sm BtnGroup-item px-2 float-none';
        summary.setAttribute('role', 'button');
        summary.setAttribute('aria-haspopup', 'menu');
        summary.setAttribute('aria-label', 'Choose a README to copy');
        summary.appendChild(ICONS.caret());

        const menu = document.createElement('details-menu');
        menu.className = 'SelectMenu right-0';
        menu.setAttribute('role', 'menu');

        const modal = document.createElement('div');
        modal.className = 'SelectMenu-modal';

        const header = document.createElement('header');
        header.className = 'SelectMenu-header';
        const title = document.createElement('h3');
        title.className = 'SelectMenu-title';
        title.textContent = 'Copy README';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'SelectMenu-closeButton';
        closeBtn.setAttribute('aria-label', 'Close menu');
        closeBtn.appendChild(ICONS.x());
        closeBtn.addEventListener('click', () => { details.open = false; });
        header.append(title, closeBtn);

        const list = document.createElement('div');
        list.className = 'SelectMenu-list';
        for (const item of readmes) {
            const it = document.createElement('button');
            it.type = 'button';
            it.className = 'SelectMenu-item';
            it.setAttribute('role', 'menuitem');
            const icon = ICONS.file();
            icon.classList.add('mr-2');
            it.append(icon, Object.assign(document.createElement('span'), { textContent: item.path }));
            it.addEventListener('click', (e) => {
                e.preventDefault();
                details.open = false;   // close the dropdown (details-menu also auto-closes)
                copy(() => fetchRawPath(owner, repo, item));
            });
            list.appendChild(it);
        }

        modal.append(header, list);
        menu.appendChild(modal);
        details.append(summary, menu);
        group.append(main, details);
        return group;
    }

    /**
     * Rebuild the Copy README control when the discovered README set changes — most
     * importantly when GitHub streams the file list in after mount and the count crosses
     * the 1↔2 boundary (plain button ↔ split button). Skips rebuilding while a copy is
     * in flight, a result is showing, or the picker is open, so nothing flickers.
     */
    function refreshReadmeControl() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;
        const root = container.querySelector('.ghx-readme-main, .ghx-readme-group');
        if (!root) return;
        const main = root.classList.contains('ghx-readme-main') ? root : root.querySelector('.ghx-readme-main');
        if (!main || main.disabled) return;                                   // mid-copy
        if (main.classList.contains('color-fg-success') || main.classList.contains('color-fg-danger')) return;
        if (root.querySelector('details[open]')) return;                      // picker open
        const repo = getRepoInfo();
        if (!repo) return;
        const readmes = discoverReadmes(repo.owner, repo.repo);
        if (root.dataset.ghxSig === readmeSignature(readmes)) return;         // unchanged
        root.replaceWith(buildReadmeControl(repo.owner, repo.repo));
    }

    /** Build the container holding both buttons. */
    function createContainer(repo) {
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.append(createGitingestButton(repo), buildReadmeControl(repo.owner, repo.repo));
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

    // Debounced work driven by the SPA mutation observer: insert the buttons when
    // they're missing, or rebuild the README control as the file list streams in.
    let insertTimeout = null;
    function debouncedInsert() {
        if (insertTimeout) clearTimeout(insertTimeout);
        insertTimeout = setTimeout(() => {
            if (document.getElementById(CONTAINER_ID)) refreshReadmeControl();
            else insertButton();
        }, 50);
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
