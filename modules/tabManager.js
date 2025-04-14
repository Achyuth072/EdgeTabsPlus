(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.tabManager = {
        lastTabsState: null,
        pendingRender: false,
        tabUpdateQueue: [],

        init() {
            this.setupMessageListeners();
            this.requestInitialTabs();
            this.setupPageVisibilityListener();
            return this;
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
                                <button class="close-tab" aria-label="Close tab" type="button">×</button>
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
                        tabElement.classList.add('minimal');
                        tabElement.style.removeProperty('--tab-width');
                    } else {
                        tabElement.classList.remove('single-tab', 'minimal');
                        tabElement.style.setProperty('--tab-width', `${tabWidth}px`);
                    }

                    // Update active state
                    tabElement.classList.toggle('active', tab.active);

                    // Update title if changed
                    const titleSpan = tabElement.querySelector('.tab-title');
                    const cleanTitle = tab.title
                        ?.replace(/ at DuckDuckGo$/i, '')
                        ?.replace(/ - DuckDuckGo$/i, '')
                        ?.split(' - ')[0]
                        ?.trim() || 'New Tab';
                    
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
            // Setup message listener for tab updates
            chrome.runtime.onMessage.addListener((message) => {
                if (message.action === 'tabsUpdated' && message.tabs) {
                    // Queue this update
                    EdgeTabsPlus.logger.debug(`Queueing tab update with ${message.tabs.length} tabs`);
                    this.queueTabUpdate(message.tabs);
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

        queueTabUpdate(tabs) {
            // Add to queue
            this.tabUpdateQueue.push(tabs);
            
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
            const tabs = this.tabUpdateQueue.pop();
            // Clear queue since we're using most recent state
            this.tabUpdateQueue = [];

            // Deduplicate tabs
            const uniqueTabs = Array.from(new Map(tabs.map(tab => [tab.id, tab])).values());
            const newState = JSON.stringify(uniqueTabs);

            if (newState !== this.lastTabsState) {
                EdgeTabsPlus.logger.debug(`Processing ${uniqueTabs.length} deduplicated tabs`);
                this.lastTabsState = newState;
                
                // Use requestAnimationFrame to ensure we're in sync with browser's render cycle
                requestAnimationFrame(() => {
                    this.renderTabs(uniqueTabs).finally(() => {
                        this.pendingRender = false;
                        // Process any updates that came in while we were rendering
                        if (this.tabUpdateQueue.length > 0) {
                            this.processNextUpdate();
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