(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    // Development mode flag - set to false for production builds
    const DEBUG = true;

    EdgeTabsPlus.logger = {
        overlay: null,
        toggleButton: null,
        exportButton: null,
        closeButton: null,
        logEntries: [],
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

            // Create header
            const header = document.createElement('div');
            header.className = 'log-header';

            const title = document.createElement('div');
            title.className = 'log-title';
            title.textContent = 'Application Logs';

            const controls = document.createElement('div');
            controls.className = 'log-controls';

            // Export button
            this.exportButton = document.createElement('button');
            this.exportButton.className = 'log-export-button';
            this.exportButton.textContent = '⬇️';
            this.exportButton.setAttribute('aria-label', 'Export logs');
            this.exportButton.title = 'Export logs';

            // Close button
            this.closeButton = document.createElement('button');
            this.closeButton.className = 'log-close-button';
            this.closeButton.textContent = '✕';
            this.closeButton.setAttribute('aria-label', 'Close logs');
            this.closeButton.title = 'Close logs';

            controls.appendChild(this.exportButton);
            controls.appendChild(this.closeButton);
            header.appendChild(title);
            header.appendChild(controls);

            // Create logs container
            const logsContainer = document.createElement('div');
            logsContainer.className = 'logs-container';

            overlay.appendChild(header);
            overlay.appendChild(logsContainer);
            this.shadowRoot.appendChild(overlay);
            return overlay;
        },

        createToggleButton() {
            const button = document.createElement('button');
            button.id = 'log-toggle-button';
            button.textContent = '📜';
            button.setAttribute('aria-label', 'Toggle debug logs');
            button.setAttribute('part', 'log-button');
            this.shadowRoot.appendChild(button);
            return button;
        },

        setupListeners() {
            this.toggleButton.onclick = () => {
                if (!this.overlay) return;
                this.overlay.style.display = this.overlay.style.display === 'none' ? 'block' : 'none';
            };

            this.closeButton.onclick = () => {
                if (!this.overlay) return;
                this.overlay.style.display = 'none';
            };

            this.exportButton.onclick = async () => {
                if (!this.overlay || !this.overlay.children.length) {
                    this.error('No logs to export');
                    return;
                }

                try {
                    const logsContainer = this.overlay.querySelector('.logs-container');
                    const logs = Array.from(logsContainer.children).map(entry => entry.textContent);
                    const jsonStr = JSON.stringify(logs, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `edgetabs-logs-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    this.addLog('✅ Logs exported successfully');
                } catch (error) {
                    console.error('Failed to export logs:', error);
                    this.error('❌ Failed to export logs', error);
                }
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
            
            const logsContainer = this.overlay.querySelector('.logs-container');
            logsContainer.appendChild(logEntry);
            logsContainer.scrollTop = logsContainer.scrollHeight;
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
