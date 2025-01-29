// Initialize the EdgeTabsPlus namespace
window.EdgeTabsPlus = {
    // Core configuration
    config: null,
    settings: null,

    // Modules
    logger: null,
    styles: null,
    faviconHandler: null,
    uiComponents: null,
    tabManager: null,
    scrollHandler: null,
    touchHandler: null,

    // Version information
    version: '0.5.5',

    // Utility function to check if namespace is properly initialized
    isInitialized() {
        return !!(this.config && this.logger && this.styles && 
                 this.faviconHandler && this.uiComponents && 
                 this.tabManager && this.scrollHandler && 
                 this.touchHandler);
    }
};