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

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();