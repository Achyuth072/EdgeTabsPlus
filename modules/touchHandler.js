(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.touchHandler = {
        startX: null,
        scrollLeft: null,
        isDragging: false,
        lastX: null,
        lastY: null,
        lastTime: null,
        velocity: 0,
        momentumRAF: null,
        touchStartDirection: null,
        isHorizontalScroll: false,
        touchPositions: [],
        maxVelocityCapture: 10,
        currentOffset: 0,
        transformRAF: null,
        scrollUpdateRAF: null,
        pendingDeltaX: 0,

        init() {
            // Initialize timing properties
            this.frameTime = 1000 / 120; // Base timing for up to 120Hz displays
            this.lastFrameTime = 0;
            this.scrollRAF = null;
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
                this.addMouseListeners(tabsList);
            }
        },

        addTouchListeners(tabsList) {
            tabsList.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            tabsList.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
            tabsList.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
            tabsList.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true });
        },
        
        addMouseListeners(tabsList) {
            // Add mouse support for desktop testing
            tabsList.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            
            // Add wheel smooth scrolling with horizontal support
            tabsList.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        },
        
        onWheel(e) {
            // Handle horizontal wheel scrolling
            if (e.deltaX !== 0) {
                // Native horizontal wheel - let the browser handle it
                return;
            }
            
            // Convert vertical scroll to horizontal for touchpads and mice
            if (Math.abs(e.deltaY) > 0) {
                e.preventDefault();
                const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                
                if (!tabsList) return;
                
                // Faster scroll for desktop devices
                const scrollMultiplier = 2.0;
                const newScrollLeft = tabsList.scrollLeft + (e.deltaY * scrollMultiplier);
                
                // Smooth scroll to the new position
                tabsList.scrollTo({
                    left: newScrollLeft,
                    behavior: 'smooth'
                });
            }
        },
        
        onMouseDown(e) {
            if (e.button !== 0) return; // Only handle left mouse button
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            e.preventDefault();
            this.isDragging = true;
            this.startX = e.pageX;
            this.lastX = this.startX;
            this.lastTime = performance.now();
            this.scrollLeft = tabsList.scrollLeft;
            this.velocity = 0;
            this.touchPositions = [];
            
            // Prepare for high-precision tracking
            tabsList.style.scrollBehavior = 'auto';
            tabsList.style.scrollSnapType = 'none';  // Disable scroll snap during drag
            tabsList.classList.add('grabbing');
            document.body.classList.add('no-select');
        },
        
        onMouseMove(e) {
            if (!this.isDragging) return;

            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;

            const currentTime = performance.now();
            const x = e.pageX;
            const deltaX = this.lastX - x; // Calculate change since last move

            // Store position for velocity calculation
            this.touchPositions.push({ x: x, time: currentTime });
            if (this.touchPositions.length > this.maxVelocityCapture) {
                this.touchPositions.shift();
            }

            // Schedule scroll update using RAF for smoother visual updates
            this.pendingDeltaX += deltaX;
            this.scheduleScrollUpdate(tabsList);

            // Update tracking
            this.lastX = x;
            this.lastTime = currentTime; // Update time for velocity calc
        },
        
        onMouseUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;

            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;

            // Cancel any pending scroll updates
            cancelAnimationFrame(this.scrollUpdateRAF);
            this.pendingDeltaX = 0;

            // Calculate final velocity from stored positions
            this.calculateFinalVelocity();

            // Apply momentum if velocity is high enough
            // Note: scrollLeft is already updated during mousemove
            if (Math.abs(this.velocity) > 0.5) {
                this.applyScrollMomentum(tabsList); // Momentum uses scrollLeft
            } else {
                // Otherwise just snap to the nearest tab
                tabsList.style.scrollBehavior = 'smooth';
                tabsList.style.scrollSnapType = 'x proximity';  // Restore scroll snap
                EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
            }

            // Clean up
            tabsList.classList.remove('grabbing');
            document.body.classList.remove('no-select');
            // No need to reset currentOffset or transform
        },

        onTouchStart(e) {
            this.isDragging = true;
            this.isHorizontalScroll = null; // Reset direction detection
            this.touchStartDirection = null;
            this.startX = e.touches[0].pageX;
            this.startY = e.touches[0].pageY;
            this.lastX = this.startX;
            this.lastY = this.startY;
            this.lastTime = performance.now();
            this.touchPositions = []; // Reset position tracking
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            this.scrollLeft = tabsList.scrollLeft;
            this.velocity = 0;
            
            // Cancel any ongoing animations
            cancelAnimationFrame(this.momentumRAF);
            cancelAnimationFrame(this.scrollRAF);
            
            // Clear transitions and prepare for new gesture
            tabsList.style.scrollBehavior = 'auto';
            tabsList.style.scrollSnapType = 'none';  // Disable scroll snap during drag
        },

        onTouchMove(e) {
            if (!this.isDragging) return;

            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;

            const currentTime = performance.now();
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
                        this.isDragging = false; // Let native vertical scrolling take over
                        return;
                    }
                    // If horizontal, ensure scrollBehavior is 'auto' for direct manipulation
                    tabsList.style.scrollBehavior = 'auto';
                } else {
                    // Not enough movement yet to determine direction
                    return;
                }
            }

            // Only process horizontal scrolling
            if (this.isHorizontalScroll) {
                // Store position data for momentum calculation
                this.touchPositions.push({ x: x, time: currentTime });
                if (this.touchPositions.length > this.maxVelocityCapture) {
                    this.touchPositions.shift();
                }

                // Schedule scroll update using RAF for smoother visual updates
                const deltaX = this.lastX - x;
                this.pendingDeltaX += deltaX;
                this.scheduleScrollUpdate(tabsList);

                // Update tracking variables
                this.lastX = x;
                this.lastY = y; // Keep track of Y for direction detection consistency
                this.lastTime = currentTime; // Update time for velocity calc
            }
        },

        onTouchEnd(e) {
            if (!this.isDragging) {
                return;
            }

            // Only process if horizontal scroll was initiated
            if (this.isHorizontalScroll) {
                const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                if (!tabsList) {
                    this.isDragging = false;
                    return;
                }

                // Calculate final velocity based on touch history
                this.calculateFinalVelocity();

                // Apply momentum if velocity is high enough
                // scrollLeft is already updated during touchmove
                if (Math.abs(this.velocity) > 0.5) {
                    // Momentum calculation remains the same, using current scrollLeft
                    this.applyScrollMomentum(tabsList);
                } else {
                    // Otherwise just snap to the nearest tab
                    tabsList.style.scrollBehavior = 'smooth'; // Enable smooth snapping
                    tabsList.style.scrollSnapType = 'x proximity';  // Restore scroll snap
                    EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
                }
                // No need to reset currentOffset or transform
            }

            this.isDragging = false;
            this.isHorizontalScroll = null; // Reset direction lock
            cancelAnimationFrame(this.scrollUpdateRAF); // Cancel any pending scroll updates
            this.pendingDeltaX = 0;
        },

        scheduleScrollUpdate(tabsList) {
            // Cancel any existing RAF to avoid multiple queued updates
            cancelAnimationFrame(this.scrollUpdateRAF);
            
            // Schedule new update
            this.scrollUpdateRAF = requestAnimationFrame(() => {
                if (this.pendingDeltaX !== 0) {
                    tabsList.scrollLeft += this.pendingDeltaX;
                    this.pendingDeltaX = 0;
                }
            });
        },
        
        calculateFinalVelocity() {
            // If we have enough position data
            if (this.touchPositions.length >= 2) {
                const newest = this.touchPositions[this.touchPositions.length - 1];
                const oldest = this.touchPositions[0];
                
                const deltaX = newest.x - oldest.x;
                const deltaTime = newest.time - oldest.time;
                
                if (deltaTime > 0) {
                    // Calculate pixels per millisecond
                    this.velocity = deltaX / deltaTime;
                    
                    // Apply non-linear amplification for faster swipes
                    const absVel = Math.abs(this.velocity);
                    if (absVel > 1.0) {
                        const scale = 1.0 + (absVel - 1.0) * 0.2; // Progressive scaling
                        this.velocity *= scale;
                    }
                }
            } else {
                this.velocity = 0;
            }
        },
        
        applyScrollMomentum(tabsList) {
            if (!tabsList) return;
            
            // Apply physics-based scrolling with easing
            let startTime = null;
            let startPosition = tabsList.scrollLeft;
            let initialVelocity = this.velocity;
            const maxScrollLeft = tabsList.scrollWidth - tabsList.clientWidth;
            const deceleration = 0.95; // Deceleration rate (higher = longer slide)
            const minVelocity = 0.05; // Stop threshold
            
            const animateMomentum = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                
                // Apply deceleration based on elapsed time
                const decayFactor = Math.pow(deceleration, elapsed / 16); // Normalized to 60fps
                const currentVelocity = initialVelocity * decayFactor;
                
                // If we've slowed down enough or reached the end, snap to nearest tab
                if (Math.abs(currentVelocity) < minVelocity || 
                    tabsList.scrollLeft <= 0 || 
                    tabsList.scrollLeft >= maxScrollLeft) {
                    
                    tabsList.style.scrollBehavior = 'smooth';
                    tabsList.style.scrollSnapType = 'x proximity';  // Restore scroll snap
                    EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
                    return;
                }
                
                // Calculate new position based on current velocity
                const delta = currentVelocity * -12; // Scale factor for visible movement
                tabsList.scrollLeft += delta;
                
                // Continue animation
                this.momentumRAF = requestAnimationFrame(animateMomentum);
            };
            
            // Start animation loop
            this.momentumRAF = requestAnimationFrame(animateMomentum);
        },
        
        // Additional helper methods
        isFlickGesture() {
            return Math.abs(this.velocity) > 1.0;
        }
    };
})();