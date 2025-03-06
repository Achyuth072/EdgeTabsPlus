(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.scrollHandler = {
        lastScrollY: 0,
        isScrolling: false,
        isAutoHideEnabled: true, // Default to true as per requirement
        scrollEndTimeout: null,
        lastScrollPosition: 0,
        scrollVelocity: 0,
        scrollTimestamp: 0,

        init() {
            // Get initial auto-hide state from storage
            chrome.storage.sync.get('autoHide', (result) => {
                this.isAutoHideEnabled = result.autoHide !== undefined ? result.autoHide : true;
                EdgeTabsPlus.logger.addLog(`Scroll handler initialized with auto-hide: ${this.isAutoHideEnabled}`);
            });
            this.setupScrollListener();
            this.setupHorizontalScrollListener();
            return this;
        },

        setAutoHide(enabled) {
            this.isAutoHideEnabled = enabled;
            const strip = document.getElementById('edgetabs-plus-strip');
            if (strip) {
                if (!enabled) {
                    // Reset position when disabled
                    strip.classList.remove('hidden');
                    strip.style.transform = 'translate3d(0,0,0)';
                }
            }
            EdgeTabsPlus.logger.addLog(`Auto-hide ${enabled ? 'enabled' : 'disabled'}`);
        },

        setupScrollListener() {
            window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
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
            if (!this.isAutoHideEnabled || !this.isScrolling) {
                requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    const scrollDelta = currentScrollY - this.lastScrollY;
                    const strip = document.getElementById('edgetabs-plus-strip');

                    if (strip && Math.abs(scrollDelta) > EdgeTabsPlus.config.scroll.threshold) {
                        if (this.isAutoHideEnabled) {
                            requestAnimationFrame(() => {
                                if (scrollDelta > 0) {
                                    // Scrolling down - hide
                                    strip.classList.add('hidden');
                                } else {
                                    // Scrolling up - show
                                    strip.classList.remove('hidden');
                                }
                            });
                        }
                        this.lastScrollY = currentScrollY;
                    }
                });
            }
            this.isScrolling = false;
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