(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.uiComponents = {
        strip: null,
        tabsList: null,
        addButton: null,
        addButtonContainer: null,

        init() {
            const { host, strip, shadow } = this.createTabStrip();
            this.host = host;
            this.strip = strip;
            this.shadow = shadow;
            
            // Create and inject styles into shadow DOM
            this.injectStyles();
            
            this.tabsList = this.createTabsList();
            this.addButtonContainer = this.createAddButtonContainer();
            this.addButton = this.createAddButton();
            this.setupStrip();
            
            // Initialize toggle button functionality (if available)
            if (EdgeTabsPlus.toggleButton) {
                EdgeTabsPlus.toggleButton.init();
            }
            
            // Add additional check to ensure strip visibility
            this.ensureStripVisibility();
            
            return this;
        },

        injectStyles() {
            if (!this.shadow) return;

            // Remove any existing styles
            const existingStyle = this.shadow.querySelector('style');
            if (existingStyle) {
                existingStyle.remove();
            }

            const style = document.createElement('style');
            
            // Get all styles from EdgeTabsPlus.styles
            style.textContent = EdgeTabsPlus.styles.getStyles();
            
            this.shadow.appendChild(style);

            // Set up theme sync
            this.setupThemeSync();
        },

        setupThemeSync() {
            // Listen for theme changes
            chrome.runtime.onMessage.addListener((message) => {
                if (message.action === 'updateTheme') {
                    this.host.setAttribute('theme', message.isDark ? 'dark' : 'light');
                    // Add transitioning class
                    this.host.classList.add('theme-transitioning');
                    // Remove it after transition
                    setTimeout(() => {
                        this.host.classList.remove('theme-transitioning');
                    }, 300);
                }
            });

            // Watch for system theme changes
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeMediaQuery.addEventListener('change', (e) => {
                if (!this.host.hasAttribute('theme')) {
                    // Only update if theme isn't explicitly set
                    this.host.setAttribute('theme', e.matches ? 'dark' : 'light');
                }
            });

            // Set initial theme
            const shouldUseDark = darkModeMediaQuery.matches;
            const savedTheme = localStorage.getItem('theme');
            const theme = savedTheme || (shouldUseDark ? 'dark' : 'light');
            this.host.setAttribute('theme', theme);
        },
        
        setupThemeObserver() {
            // Create an observer to watch for theme changes on document root
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isDark = document.documentElement.classList.contains('dark-theme');
                        this.host.setAttribute('theme', isDark ? 'dark' : 'light');
                    }
                });
            });
            
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            // Set initial theme
            const isDark = document.documentElement.classList.contains('dark-theme');
            this.host.setAttribute('theme', isDark ? 'dark' : 'light');
        },

        createTabStrip() {
            const host = document.createElement('div');
            host.id = 'edgetabs-plus-host';
            
            // Create shadow root with mode: open for debugging
            const shadow = host.attachShadow({ mode: 'open' });
            
            // Create the strip container inside shadow DOM
            const strip = document.createElement('div');
            strip.id = 'edgetabs-plus-strip';
            
            // Let CSS handle all the styling
            strip.style.setProperty('--strip-bottom-offset', EdgeTabsPlus.config.tabStrip.bottomOffset);
            
            // Add strip to shadow root
            shadow.appendChild(strip);
            
            return { host, strip, shadow };
        },

        createTabsList() {
            const list = document.createElement('ul');
            list.id = 'tabs-list';
            list.style.pointerEvents = 'auto';
            list.style.touchAction = 'auto';
            list.style.listStyle = 'none';
            list.style.display = 'flex';
            list.style.margin = '0';
            list.style.padding = '0';
            list.style.overflowX = 'auto';
            list.style.width = '100%';
            return list;
        },

        createAddButtonContainer() {
            const container = document.createElement('div');
            container.className = 'add-tab-container';
            
            // Add the separator
            const separator = document.createElement('div');
            separator.className = 'add-tab-separator';
            separator.textContent = '|';
            separator.style.color = '#ddd';
            separator.style.margin = '0 8px';
            
            container.appendChild(separator);
            return container;
        },

        createAddButton() {
            const button = document.createElement('button');
            button.id = 'add-tab';
            button.innerHTML = '+';
            
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: 'createTab' });
            };

            return button;
        },

        setupStrip() {
            this.addButtonContainer.appendChild(this.addButton);
            this.strip.appendChild(this.tabsList);
            this.strip.appendChild(this.addButtonContainer);
            document.body.appendChild(this.host);
            
            // Set up event delegation in shadow root
            this.shadow.addEventListener('click', (e) => {
                const target = e.target;
                
                // Handle close button clicks
                if (target.classList.contains('close-tab')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const tabId = target.closest('.tab-item').dataset.tabId;
                    chrome.runtime.sendMessage({ action: 'closeTab', tabId });
                }
                
                // Handle tab clicks
                if (target.closest('.tab-item')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const tabId = target.closest('.tab-item').dataset.tabId;
                    chrome.runtime.sendMessage({ action: 'activateTab', tabId });
                }
            });
            
            // Initialize without any visibility classes
            this.strip.classList.remove('hidden');
        },
        
        // Method to ensure the strip is visible with shadow DOM support
        ensureStripVisibility() {
            chrome.storage.sync.get(['showTabStrip'], (result) => {
                const shouldShow = result.showTabStrip !== undefined ? result.showTabStrip : true;
                
                if (shouldShow && this.host && this.strip) {
                    // Force display if it should be visible
                    // Remove any visibility-related classes
                    this.strip.classList.remove('hidden');
                    
                    // Check if host element is in document
                    if (!document.body.contains(this.host)) {
                        document.body.appendChild(this.host);
                        console.log('Re-added tab strip host to document');
                    }
                    
                    // Force a layout recalculation
                    void this.strip.offsetHeight;
                    
                    // Ensure styles are applied in shadow DOM
                    this.injectStyles();
                }
                
                // Log the visibility status
                if (window.EdgeTabsPlus.logger) {
                    window.EdgeTabsPlus.logger.addLog(`Tab strip visibility checked: ${shouldShow ? 'visible' : 'hidden'}`);
                } else {
                    console.log(`Tab strip visibility checked: ${shouldShow ? 'visible' : 'hidden'}`);
                }
                
                // Update theme
                const isDark = document.documentElement.classList.contains('dark-theme');
                this.host.setAttribute('theme', isDark ? 'dark' : 'light');
            });
        }
    };
})();