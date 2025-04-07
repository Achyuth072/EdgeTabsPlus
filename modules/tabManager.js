(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.tabManager = {
        lastTabsState: null,

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
                const tabWidth = this.calculateTabWidth(tabs.length);
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

                const fragment = document.createDocumentFragment();
                
                // Create template in document context
                const template = document.createElement('template');
                template.innerHTML = `
                    <li class="tab-item">
                        <div class="tab-content">
                            <div class="tab-info">
                                <div class="tab-favicon"></div> <!-- Changed from img to div -->
                                <span class="tab-title"></span>
                            </div>
                            <div class="close-button-container">
                                <button class="close-tab" aria-label="Close tab" type="button">×</button>
                            </div>
                        </div>
                    </li>
                `.trim();
                
                // Clear existing tabs
                while (tabsList.firstChild) {
                    tabsList.removeChild(tabsList.firstChild);
                }

                // Ensure styles are loaded
                EdgeTabsPlus.styles.addLoggerStyles();
                EdgeTabsPlus.uiComponents.injectStyles();
                
                // Process tabs sequentially
                for (const tab of tabs) {
                    // Clone template for each tab
                    const tabItem = template.content.cloneNode(true).firstElementChild;
                    const favicon = tabItem.querySelector('.tab-favicon');
                    const titleSpan = tabItem.querySelector('.tab-title');
                    
                    // Setup tab item
                    tabItem.dataset.tabId = tab.id;
                    
                    // Set width class
                    if (tabs.length === 1) {
                        tabItem.classList.add('single-tab');
                    } else if (tabs.length >= 5) {
                        tabItem.classList.add('minimal');
                    } else {
                        tabItem.style.setProperty('--tab-width', `${tabWidth}px`);
                    }
                    
                    // Clean and set title
                    const cleanTitle = tab.title
                        ?.replace(/ at DuckDuckGo$/i, '')
                        ?.replace(/ - DuckDuckGo$/i, '')
                        ?.split(' - ')[0]
                        ?.trim() || 'New Tab';
                    titleSpan.textContent = cleanTitle;
                    
                    // Check cache before attempting to load
                    EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Checking cache for ${tab.url}`);
                    const cachedSrc = await EdgeTabsPlus.faviconHandler.getCachedFavicon(tab);
                    let finalSrc = null; // Variable to hold the determined src

                    if (cachedSrc) {
                        EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Cache hit for ${tab.url}. Determined src: ${cachedSrc}`);
                        finalSrc = cachedSrc;
                    } else if (tab.url) { // Only load if not cached and URL exists
                        EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Cache miss for ${tab.url}. Calling loadFavicon.`);
                        try {
                            const loadedSrc = await EdgeTabsPlus.faviconHandler.loadFavicon(tab);
                            EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] loadFavicon returned: ${loadedSrc}. Determined src.`);
                            finalSrc = loadedSrc;
                        } catch (error) {
                            EdgeTabsPlus.logger.error(`[tabManager ${tab.id}] Error loading favicon for ${tab.url}:`, error);
                            const defaultIcon = EdgeTabsPlus.faviconHandler.getDefaultIcon();
                            EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] Determined default icon due to error: ${defaultIcon}`);
                            finalSrc = defaultIcon; // Correct reference
                        }
                    } else {
                        // Handle tabs with no URL (shouldn't happen for edge://newtab)
                        const defaultIcon = EdgeTabsPlus.faviconHandler.getDefaultIcon();
                        EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id}] No URL found. Determined default icon: ${defaultIcon}`);
                        finalSrc = defaultIcon;
                    }

                    // Apply the background-image slightly later using requestAnimationFrame
                    requestAnimationFrame(() => {
                        if (finalSrc) {
                            // Ensure the URL is properly quoted for CSS
                            const bgImageValue = `url("${finalSrc.replace(/"/g, '\\"')}")`;
                            favicon.style.backgroundImage = bgImageValue;
                            EdgeTabsPlus.logger.debug(`[renderTabs ${tab.id} RAF] Applied final favicon background-image: ${bgImageValue}`);
                        } else {
                             EdgeTabsPlus.logger.warn(`[renderTabs ${tab.id} RAF] No finalSrc determined for ${tab.url}, clearing background-image.`);
                             favicon.style.backgroundImage = 'none'; // Clear if no source
                        }
                    });
                    
                    // Set active state
                    if (tab.active) {
                        tabItem.classList.add('active');
                    }
                    
                    // Add to fragment
                    // Check if tab already exists before adding
                    if (!tabsList.querySelector(`[data-tab-id="${tab.id}"]`)) {
                        fragment.appendChild(tabItem);
                    }
                }
        
                // Add all tabs to DOM at once
                tabsList.appendChild(fragment);
                
                // Update UI state
                this.updateMinimalTabs();
                this.updateScrollIndicators();
            } catch (error) {
                EdgeTabsPlus.logger.error('Failed to render tabs:', error);
            }
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
                    const newState = JSON.stringify(message.tabs);
                    if (newState !== this.lastTabsState) {
                        this.lastTabsState = newState;
                        this.renderTabs(message.tabs);
                    }
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
        }
    };
})();