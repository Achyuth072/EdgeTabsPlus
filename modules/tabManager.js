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
            const tabWidth = this.calculateTabWidth(tabs.length);
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            
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
                }
                
                tabItem.appendChild(closeButton);
                tabsList.appendChild(tabItem);
            }
            
            this.updateMinimalTabs();
            this.updateScrollIndicators();
        },

        handleTabClick(tab) {
            const tabId = tab.id;
            
            chrome.runtime.sendMessage({ 
                action: 'activateTab', 
                tabId: tabId 
            });
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