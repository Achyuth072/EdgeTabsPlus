(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.logger = {
        overlay: null,
        toggleButton: null,
        isEnabled: true,

        init() {
            if (!this.isEnabled) return this;
            
            this.overlay = this.createOverlay();
            this.toggleButton = this.createToggleButton();
            this.setupListeners();
            return this;
        },

        createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'log-overlay';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
            return overlay;
        },

        createToggleButton() {
            const button = document.createElement('button');
            button.id = 'log-toggle-button';
            button.textContent = '📜';
            document.body.appendChild(button);
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