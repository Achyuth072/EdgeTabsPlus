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
            
            // Create main toggle button only if it doesn't exist
            if (!this.button) {
                this.button = document.createElement('button');
                this.button.id = 'strip-toggle-btn';
                this.button.className = 'strip-toggle-btn';
                this.button.setAttribute('aria-label', 'Collapse tab strip');
                this.button.innerHTML = '▼';
                
                // Add click handler specific to main button (collapse only)
                this.button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!this.isCollapsed) {
                        this.toggleTabStrip();
                    }
                });
                
                // Insert the button at the beginning of the strip
                strip.insertBefore(this.button, strip.firstChild);
            }
        },

        updateButtonState() {
            if (!this.button) return;
            
            // Update button appearance and aria-label
            this.button.innerHTML = this.isCollapsed ? '▲' : '▼';
            this.button.setAttribute('aria-label', this.isCollapsed ? 'Expand tab strip' : 'Collapse tab strip');
        },
        toggleTabStrip() {
            const oldState = this.isCollapsed;
            
            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.addLog(`Starting toggle - current state: ${oldState}`);
            }
            
            // Perform DOM changes first
            if (oldState) {
                // If currently collapsed, expand first
                this.expandTabStrip();
            } else {
                // If currently expanded, collapse first
                this.collapseTabStrip(true);
            }
            
            // Update state after DOM changes
            this.isCollapsed = !oldState;
            
            // Store the state for persistence
            chrome.storage.sync.set({ tabStripCollapsed: this.isCollapsed }, () => {
                if (EdgeTabsPlus.logger) {
                    EdgeTabsPlus.logger.addLog(`Tab strip collapsed state saved: ${this.isCollapsed}`);
                }
            });
            
            // Update main button state
            this.updateButtonState();
        },
         
         collapseTabStrip(animate = true) {
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) return;
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) return;
            
            // First, update internal state to collapsed
            this.isCollapsed = true;
            
            // Update strip button state and hide it using a class
            if (this.button) {
                this.button.classList.add('hidden');
                this.button.setAttribute('aria-label', 'Collapse tab strip');
                this.button.innerHTML = '▼';
            }
            
            // Clean up any existing fixed button
            this.cleanup();
            
            if (animate) {
                strip.classList.add('transitioning');
            }
            
            // Update strip state
            strip.classList.add('collapsed');
            
            // Only create fixed button after strip button is hidden
            requestAnimationFrame(() => {
                this.createFixedToggleButton();
            });
            
            if (animate) {
                setTimeout(() => {
                    strip.classList.remove('transitioning');
                }, 300);
            }

            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.addLog(`Tab strip collapsed`);
            }
        },
        
        // Create a fixed position toggle button within the shadow DOM
        createFixedToggleButton() {
           if (EdgeTabsPlus.logger) {
               EdgeTabsPlus.logger.addLog(`Creating fixed button - isCollapsed: ${this.isCollapsed}, fixedButtonContainer exists: ${!!this.fixedButtonContainer}`);
           }
           
           // Only create if we're in collapsed state and don't have a fixed button
           if (this.isCollapsed && !this.fixedButtonContainer) {
                const host = document.getElementById('edgetabs-plus-host');
                if (!host || !host.shadowRoot) return;
                
                const shadow = host.shadowRoot;
                
                // Create the fixed button using the shadow DOM's styling
                const fixedButton = document.createElement('button');
                fixedButton.className = 'strip-toggle-btn fixed';
                fixedButton.setAttribute('aria-label', 'Expand tab strip');
                fixedButton.innerHTML = '▲';
                
                // Add click handler specific to fixed button (expand only)
                fixedButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.isCollapsed) {
                        if (EdgeTabsPlus.logger) {
                            EdgeTabsPlus.logger.addLog('Fixed button clicked - expanding strip');
                        }
                        this.toggleTabStrip();
                    }
                });
                
                // Add to shadow DOM
                this.fixedButtonContainer = fixedButton;
                shadow.appendChild(fixedButton);
            }
        },
        
        expandTabStrip() {
           const host = document.getElementById('edgetabs-plus-host');
           if (!host || !host.shadowRoot) return;
           
           const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
           if (!strip) return;
           
           // Remove fixed button first to prevent any overlap
           if (this.fixedButtonContainer) {
               if (EdgeTabsPlus.logger) {
                   EdgeTabsPlus.logger.addLog(`Removing fixed button - DOM contains: ${host.shadowRoot.contains(this.fixedButtonContainer)}`);
               }
               if (host.shadowRoot.contains(this.fixedButtonContainer)) {
                   host.shadowRoot.removeChild(this.fixedButtonContainer);
               }
               this.fixedButtonContainer = null;
           }
           
           // Update state
           this.isCollapsed = false;
           
           strip.classList.add('transitioning');
           strip.classList.remove('collapsed');
           
           // Show and update the strip button
           if (this.button) {
               this.button.classList.remove('hidden');
               this.button.setAttribute('aria-label', 'Collapse tab strip');
               this.button.innerHTML = '▼';
           }
            
            setTimeout(() => {
                strip.classList.remove('transitioning');
            }, 300);

            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.addLog(`Tab strip expanded`);
            }
        },
        
        // Cleanup function to remove fixed button and reset states
        cleanup() {
            if (EdgeTabsPlus.logger) {
                EdgeTabsPlus.logger.addLog('Starting cleanup');
            }
            
            if (this.fixedButtonContainer) {
                // Always attempt removal if button exists
                const host = document.getElementById('edgetabs-plus-host');
                if (host && host.shadowRoot && host.shadowRoot.contains(this.fixedButtonContainer)) {
                    host.shadowRoot.removeChild(this.fixedButtonContainer);
                    if (EdgeTabsPlus.logger) {
                        EdgeTabsPlus.logger.addLog('Fixed button removed during cleanup');
                    }
                }
                this.fixedButtonContainer = null;
            }
        }
    };
})();
