(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.tabManager = {
        lastTabsState: null,

        init() {
            this.setupMessageListeners();
            this.requestInitialTabs();
            return this;
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
                    requestAnimationFrame(() => {
                        this.scrollToActiveTab(tab.id);
                    });
                }
                
                tabItem.appendChild(closeButton);
                tabsList.appendChild(tabItem);
            }
            
            this.updateMinimalTabs();
        },

        handleTabClick(tab) {
            const tabId = tab.id;
            chrome.runtime.sendMessage({ 
                action: 'activateTab', 
                tabId: tabId 
            });
            
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
            const currentScroll = tabsList.scrollLeft;
            
            // Determine if tab is fully visible
            const tabStart = tabLeft;
            const tabEnd = tabLeft + tabWidth;
            const viewportStart = currentScroll;
            const viewportEnd = currentScroll + listWidth;
            const isTabFullyVisible = tabStart >= viewportStart && tabEnd <= viewportEnd;
            
            // If tab is already fully visible, don't scroll
            if (isTabFullyVisible) return;
            
            // Calculate optimal scroll position to center the tab
            let targetScroll = tabLeft - (listWidth - tabWidth) / 2;
            
            // Adjust for boundaries
            targetScroll = Math.max(0, Math.min(targetScroll, totalWidth - listWidth));
            
            // Cancel any ongoing smooth scrolls first
            tabsList.style.scrollBehavior = 'auto';
            requestAnimationFrame(() => {
                tabsList.style.scrollBehavior = 'smooth';
                tabsList.scrollTo({
                    left: targetScroll,
                    behavior: 'smooth'
                });
            });
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