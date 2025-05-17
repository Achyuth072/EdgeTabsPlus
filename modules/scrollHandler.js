(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.scrollHandler = {
        lastScrollY: window.scrollY, // Initialize with current scroll position
        isAutoHideEnabled: true, // Default to true as per requirement
        scrollEndTimeout: null,
        lastScrollPosition: 0,
        scrollVelocity: 0,
        scrollTimestamp: 0,

        init() {
            EdgeTabsPlus.logToEruda('Initializing scroll handler', 'log');
            
            // Reset state
            this.lastScrollY = window.scrollY;
            this.isScrolling = false;
            
            // Get initial auto-hide state from storage
            chrome.storage.sync.get('autoHide', (result) => {
                this.isAutoHideEnabled = result.autoHide !== undefined ? result.autoHide : true;
                EdgeTabsPlus.logToEruda(`Scroll handler initialized with auto-hide: ${this.isAutoHideEnabled}`, 'log');
                
                // Ensure initial state is correct
                const host = document.getElementById('edgetabs-plus-host');
                if (host && host.shadowRoot) {
                    const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
                    if (strip) {
                        EdgeTabsPlus.logToEruda('Found strip during initialization', 'log');
                        if (!this.isAutoHideEnabled) {
                            strip.classList.remove('hidden');
                        }
                    } else {
                        EdgeTabsPlus.logToEruda('WARNING: Strip not found during initialization', 'warn');
                    }
                }
            });

            this.setupScrollListener();
            this.setupHorizontalScrollListener();
            
            EdgeTabsPlus.logToEruda('Scroll handler initialization complete', 'log');
            return this;
        },

        setAutoHide(enabled) {
            EdgeTabsPlus.logToEruda(`Setting auto-hide: ${enabled}`, 'log');
            this.isAutoHideEnabled = enabled;
            
            const host = document.getElementById('edgetabs-plus-host');
            if (host && host.shadowRoot) {
                const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
                if (strip) {
                    EdgeTabsPlus.logToEruda('Found strip element for auto-hide update', 'log');
                    if (!enabled) {
                        // Reset position when disabled
                        strip.classList.remove('hidden');
                        strip.style.transform = 'translate3d(0,0,0)';
                        EdgeTabsPlus.logToEruda('Reset strip position - auto-hide disabled', 'log');
                    }
                } else {
                    EdgeTabsPlus.logToEruda('WARNING: Strip not found for auto-hide update', 'warn');
                }
            } else {
                EdgeTabsPlus.logToEruda('WARNING: Host element or shadow root not found', 'warn');
            }
            
            EdgeTabsPlus.logToEruda(`Auto-hide ${enabled ? 'enabled' : 'disabled'}`, 'log');
        },

        setupScrollListener() {
            EdgeTabsPlus.logToEruda('Setting up scroll listener', 'log');
            const boundHandler = this.handleScroll.bind(this);
            window.addEventListener('scroll', boundHandler, { passive: true });
            EdgeTabsPlus.logToEruda('Scroll listener attached to window', 'log');
            
            // Initialize with current scroll position
            this.lastScrollY = window.scrollY;
            EdgeTabsPlus.logToEruda(`Initial scroll position: ${this.lastScrollY}`, 'log');
        },

        setupHorizontalScrollListener() {
            const tabsList = document.getElementById('tabs-list');
            if (!tabsList) return;

            // Track scroll velocity for better momentum detection
            tabsList.addEventListener('scroll', (e) => {
                this.handleHorizontalScroll(e);
            }, { passive: true });
            
            // Apply enhanced scroll snap
            this.updateScrollSnap();
            
            // Set up scroll end detection to ensure tabs snap into place
            if ('onscrollend' in window) {
                tabsList.addEventListener('scrollend', () => {
                    this.handleScrollEnd(tabsList);
                }, { passive: true });
            }
            
            // Fallback for browsers that don't support scrollend
            tabsList.addEventListener('scroll', () => {
                if (this.scrollEndTimeout) {
                    clearTimeout(this.scrollEndTimeout);
                }
                this.scrollEndTimeout = setTimeout(() => {
                    this.handleScrollEnd(tabsList);
                }, 150);
            }, { passive: true });
            
            // Also monitor touchend to handle scroll snap even with small movements
            // Disabled touchend snap behavior to allow manual scroll persistence
            tabsList.addEventListener('touchend', () => {}, { passive: true });
        },

        handleScrollEnd(tabsList) {
            // Disabled auto-scroll handling to allow manual scroll persistence
            return;
        },

        handleScroll() {
            // Early return if auto-hide is disabled
            if (!this.isAutoHideEnabled) {
                return;
            }

            // Get scroll position immediately
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - this.lastScrollY;
            
            // Find the strip element
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) {
                EdgeTabsPlus.logToEruda('No host element or shadow root found', 'log');
                return;
            }
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) {
                EdgeTabsPlus.logToEruda('No strip element found', 'log');
                return;
            }

            const threshold = EdgeTabsPlus.config.scroll.threshold;
            
            // Only proceed if we've scrolled enough
            if (Math.abs(scrollDelta) > threshold) {
                requestAnimationFrame(() => {
                    if (scrollDelta > 0) {
                        strip.classList.add('hidden');
                    } else {
                        strip.classList.remove('hidden');
                    }
                });
                
                // Update last scroll position
                this.lastScrollY = currentScrollY;
            }
        },

        handleHorizontalScroll(event) {
            const tabsList = event.target;
            if (!tabsList || !tabsList.classList.contains('tabs-list')) {
                return;
            }

            // Early exit if we're in an active touch drag
            if (EdgeTabsPlus.touchHandler && EdgeTabsPlus.touchHandler.isDragging) {
                // Still track position but don't update indicators during drag
                this.lastScrollPosition = tabsList.scrollLeft;
                return;
            }

            // Debounce scroll indicator updates to reduce visual jitter
            if (this.scrollEndTimeout) {
                clearTimeout(this.scrollEndTimeout);
            }

            this.scrollEndTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    // Only update indicators if we're not in a drag operation
                    if (!EdgeTabsPlus.touchHandler?.isDragging) {
                        this.updateScrollIndicators(tabsList);
                    }
                });
            }, 32); // ~2 frames at 60fps
        },
        
        updateScrollIndicators(tabsList) {
            if (!tabsList) {
                tabsList = document.getElementById('tabs-list');
                if (!tabsList) return;
            }

            // Use percentage-based thresholds instead of fixed pixels
            const scrollWidth = tabsList.scrollWidth;
            const clientWidth = tabsList.clientWidth;
            const maxScroll = scrollWidth - clientWidth;
            const currentScroll = tabsList.scrollLeft;

            // Use 2% of the viewport width as threshold
            const threshold = clientWidth * 0.02;
            
            const hasLeftScroll = currentScroll > threshold;
            const hasRightScroll = currentScroll < (maxScroll - threshold);
            
            requestAnimationFrame(() => {
                tabsList.classList.toggle('scroll-left', hasLeftScroll);
                tabsList.classList.toggle('scroll-right', hasRightScroll);
            });
        },

        snapToNearestTabAfterScroll(tabsList) {
            // Disabled auto-scroll to active tab to allow manual scroll persistence
            return;
        },
        
        // Custom smooth scrolling implementation for iOS and other platforms with issues
        smoothScrollTo(element, targetPosition, duration = 300) {
            const startPosition = element.scrollLeft;
            const distance = targetPosition - startPosition;
            const startTime = performance.now();
            
            // Don't animate if already at position
            if (Math.abs(distance) < 2) return;
            
            const animateScroll = (timestamp) => {
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function: easeOutCubic
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                
                element.scrollLeft = startPosition + distance * easeProgress;
                
                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                }
            };
            
            requestAnimationFrame(animateScroll);
        },

        updateScrollSnap() {
            // Disabled scroll snap behavior to allow manual scroll persistence
            const tabsList = document.getElementById('tabs-list');
            if (!tabsList) return;
            
            // Clear scroll snap properties
            tabsList.style.scrollSnapType = 'none';
            tabsList.style.scrollBehavior = 'auto';
            
            // Initial indicator update only
            this.updateScrollIndicators(tabsList);
        }
    };
})();