// shadowStylesManager is loaded via content_scripts in manifest.json
// No import needed as it's exposed as window.shadowStylesManager

EdgeTabsPlus.logToEruda("!!! CONTENT_SCRIPT_ROOT_TEST_LOG --- ERUDA_CAPTURE_CHECK !!!", 'log');
// Initialize EdgeTabs+ extension
(function() {
    // Ensure initialization happens after DOM is loaded
    async function initialize() {
        // Check if namespace exists
        if (!window.EdgeTabsPlus) {
            EdgeTabsPlus.logToEruda('EdgeTabsPlus namespace not found! Modules may not have loaded correctly.', 'error');
            return;
        }

        try {
            // Initialize config first as other modules depend on it
            EdgeTabsPlus.config.init();

            // Log initialization started
            EdgeTabsPlus.logToEruda('Starting EdgeTabs+ initialization...', 'log');
            
            // No need to initialize styles separately anymore as we're using shadowStylesManager
            // which doesn't require initialization
            
            // Initialize UI components and wait for styles to be ready
            await EdgeTabsPlus.uiComponents.init();
            
            // Logger initialization removed as part of Eruda transition

            // After logger is ready, use it for subsequent logs
            EdgeTabsPlus.logToEruda('Core modules initialized', 'log');
            EdgeTabsPlus.logToEruda(`Using scroll threshold: ${EdgeTabsPlus.config.scroll.threshold}px`, 'log');

            // Initialize favicon handler with retry logic
            try {
                await EdgeTabsPlus.faviconHandler.init();
                EdgeTabsPlus.logToEruda('Favicon handler initialized successfully', 'log');
            } catch (error) {
                EdgeTabsPlus.logToEruda(`Favicon handler initialization failed, using fallback: ${error}`, 'error');
                // Reset to basic memory cache if IndexedDB fails
                EdgeTabsPlus.faviconHandler.db = null;
                EdgeTabsPlus.faviconHandler.cache.clear();
            }

            // Initialize remaining modules
            EdgeTabsPlus.tabManager.init();
            EdgeTabsPlus.scrollHandler.init();
            EdgeTabsPlus.touchHandler.init();

            // Initialize states from storage
            // Initialize theme media query listener
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const updateThemeFromMediaQuery = (e) => {
                const isDark = e.matches;
                const newTheme = isDark ? 'dark' : 'light';
                updateTheme(newTheme);
            };
            
            // Listen for system theme changes
            darkModeMediaQuery.addEventListener('change', updateThemeFromMediaQuery);

            // Function to update theme
            const updateTheme = (theme) => {
                // Apply theme to host element in shadow DOM
                const host = document.getElementById('edgetabs-plus-host');
                if (host && host.shadowRoot) {
                    host.setAttribute('theme', theme);
                    window.EdgeTabsPlus.currentTheme = theme;
                    EdgeTabsPlus.logToEruda(`Theme updated to ${theme}`, 'log');
                }
            };

            await new Promise((resolve) => {
                chrome.storage.sync.get(['theme', 'isDarkMode', 'showTabStrip', 'autoHide'], (result) => {
                    try {
                        // Theme initialization
                        let theme = result.theme;
                        if (!theme) {
                            // Use system preference
                            theme = darkModeMediaQuery.matches ? 'dark' : 'light';
                        }
                        updateTheme(theme);
                        
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
                                
                                EdgeTabsPlus.logToEruda(`Theme set to ${theme}, visibility: ${showStrip}, auto-hide: ${autoHide}`, 'log');
                                
                                // Ensure toggle button state is consistent with strip visibility
                                if (EdgeTabsPlus.toggleButton) {
                                    // If strip is not shown, make sure toggle is in collapsed state
                                    if (!showStrip && !EdgeTabsPlus.toggleButton.isCollapsed) {
                                        EdgeTabsPlus.toggleButton.collapseTabStrip(false);
                                        EdgeTabsPlus.logToEruda('Toggle button state corrected to match strip visibility', 'log');
                                    }
                                }
                            } else {
                                EdgeTabsPlus.logToEruda('Strip element not found in shadow DOM', 'error');
                            }
                        } else {
                            EdgeTabsPlus.logToEruda('Host element or shadow root not found', 'error');
                        }
                    } catch (error) {
                        EdgeTabsPlus.logToEruda(`Failed to initialize states: ${error}`, 'error');
                    }
                    resolve();
                });
            });

            // Verify all modules are properly initialized
            if (!EdgeTabsPlus.isInitialized()) {
                throw new Error('Some modules failed to initialize properly');
            }

            // Log successful initialization with config details
            EdgeTabsPlus.logToEruda(`EdgeTabs+ v${EdgeTabsPlus.version} initialized successfully`, 'log');
            EdgeTabsPlus.logToEruda(`Configuration: ${JSON.stringify(EdgeTabsPlus.config)}`, 'log');
            
            if (EdgeTabsPlus.settings.retainScrollPosition) {
                EdgeTabsPlus.logToEruda('Scroll position retention is enabled', 'log');
            }
        } catch (error) {
            EdgeTabsPlus.logToEruda(`EdgeTabs+ initialization failed: ${error}`, 'error');
            // Additional error logging already handled on line 129
        }
    }

    // Listen for messages from popup and background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!window.EdgeTabsPlus) {
            EdgeTabsPlus.logToEruda(`EdgeTabsPlus not initialized for message: ${JSON.stringify(message)}`, 'error');
            return;
        }
// Logger references removed as part of Eruda transition


        switch (message.action) {
            case 'forwardLogToEruda':
                if (message.logEntry) {
                    EdgeTabsPlus.logToEruda("[BG_LOG] " + message.logEntry, 'log');
                    if (sendResponse) {
                        sendResponse({ status: "log received by content script" });
                    }
                }
                return true; // Keep message channel open
                
            case 'themeChanged':
                try {
                    EdgeTabsPlus.logToEruda(`Received theme change message: ${JSON.stringify(message)}`, 'log');
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
                    
                    updateTheme(message.theme);
                    
                    // Update styles through UI components only
                    EdgeTabsPlus.uiComponents.injectStyles();
                    
                    // Force layout recalculation
                    void strip.offsetHeight;
                    
                    // Remove transition classes after animation
                    setTimeout(() => {
                        host.classList.remove('theme-transitioning');
                        strip.classList.remove('theme-transitioning');
                    }, 300);
                    
                    // Send confirmation
                    if (sendResponse) {
                        sendResponse({ success: true });
                    }
                } catch (error) {
                    EdgeTabsPlus.logToEruda(`Failed to update theme: ${error}`, 'error');
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
                                
                                EdgeTabsPlus.logToEruda(`Tab strip visibility set to: ${message.value}`, 'log');
                            }
                            break;
                            
                        case 'autoHide':
                            const strip = document.getElementById('edgetabs-plus-strip');
                            if (strip) {
                                strip.classList.toggle('auto-hide-enabled', message.value);
                            }
                            EdgeTabsPlus.scrollHandler.setAutoHide(message.value);
                            EdgeTabsPlus.logToEruda(`Auto-hide set to: ${message.value}`, 'log');
                            break;
                            
                        default:
                            EdgeTabsPlus.logToEruda(`Unknown toggle key: ${message.key}`, 'log');
                    }
                    
                    // Send confirmation back
                    if (sendResponse) {
                        sendResponse({ success: true });
                    }
                } catch (error) {
                    EdgeTabsPlus.logToEruda(`Failed to handle toggle update: ${error}`, 'error');
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