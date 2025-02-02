// Initialize EdgeTabs+ extension
(function() {
    // Ensure initialization happens after DOM is loaded
    function initialize() {
        // Check if namespace exists
        if (!window.EdgeTabsPlus) {
            console.error('EdgeTabsPlus namespace not found! Modules may not have loaded correctly.');
            return;
        }

        try {
            // Initialize config first as other modules depend on it
            EdgeTabsPlus.config.init();

            // Initialize modules in correct dependency order
            EdgeTabsPlus.styles.init();
            EdgeTabsPlus.logger.init();
            
            // Initialize theme state from storage
            chrome.storage.sync.get('isDarkMode', (result) => {
                const isDark = result.isDarkMode !== undefined ? result.isDarkMode : true;
                document.documentElement.classList.toggle('dark-theme', isDark);
                document.body.classList.toggle('dark-theme', isDark);
                EdgeTabsPlus.logger.addLog(`Initialized theme: ${isDark ? 'dark' : 'light'} mode`);
            });
            
            // Log initialization started
            EdgeTabsPlus.logger.addLog('Starting EdgeTabs+ initialization...');
            EdgeTabsPlus.logger.addLog(`Using scroll threshold: ${EdgeTabsPlus.config.scroll.threshold}px`);
            
            EdgeTabsPlus.faviconHandler.init();
            EdgeTabsPlus.uiComponents.init();
            EdgeTabsPlus.tabManager.init();
            EdgeTabsPlus.scrollHandler.init();
            EdgeTabsPlus.touchHandler.init();

            // Verify all modules are properly initialized
            if (!EdgeTabsPlus.isInitialized()) {
                throw new Error('Some modules failed to initialize properly');
            }

            // Log successful initialization with config details
            EdgeTabsPlus.logger.addLog(`EdgeTabs+ v${EdgeTabsPlus.version} initialized successfully`);
            EdgeTabsPlus.logger.addLog('Configuration:', EdgeTabsPlus.config);
            
            if (EdgeTabsPlus.settings.retainScrollPosition) {
                EdgeTabsPlus.logger.addLog('Scroll position retention is enabled');
            }
        } catch (error) {
            console.error('EdgeTabs+ initialization failed:', error);
            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.error('Initialization failed', error);
            }
        }
    }

    // Listen for messages from popup and background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!window.EdgeTabsPlus) {
            console.error('EdgeTabsPlus not initialized for message:', message);
            return;
        }

        const { logger } = window.EdgeTabsPlus;

        switch (message.action) {
            case 'updateTheme':
                try {
                    logger.addLog('Received theme update message:', message);
                    
                    // Apply theme with transition
                    document.documentElement.classList.toggle('dark-theme', message.isDark);
                    document.body.classList.toggle('dark-theme', message.isDark);
                    
                    // Store theme state locally for quick access
                    window.EdgeTabsPlus.currentTheme = message.isDark ? 'dark' : 'light';
                    
                    // Notify user of theme change via logger
                    logger.addLog(`Theme updated to ${message.isDark ? 'dark' : 'light'} mode`);
                    
                    // Apply smooth transition class
                    document.documentElement.classList.add('theme-transitioning');
                    setTimeout(() => {
                        document.documentElement.classList.remove('theme-transitioning');
                    }, 300); // Match transition duration in styles.js
                    
                    // Send confirmation back
                    if (sendResponse) {
                        sendResponse({ success: true });
                    }
                } catch (error) {
                    logger.error('Failed to update theme:', error);
                    if (sendResponse) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
                return true; // Keep the message channel open

            case 'toggleUpdate':
                try {
                    if (message.key === 'showTabStrip') {
                        const tabStrip = document.getElementById('tab-strip');
                        if (tabStrip) {
                            tabStrip.style.display = message.value ? 'flex' : 'none';
                            logger.addLog(`Tab strip visibility set to: ${message.value}`);
                        }
                    } else if (message.key === 'autoHide') {
                        EdgeTabsPlus.scrollHandler.setAutoHide(message.value);
                        logger.addLog(`Auto-hide set to: ${message.value}`);
                    }
                } catch (error) {
                    logger.error('Failed to handle toggle update:', error);
                }
                break;
        }
    });

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();