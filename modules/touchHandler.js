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
        maxVelocityCapture: 5,

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
            
            // Enhanced hardware acceleration and smooth scrolling
            if (tabsList) {
                // Force hardware acceleration
                tabsList.style.transform = 'translate3d(0,0,0)';
                tabsList.style.backfaceVisibility = 'hidden';
                tabsList.style.perspective = '1000';
                tabsList.style.willChange = 'transform, scroll-position';
                tabsList.style.overscrollBehavior = 'contain';
                
                // Add CSS class for styling
                tabsList.classList.add('tabs-list');
                
                // Add these listeners with proper options
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
            tabsList.classList.add('grabbing');
            document.body.classList.add('no-select');
        },
        
        onMouseMove(e) {
            if (!this.isDragging) return;
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;
            
            // Skip if too soon (prevent oversampling)
            if (deltaTime < 8) return;
            
            const x = e.pageX;
            const deltaX = this.lastX - x;
            
            // Store position for velocity calculation (keep last 5 positions)
            this.touchPositions.push({
                x: x,
                time: currentTime
            });
            
            if (this.touchPositions.length > this.maxVelocityCapture) {
                this.touchPositions.shift();
            }
            
            // Update scroll position
            tabsList.scrollLeft = this.scrollLeft + (this.startX - x);
            
            // Update tracking
            this.lastX = x;
            this.lastTime = currentTime;
        },
        
        onMouseUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            // Calculate final velocity from stored positions
            this.calculateFinalVelocity();
            
            // Apply momentum if velocity is high enough
            if (Math.abs(this.velocity) > 0.5) {
                this.applyScrollMomentum(tabsList);
            } else {
                // Otherwise just snap to the nearest tab
                tabsList.style.scrollBehavior = 'smooth';
                EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
            }
            
            // Clean up
            tabsList.classList.remove('grabbing');
            document.body.classList.remove('no-select');
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
                
                // If we've moved enough to determine direction
                if (deltaX > 5 || deltaY > 5) {
                    this.isHorizontalScroll = deltaX > deltaY;
                    this.touchStartDirection = this.isHorizontalScroll ? 'horizontal' : 'vertical';
                    
                    // If vertical scrolling detected, exit early and don't prevent default
                    if (!this.isHorizontalScroll) {
                        this.isDragging = false; // Let native vertical scrolling take over
                        return;
                    }
                }
            }
            
            // Only process horizontal scrolling
            if (this.isHorizontalScroll) {
                const deltaX = this.lastX - x;
                const deltaTime = currentTime - this.lastTime;
                
                // Store position data for momentum calculation (keep last 5 positions)
                this.touchPositions.push({
                    x: x,
                    time: currentTime
                });
                
                if (this.touchPositions.length > this.maxVelocityCapture) {
                    this.touchPositions.shift();
                }
                
                // Skip if too soon (prevent oversampling)
                if (deltaTime < 8) return;
                
                // Apply movement
                tabsList.scrollLeft += deltaX * 1.0; // Multiplier for better tracking
                
                // Update tracking variables
                this.lastX = x;
                this.lastY = y;
                this.lastTime = currentTime;
            }
        },

        onTouchEnd(e) {
            if (!this.isDragging) {
                return;
            }
            
            if (this.isHorizontalScroll) {
                const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                if (!tabsList) {
                    this.isDragging = false;
                    return;
                }
                
                // Calculate final velocity based on touch history
                this.calculateFinalVelocity();
                
                // Apply momentum if velocity is high enough
                if (Math.abs(this.velocity) > 0.5) {
                    this.applyScrollMomentum(tabsList);
                } else {
                    // Otherwise just snap to the nearest tab
                    tabsList.style.scrollBehavior = 'smooth';
                    EdgeTabsPlus.scrollHandler.snapToNearestTabAfterScroll(tabsList);
                }
            }
            
            this.isDragging = false;
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