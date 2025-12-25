// ==UserScript==
// @name         GitHub to Gitingest Button
// @namespace    https://github.com/abd3lraouf
// @version      1.1
// @description  Adds a Gitingest button to GitHub repository pages (works on all repo paths)
// @author       abd3lraouf
// @license      MIT
// @match        https://github.com/*
// @grant        none
// @homepageURL  https://github.com/abd3lraouf/github-to-gitingest
// @supportURL   https://github.com/abd3lraouf/github-to-gitingest/issues
// @original     https://greasyfork.org/en/scripts/527278
// @downloadURL  https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js
// @updateURL    https://raw.githubusercontent.com/abd3lraouf/github-to-gitingest/main/github-to-gitingest.user.js
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'gitingest-button';
    const CONTAINER_ID = 'gitingest-container';

    // Brand colors
    const COLORS = {
        primary: '#f97316',      // Orange
        primaryHover: '#ea580c', // Darker orange
        shadow: '#c2410c',       // Dark orange for shadow
        text: '#ffffff',         // White text
    };

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
     * Create the distinctive 3D-style Gitingest button
     */
    function createButton() {
        if (document.getElementById(CONTAINER_ID)) return null;

        // Container for 3D effect
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        Object.assign(container.style, {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '8px',
            verticalAlign: 'middle',
        });

        // Shadow layer (creates 3D depth)
        const shadow = document.createElement('div');
        Object.assign(shadow.style, {
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.shadow,
            borderRadius: '6px',
            top: '2px',
            left: '2px',
        });

        // Main button
        const button = document.createElement('a');
        button.id = BUTTON_ID;
        button.href = `https://gitingest.com${getRepoPath()}`;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
        button.title = 'Open in Gitingest - Convert repo to LLM-friendly text';
        button.textContent = 'Gitingest';

        Object.assign(button.style, {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            height: '28px',
            backgroundColor: COLORS.primary,
            color: COLORS.text,
            borderRadius: '6px',
            cursor: 'pointer',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
            transition: 'transform 0.1s ease-out, background-color 0.1s ease-out',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        });

        // Hover effects
        container.addEventListener('mouseenter', () => {
            button.style.transform = 'translate(-1px, -1px)';
            button.style.backgroundColor = COLORS.primaryHover;
        });
        container.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0)';
            button.style.backgroundColor = COLORS.primary;
        });

        // Active/click effect
        button.addEventListener('mousedown', () => {
            button.style.transform = 'translate(1px, 1px)';
        });
        button.addEventListener('mouseup', () => {
            button.style.transform = 'translate(-1px, -1px)';
        });

        container.appendChild(shadow);
        container.appendChild(button);

        return container;
    }

    /**
     * Try multiple insertion points
     */
    function insertButton() {
        if (!isRepoPage()) return;
        if (document.getElementById(CONTAINER_ID)) return;

        const button = createButton();
        if (!button) return;

        // Strategy 1: Main repo page - next to repo visibility label (Public/Private)
        const repoTitleComponent = document.querySelector('#repo-title-component');
        if (repoTitleComponent) {
            const visibilityLabel = repoTitleComponent.querySelector('.Label');
            if (visibilityLabel) {
                visibilityLabel.parentNode.insertBefore(button, visibilityLabel.nextSibling);
                return;
            }
            // If no label, append to title component
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

        // Strategy 4: New repo layout - action buttons area
        const actionsList = document.querySelector('ul.pagehead-actions');
        if (actionsList) {
            const li = document.createElement('li');
            li.appendChild(button);
            actionsList.prepend(li);
            return;
        }

        // Strategy 5: Generic - find any suitable header
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
