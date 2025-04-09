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
            EdgeTabsPlus.logger.addLog('Initializing scroll handler');
            
            // Reset state
            this.lastScrollY = window.scrollY;
            this.isScrolling = false;
            
            // Get initial auto-hide state from storage
            chrome.storage.sync.get('autoHide', (result) => {
                this.isAutoHideEnabled = result.autoHide !== undefined ? result.autoHide : true;
                EdgeTabsPlus.logger.addLog(`Scroll handler initialized with auto-hide: ${this.isAutoHideEnabled}`);
                
                // Ensure initial state is correct
                const host = document.getElementById('edgetabs-plus-host');
                if (host && host.shadowRoot) {
                    const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
                    if (strip) {
                        EdgeTabsPlus.logger.addLog('Found strip during initialization');
                        if (!this.isAutoHideEnabled) {
                            strip.classList.remove('hidden');
                        }
                    } else {
                        EdgeTabsPlus.logger.addLog('WARNING: Strip not found during initialization');
                    }
                }
            });

            this.setupScrollListener();
            this.setupHorizontalScrollListener();
            
            EdgeTabsPlus.logger.addLog('Scroll handler initialization complete');
            return this;
        },

        setAutoHide(enabled) {
            EdgeTabsPlus.logger.addLog('Setting auto-hide:', enabled);
            this.isAutoHideEnabled = enabled;
            
            const host = document.getElementById('edgetabs-plus-host');
            if (host && host.shadowRoot) {
                const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
                if (strip) {
                    EdgeTabsPlus.logger.addLog('Found strip element for auto-hide update');
                    if (!enabled) {
                        // Reset position when disabled
                        strip.classList.remove('hidden');
                        strip.style.transform = 'translate3d(0,0,0)';
                        EdgeTabsPlus.logger.addLog('Reset strip position - auto-hide disabled');
                    }
                } else {
                    EdgeTabsPlus.logger.addLog('WARNING: Strip not found for auto-hide update');
                }
            } else {
                EdgeTabsPlus.logger.addLog('WARNING: Host element or shadow root not found');
            }
            
            EdgeTabsPlus.logger.addLog(`Auto-hide ${enabled ? 'enabled' : 'disabled'}`);
        },

        setupScrollListener() {
            EdgeTabsPlus.logger.addLog('Setting up scroll listener');
            const boundHandler = this.handleScroll.bind(this);
            window.addEventListener('scroll', boundHandler, { passive: true });
            EdgeTabsPlus.logger.addLog('Scroll listener attached to window');
            
            // Initialize with current scroll position
            this.lastScrollY = window.scrollY;
            EdgeTabsPlus.logger.addLog(`Initial scroll position: ${this.lastScrollY}`);
        },

        setupHorizontalScrollListener() {
            const tabsList = document.getElementById('tabs-list');
            if (!tabsList) return;

            // Track scroll velocity for better momentum detection
            tabsList.addEventListener('scroll', (e) => {
                const now = performance.now();
                const scrollPos = tabsList.scrollLeft;
                
                if (this.scrollTimestamp) {
                    const dt = now - this.scrollTimestamp;
                    const dx = scrollPos - this.lastScrollPosition;
                    
                    // Only calculate if enough time has passed
                    if (dt > 10) {
                        this.scrollVelocity = dx / dt;
                        this.lastScrollPosition = scrollPos;
                        this.scrollTimestamp = now;
                        
                        this.handleHorizontalScroll(e);
                    }
                } else {
                    this.lastScrollPosition = scrollPos;
                    this.scrollTimestamp = now;
                }
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
            tabsList.addEventListener('touchend', () => {
                if (Math.abs(this.scrollVelocity) < 0.2) {
                    // If almost no velocity, immediately snap
                    clearTimeout(this.scrollEndTimeout);
                    setTimeout(() => {
                        this.snapToNearestTabAfterScroll(tabsList);
                    }, 50);
                }
            }, { passive: true });
        },

        handleScrollEnd(tabsList) {
            // Don't compete with momentum scrolling from touchHandler
            if (!EdgeTabsPlus.touchHandler.isDragging && 
                Math.abs(this.scrollVelocity) < 0.5) {
                this.snapToNearestTabAfterScroll(tabsList);
            }
        },

        handleScroll() {
            EdgeTabsPlus.logger.addLog('Scroll event fired');
            
            // Early return if auto-hide is disabled
            if (!this.isAutoHideEnabled) {
                EdgeTabsPlus.logger.addLog('Auto-hide is disabled, ignoring scroll');
                return;
            }

            // Get scroll position immediately
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - this.lastScrollY;
            
            EdgeTabsPlus.logger.addLog(`Scroll delta: ${scrollDelta}`);
            
            // Find the strip element
            const host = document.getElementById('edgetabs-plus-host');
            if (!host || !host.shadowRoot) {
                EdgeTabsPlus.logger.addLog('No host element or shadow root found');
                return;
            }
            
            const strip = host.shadowRoot.getElementById('edgetabs-plus-strip');
            if (!strip) {
                EdgeTabsPlus.logger.addLog('No strip element found');
                return;
            }

            const threshold = EdgeTabsPlus.config.scroll.threshold;
            
            // Only proceed if we've scrolled enough
            if (Math.abs(scrollDelta) > threshold) {
                EdgeTabsPlus.logger.addLog(`Scroll threshold exceeded: ${Math.abs(scrollDelta)} > ${threshold}`);
                
                requestAnimationFrame(() => {
                    if (scrollDelta > 0) {
                        EdgeTabsPlus.logger.addLog('Scrolling down - hiding strip');
                        strip.classList.add('hidden');
                    } else {
                        EdgeTabsPlus.logger.addLog('Scrolling up - showing strip');
                        strip.classList.remove('hidden');
                    }
                    
                    EdgeTabsPlus.logger.addLog(`Strip classes after update: ${strip.className}`);
                });
                
                // Update last scroll position
                this.lastScrollY = currentScrollY;
            }
        },

        handleHorizontalScroll(event) {
            // Don't interrupt user scrolling with snapping
            if (EdgeTabsPlus.touchHandler && EdgeTabsPlus.touchHandler.isDragging) {
                return;
            }
            
            const tabsList = event.target;
            if (!tabsList || !tabsList.classList.contains('tabs-list')) {
                return;
            }
            
            // Update scroll indicators
            this.updateScrollIndicators(tabsList);
            
            // Clear any previous scroll end timeout
            if (this.scrollEndTimeout) {
                clearTimeout(this.scrollEndTimeout);
            }
        },
        
        updateScrollIndicators(tabsList) {
            if (!tabsList) {
                tabsList = document.getElementById('tabs-list');
                if (!tabsList) return;
            }
            
            const hasLeftScroll = tabsList.scrollLeft > 10;
            const hasRightScroll = tabsList.scrollLeft < (tabsList.scrollWidth - tabsList.clientWidth - 10);
            
            tabsList.classList.toggle('scroll-left', hasLeftScroll);
            tabsList.classList.toggle('scroll-right', hasRightScroll);
        },

        snapToNearestTabAfterScroll(tabsList) {
            if (!tabsList || EdgeTabsPlus.touchHandler.isDragging) return;
            
            const scrollPosition = tabsList.scrollLeft;
            const tabItems = tabsList.querySelectorAll('.tab-item');
            
            if (!tabItems.length) return;
            
            let closestTab = null;
            let minDistance = Infinity;
            
            // Find the tab closest to the current scroll position
            tabItems.forEach(tab => {
                const tabLeft = tab.offsetLeft;
                const tabCenter = tabLeft + (tab.offsetWidth / 2);
                const scrollCenter = scrollPosition + (tabsList.clientWidth / 2);
                const distance = Math.abs(tabCenter - scrollCenter);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTab = tab;
                }
            });
            
            if (closestTab) {
                // Get position to center the tab in view
                const tabLeft = closestTab.offsetLeft;
                const tabWidth = closestTab.offsetWidth;
                const targetScroll = tabLeft - ((tabsList.clientWidth - tabWidth) / 2);
                
                // Only snap if we're not too close to the target already (to avoid jitter)
                if (Math.abs(tabsList.scrollLeft - targetScroll) > 5) {
                    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    
                    // Smoother snapping animation for iOS
                    if (isAppleMobile) {
                        // For iOS we need a more controlled animation
                        this.smoothScrollTo(tabsList, targetScroll);
                    } else {
                        // For other browsers, use native smooth scrolling
                        tabsList.scrollTo({
                            left: targetScroll,
                            behavior: 'smooth'
                        });
                    }
                }
            }
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
            const tabsList = document.getElementById('tabs-list');
            if (!tabsList) return;
            
            // Modern scroll snap properties
            tabsList.style.scrollSnapType = 'x proximity';
            tabsList.style.scrollBehavior = 'smooth';
            
            // Apply scroll snap align to all tabs
            const tabs = tabsList.getElementsByClassName('tab-item');
            Array.from(tabs).forEach(tab => {
                tab.style.scrollSnapAlign = 'center';
                tab.style.scrollSnapStop = 'always';
            });
            
            EdgeTabsPlus.logger.addLog('Enhanced scroll snap behavior applied');
            
            // Initial indicator update
            this.updateScrollIndicators(tabsList);
        }
    };
})();