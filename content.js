// Initialize EdgeTabs+ extension
(function() {
    // Ensure initialization happens after DOM is loaded
    async function initialize() {
        // Check if namespace exists
        if (!window.EdgeTabsPlus) {
            console.error('EdgeTabsPlus namespace not found! Modules may not have loaded correctly.');
            return;
        }

        try {
            // Initialize config first as other modules depend on it
            EdgeTabsPlus.config.init();

            // Log initialization started
            console.log('Starting EdgeTabs+ initialization...');
            
            // Initialize styles first
            EdgeTabsPlus.styles.init();
            
            // Initialize UI components and wait for styles to be ready
            await EdgeTabsPlus.uiComponents.init();
            
            // Initialize logger after UI is ready
            EdgeTabsPlus.logger.init();

            // After logger is ready, use it for subsequent logs
            EdgeTabsPlus.logger.addLog('Core modules initialized');
            EdgeTabsPlus.logger.addLog(`Using scroll threshold: ${EdgeTabsPlus.config.scroll.threshold}px`);

            // Initialize favicon handler with retry logic
            try {
                await EdgeTabsPlus.faviconHandler.init();
                EdgeTabsPlus.logger.addLog('Favicon handler initialized successfully');
            } catch (error) {
                EdgeTabsPlus.logger.error('Favicon handler initialization failed, using fallback:', error);
                // Reset to basic memory cache if IndexedDB fails
                EdgeTabsPlus.faviconHandler.db = null;
                EdgeTabsPlus.faviconHandler.cache.clear();
            }

            // Initialize remaining modules
            EdgeTabsPlus.tabManager.init();
            EdgeTabsPlus.scrollHandler.init();
            EdgeTabsPlus.touchHandler.init();

            // Initialize states from storage
            await new Promise((resolve) => {
                chrome.storage.sync.get(['theme', 'isDarkMode', 'showTabStrip', 'autoHide'], (result) => {
                    try {
                        // Theme initialization
                        let theme = result.theme;
                        if (!theme) {
                            const isDark = result.isDarkMode !== undefined ? result.isDarkMode :
                                         window.matchMedia('(prefers-color-scheme: dark)').matches;
                            theme = isDark ? 'dark' : 'light';
                        }
                        
                        // Apply theme to host element in shadow DOM
                        const host = document.getElementById('edgetabs-plus-host');
                        if (host && host.shadowRoot) {
                            host.setAttribute('theme', theme);
                            window.EdgeTabsPlus.currentTheme = theme;
                            
                            // Access strip through shadow DOM
                            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
                            if (strip) {
                                // Set visibility
                                const showStrip = result.showTabStrip !== undefined ? result.showTabStrip : true;
                                strip.style.display = showStrip ? 'flex' : 'none';
                                strip.classList.toggle('visible', showStrip);
                                
                                // Set auto-hide
                                const autoHide = result.autoHide !== undefined ? result.autoHide : true;
                                strip.classList.toggle('auto-hide-enabled', autoHide);
                                EdgeTabsPlus.scrollHandler.setAutoHide(autoHide);
                                
                                // Force style recalculation
                                void strip.offsetHeight;
                                
                                EdgeTabsPlus.logger.addLog(`Theme set to ${theme}, visibility: ${showStrip}, auto-hide: ${autoHide}`);
                            } else {
                                EdgeTabsPlus.logger.error('Strip element not found in shadow DOM');
                            }
                        } else {
                            EdgeTabsPlus.logger.error('Host element or shadow root not found');
                        }
                    } catch (error) {
                        EdgeTabsPlus.logger.error('Failed to initialize states:', error);
                    }
                    resolve();
                });
            });

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
            case 'themeChanged':
                try {
                    logger.addLog('Received theme change message:', message);
                    const host = document.getElementById('edgetabs-plus-host');
                    if (!host || !host.shadowRoot) {
                        throw new Error('Tab strip host element or shadow root not found');
                    }

                    const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
                    if (!strip) {
                        throw new Error('Strip element not found in shadow DOM');
                    }

                    // Add transitioning class to prevent flicker
                    host.classList.add('theme-transitioning');
                    strip.classList.add('theme-transitioning');
                    
                    // Update theme
                    host.setAttribute('theme', message.theme);
                    window.EdgeTabsPlus.currentTheme = message.theme;
                    
                    // Update styles through UI components only
                    EdgeTabsPlus.uiComponents.injectStyles();
                    
                    // Force layout recalculation
                    void strip.offsetHeight;
                    
                    // Remove transition classes after animation
                    setTimeout(() => {
                        host.classList.remove('theme-transitioning');
                        strip.classList.remove('theme-transitioning');
                    }, 300);
                    
                    logger.addLog(`Theme updated to ${message.theme} mode`);
                    
                    // Send confirmation
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
        }
    });

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();