(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.touchHandler = {
        startX: null,
        scrollLeft: null,
        isDragging: false,
        lastX: null,
        lastTime: null,
        velocity: 0,
        momentumRAF: null,

        init() {
            this.setupTouchScroll();
            return this;
        },

        setupTouchScroll() {
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            
            // Use transform for hardware acceleration
            tabsList.style.transform = 'translate3d(0,0,0)';
            tabsList.style.willChange = 'scroll-position';
            tabsList.style.overscrollBehavior = 'contain';
            
            this.addTouchListeners(tabsList);
        },

        addTouchListeners(tabsList) {
            tabsList.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            tabsList.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
            tabsList.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
            tabsList.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true });
        },

        onTouchStart(e) {
            this.isDragging = true;
            this.startX = e.touches[0].pageX;
            this.lastX = this.startX;
            this.lastTime = Date.now();
            this.scrollLeft = EdgeTabsPlus.uiComponents.tabsList.scrollLeft;
            this.velocity = 0;
            
            // Cancel any ongoing momentum and animations
            cancelAnimationFrame(this.momentumRAF);
            EdgeTabsPlus.uiComponents.tabsList.style.scrollBehavior = 'auto';
            
            // Clear any existing transitions to prevent ghosting
            EdgeTabsPlus.uiComponents.tabsList.style.transition = 'none';
            requestAnimationFrame(() => {
                EdgeTabsPlus.uiComponents.tabsList.style.transition = '';
            });
        },

        onTouchMove(e) {
                    if (!this.isDragging) return;
                    
                    const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                    const x = e.touches[0].pageX;
                    const deltaX = x - this.lastX;
                    const currentTime = Date.now();
                    const deltaTime = currentTime - this.lastTime;
                    
                    // Calculate velocity (pixels per millisecond)
                    if (deltaTime > 0) {
                        this.velocity = (deltaX / deltaTime); // Reduced sensitivity for better control
                    }
                    
                    // Calculate new scroll position
                    const newScrollLeft = this.scrollLeft - (x - this.startX);
                    
                    // Check boundaries
                    const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
                    const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
                    
                    // Update scroll position with hardware acceleration and boundary checks
                    requestAnimationFrame(() => {
                        tabsList.scrollLeft = boundedScrollLeft;
                        
                        // Reset velocity if hitting boundaries to prevent bouncing
                        if (boundedScrollLeft === 0 || boundedScrollLeft === maxScroll) {
                            this.velocity = 0;
                        }
                    });
                    
                    this.lastX = x;
                    this.lastTime = currentTime;
                },

        onTouchEnd() {
                    if (!this.isDragging) return;
                    this.isDragging = false;
                    
                    const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                    const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
                    
                    // Enhanced momentum scrolling with boundary checks
                    const momentum = () => {
                        if (Math.abs(this.velocity) > 0.01) {
                            requestAnimationFrame(() => {
                                const newScrollLeft = tabsList.scrollLeft - (this.velocity * 16);
                                const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
                                
                                tabsList.scrollLeft = boundedScrollLeft;
                                
                                // Apply stronger deceleration near boundaries
                                if (boundedScrollLeft === 0 || boundedScrollLeft === maxScroll) {
                                    this.velocity = 0;
                                } else {
                                    // Progressive deceleration
                                    this.velocity *= Math.abs(this.velocity) > 0.5 ? 0.92 : 0.85;
                                }
                                
                                this.momentumRAF = requestAnimationFrame(momentum);
                            });
                        } else {
                            // Snap to nearest tab when momentum ends
                            const tabWidth = tabsList.firstElementChild?.offsetWidth || 0;
                            if (tabWidth > 0) {
                                const targetScroll = Math.round(tabsList.scrollLeft / tabWidth) * tabWidth;
                                tabsList.scrollTo({
                                    left: targetScroll,
                                    behavior: 'smooth'
                                });
                            }
                        }
                    };
                    
                    // Only apply momentum if velocity is significant
                    if (Math.abs(this.velocity) > 0.1) {
                        momentum();
                    }
                }
    };
})();