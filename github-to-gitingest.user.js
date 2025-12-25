// ==UserScript==
// @name         GitHub to Gitingest Button
// @namespace    https://github.com/abd3lraouf
// @version      2.0
// @description  Adds a premium Gitingest button to GitHub repository pages
// @author       abd3lraouf
// @license      MIT
// @match        https://github.com/*
// @grant        none
// @homepageURL  https://github.com/abd3lraouf/github-to-gitingest
// @supportURL   https://github.com/abd3lraouf/github-to-gitingest/issues
// @contributionURL https://greasyfork.org/en/scripts/527278
// @downloadURL  https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js
// @updateURL    https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js
// ==/UserScript==

(function() {
    'use strict';

    const CONTAINER_ID = 'gitingest-container';

    /**
     * Inject CSS styles for the premium button
     */
    function injectStyles() {
        if (document.getElementById('gitingest-styles')) return;

        const style = document.createElement('style');
        style.id = 'gitingest-styles';
        style.textContent = `
            @keyframes gitingest-shimmer {
                0% { transform: translateX(-100%) rotate(15deg); }
                100% { transform: translateX(200%) rotate(15deg); }
            }

            @keyframes gitingest-glow-pulse {
                0%, 100% { box-shadow: 0 0 8px rgba(251, 146, 60, 0.4), 0 0 20px rgba(251, 146, 60, 0.2); }
                50% { box-shadow: 0 0 12px rgba(251, 146, 60, 0.6), 0 0 30px rgba(251, 146, 60, 0.3); }
            }

            #${CONTAINER_ID} {
                position: relative;
                display: inline-flex;
                align-items: center;
                margin-left: 8px;
                vertical-align: middle;
            }

            #${CONTAINER_ID} .gitingest-btn {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 14px;
                height: 28px;
                background: linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
                color: #fff;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                text-decoration: none;
                font-size: 12px;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow:
                    0 1px 2px rgba(0, 0, 0, 0.1),
                    0 2px 8px rgba(249, 115, 22, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
                overflow: hidden;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
            }

            /* Shimmer effect overlay */
            #${CONTAINER_ID} .gitingest-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 50%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.3),
                    transparent
                );
                transform: translateX(-100%) rotate(15deg);
            }

            /* Hover state */
            #${CONTAINER_ID} .gitingest-btn:hover {
                background: linear-gradient(135deg, #fdba74 0%, #fb923c 50%, #f97316 100%);
                transform: translateY(-2px) scale(1.02);
                box-shadow:
                    0 4px 12px rgba(249, 115, 22, 0.4),
                    0 8px 24px rgba(249, 115, 22, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
            }

            /* Shimmer animation on hover */
            #${CONTAINER_ID} .gitingest-btn:hover::before {
                animation: gitingest-shimmer 0.8s ease-in-out;
            }

            /* Active/pressed state */
            #${CONTAINER_ID} .gitingest-btn:active {
                transform: translateY(0) scale(0.98);
                box-shadow:
                    0 1px 4px rgba(249, 115, 22, 0.3),
                    inset 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            /* Icon styling */
            #${CONTAINER_ID} .gitingest-icon {
                width: 14px;
                height: 14px;
                flex-shrink: 0;
                filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
            }

            /* Premium badge dot */
            #${CONTAINER_ID} .gitingest-btn::after {
                content: '';
                position: absolute;
                top: 4px;
                right: 4px;
                width: 4px;
                height: 4px;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                opacity: 0.8;
            }

            /* Dark mode adjustments */
            [data-color-mode="dark"] #${CONTAINER_ID} .gitingest-btn,
            .dark #${CONTAINER_ID} .gitingest-btn {
                box-shadow:
                    0 1px 2px rgba(0, 0, 0, 0.3),
                    0 2px 12px rgba(249, 115, 22, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
            }

            [data-color-mode="dark"] #${CONTAINER_ID} .gitingest-btn:hover,
            .dark #${CONTAINER_ID} .gitingest-btn:hover {
                box-shadow:
                    0 4px 16px rgba(249, 115, 22, 0.5),
                    0 8px 32px rgba(249, 115, 22, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Check if current page is a repository page
     */
    function isRepoPage() {
        const pathParts = location.pathname.split('/').filter(Boolean);
        if (pathParts.length < 2) return false;

        const nonRepoPages = [
            'settings', 'organizations', 'orgs', 'users', 'search',
            'explore', 'marketplace', 'sponsors', 'notifications',
            'new', 'login', 'signup', 'features', 'pricing', 'enterprise'
        ];
        return !nonRepoPages.includes(pathParts[0]);
    }

    /**
     * Get the repository path
     */
    function getRepoPath() {
        return location.pathname;
    }

    /**
     * Create the premium Gitingest button
     */
    function createButton() {
        if (document.getElementById(CONTAINER_ID)) return null;

        const container = document.createElement('div');
        container.id = CONTAINER_ID;

        const button = document.createElement('a');
        button.className = 'gitingest-btn';
        button.href = `https://gitingest.com${getRepoPath()}`;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
        button.title = 'Open in Gitingest - Convert repo to LLM-friendly text';

        // Create sparkle/digest icon
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'gitingest-icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '2');
        icon.setAttribute('stroke-linecap', 'round');
        icon.setAttribute('stroke-linejoin', 'round');

        // Sparkles/magic icon path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1zM19 13l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z');
        icon.appendChild(path);

        const text = document.createElement('span');
        text.textContent = 'Gitingest';

        button.appendChild(icon);
        button.appendChild(text);
        container.appendChild(button);

        return container;
    }

    /**
     * Try multiple insertion points
     */
    function insertButton() {
        if (!isRepoPage()) return;
        if (document.getElementById(CONTAINER_ID)) return;

        injectStyles();
        const button = createButton();
        if (!button) return;

        // Strategy 1: Main repo page - next to repo visibility label
        const repoTitleComponent = document.querySelector('#repo-title-component');
        if (repoTitleComponent) {
            const visibilityLabel = repoTitleComponent.querySelector('.Label');
            if (visibilityLabel) {
                visibilityLabel.parentNode.insertBefore(button, visibilityLabel.nextSibling);
                return;
            }
            repoTitleComponent.appendChild(button);
            return;
        }

        // Strategy 2: Code view - next to copy path button
        const breadcrumbFilename = document.querySelector('[data-testid="breadcrumbs-filename"]');
        if (breadcrumbFilename) {
            const copyButton = breadcrumbFilename.querySelector('button[data-component="IconButton"]');
            if (copyButton) {
                copyButton.parentNode.insertBefore(button, copyButton.nextSibling);
                return;
            }
            breadcrumbFilename.appendChild(button);
            return;
        }

        // Strategy 3: Repository header actions area
        const headerActions = document.querySelector('.pagehead-actions');
        if (headerActions) {
            headerActions.prepend(button);
            return;
        }

        // Strategy 4: New repo layout
        const actionsList = document.querySelector('ul.pagehead-actions');
        if (actionsList) {
            const li = document.createElement('li');
            li.appendChild(button);
            actionsList.prepend(li);
            return;
        }

        // Strategy 5: Generic header
        const repoHeader = document.querySelector('[data-testid="repository-container-header"]') ||
                          document.querySelector('.repository-content') ||
                          document.querySelector('.repohead');
        if (repoHeader) {
            const flexContainer = repoHeader.querySelector('.d-flex');
            if (flexContainer) {
                flexContainer.appendChild(button);
            }
        }
    }

    /**
     * Remove existing button
     */
    function removeButton() {
        const existing = document.getElementById(CONTAINER_ID);
        if (existing) existing.remove();
    }

    /**
     * Debounced insertion
     */
    let insertTimeout = null;
    function debouncedInsert() {
        if (insertTimeout) clearTimeout(insertTimeout);
        insertTimeout = setTimeout(() => {
            if (!document.getElementById(CONTAINER_ID) && isRepoPage()) {
                insertButton();
            }
        }, 50);
    }

    // Initial insertion
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertButton);
    } else {
        insertButton();
    }

    // Observe DOM changes for SPA navigation
    const observer = new MutationObserver(debouncedInsert);
    observer.observe(document.body, { childList: true, subtree: true });

    // Handle various navigation events
    ['turbo:load', 'turbo:render', 'pjax:end'].forEach(event => {
        document.addEventListener(event, () => {
            removeButton();
            setTimeout(insertButton, 100);
        });
    });

    // Handle popstate (back/forward)
    window.addEventListener('popstate', () => {
        removeButton();
        setTimeout(insertButton, 100);
    });
})();
