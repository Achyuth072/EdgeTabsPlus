// Toggle button for collapsing/expanding the tab strip
(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.toggleButton = {
        button: null,
        isCollapsed: false,
        _buttonOriginalPosition: null,
        _boundResizeHandler: null,
        
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
            
            // Add window resize listener to update button position
            this._boundResizeHandler = this._handleResize.bind(this);
            window.addEventListener('resize', this._boundResizeHandler);
            
            // Prevent flash on load
            const elements = this._getDOMElements();
            if (elements) {
                elements.strip.style.visibility = 'hidden';
            }
            
            // Check stored state
            chrome.storage.sync.get(['tabStripCollapsed'], (result) => {
                const shouldBeCollapsed = result.tabStripCollapsed === true;
                
                // Store initial button position before any state changes
                if (this.button) {
                    this._storeButtonPosition();
                }
                
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
        
        // Helper to set button styles efficiently
        _setButtonBaseStyles(styles) {
            if (!this.button) return;
            Object.assign(this.button.style, styles);
        },
        
        // Helper for setting button expanded styles
        _applyExpandedButtonStyles() {
            if (!this.button) return;
            
            this._setButtonBaseStyles({
                position: 'relative',
                zIndex: '2',
                marginRight: '8px',
                color: this.TOGGLE_BUTTON_COLOR,
                backgroundColor: this.TOGGLE_BUTTON_BG_COLOR,
                fontSize: '1.3em', // Make arrows bigger
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                top: '',
                left: '',
                right: '',
                bottom: '',
                width: '24px', // Explicit dimensions
                height: '24px'
            });
        },
        
        // Helper for setting button collapsed styles
        _applyCollapsedButtonStyles() {
            if (!this.button) return;
            
            this._setButtonBaseStyles({
                position: 'absolute',
                zIndex: '999999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                // In the container, position relative to container
                left: '0',
                top: '0',
                right: 'auto',
                bottom: 'auto',
                width: '24px',
                height: '24px',
                color: this.TOGGLE_BUTTON_COLOR,
                backgroundColor: this.TOGGLE_BUTTON_BG_COLOR,
                fontSize: '1.3em', // Make arrows bigger
                // Enhanced visibility styles
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                border: 'none',
                opacity: '1',
                visibility: 'visible'
            });
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
        
        // Helper to store button position consistently
        _storeButtonPosition() {
            if (!this.button) return;
            
            const rect = this.button.getBoundingClientRect();
            this._buttonOriginalPosition = {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
        },
        
        // Helper to set container dimensions consistently
        _setContainerDimensions(container) {
            if (!container) return;
            
            container.style.width = '24px';
            container.style.height = '24px';
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
            
            // Store button position before changes
            if (this.button) {
                this._storeButtonPosition();
            }
            
            // Update strip state
            strip.classList.add('collapsed');
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
            
            // Create a fallback container for the button
            let buttonContainer = document.getElementById('edgetabs-toggle-container');
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.id = 'edgetabs-toggle-container';
                buttonContainer.style.position = 'fixed';
                buttonContainer.style.zIndex = '9999999';
                
                // Use the stored position if available, otherwise use fallback values
                if (this._buttonOriginalPosition) {
                    buttonContainer.style.top = `${this._buttonOriginalPosition.top}px`;
                    buttonContainer.style.left = `${this._buttonOriginalPosition.left}px`;
                    this._setContainerDimensions(buttonContainer);
                } else {
                    buttonContainer.style.bottom = '10px';
                    buttonContainer.style.left = '10px';
                    this._setContainerDimensions(buttonContainer);
                }
                document.body.appendChild(buttonContainer);
            } else {
                // Reset container dimensions when re-collapsing
                this._setContainerDimensions(buttonContainer);
            }
            
            // Add button to container if it's not already there
            if (!buttonContainer.contains(this.button)) {
                buttonContainer.appendChild(this.button);
            }
            
            // Set strip to hidden AFTER moving the button out
            strip.style.visibility = 'hidden';
            
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
            
            // Check for our fallback container
            const buttonContainer = document.getElementById('edgetabs-toggle-container');
            if (buttonContainer && buttonContainer.contains(this.button)) {
                strip.insertBefore(this.button, strip.firstChild);
                
                // Update stored button position for next time
                setTimeout(() => {
                    if (this.button) {
                        this._storeButtonPosition();
                    }
                }, 50); // Short delay to ensure button is properly positioned
                
                // Remove the container if it's empty
                if (buttonContainer.childElementCount === 0) {
                    buttonContainer.remove();
                }
            }
            
            // Reset button styles
            this._applyExpandedButtonStyles();
            
            // Force reflow to ensure styles are applied correctly
            void this.button.offsetWidth;
            
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
            // Remove resize event listener
            if (this._boundResizeHandler) {
                window.removeEventListener('resize', this._boundResizeHandler);
                this._boundResizeHandler = null;
            }
            
            // Remove any lingering toggle containers
            const container = document.getElementById('edgetabs-toggle-container');
            if (container) {
                container.remove();
            }
            
            // Reset button position if it exists
            if (this.button) {
                this._applyExpandedButtonStyles();
                this._buttonOriginalPosition = null;
            }
        },
        
        // Handle window resize
        _handleResize() {
            // Only update if not collapsed (if collapsed, we'll update on expand)
            if (!this.isCollapsed && this.button) {
                this._storeButtonPosition();
                
                // Update container position if it exists
                const buttonContainer = document.getElementById('edgetabs-toggle-container');
                if (buttonContainer && this._buttonOriginalPosition) {
                    buttonContainer.style.top = `${this._buttonOriginalPosition.top}px`;
                    buttonContainer.style.left = `${this._buttonOriginalPosition.left}px`;
                    this._setContainerDimensions(buttonContainer);
                }
            }
        }
    };
})();
