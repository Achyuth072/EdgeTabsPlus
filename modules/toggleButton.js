// Toggle button for collapsing/expanding the tab strip
(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.toggleButton = {
        button: null,
        isCollapsed: false,

        init() {
            // Check for stored state
            chrome.storage.sync.get(['tabStripCollapsed'], (result) => {
                this.isCollapsed = result.tabStripCollapsed === true;
                this.createToggleButton();
                this.updateButtonState();
                
                if (this.isCollapsed) {
                    this.collapseTabStrip(false); // No animation on initial load
                }
                
                // Log initialization
                if (EdgeTabsPlus.logger) {
                    EdgeTabsPlus.logger.addLog(`Toggle button initialized, collapsed state: ${this.isCollapsed}`);
                }
            });
            
            return this;
        },

        createToggleButton() {
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) return;
            
            const shadow = host.shadowRoot;
            const strip = shadow.getElementById('edgetabs-plus-strip');
            if (!strip) return;
            
            // Create the toggle button
            this.button = document.createElement('button');
            this.button.id = 'strip-toggle-btn';
            this.button.className = 'strip-toggle-btn';
            this.button.setAttribute('aria-label', this.isCollapsed ? 'Expand tab strip' : 'Collapse tab strip');
            this.button.innerHTML = this.isCollapsed ? '▲' : '▼';
            
            // Add click handler
            this.button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTabStrip();
            });
            
            // Insert the button at the beginning of the strip
            strip.insertBefore(this.button, strip.firstChild);
        },

        updateButtonState() {
            if (!this.button) return;
            
            // Update button appearance and aria-label
            this.button.innerHTML = this.isCollapsed ? '▲' : '▼';
            this.button.setAttribute('aria-label', this.isCollapsed ? 'Expand tab strip' : 'Collapse tab strip');
        },

        toggleTabStrip() {
            this.isCollapsed = !this.isCollapsed;
            
            // Store the state for persistence
            chrome.storage.sync.set({ tabStripCollapsed: this.isCollapsed }, () => {
                if (EdgeTabsPlus.logger) {
                    EdgeTabsPlus.logger.addLog(`Tab strip collapsed state saved: ${this.isCollapsed}`);
                }
            });
            
            // Update visual state
            this.updateButtonState();
            
            // Apply the collapse/expand with animation
            if (this.isCollapsed) {
                this.collapseTabStrip(true);
            } else {
                this.expandTabStrip();
            }
        },        collapseTabStrip(animate = true) {
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) return;
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) return;

            // Hide the button inside the strip to avoid having two buttons
            if (this.button) {
                this.button.style.display = 'none';
            }
            
            if (animate) {
                // Add transitioning class for animation
                strip.classList.add('transitioning');
            }
            
            // Add collapsed class
            strip.classList.add('collapsed');
            
            // Create fixed position button container if needed
            if (!this.fixedButtonContainer) {
                this.createFixedToggleButton();
            } else {
                // Show the fixed toggle button
                this.fixedButtonContainer.style.display = 'flex';
            }
            
            // Remove transitioning class after animation completes
            if (animate) {
                setTimeout(() => {
                    strip.classList.remove('transitioning');
                }, 300);
            }

            // Log the action
            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.addLog(`Tab strip collapsed`);
            }
        },
        
        // Create a fixed position toggle button that isn't affected by scroll
        createFixedToggleButton() {
            const body = document.body;
            
            // Create a fixed container for the toggle button
            this.fixedButtonContainer = document.createElement('div');
            this.fixedButtonContainer.id = 'fixed-toggle-container';
            this.fixedButtonContainer.style.position = 'fixed';
            this.fixedButtonContainer.style.bottom = '10px';
            this.fixedButtonContainer.style.left = '10px';
            this.fixedButtonContainer.style.zIndex = '9999999';
            this.fixedButtonContainer.style.display = 'flex';
            this.fixedButtonContainer.style.alignItems = 'center';
            this.fixedButtonContainer.style.justifyContent = 'center';
            
            // Create the fixed toggle button
            const fixedButton = document.createElement('button');
            fixedButton.className = 'fixed-toggle-btn';
            fixedButton.style.background = 'transparent';
            fixedButton.style.border = 'none';
            fixedButton.style.padding = '0';
            fixedButton.style.margin = '0';
            fixedButton.style.cursor = 'pointer';            fixedButton.style.fontSize = '18px';
            fixedButton.style.fontWeight = 'bold';
            fixedButton.style.color = 'var(--tab-text, #000)'; // Match the tab strip text color
            fixedButton.style.display = 'flex';
            fixedButton.style.alignItems = 'center';
            fixedButton.style.justifyContent = 'center';
            fixedButton.style.width = '28px';
            fixedButton.style.height = '28px';
            fixedButton.innerHTML = '▲';
            fixedButton.setAttribute('aria-label', 'Expand tab strip');
            
            // Add click handler
            fixedButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTabStrip();
            });
            
            this.fixedButtonContainer.appendChild(fixedButton);
            body.appendChild(this.fixedButtonContainer);
        },        expandTabStrip() {
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) return;
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) return;
            
            // Add transitioning class for animation
            strip.classList.add('transitioning');
            
            // Remove collapsed class
            strip.classList.remove('collapsed');
            
            // Hide the fixed toggle button if it exists
            if (this.fixedButtonContainer) {
                this.fixedButtonContainer.style.display = 'none';
            }
            
            // Show the toggle button inside the strip again
            if (this.button) {
                this.button.style.display = 'flex';
            }
            
            // Remove transitioning class after animation completes
            setTimeout(() => {
                strip.classList.remove('transitioning');
            }, 300);

            // Log the action
            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.addLog(`Tab strip expanded`);
            }
        },
        
        // Cleanup function to remove the fixed button when no longer needed
        cleanup() {
            if (this.fixedButtonContainer && document.body.contains(this.fixedButtonContainer)) {
                document.body.removeChild(this.fixedButtonContainer);
                this.fixedButtonContainer = null;
            }
        }
    };
})();
