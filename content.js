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
            
            // Initialize states from storage
            chrome.storage.sync.get(['isDarkMode', 'showTabStrip', 'autoHide'], (result) => {
                // Theme initialization - set theme immediately to prevent flash
                const isDark = result.isDarkMode !== undefined ? result.isDarkMode : true;
                
                // Apply theme to both html and body elements
                document.documentElement.classList.toggle('dark-theme', isDark);
                document.body.classList.toggle('dark-theme', isDark);
                
                // Store theme state for quick access
                window.EdgeTabsPlus.currentTheme = isDark ? 'dark' : 'light';
                
                EdgeTabsPlus.logger.addLog(`Initialized theme: ${isDark ? 'dark' : 'light'} mode`);
                
                // Tab strip visibility initialization
                const tabStrip = document.getElementById('edgetabs-plus-strip');
                if (tabStrip) {
                    const showStrip = result.showTabStrip !== undefined ? result.showTabStrip : true;
                    if (showStrip) {
                        tabStrip.style.display = 'flex';
                        tabStrip.classList.add('visible');
                    } else {
                        tabStrip.style.display = 'none';
                    }
                    EdgeTabsPlus.logger.addLog(`Initialized tab strip visibility: ${showStrip}`);
                }
                
                // Auto-hide initialization
                const autoHide = result.autoHide !== undefined ? result.autoHide : true;
                if (tabStrip) {
                    tabStrip.classList.toggle('auto-hide-enabled', autoHide);
                }
                EdgeTabsPlus.scrollHandler.setAutoHide(autoHide);
                EdgeTabsPlus.logger.addLog(`Initialized auto-hide: ${autoHide}`);
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
                    
                    // Start by pausing transitions to prevent visual glitches
                    document.documentElement.classList.add('theme-transitioning');
                    
                    // Wait for a frame to ensure transitions are paused
                    requestAnimationFrame(() => {
                        // Apply theme with transition
                        document.documentElement.classList.toggle('dark-theme', message.isDark);
                        document.body.classList.toggle('dark-theme', message.isDark);
                        
                        // Store theme state locally for quick access
                        window.EdgeTabsPlus.currentTheme = message.isDark ? 'dark' : 'light';
                        
                        // Re-enable transitions after a short delay
                        setTimeout(() => {
                            document.documentElement.classList.remove('theme-transitioning');
                            
                            // Force a repaint of the tab strip to apply theme properly
                            const tabStrip = document.getElementById('edgetabs-plus-strip');
                            if (tabStrip) {
                                tabStrip.style.display = tabStrip.style.display;
                                // Force style recalculation
                                void tabStrip.offsetHeight;
                            }
                        }, 50);
                        
                        // Notify user of theme change via logger
                        logger.addLog(`Theme updated to ${message.isDark ? 'dark' : 'light'} mode`);
                    });
                    
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
                    switch (message.key) {
                        case 'showTabStrip':
                            const tabStrip = document.getElementById('edgetabs-plus-strip');
                            if (tabStrip) {
                                // Add transition class before changing display
                                tabStrip.classList.add('transitioning');
                                
                                if (message.value) {
                                    // Show strip
                                    tabStrip.style.display = 'flex';
                                    // Force reflow
                                    void tabStrip.offsetHeight;
                                    tabStrip.classList.add('visible');
                                    setTimeout(() => {
                                        tabStrip.classList.remove('transitioning');
                                    }, 300);
                                } else {
                                    // Hide strip
                                    tabStrip.classList.remove('visible');
                                    setTimeout(() => {
                                        tabStrip.style.display = 'none';
                                        tabStrip.classList.remove('transitioning');
                                    }, 300);
                                }
                                
                                logger.addLog(`Tab strip visibility set to: ${message.value}`);
                            }
                            break;
                            
                        case 'autoHide':
                            const strip = document.getElementById('edgetabs-plus-strip');
                            if (strip) {
                                strip.classList.toggle('auto-hide-enabled', message.value);
                            }
                            EdgeTabsPlus.scrollHandler.setAutoHide(message.value);
                            logger.addLog(`Auto-hide set to: ${message.value}`);
                            break;
                            
                        default:
                            logger.addLog(`Unknown toggle key: ${message.key}`);
                    }
                    
                    // Send confirmation back
                    if (sendResponse) {
                        sendResponse({ success: true });
                    }
                } catch (error) {
                    logger.error('Failed to handle toggle update:', error);
                    if (sendResponse) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
                return true; // Keep message channel open
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