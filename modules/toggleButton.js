/**
 * Toggle button for collapsing/expanding the tab strip.
 * All logic and DOM elements are encapsulated within the Shadow DOM.
 */
(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.toggleButton = {
        button: null,
        isCollapsed: false,
        _buttonOriginalPosition: null,
        _boundResizeHandler: null,
        _boundScrollHandler: null,
        _scrollTimer: null,
        _isButtonHidden: false,

        // Constants
        TOGGLE_BUTTON_COLOR: '#104e92',
        TOGGLE_BUTTON_BG_COLOR: '#2bc3d2',

        // Cached DOM elements
        _elements: null,
        _buttonContainer: null,

        /**
         * Returns the toggle button element.
         * @returns {HTMLElement|null}
         */
        getButtonElement() {
            return this.button;
        },

        /**
         * Returns whether the tab strip is currently collapsed.
         * @returns {boolean}
         */
        isCurrentlyCollapsed() {
            return this.isCollapsed;
        },
        
        /**
         * Locates and caches critical DOM elements.
         * Must be called before any DOM operations.
         * @returns {Object|null} Object containing references to key DOM elements
         */
        _getAndCacheDOMElements() {
            if (this._elements) return this._elements; // Return cached if available

            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) {
                EdgeTabsPlus.logToEruda('Error: edgetabs-plus-host or its shadowRoot not found.', 'error');
                return null;
            }
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) {
                EdgeTabsPlus.logToEruda('Error: edgetabs-plus-strip not found in shadowRoot.', 'error');
                return null;
            }
            
            this._elements = { host, strip, shadowRoot: host.shadowRoot };
            return this._elements;
        },

        /**
         * Initializes the toggle button functionality.
         * Creates DOM elements, injects styles, sets up event listeners,
         * and restores previous state from storage.
         * @returns {Object} The toggleButton module for chaining
         */
        init() {
            this.cleanup(); // Clean up any previous state
            
            if (!this._getAndCacheDOMElements()) return this; // Ensure DOM elements are ready

            this.createToggleButtonAndContainer(); // Create button and its container within Shadow DOM
            this._injectStyles(); // Inject all necessary styles into Shadow DOM once

            // Add window resize listener with debouncing
            this._boundResizeHandler = this._debounce(this._handleResize.bind(this), 200);
            window.addEventListener('resize', this._boundResizeHandler);
            
            // Add scroll listener with throttling
            this._boundScrollHandler = this._throttle(this._handleScroll.bind(this), 150);
            window.addEventListener('scroll', this._boundScrollHandler, { passive: true });
            
            this._lastScrollY = window.scrollY; // Initialize scroll tracking
            
            // Prevent flash on load by initially hiding strip, then revealing
            if (this._elements.strip) {
                 this._elements.strip.classList.add('strip-hidden-initially');
            }
            
            // Restore collapsed state from storage
            chrome.storage.sync.get(['tabStripCollapsed'], (result) => {
                const shouldBeCollapsed = result.tabStripCollapsed === true;
                
                if (this.button) this._storeButtonPosition(); // Store initial position
                
                this.isCollapsed = shouldBeCollapsed; // Set state first
                
                if (this.isCollapsed) {
                    this.collapseTabStrip(false); // Don't animate initial state
                } else {
                    this.expandTabStrip(false); // Ensure strip is expanded if not collapsed
                }
                
                this.updateButtonState(); // Update button icon/aria
                
                // Make strip visible after state is applied
                if (this._elements.strip) {
                    setTimeout(() => {
                        this._elements.strip.classList.remove('strip-hidden-initially');
                        // Ensure correct visibility based on state, especially if not animating expand
                        if (!this.isCollapsed) {
                             this._elements.strip.classList.remove('strip-collapsed-visuals');
                             if (this._buttonContainer) this._buttonContainer.classList.add('hidden');
                        } else {
                            if (this._buttonContainer) this._buttonContainer.classList.remove('hidden');
                        }
                    }, 10); // Small delay for setup
                }
            });
            
            return this;
        },

        /**
         * Creates the toggle button and its container, both within the Shadow DOM.
         * The button initially lives in the tab strip, but will move to the container
         * when the strip is collapsed.
         */
        createToggleButtonAndContainer() {
            if (!this._elements || !this._elements.shadowRoot) return;
            const { shadowRoot, strip } = this._elements;

            // Create toggle button if it doesn't exist
            if (!this.button) {
                this.button = document.createElement('button');
                this.button.id = 'strip-toggle-btn';
                this.button.className = 'strip-toggle-btn'; // Base class for styling
                this.button.setAttribute('aria-label', 'Collapse tab strip');
                this.button.innerHTML = '▼'; // Initial icon

                this.button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleTabStrip();
                });
                
                // The button is initially part of the strip
                strip.insertBefore(this.button, strip.firstChild);
            }

            // Create dedicated fixed-position container in Shadow DOM for button when strip is collapsed
            if (!this._buttonContainer) {
                this._buttonContainer = document.createElement('div');
                this._buttonContainer.id = 'edgetabs-toggle-container';
                this._buttonContainer.className = 'toggle-button-container hidden'; // Initially hidden
                
                // Always append to shadowRoot, never to document.body
                shadowRoot.appendChild(this._buttonContainer);
            }
        },
        
        /**
         * Applies appropriate CSS classes to the button and its container
         * based on whether the strip is collapsed or expanded.
         * Also handles fixed positioning of the button container when collapsed.
         * @param {boolean} isCollapsed Whether the strip is in collapsed state
         */
        _applyButtonStyles(isCollapsed) {
            if (!this.button) return;
            
            // Toggle appropriate button classes
            this.button.classList.toggle('button-expanded-styles', !isCollapsed);
            this.button.classList.toggle('button-collapsed-styles', isCollapsed);

            if (this._buttonContainer) {
                // Toggle container class
                this._buttonContainer.classList.toggle('container-collapsed-styles', isCollapsed);
                
                // Only adjust position if collapsed - otherwise container is hidden
                if (isCollapsed && this._buttonOriginalPosition) {
                    // Position using viewport-relative coordinates from _buttonOriginalPosition
                    this._buttonContainer.style.top = `${this._buttonOriginalPosition.top}px`;
                    this._buttonContainer.style.left = `${this._buttonOriginalPosition.left}px`;
                } else if (isCollapsed) { 
                    // Fallback positioning if original position not available
                    this._buttonContainer.style.top = 'auto';
                    this._buttonContainer.style.left = '10px';
                    this._buttonContainer.style.bottom = '10px';
                }
            }
        },

        /**
         * Updates the button's visual state and ARIA attributes
         * based on the current collapsed/expanded state.
         */
        updateButtonState() {
            if (!this.button) return;
            
            // Update icon and accessibility attributes
            this.button.innerHTML = this.isCollapsed ? '▲' : '▼';
            this.button.setAttribute('aria-label', 
                this.isCollapsed ? 'Expand tab strip' : 'Collapse tab strip');
            
            // Apply appropriate styling based on state
            this._applyButtonStyles(this.isCollapsed);
        },
        
        /**
         * Toggles the tab strip between collapsed and expanded states.
         * Updates storage, applies animations, and repositions elements.
         */
        toggleTabStrip() {
            this.isCollapsed = !this.isCollapsed;
            
            // Persist state to storage
            chrome.storage.sync.set({ tabStripCollapsed: this.isCollapsed });
            EdgeTabsPlus.logToEruda(`Toggle state changed to: ${this.isCollapsed ? 'collapsed' : 'expanded'}`, 'log');
            
            if (!this._elements) return; // Ensure elements are available
            
            // Apply the appropriate state with animation
            if (this.isCollapsed) {
                this.collapseTabStrip(true);
            } else {
                this.expandTabStrip(true);
            }
            
            this.updateButtonState();
        },
        
        /**
         * Stores the button's current position relative to the viewport.
         * This is crucial for correctly positioning the fixed container
         * after the strip collapses.
         */
        _storeButtonPosition() {
            if (!this.button || !this._elements || !this._elements.strip.contains(this.button)) return;
            
            // Only store if button is in the strip (expanded state)
            const rect = this.button.getBoundingClientRect();
            this._buttonOriginalPosition = {
                top: rect.top,    // Relative to viewport
                left: rect.left,  // Relative to viewport
                width: rect.width,
                height: rect.height
            };
        },
         
        /**
         * Collapses the tab strip and moves the toggle button to a fixed container.
         * @param {boolean} animate Whether to animate the transition
         */
        collapseTabStrip(animate = true) {
            if (!this._elements || !this._buttonContainer) return;
            const { strip } = this._elements;

            // Store reference for other modules if needed
            if (!EdgeTabsPlus.ui) EdgeTabsPlus.ui = {};
            EdgeTabsPlus.ui.tabStripContainer = strip;
            
            // Only move button if it's currently in the strip
            if (this.button && strip.contains(this.button)) {
                this._storeButtonPosition(); // Store position before moving
                this._buttonContainer.appendChild(this.button); // Move button to fixed container in shadow DOM
            }
            
            // Apply visual state via classes
            strip.classList.add('strip-collapsed-visuals'); // Hides strip content via CSS
            
            if (animate) {
                strip.classList.add('strip-transitioning');
                this._buttonContainer.classList.add('container-transitioning');
            }
            
            this._buttonContainer.classList.remove('hidden'); // Show the button's new container
            this._applyButtonStyles(true); // Apply collapsed styles to button and container

            // Remove transition classes after animation completes
            if (animate) {
                setTimeout(() => {
                    strip.classList.remove('strip-transitioning');
                    this._buttonContainer.classList.remove('container-transitioning');
                }, 300); // Match CSS transition time
            }
        },
        
        /**
         * Expands the tab strip and moves the toggle button back inside the strip.
         * @param {boolean} animate Whether to animate the transition
         */
        expandTabStrip(animate = true) {
            if (!this._elements || !this._buttonContainer) return;
            const { strip } = this._elements;

            // Store reference for other modules if needed
            if (!EdgeTabsPlus.ui) EdgeTabsPlus.ui = {};
            EdgeTabsPlus.ui.tabStripContainer = strip;

            // Only move button if it's currently in the fixed container
            if (this.button && this._buttonContainer.contains(this.button)) {
                strip.insertBefore(this.button, strip.firstChild); // Move button back to strip
            }
            
            // Apply visual state via classes
            strip.classList.remove('strip-collapsed-visuals');
            
            if (animate) {
                strip.classList.add('strip-transitioning');
            }
            
            this._buttonContainer.classList.add('hidden'); // Hide the fixed container
            this._applyButtonStyles(false); // Apply expanded styles

            // Remove transition classes after animation completes
            if (animate) {
                setTimeout(() => {
                    strip.classList.remove('strip-transitioning');
                }, 300);
            }
        },
        
        /**
         * Cleans up all event listeners, DOM elements, and resets state.
         * Should be called before reinitializing or when the module is no longer needed.
         */
        cleanup() {
            // Remove event listeners
            if (this._boundResizeHandler) {
                window.removeEventListener('resize', this._boundResizeHandler);
                this._boundResizeHandler = null;
            }
            if (this._boundScrollHandler) {
                window.removeEventListener('scroll', this._boundScrollHandler);
                this._boundScrollHandler = null;
            }
            if (this._scrollTimer) {
                clearTimeout(this._scrollTimer);
                this._scrollTimer = null;
            }
            
            // Remove button and container from Shadow DOM if they exist
            if (this.button) {
                this.button.remove();
                this.button = null;
            }
            if (this._buttonContainer) {
                this._buttonContainer.remove();
                this._buttonContainer = null;
            }
            
            // Remove injected style tag from Shadow DOM
            const styleTag = this._elements?.shadowRoot.getElementById('edgetabs-toggle-button-styles');
            if (styleTag) {
                styleTag.remove();
            }

            // Reset state
            this._elements = null;
            this._buttonOriginalPosition = null;
            this.isCollapsed = false;
            this._isButtonHidden = false;
            this._lastScrollY = null;
        },
        
        /**
         * Handles window resize events.
         * Maintains proper button positioning when collapsed.
         * Debounced in init() to improve performance.
         */
        _handleResize() {
            if (this.isCollapsed && this._buttonContainer && this._buttonOriginalPosition) {
                // When collapsed, update the fixed container position using stored viewport coordinates
                // This preserves the button's relative position on screen despite window resizing
                this._buttonContainer.style.top = `${this._buttonOriginalPosition.top}px`;
                this._buttonContainer.style.left = `${this._buttonOriginalPosition.left}px`;
            } else if (!this.isCollapsed && this.button && this._elements?.strip.contains(this.button)) {
                // If expanded, update stored position as window resizes
                this._storeButtonPosition();
            }
        },

        /**
         * Handles scroll events.
         * Shows/hides the toggle button based on scroll direction.
         * Throttled in init() to improve performance.
         */
        _handleScroll() {
            if (!this.isCollapsed || !this._buttonContainer) return;

            // Check if auto-hide is enabled (default: true)
            const autoHideEnabled = EdgeTabsPlus.scrollHandler?.isAutoHideEnabled ?? true;
            if (!autoHideEnabled) {
                this._buttonContainer.classList.remove('slide-hide-via-scroll');
                this._isButtonHidden = false;
                return;
            }
            
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - (this._lastScrollY || 0);
            const threshold = EdgeTabsPlus.config?.scroll?.threshold ?? 5;
            
            // Only react to significant scroll movements
            if (Math.abs(scrollDelta) > threshold) {
                requestAnimationFrame(() => {
                    if (scrollDelta > 0) { // Scrolling down - hide
                        this._buttonContainer.classList.add('slide-hide-via-scroll');
                        this._isButtonHidden = true;
                    } else { // Scrolling up - show
                        this._buttonContainer.classList.remove('slide-hide-via-scroll');
                        this._isButtonHidden = false;
                    }
                });
                this._lastScrollY = currentScrollY;
            }
        },

        /**
         * Creates a debounced version of a function.
         * @param {Function} func The function to debounce
         * @param {number} delay Delay in ms before function execution
         * @returns {Function} Debounced function
         */
        _debounce(func, delay) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
