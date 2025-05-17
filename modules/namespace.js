// Initialize the EdgeTabsPlus namespace
window.EdgeTabsPlus = {
    // Core configuration
    config: null,
    settings: null,

    // Modules
    // logger: null, // Removed as part of Eruda transition
    styles: null,
    faviconHandler: null,
    uiComponents: null,
    tabManager: null,
    scrollHandler: null,
    touchHandler: null,

    // Version information
    version: '0.5.5',

    /**
     * Logs a message to Eruda console via window.postMessage with extLog property
     * @param {string} message - The message to log
     * @param {string} level - Log level ('log', 'error', 'debug', 'info', 'warn')
     */
    logToEruda(message, level = 'log') {
        try {
            // Format the message with the appropriate level
            let formattedMessage;
            switch (level) {
                case 'error':
                    formattedMessage = `[ERROR] ${message}`;
                    break;
                case 'debug':
                    formattedMessage = `[DEBUG] ${message}`;
                    break;
                case 'info':
                    formattedMessage = `[INFO] ${message}`;
                    break;
                case 'warn':
                    formattedMessage = `[WARN] ${message}`;
                    break;
                default:
                    formattedMessage = message;
            }
            
            // Send the log to Eruda via window.postMessage
            window.postMessage({ extLog: formattedMessage }, '*');
        } catch (error) {
            // If logging fails, fall back to standard console
            console.error('Failed to send log to Eruda:', error);
        }
    },

    // Utility function to check if namespace is properly initialized
    isInitialized() {
        return !!(this.config && this.styles &&
                 this.faviconHandler && this.uiComponents &&
                 this.tabManager && this.scrollHandler &&
                 this.touchHandler);
        // logger removed from initialization check as part of Eruda transition
    }
};