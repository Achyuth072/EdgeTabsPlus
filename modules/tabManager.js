(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.tabManager = {
        lastTabsState: null,
        scrollPositionMemory: new Map(), // Store scroll positions per tabId

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
            const tabWidth = this.calculateTabWidth(tabs.length);
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            let activeTabId = null;
            
            // Find active tab before rendering
            const activeTab = tabs.find(tab => tab.active);
            if (activeTab) {
                activeTabId = activeTab.id;
                
                // Remember the scroll position before re-rendering
                if (tabsList && EdgeTabsPlus.settings.retainScrollPosition) {
                    this.scrollPositionMemory.set('lastScrollPosition', tabsList.scrollLeft);
                }
            }
            
            tabsList.innerHTML = '';
            
            // Process tabs sequentially to maintain order
            for (const tab of tabs) {
                const tabItem = document.createElement('li');
                tabItem.className = 'tab-item';
                tabItem.dataset.tabId = tab.id;
                
                if (tabs.length === 1) {
                    tabItem.classList.add('single-tab');
                } else if (tabs.length >= 5) {
                    tabItem.classList.add('minimal');
                } else {
                    tabItem.style.setProperty('--tab-width', `${tabWidth}px`);
                }
                
                tabItem.style.minHeight = '40px';
                
                // Create and style favicon image
                const favicon = new Image();
                favicon.style.width = '20px';
                favicon.style.height = '20px';
                favicon.style.marginRight = '8px';
                favicon.decoding = 'sync';

                // Load favicon using faviconHandler
                try {
                    const faviconUrl = await EdgeTabsPlus.faviconHandler.loadFavicon(tab);
                    EdgeTabsPlus.logger.addLog(`Loaded favicon for tab ${tab.id}: ${faviconUrl}`);
                    favicon.src = faviconUrl;
                } catch (error) {
                    EdgeTabsPlus.logger.error(`Failed to load favicon for tab ${tab.id}: ${error.message}`);
                    favicon.src = EdgeTabsPlus.faviconHandler.getDefaultIcon();
                }

                // Title handling
                const titleSpan = document.createElement('span');
                titleSpan.style.overflow = 'hidden';
                titleSpan.style.textOverflow = 'ellipsis';
                titleSpan.style.whiteSpace = 'nowrap';
                titleSpan.style.flexGrow = '1';
                
                // Enhanced title cleaning
                let cleanTitle = tab.title;
                cleanTitle = cleanTitle
                    .replace(/ at DuckDuckGo$/i, '')
                    .replace(/ - DuckDuckGo$/i, '')
                    .split(' - ')[0]
                    .trim();
                    
                titleSpan.textContent = cleanTitle || 'New Tab';

                // Assemble tab item
                tabItem.appendChild(favicon);
                
                const titleContainer = document.createElement('div');
                titleContainer.style.flex = '1';
                titleContainer.style.minWidth = '0';
                titleContainer.style.overflow = 'hidden';
                titleContainer.appendChild(titleSpan);
                
                tabItem.appendChild(titleContainer);
                
                const closeButton = document.createElement('span');
                closeButton.innerHTML = '×';
                closeButton.className = 'close-tab';
                closeButton.style.marginLeft = '5px';
                closeButton.onclick = (e) => {
                    e.stopPropagation();
                    chrome.runtime.sendMessage({ action: 'closeTab', tabId: tab.id });
                };
                
                tabItem.onclick = () => this.handleTabClick(tab);
                
                if (tab.active) {
                    tabItem.classList.add('active');
                    
                    // Defer scrolling to allow layout to complete
                    if (EdgeTabsPlus.settings.retainScrollPosition) {
                        requestAnimationFrame(() => {
                            this.scrollToActiveTab(tab.id);
                        });
                    }
                }
                
                tabItem.appendChild(closeButton);
                tabsList.appendChild(tabItem);
            }
            
            this.updateMinimalTabs();
            this.updateScrollIndicators();
        },

        handleTabClick(tab) {
            const tabId = tab.id;
            
            // Store current scroll position before switching
            const tabsList = document.getElementById('tabs-list');
            if (tabsList) {
                this.scrollPositionMemory.set('lastScrollPosition', tabsList.scrollLeft);
            }
            
            chrome.runtime.sendMessage({ 
                action: 'activateTab', 
                tabId: tabId 
            });
            
            // Use double requestAnimationFrame to ensure full tab switch occurs before scrolling
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.scrollToActiveTab(tabId);
                });
            });
        },

        scrollToActiveTab(tabId) {
            if (!EdgeTabsPlus.settings.retainScrollPosition) return;
            
            const tabsList = document.getElementById('tabs-list');
            const activeTab = tabsList.querySelector(`[data-tab-id="${tabId}"]`);
            
            if (!activeTab || !tabsList) return;
            
            // Get dimensions
            const tabLeft = activeTab.offsetLeft;
            const tabWidth = activeTab.offsetWidth;
            const listWidth = tabsList.offsetWidth;
            const totalWidth = tabsList.scrollWidth;
            let targetScroll = 0;
            
            // First check if we have a remembered position for tab switches
            const lastPosition = this.scrollPositionMemory.get('lastScrollPosition');
            const shouldUseMemory = lastPosition !== undefined;
            
            if (shouldUseMemory) {
                // Only use the remembered position if the tab would still be visible
                const viewportStart = lastPosition;
                const viewportEnd = lastPosition + listWidth;
                const tabStart = tabLeft;
                const tabEnd = tabLeft + tabWidth;
                const wouldBeVisible = tabStart >= viewportStart && tabEnd <= viewportEnd;
                
                if (wouldBeVisible) {
                    // Use the remembered position
                    targetScroll = lastPosition;
                    EdgeTabsPlus.logger.addLog(`Using stored scroll position: ${targetScroll}`);
                } else {
                    // Calculate optimal scroll position to center the tab
                    targetScroll = tabLeft - (listWidth - tabWidth) / 2;
                    EdgeTabsPlus.logger.addLog(`Tab not visible at stored position, centering: ${targetScroll}`);
                }
            } else {
                // Special handling for first and last tabs
                if (tabLeft === 0) {
                    // First tab - always scroll to the start
                    targetScroll = 0;
                } else if (tabLeft + tabWidth >= totalWidth - 20) {
                    // Last tab - always scroll to the end with a small buffer
                    targetScroll = totalWidth - listWidth;
                } else {
                    // Calculate optimal scroll position to center the tab
                    targetScroll = tabLeft - (listWidth - tabWidth) / 2;
                }
                EdgeTabsPlus.logger.addLog(`No stored position, calculated scroll: ${targetScroll}`);
            }
            
            // Ensure we're not scrolling beyond bounds
            targetScroll = Math.max(0, Math.min(targetScroll, totalWidth - listWidth));
            
            // Use smooth scrolling with hardware acceleration
            tabsList.style.scrollBehavior = 'smooth';
            
            // Scroll to position with eased animation
            tabsList.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
            
            // Clear memory after use
            this.scrollPositionMemory.delete('lastScrollPosition');
            
            // Update scroll indicators
            this.updateScrollIndicators();
        },

        updateScrollIndicators() {
            const tabsList = document.getElementById('tabs-list');
            if (!tabsList) return;
            
            const hasLeftScroll = tabsList.scrollLeft > 10;
            const hasRightScroll = tabsList.scrollLeft < (tabsList.scrollWidth - tabsList.clientWidth - 10);
            
            tabsList.classList.toggle('scroll-left', hasLeftScroll);
            tabsList.classList.toggle('scroll-right', hasRightScroll);
        },

        updateMinimalTabs() {
            const tabs = document.querySelectorAll('.tab-item');
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
            chrome.runtime.onMessage.addListener((message) => {
                if (message.action === 'tabsUpdated' && message.tabs) {
                    const newState = JSON.stringify(message.tabs);
                    if (newState !== this.lastTabsState) {
                        this.lastTabsState = newState;
                        this.renderTabs(message.tabs);
                    }
                }
            });
        },

        requestInitialTabs() {
            chrome.runtime.sendMessage({ action: 'getTabs' });
        }
    };
})();