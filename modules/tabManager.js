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
            const fragment = document.createDocumentFragment();
            
            // Create template once
            const template = document.createElement('template');
            template.innerHTML = `
                <li class="tab-item">
                    <div class="tab-content">
                        <div class="tab-info">
                            <img class="tab-favicon" width="16" height="16" decoding="sync">
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
                
                // Load favicon
                try {
                    favicon.src = await EdgeTabsPlus.faviconHandler.loadFavicon(tab);
                    EdgeTabsPlus.logger.addLog(`Loaded favicon for tab ${tab.id}`);
                } catch (error) {
                    EdgeTabsPlus.logger.error(`Failed to load favicon for tab ${tab.id}`);
                    favicon.src = EdgeTabsPlus.faviconHandler.getDefaultIcon();
                }
                
                // Set active state
                if (tab.active) {
                    tabItem.classList.add('active');
                }
                
                    // Add to fragment
                    fragment.appendChild(tabItem);
                }
    
                // Add all tabs to DOM at once
                tabsList.appendChild(fragment);
                
                // Update UI state
                this.updateMinimalTabs();
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