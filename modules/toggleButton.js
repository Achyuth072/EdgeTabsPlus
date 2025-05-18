// Toggle button for collapsing/expanding the tab strip
(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.toggleButton = {
        button: null,
        isCollapsed: false,
        _buttonOriginalPosition: null,
        
        // Constants
        TOGGLE_BUTTON_COLOR: '#104e92',
        TOGGLE_BUTTON_BG_COLOR: '#2bc3d2',
        
        // Public accessors for other modules
        getButtonElement() {
            return this.button;
        },
        
        isCurrentlyCollapsed() {
            return this.isCollapsed;
        },
        
        // Helper to get DOM elements
        _getDOMElements() {
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) return null;
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) return null;
            
            return { host, strip };
        },

        init() {
            // Clean up any previous state
            this.cleanup();
            
            // Create toggle button immediately
            this.createToggleButton();
            
            // Prevent flash on load
            const elements = this._getDOMElements();
            if (elements) {
                elements.strip.style.visibility = 'hidden';
            }
            
            // Check stored state
            chrome.storage.sync.get(['tabStripCollapsed'], (result) => {
                const shouldBeCollapsed = result.tabStripCollapsed === true;
                
                // Apply stored state
                if (shouldBeCollapsed) {
                    this.isCollapsed = true;
                    this.collapseTabStrip(false); // No animation on init
                } else {
                    this.isCollapsed = false;
                }
                
                // Update button state to match
                this.updateButtonState();
                
                // Make strip visible after state is applied
                const elements = this._getDOMElements();
                if (elements) {
                    setTimeout(() => {
                        if (!this.isCollapsed) {
                            elements.strip.style.visibility = '';
                        }
                    }, 10);
                }
            });
            
            return this;
        },

        createToggleButton() {
            const elements = this._getDOMElements();
            if (!elements) return;
            
            // Create toggle button only if it doesn't exist
            if (!this.button) {
                this.button = document.createElement('button');
                this.button.id = 'strip-toggle-btn';
                this.button.className = 'strip-toggle-btn';
                this.button.setAttribute('aria-label', 'Collapse tab strip');
                this.button.innerHTML = '▼';
                
                // Add click handler to toggle
                this.button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleTabStrip();
                });
                
                // Set initial styles
                this._applyExpandedButtonStyles();
                
                // Insert the button at the beginning of the strip
                elements.strip.insertBefore(this.button, elements.strip.firstChild);
            }
        },
        
        // Helper for setting button expanded styles
        _applyExpandedButtonStyles() {
            if (!this.button) return;
            
            this.button.style.position = 'relative';
            this.button.style.zIndex = '2';
            this.button.style.marginRight = '8px';
            this.button.style.color = this.TOGGLE_BUTTON_COLOR;
            this.button.style.backgroundColor = this.TOGGLE_BUTTON_BG_COLOR;
            this.button.style.fontSize = '1.5em'; // Make arrows bigger
            this.button.style.display = 'flex';
            this.button.style.alignItems = 'center';
            this.button.style.justifyContent = 'center';
            this.button.style.top = '';
            this.button.style.left = '';
            this.button.style.right = '';
            this.button.style.bottom = '';
        },
        
        // Helper for setting button collapsed styles
        _applyCollapsedButtonStyles() {
            if (!this.button) return;
            
            this.button.style.position = 'absolute';
            this.button.style.zIndex = '999999';
            this.button.style.display = 'flex';
            this.button.style.alignItems = 'center';
            this.button.style.justifyContent = 'center';
            this.button.style.pointerEvents = 'auto';
            this.button.style.left = '10px';  // Position on left side instead of right
            this.button.style.bottom = '10px';
            this.button.style.top = 'auto';
            this.button.style.right = 'auto'; // Clear right position
            this.button.style.color = this.TOGGLE_BUTTON_COLOR;
            this.button.style.backgroundColor = this.TOGGLE_BUTTON_BG_COLOR;
            this.button.style.fontSize = '1.5em'; // Make arrows bigger
        },

        updateButtonState() {
            if (!this.button) return;
            
            // Update button appearance and aria-label
            this.button.innerHTML = this.isCollapsed ? '▲' : '▼';
            this.button.setAttribute('aria-label', this.isCollapsed ? 'Expand tab strip' : 'Collapse tab strip');
        },
        
        toggleTabStrip() {
            // Update state and persist to storage
            this.isCollapsed = !this.isCollapsed;
            chrome.storage.sync.set({ tabStripCollapsed: this.isCollapsed });
            EdgeTabsPlus.logToEruda(`Toggle state changed to: ${this.isCollapsed ? 'collapsed' : 'expanded'}`, 'log');
            
            // Get DOM references
            const elements = this._getDOMElements();
            if (!elements) {
                EdgeTabsPlus.logToEruda('Failed to find required DOM elements for toggle', 'error');
                return;
            }
            
            // Apply the appropriate state
            if (this.isCollapsed) {
                this.collapseTabStrip(true);
            } else {
                this.expandTabStrip();
            }
            
            // Update button state
            this.updateButtonState();
        },
         
        collapseTabStrip(animate = true) {
            const elements = this._getDOMElements();
            if (!elements) return;
            
            const { strip } = elements;
            
            // Store reference to UI container
            if (!EdgeTabsPlus.ui) EdgeTabsPlus.ui = {};
            EdgeTabsPlus.ui.tabStripContainer = strip;
            
            // Add transition if animating
            if (animate) strip.classList.add('transitioning');
            
            // Store button position before changes if needed
            if (!this._buttonOriginalPosition && this.button) {
                const rect = this.button.getBoundingClientRect();
                this._buttonOriginalPosition = {
                    left: rect.left,
                    top: rect.top
                };
            }
            
            // Update strip state
            strip.classList.add('collapsed');
            strip.style.visibility = 'hidden';
            
            // Create or update style for hiding elements
            let hideStyle = strip.querySelector('#hide-elements-style');
            if (!hideStyle) {
                hideStyle = document.createElement('style');
                hideStyle.id = 'hide-elements-style';
                strip.appendChild(hideStyle);
            }
            
            // Apply the style to hide tab elements but keep the toggle button visible
            hideStyle.textContent = `
                /* Hide all strip children except the toggle button */
                #edgetabs-plus-strip.collapsed > *:not(#strip-toggle-btn):not(style) {
                    display: none !important;
                }
                
                /* Hide the strip container itself - but use visibility instead of display */
                #edgetabs-plus-strip.collapsed {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    /* visibility controlled by JavaScript */
                }
            `;
            
            // Update button
            this.button.classList.add('strip-collapsed-state');
            this._applyCollapsedButtonStyles();
            
            // Move button to toolbar to integrate with scroll behavior
            const toolbar = document.querySelector('.toolbar-bottom');
            if (toolbar && !toolbar.contains(this.button)) {
                toolbar.appendChild(this.button);
            }
            
            // Remove transition class after animation
            if (animate) {
                setTimeout(() => {
                    strip.classList.remove('transitioning');
                }, 300);
            }
        },
        
        expandTabStrip() {
            const elements = this._getDOMElements();
            if (!elements) return;
            
            const { strip } = elements;
            
            // Store reference to UI container
            if (!EdgeTabsPlus.ui) EdgeTabsPlus.ui = {};
            EdgeTabsPlus.ui.tabStripContainer = strip;
            
            // Add transition and remove collapsed state
            strip.classList.add('transitioning');
            strip.classList.remove('collapsed');
            
            // Clear the hide style to show all elements
            let hideStyle = strip.querySelector('#hide-elements-style');
            if (hideStyle) {
                hideStyle.textContent = '';
            }
            
            // Make the strip visible again
            strip.style.visibility = '';
            
            // Reset strip styles
            strip.style.display = 'flex';
            strip.style.background = '';
            strip.style.border = '';
            strip.style.boxShadow = '';
            
            // Update button
            this.button.classList.remove('strip-collapsed-state');
            
            // Return button to strip
            const toolbar = document.querySelector('.toolbar-bottom');
            if (toolbar && toolbar.contains(this.button)) {
                strip.insertBefore(this.button, strip.firstChild);
            } else {
                const buttonContainer = document.getElementById('edgetabs-toggle-container');
                if (buttonContainer && buttonContainer.contains(this.button)) {
                    strip.insertBefore(this.button, strip.firstChild);
                    
                    // Remove the container if it's empty
                    if (buttonContainer.childElementCount <= 1) {
                        buttonContainer.remove();
                    }
                }
            }
            
            // Reset button styles
            this._applyExpandedButtonStyles();
            
            // Ensure all child elements are visible
            const elementsToShow = strip.querySelectorAll(':scope > *:not(style)');
            elementsToShow.forEach(el => {
                if (el.style.display === 'none') {
                    el.style.display = '';
                }
            });
            
            // Remove transition class after animation
            setTimeout(() => {
                strip.classList.remove('transitioning');
            }, 300);
        },
        
        // Cleanup method to ensure proper state on page events
        cleanup() {
            // Remove any lingering toggle containers
            const container = document.getElementById('edgetabs-toggle-container');
            if (container) {
                container.remove();
            }
            
            // Check for button in toolbar
            const toolbar = document.querySelector('.toolbar-bottom');
            if (toolbar && this.button && toolbar.contains(this.button)) {
                toolbar.removeChild(this.button);
            }

            // Reset button position if it exists
            if (this.button) {
                this._applyExpandedButtonStyles();
                this._buttonOriginalPosition = null;
            }
        },
        
        // Debug method to check toggle state
        debugToggleState() {
            const elements = this._getDOMElements();
            if (!elements) {
                EdgeTabsPlus.logToEruda('DEBUG: Required DOM elements not found', 'warn');
                return;
            }
            
            const { strip } = elements;
            EdgeTabsPlus.logToEruda('==== Toggle Button Debug ====', 'log');
            EdgeTabsPlus.logToEruda(`isCollapsed: ${this.isCollapsed}`, 'log');
            EdgeTabsPlus.logToEruda(`Strip classes: ${strip.className}`, 'log');
            EdgeTabsPlus.logToEruda(`Strip visibility: ${strip.style.visibility}`, 'log');
            EdgeTabsPlus.logToEruda(`Button exists: ${!!this.button}`, 'log');
            EdgeTabsPlus.logToEruda('===========================', 'log');
        }
    };
})();
