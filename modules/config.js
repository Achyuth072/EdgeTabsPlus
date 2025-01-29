(function() {
    // Ensure namespace exists
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    // Add configuration to namespace
    EdgeTabsPlus.config = {
        scroll: {
            threshold: 50,
            debounceTime: 150,
            transformDuration: '0.3s'
        },
        tabStrip: {
            height: '44px',
            bottomOffset: '0px',
            backgroundColor: '#f1f1f1'
        }
    };

    EdgeTabsPlus.settings = {
        retainScrollPosition: true
    };

    // Tab width configurations
    EdgeTabsPlus.config.tabWidths = {
        single: 180,    // Single tab
        double: 160,    // Two tabs
        triple: 120,    // Three tabs
        quad: 100,      // Four tabs
        multi: 90       // Five or more tabs
    };

    // Add initialization method
    EdgeTabsPlus.config.init = function() {
        // Load any saved settings from storage
        chrome.storage.sync.get(EdgeTabsPlus.settings, (savedSettings) => {
            Object.assign(EdgeTabsPlus.settings, savedSettings);
        });
        return this;
    };
})();