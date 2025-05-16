(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.tabManager = {
        lastTabsState: null,
        pendingRender: false,
        tabUpdateQueue: [],
        scrollUpdateTimeout: null,

        init() {
            this.setupMessageListeners();
            this.requestInitialTabs();
            this.setupPageVisibilityListener();
            this.setupScrollListener();
            return this;
        },

        setupScrollListener() {
            // Only set up the listener once we have the container
            const setupListener = () => {
                const tabStrip = document.getElementById('edgetabs-plus-host');
                if (tabStrip && tabStrip.shadowRoot) {
                    const tabsList = tabStrip.shadowRoot.getElementById('tabs-list');
                    if (tabsList) {
                        // Add debounced scroll event listener to update shared position
                        tabsList.addEventListener('scroll', () => {
                            // Clear any existing timeout
                            if (this.scrollUpdateTimeout) {
                                clearTimeout(this.scrollUpdateTimeout);
                            }
                            
                            // Set new timeout for debounced update
                            this.scrollUpdateTimeout = setTimeout(() => {
                                chrome.runtime.sendMessage({
                                    action: 'UPDATE_SCROLL_POSITION',
                                    position: tabsList.scrollLeft
                                });
                                EdgeTabsPlus.logger.debug(`[ScrollDebug] Sent scroll position update: ${tabsList.scrollLeft}`);
                            }, 100); // 100ms debounce delay
                        });
                        return true;
                    }
                }
                return false;
            };

            // Try to set up immediately
            if (!setupListener()) {
                // If not ready, retry after a short delay
                setTimeout(setupListener, 100);
            }
        },

        setupPageVisibilityListener() {
            // Re-check tabs when page becomes visible again
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.requestInitialTabs();
                }
            });
        },

        calculateTabWidth(tabCount) {
            const TAB_WIDTHS = {
                1: 180, // Single tab
                2: 160, // Two tabs
                3: 120, // Three tabs
                4: 100, // Four tabs
                5: 90   // Five or more tabs
            };

            return tabCount > 5 ? TAB_WIDTHS[5] : TAB_WIDTHS[tabCount];
        },

        async renderTabs(tabs) {
            // LOG: Called renderTabs with tabs
            const logMsg6 = `TM: renderTabs - Called with tabs: ${JSON.stringify(tabs)}`;
            window.postMessage({ extLog: logMsg6 }, '*');
            try {
                // Deduplicate tabs by id
                const uniqueTabs = Array.from(new Map(tabs.map(tab => [tab.id, tab])).values());
                EdgeTabsPlus.logger.debug(`[renderTabs] Starting render of ${uniqueTabs.length} tabs. Pending: ${this.pendingRender}, Queue size: ${this.tabUpdateQueue.length}`);
                const tabWidth = this.calculateTabWidth(uniqueTabs.length);

                const tabStrip = document.getElementById('edgetabs-plus-host');
                if (!tabStrip || !tabStrip.shadowRoot) {
                    EdgeTabsPlus.logger.error('Tab strip or shadow root not found');
                    return;
                }
                
                const tabsList = tabStrip.shadowRoot.getElementById('tabs-list');
                if (!tabsList) {
                    EdgeTabsPlus.logger.error('Tabs list not found in shadow DOM');
                    return;
                }

                // Skip redundant style injection since styles are already loaded
                // during initialization

                // Get current tabs and create a map for quick lookup
                const currentTabs = Array.from(tabsList.querySelectorAll('.tab-item'));
                const currentTabsMap = new Map(
                    currentTabs.map(el => [el.dataset.tabId, el])
                );

                // Create template for new tabs
                const template = document.createElement('template');
                template.innerHTML = `
                    <li class="tab-item">
                        <div class="tab-content">
                            <div class="tab-info">
                                <div class="tab-favicon"></div>
                                <span class="tab-title"></span>
                            </div>
                            <div class="close-button-container">
                                <button class="close-tab" aria-label="Close tab" type="button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </li>
                `.trim();

                // Track tabs to remove
                const tabsToRemove = new Set(currentTabsMap.keys());

                // Process tabs in order
                for (const [index, tab] of uniqueTabs.entries()) {
                    const tabId = tab.id.toString();
                    tabsToRemove.delete(tabId);
                    
                    let tabElement = currentTabsMap.get(tabId);
                    let isNewTab = false;

                    if (!tabElement) {
                        // Create new tab if it doesn't exist
                        tabElement = template.content.cloneNode(true).firstElementChild;
                        tabElement.dataset.tabId = tabId;
                        isNewTab = true;
                    }

                    // Update tab width/classes
                    if (uniqueTabs.length === 1) {
                        tabElement.classList.add('single-tab');
                        tabElement.classList.remove('minimal');
                        tabElement.style.removeProperty('--tab-width');
                    } else if (uniqueTabs.length >= 5) {
                        tabElement.classList.remove('single-tab');
                        
                        // Debug log before changes
                        EdgeTabsPlus.logger.debug(`[TabDebug] Before minimal mode - computed width: ${getComputedStyle(tabElement).width}`);
                        
                        // Set minimal class first
                        tabElement.classList.add('minimal');
                        
                        // Debug log after minimal class
                        EdgeTabsPlus.logger.debug(`[TabDebug] After minimal class - computed width: ${getComputedStyle(tabElement).width}`);
                        
                        // Then set tab width
                        tabElement.style.setProperty('--tab-width', '90px');
                        
                        // Debug log after width property
                        EdgeTabsPlus.logger.debug(`[TabDebug] After width property - computed width: ${getComputedStyle(tabElement).width}, favicon position: ${getComputedStyle(tabElement.querySelector('.tab-favicon')).left}`);
                    } else {
                        tabElement.classList.remove('single-tab', 'minimal');
                        tabElement.style.setProperty('--tab-width', `${tabWidth}px`);
                    }

                    // Update active state
                    tabElement.classList.toggle('active', tab.active);

                    // Update title if changed
                    const titleSpan = tabElement.querySelector('.tab-title');
                    let cleanTitle = 'New Tab';
                    
                    // Log title update for debugging
                    EdgeTabsPlus.logger.debug(`[TitleUpdate ${tab.id}] Processing title "${tab.title}" for ${tab.active ? 'active' : 'background'} tab with status "${tab.status}"`);
                    
                    if (tab.title) {
                        if (tab.title === 'edge://newtab') {
                            cleanTitle = 'New tab';
                        } else if (tab.title === 'Loading...') {
                            // For any tab that still shows "Loading..." (even if not complete),
                            // try to extract title from URL as a fallback
                            EdgeTabsPlus.logger.debug(`[TitleUpdate ${tab.id}] Tab title is still "Loading..." with status "${tab.status}" - Extracting from URL`);
                            try {
                                if (tab.url && tab.url.startsWith('http')) {
                                    const urlObj = new URL(tab.url);
                                    const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
                                    
                                    if (pathSegments.length > 0) {
                                        const lastSegment = pathSegments[pathSegments.length - 1]
                                            .replace(/[-_]/g, ' ')
                                            .replace(/\.\w+$/, '');
                                        
                                        if (lastSegment && lastSegment.length > 1) {
                                            cleanTitle = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
                                        } else {
                                            cleanTitle = urlObj.hostname.replace('www.', '');
                                        }
                                    } else {
                                        cleanTitle = urlObj.hostname.replace('www.', '');
                                    }
                                }
                            } catch (err) {
                                // Keep the title we got from background.js
                                cleanTitle = tab.title;
                            }
                        } else {
                            // First clean up common suffixes
                            cleanTitle = tab.title
                                .replace(/ at DuckDuckGo$/i, '')
                                .replace(/ - DuckDuckGo$/i, '')
                                .replace(/ - Google Search$/i, '')
                                .replace(/ - Bing$/i, '')
                                .replace(/ - Brave Search$/i, '')
                                .replace(/ - YouTube$/i, '')
                                .split(' - ')[0]
                                .trim();
                            
                            // Only apply the URL-like title handling if the title actually is a URL
                            // This prevents domain names from being added to actual page titles
                            const looksExactlyLikeURL =
                                cleanTitle.startsWith('http://') ||
                                cleanTitle.startsWith('https://') ||
                                cleanTitle.startsWith('www.') ||
                                (tab.url && cleanTitle === tab.url);
                            
                            // If title is actually a URL (not just contains domain-like text)
                            if (looksExactlyLikeURL && tab.url) {
                                try {
                                    // Only try to parse URLs that are likely to be valid
                                    if (tab.url.startsWith('http')) {
                                        const urlObj = new URL(tab.url);
                                        cleanTitle = tab.status === 'complete' ? urlObj.hostname.replace('www.', '') : 'Loading...';
                                    } else if (cleanTitle === tab.url) {
                                        // For non-http URLs, simpler handling
                                        cleanTitle = 'Loading...';
                                    }
                                } catch (error) {
                                    // If URL parsing fails, fall back to a simple match check
                                    if (cleanTitle === tab.url) {
                                        cleanTitle = 'Loading...';
                                    }
                                }
                            }
                        }
                    }
                    
                    // Only restore original titles for tabs that aren't already cleaned
                    // This prevents removing our title cleaning when switching tabs
                    if (tab.status === 'complete' && tab.title && tab.title !== 'Loading...' &&
                        !tab.title.startsWith('http') && !tab.title.includes('/') &&
                        // Don't override if we just cleaned a title with domain suffix
                        tab.title === cleanTitle) {
                        // Keep the already cleaned title
                        EdgeTabsPlus.logger.debug(`[TitleUpdate ${tab.id}] Using original title as it's not a URL and hasn't been cleaned`);
                    }
                    
                    // Compare original and cleaned title to debug title cleaning
                    window.postMessage({ extLog: `[TitleUpdate ${tab.id}] Title cleaning: original="${tab.title}", cleaned="${cleanTitle}"` }, '*');
                    
                    if (titleSpan.textContent !== cleanTitle) {
                        titleSpan.textContent = cleanTitle;
                    }

                    // Update favicon if needed
                    const favicon = tabElement.querySelector('.tab-favicon');
                    const cachedSrc = await EdgeTabsPlus.faviconHandler.getCachedFavicon(tab);
                    
                    if (cachedSrc) {
                        EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Cache hit for ${tab.url}`);
                        this.updateFavicon(favicon, cachedSrc, tab);
                    } else if (tab.url) {
                        EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Cache miss for ${tab.url}`);
                        try {
                            const loadedSrc = await EdgeTabsPlus.faviconHandler.loadFavicon(tab);
                            this.updateFavicon(favicon, loadedSrc, tab);
                        } catch (error) {
                            EdgeTabsPlus.logger.error(`[tabManager ${tab.id}] Error loading favicon:`, error);
                            this.updateFavicon(favicon, EdgeTabsPlus.faviconHandler.getDefaultIcon(), tab);
                        }
                    } else {
                        this.updateFavicon(favicon, EdgeTabsPlus.faviconHandler.getDefaultIcon(), tab);
                    }

                    if (isNewTab) {
                        // Ensure styles are applied before inserting tab
                        requestAnimationFrame(() => {
                            // Set initial invisible state
                            tabElement.style.opacity = '0';
                            
                            // Find the correct position to insert the new tab
                            const nextTabId = uniqueTabs[index + 1]?.id;
                            const nextElement = nextTabId ? tabsList.querySelector(`[data-tab-id="${nextTabId}"]`) : null;
                            tabsList.insertBefore(tabElement, nextElement);

                            // Force a reflow to ensure styles are applied
                            void tabElement.offsetHeight;

                            // Make visible with transition
                            requestAnimationFrame(() => {
                                tabElement.style.transition = 'opacity 0.2s ease-in-out';
                                tabElement.style.opacity = '1';
                            });
                        });
                    }
                }

                // Remove tabs that are no longer present
                for (const tabId of tabsToRemove) {
                    const element = currentTabsMap.get(tabId);
                    if (element && element.parentNode === tabsList) {
                        tabsList.removeChild(element);
                    }
                }

                // Update UI state and log completion
                this.updateMinimalTabs();
                EdgeTabsPlus.logger.debug(`[renderTabs] Completed render of ${uniqueTabs.length} tabs successfully`);
                this.updateScrollIndicators();
            } catch (error) {
                EdgeTabsPlus.logger.error('Failed to render tabs:', error);
            }
        },

        updateFavicon(faviconElement, src, tab) {
            if (!faviconElement || !src) return;
            
            requestAnimationFrame(() => {
                const bgImageValue = `url("${src.replace(/"/g, '\\"')}")`;
                if (faviconElement.style.backgroundImage !== bgImageValue) {
                    faviconElement.style.backgroundImage = bgImageValue;
                    EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Updated favicon: ${bgImageValue}`);
                }
            });
        },

        updateScrollIndicators() {
            const tabStrip = document.getElementById('edgetabs-plus-host');
            if (!tabStrip || !tabStrip.shadowRoot) return;
            
            const tabsList = tabStrip.shadowRoot.getElementById('tabs-list');
            if (!tabsList) return;
            
            const hasLeftScroll = tabsList.scrollLeft > 10;
            const hasRightScroll = tabsList.scrollLeft < (tabsList.scrollWidth - tabsList.clientWidth - 10);
            
            tabsList.classList.toggle('scroll-left', hasLeftScroll);
            tabsList.classList.toggle('scroll-right', hasRightScroll);
        },

        updateMinimalTabs() {
            const tabStrip = document.getElementById('edgetabs-plus-host');
            if (!tabStrip || !tabStrip.shadowRoot) return;
            
            const tabs = tabStrip.shadowRoot.querySelectorAll('.tab-item');
            const TAB_THRESHOLD = 5;
            
            tabs.forEach(tab => {
                tab.classList.remove('minimal', 'single-tab');
                
                if (tabs.length === 1) {
                    tab.classList.add('single-tab');
                } else if (tabs.length >= TAB_THRESHOLD) {
                    tab.classList.add('minimal');
                }
            });
        },

        setupMessageListeners() {
            // Setup message listener for tab updates and forwarded logs from background
            chrome.runtime.onMessage.addListener((message) => {
                if (message.action === 'tabsUpdated' && message.tabs) {
                    // LOG: Received tabsUpdated message
                    const logMsg1 = `TM: Message Listener - Received "tabsUpdated". Tab count: ${message.tabs.length}, Full data: ${JSON.stringify(message.tabs)}`;
                    window.postMessage({ extLog: logMsg1 }, '*');
                    // Queue this update with scroll position
                    EdgeTabsPlus.logger.debug(`Queueing tab update with ${message.tabs.length} tabs and scroll position ${message.sharedScrollPosition}`);
                    this.queueTabUpdate(message.tabs, message.sharedScrollPosition);
                }

                // Listen for logs forwarded from background.js and relay to Eruda
                if (message.action === 'forwardLogToEruda' && message.logEntry) {
                    window.postMessage({ extLog: message.logEntry }, '*');
                    // Optionally, could send a response here if needed
                }
            });

            // Setup event delegation for tab interactions
            EdgeTabsPlus.uiComponents.tabsList.addEventListener('click', (e) => {
                const tabItem = e.target.closest('.tab-item');
                if (!tabItem) return;

                const tabId = parseInt(tabItem.dataset.tabId, 10);
                if (!tabId) return;

                // Handle close button clicks
                if (e.target.closest('.close-tab')) {
                    e.stopPropagation();
                    chrome.runtime.sendMessage({
                        action: 'closeTab',
                        tabId: tabId
                    });
                    return;
                }

                // Handle tab activation
                chrome.runtime.sendMessage({
                    action: 'activateTab',
                    tabId: tabId
                });
            });
        },

        requestInitialTabs() {
            chrome.runtime.sendMessage({ action: 'getTabs' });
        },

        queueTabUpdate(tabs, scrollPosition) {
            // Add to queue with scroll position
            this.tabUpdateQueue.push({ tabs, scrollPosition });
            
            // Process queue if no render is pending
            if (!this.pendingRender) {
                this.processNextUpdate();
            }
        },

        processNextUpdate() {
            if (this.tabUpdateQueue.length === 0) {
                this.pendingRender = false;
                return;
            }

            this.pendingRender = true;

            // Get most recent update
            const update = this.tabUpdateQueue.pop();
            // Clear queue since we're using most recent state
            this.tabUpdateQueue = [];

            // Deduplicate tabs
            const uniqueTabs = Array.from(new Map(update.tabs.map(tab => [tab.id, tab])).values());
            
            // Special handling for background tab title updates
            // Look for background tabs that either:
            // 1. Are complete and not active (original condition)
            // 2. Have a real title (not "Loading...") regardless of status
            const hasCompletedTabsToUpdate = update.tabs.some(tab =>
                (!tab.active) && (
                    tab.status === 'complete' ||
                    (tab.title && tab.title !== 'Loading...')
                )
            );
            
            const newState = JSON.stringify(uniqueTabs);

            // LOG: Compare new and old tab states
            const logMsg2 = `TM: processNextUpdate - Comparing states. New state tab count: ${uniqueTabs.length}, Old state tab count: ${JSON.parse(this.lastTabsState || '[]').length}`;
            window.postMessage({ extLog: logMsg2 }, '*');
            const logMsg3 = `TM: processNextUpdate - New state: ${newState}`;
            window.postMessage({ extLog: logMsg3 }, '*');
            const logMsg4 = `TM: processNextUpdate - Last state: ${this.lastTabsState}`;
            window.postMessage({ extLog: logMsg4 }, '*');
            const logMsg5 = `TM: processNextUpdate - States equal: ${newState === this.lastTabsState}`;
            window.postMessage({ extLog: logMsg5 }, '*');
            
            if (hasCompletedTabsToUpdate) {
                window.postMessage({ extLog: `TM: processNextUpdate - Force update for background tabs with real titles (status: ${update.tabs.filter(t => !t.active && t.title && t.title !== 'Loading...').map(t => t.status).join(',')})` }, '*');
            }

            if (newState !== this.lastTabsState || hasCompletedTabsToUpdate) {
                EdgeTabsPlus.logger.debug(`Processing ${uniqueTabs.length} deduplicated tabs`);
                this.lastTabsState = newState;
                
                // Use requestAnimationFrame to ensure we're in sync with browser's render cycle
                requestAnimationFrame(() => {
                    this.renderTabs(uniqueTabs).finally(() => {
                        // Get reference to tabsList before rAF
                        const tabStrip = document.getElementById('edgetabs-plus-host');
                        const tabsList = tabStrip?.shadowRoot?.getElementById('tabs-list');

                        if (tabsList) {
                            EdgeTabsPlus.logger.debug(`[ScrollDebug] Before restoring - Current scrollLeft: ${tabsList.scrollLeft}`);
                            
                            requestAnimationFrame(() => {
                                if (tabsList) { // Verify element still exists
                                    const maxScrollLeft = tabsList.scrollWidth - tabsList.clientWidth;
                                    // Ensure the position to restore is not greater than the maximum possible scroll
                                    const validScrollPosition = Math.max(0, Math.min(update.scrollPosition, maxScrollLeft));

                                    EdgeTabsPlus.logger.debug(`[ScrollDebug] Attempting restore - Shared: ${update.scrollPosition}, Max: ${maxScrollLeft}, Valid: ${validScrollPosition}`);
                                    tabsList.scrollLeft = validScrollPosition;
                                    EdgeTabsPlus.logger.debug(`[ScrollDebug] After restoring (in rAF) - New scrollLeft: ${tabsList.scrollLeft}`);
                                }
                                
                                this.pendingRender = false;
                                // Process any updates that came in while we were rendering
                                if (this.tabUpdateQueue.length > 0) {
                                    this.processNextUpdate();
                                }
                            });
                            
                            // Keep processing queue even with restoration disabled
                            this.pendingRender = false;
                            if (this.tabUpdateQueue.length > 0) {
                                this.processNextUpdate();
                            }
                        } else {
                            this.pendingRender = false;
                            if (this.tabUpdateQueue.length > 0) {
                                this.processNextUpdate();
                            }
                        }
                    });
                });
            } else {
                EdgeTabsPlus.logger.debug('Ignoring duplicate tabs update');
                this.pendingRender = false;
                // Check for more updates
                if (this.tabUpdateQueue.length > 0) {
                    this.processNextUpdate();
                }
            }
        }
    };
})();