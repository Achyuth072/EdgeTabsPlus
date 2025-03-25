(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    // Development mode flag - set to false for production builds
    const DEBUG = true;

    EdgeTabsPlus.logger = {
        overlay: null,
        toggleButton: null,
        isEnabled: DEBUG && window.location.protocol !== 'edge-debug:',
        shadowRoot: null,

        init() {
            if (!this.isEnabled) return this;
            
            // Wait for tab strip to be initialized
            const tabStrip = document.getElementById('edgetabs-plus-host');
            if (!tabStrip || !tabStrip.shadowRoot) {
                console.warn('Logger: Tab strip not ready, retrying in 100ms...');
                setTimeout(() => this.init(), 100);
                return this;
            }
            
            this.shadowRoot = tabStrip.shadowRoot;
            
            // Remove any existing logger elements
            const existingOverlay = this.shadowRoot.getElementById('log-overlay');
            const existingButton = this.shadowRoot.getElementById('log-toggle-button');
            if (existingOverlay) existingOverlay.remove();
            if (existingButton) existingButton.remove();
            
            this.overlay = this.createOverlay();
            this.toggleButton = this.createToggleButton();
            this.setupListeners();
            
            // Add logger styles to EdgeTabsPlus.styles
            EdgeTabsPlus.styles.addLoggerStyles();
            
            return this;
        },

        createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'log-overlay';
            overlay.style.display = 'none';
            overlay.setAttribute('part', 'log-overlay');
            this.shadowRoot.appendChild(overlay);
            return overlay;
        },

        createToggleButton() {
            const container = document.createElement('div');
            container.id = 'log-button-container';
            
            const button = document.createElement('button');
            button.id = 'log-toggle-button';
            button.textContent = '📜';
            button.setAttribute('aria-label', 'Toggle debug logs');
            button.setAttribute('part', 'log-button');
            
            container.appendChild(button);
            this.shadowRoot.appendChild(container);
            return button;
        },

        setupListeners() {
            this.toggleButton.onclick = () => {
                if (!this.overlay) return;
                this.overlay.style.display = this.overlay.style.display === 'none' ? 'block' : 'none';
            };
        },

        addLog(message) {
            if (!this.isEnabled) return;
            
            console.log(message); // Always log to console
            
            if (!this.overlay) {
                this.init();
            }

            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.textContent = `[${timestamp}] ${message}`;
            this.overlay.appendChild(logEntry);
            this.overlay.scrollTop = this.overlay.scrollHeight;
        },

        error(message, error) {
            const errorMsg = error ? `${message}: ${error.message}` : message;
            console.error(errorMsg);
            this.addLog(`ERROR: ${errorMsg}`);
        },

        debug(message) {
            if (!this.isEnabled) return;
            console.debug(message);
            this.addLog(`DEBUG: ${message}`);
        }
    };
})();