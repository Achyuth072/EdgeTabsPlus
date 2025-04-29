(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.touchHandler = {
        startX: null,
        scrollLeft: null,
        isDragging: false,
        lastX: null,
        lastY: null,
        isHorizontalScroll: false,
        momentumRAF: null,
        touchMoveRAF: null,
        touchStartDirection: null,
        touchEndVelocity: 0,
        lastTouchTime: null,
        lastTouchX: null,
        _subPixelAccumulator: 0,
        
        init() {
            this.setupTouchScroll();
            return this;
        },

        setupTouchScroll() {
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (tabsList) {
                // Remove problematic hardware acceleration/transform styles
                tabsList.style.transform = '';
                tabsList.style.backfaceVisibility = '';
                tabsList.style.perspective = '';
                tabsList.style.willChange = 'scroll-position'; // Only scroll-position changes

                // Let native scrolling handle it
                tabsList.style.overflowX = 'auto'; // Enable native horizontal scroll
                tabsList.style.scrollBehavior = 'smooth'; // Use smooth for programmatic scrolls
                tabsList.style.overscrollBehavior = 'contain'; // Prevent overscroll effects leaking

                // Add CSS class for styling (ensure styles.js has overflow-x: auto etc.)
                tabsList.classList.add('tabs-list');

                // Add listeners
                this.addTouchListeners(tabsList);
            }
        },

        addTouchListeners(tabsList) {
            tabsList.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            tabsList.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
            tabsList.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
            tabsList.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true });
        },

        onTouchStart(e) {
            this.isDragging = true;
            this.isHorizontalScroll = null; // Reset direction detection
            this.touchStartDirection = null;
            this.startX = e.touches[0].pageX;
            this.startY = e.touches[0].pageY;
            this.lastX = this.startX;
            this.lastY = this.startY;
            this._subPixelAccumulator = 0; // Reset sub-pixel tracking
            this._lastScrollLeft = null;
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            // Cancel any ongoing animations
            cancelAnimationFrame(this.momentumRAF);
            cancelAnimationFrame(this.touchMoveRAF);
            
            // Ensure smooth direct manipulation
            tabsList.style.scrollBehavior = 'auto';
            tabsList.style.scrollSnapType = 'none';
            tabsList.style.touchAction = 'pan-x';  // Optimize for horizontal touch
            tabsList.style.willChange = 'scroll-position';  // Hint to browser for optimization
        },

        onTouchMove(e) {
            if (!this.isDragging) return;

            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;

            const x = e.touches[0].pageX;
            const y = e.touches[0].pageY;

            // Detect scroll direction on initial movement
            if (this.isHorizontalScroll === null) {
                const deltaX = Math.abs(x - this.startX);
                const deltaY = Math.abs(y - this.startY);

                if (deltaX > 5 || deltaY > 5) {
                    this.isHorizontalScroll = deltaX > deltaY;
                    this.touchStartDirection = this.isHorizontalScroll ? 'horizontal' : 'vertical';

                    if (!this.isHorizontalScroll) {
                        this.isDragging = false;
                        return;
                    }
                    
                    // Enhance scroll performance during drag
                    tabsList.style.scrollBehavior = 'auto';
                    tabsList.style.scrollSnapType = 'none';
                    tabsList.style.willChange = 'scroll-position';
                } else {
                    return;
                }
            }

            // Only process horizontal scrolling
            if (this.isHorizontalScroll) {
                const now = performance.now();
                const rawDeltaX = this.lastX - x;
                
                // Accumulate sub-pixel movements with improved precision
                this._subPixelAccumulator += rawDeltaX;
                
                // Calculate speed-based threshold
                const moveSpeed = Math.abs(rawDeltaX / (now - this.lastTouchTime || 1));
                const threshold = Math.min(1, Math.max(0.25, moveSpeed * 0.75));
                
                // Use fractional updates for very slow movements
                if (Math.abs(this._subPixelAccumulator) >= threshold) {
                    cancelAnimationFrame(this.touchMoveRAF);
                    this.touchMoveRAF = requestAnimationFrame(() => {
                        // Apply exact sub-pixel value for smoother slow-speed updates
                        const delta = this._subPixelAccumulator;
                        tabsList.scrollLeft += delta;
                        this._subPixelAccumulator = 0;
                    });
                }
                
                // Store values for momentum calculation
                this.lastTouchTime = now;
                this.lastTouchX = x;
                this.lastX = x;
                this.lastY = y;
            }
        },

        onTouchEnd(e) {
            if (!this.isDragging) return;

            this.isDragging = false;
            
            // Only process if horizontal scroll was initiated
            if (this.isHorizontalScroll) {
                const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                if (!tabsList) return;

                const velocity = this.calculateTouchEndVelocity();
                const absVelocity = Math.abs(velocity);

                // Use a small timeout to ensure smooth transition from touch movement
                setTimeout(() => {
                    if (absVelocity > 0.5) {
                        // Apply momentum with smooth transition
                        this.applyScrollMomentum(tabsList);
                    } else {
                        // For very slow movements, delay snap re-enable slightly
                        const snapDelay = absVelocity < 0.1 ? 150 : 50;
                        setTimeout(() => {
                            tabsList.style.willChange = 'auto';
                            tabsList.style.touchAction = 'auto';
                            tabsList.style.scrollBehavior = 'smooth';
                            tabsList.style.scrollSnapType = 'x proximity';
                            EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
                        }, snapDelay);
                    }
                }, 16); // One frame delay for smooth transition
            }
            
            // Clean up after slight delay to prevent jarring transitions
            setTimeout(() => {
                this._subPixelAccumulator = 0;
                this.isHorizontalScroll = null;
            }, 32);
        },

        calculateTouchEndVelocity() {
            if (!this.lastTouchTime || !this.lastTouchX) return 0;
            
            const now = performance.now();
            const deltaTime = now - this.lastTouchTime;
            if (deltaTime === 0) return 0;
            
            // Average the last few moves for more stable velocity
            const recentDeltaX = this.lastX - this.lastTouchX;
            const instantVelocity = recentDeltaX / deltaTime;
            
            // Smooth out very small velocities to prevent unwanted momentum
            return Math.abs(instantVelocity) < 0.1 ? 0 : instantVelocity;
        },
        
        applyScrollMomentum(tabsList) {
            if (!tabsList) return;
            
            const velocity = this.calculateTouchEndVelocity();
            const absVelocity = Math.abs(velocity);
            
            if (absVelocity < 0.5) {
                // Ensure smooth transition for low velocities
                setTimeout(() => {
                    tabsList.style.scrollBehavior = 'smooth';
                    tabsList.style.scrollSnapType = 'x proximity';
                    EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
                }, 32);
                return;
            }
            
            // Scale momentum based on velocity range
            const momentumScale = Math.min(1.5, Math.max(0.5, absVelocity));
            const initialVelocity = velocity * -300 * momentumScale;
            const maxScrollLeft = tabsList.scrollWidth - tabsList.clientWidth;
            let startTime = null;
            let lastTimestamp = null;
            
            const animateMomentum = (timestamp) => {
                if (!startTime) {
                    startTime = timestamp;
                    lastTimestamp = timestamp;
                }
                
                const elapsed = timestamp - startTime;
                const deltaTime = timestamp - lastTimestamp;
                lastTimestamp = timestamp;
                
                // Improved easing with dynamic duration based on initial velocity
                const duration = 400 + (absVelocity * 200); // Longer duration for faster swipes
                const easeOut = Math.min(1, elapsed / duration);
                const easeFunction = 1 - Math.pow(1 - easeOut, 2); // Quadratic ease-out
                const currentVelocity = initialVelocity * (1 - easeFunction);
                
                // Stop conditions
                if (easeOut === 1 ||
                    tabsList.scrollLeft <= 0 ||
                    tabsList.scrollLeft >= maxScrollLeft ||
                    Math.abs(currentVelocity) < 0.1) { // Stop at very low velocities
                    
                    // Ensure smooth transition to snap
                    setTimeout(() => {
                        tabsList.style.scrollBehavior = 'smooth';
                        tabsList.style.scrollSnapType = 'x proximity';
                        EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
                    }, 16);
                    return;
                }
                
                // Apply smoother scroll updates
                const delta = currentVelocity * (deltaTime / 1000);
                tabsList.scrollLeft += delta;
                
                this.momentumRAF = requestAnimationFrame(animateMomentum);
            };
            
            this.momentumRAF = requestAnimationFrame(animateMomentum);
        }
    };
})();