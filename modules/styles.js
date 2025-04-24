(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.styles = {
        init() {
            // Store styles to be injected into shadow DOM
            this.styles = {
                base: this.getBaseStyles(),
                tabWidth: this.getTabWidthStyles(),
                tabState: this.getTabStateStyles(),
                scrolling: this.getScrollingStyles(),
                additional: this.getAdditionalStyles(),
                colorScheme: this.getColorSchemeStyles(),
                logger: this.getLoggerStyles(),
                toggle: this.getToggleStyles()
            };
            
            // Add styles to document for theme variables
            this.injectThemeVariables();
            return this;
        },

        // Method to get complete styles for shadow DOM
        getStyles() {
            return `
                ${this.styles.base}
                ${this.styles.tabWidth}
                ${this.styles.tabState}
                ${this.styles.scrolling}
                ${this.styles.additional}
                ${this.styles.colorScheme}
                ${this.styles.logger}
                ${this.styles.toggle}
            `;
        },

        addLoggerStyles() {
            // Find the shadow root from the tab strip host
            const tabStrip = document.getElementById('edgetabs-plus-host');
            if (!tabStrip || !tabStrip.shadowRoot) {
                console.error('Tab strip or shadow root not found');
                return;
            }

            // Update or create style element
            let styleElement = tabStrip.shadowRoot.querySelector('style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                tabStrip.shadowRoot.appendChild(styleElement);
            }
            styleElement.textContent = this.getStyles();
        },

        getLoggerStyles() {
            return `
                :host {
                    --logger-bg: rgba(0, 0, 0, 0.9);
                    --logger-text: #ffffff;
                    --logger-border: rgba(255, 255, 255, 0.1);
                    --logger-btn-bg: var(--tab-active-indicator, #0078D7);
                    --logger-btn-color: #ffffff;
                    --logger-btn-shadow: rgba(0, 0, 0, 0.2);
                }

                :host([theme="dark"]) {
                    --logger-bg: rgba(0, 0, 0, 0.95);
                    --logger-text: #e8eaed;
                    --logger-border: rgba(255, 255, 255, 0.15);
                    --logger-btn-bg: var(--tab-active-indicator, #8ab4f8);
                    --logger-btn-color: #ffffff;
                    --logger-btn-shadow: rgba(0, 0, 0, 0.3);
                }

                #log-controls {
                    position: fixed;
                    bottom: 100px;
                    right: 10px;
                    z-index: 2147483646;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                #log-toggle-button,
                #log-export-button {
                    background-color: var(--logger-btn-bg);
                    color: var(--logger-btn-color);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    box-shadow: 0 2px 5px var(--logger-btn-shadow);
                    outline: none;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s ease, background-color 0.2s ease;
                }

                #log-toggle-button:hover {
                    transform: scale(1.1);
                }

                #log-toggle-button:active {
                    transform: scale(0.95);
                }

                #log-overlay {
                    position: fixed;
                    bottom: 40px;
                    left: 0;
                    width: 100%;
                    background-color: var(--logger-bg);
                    color: var(--logger-text);
                    max-height: 300px;
                    display: flex;
                    flex-direction: column;
                    z-index: 2147483645;
                    border-top: 1px solid var(--logger-border);
                    box-shadow: 0 -2px 10px var(--logger-btn-shadow);
                }

                .log-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background-color: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid var(--logger-border);
                }

                .log-title {
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                }

                .log-controls {
                    display: flex;
                    gap: 8px;
                }

                .log-export-button,
                .log-close-button {
                    background: none;
                    border: none;
                    color: var(--logger-text);
                    padding: 4px 8px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: background-color 0.2s ease;
                }

                .log-export-button:hover,
                .log-close-button:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .log-export-button:active,
                .log-close-button:active {
                    background-color: rgba(255, 255, 255, 0.2);
                }

                .logs-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 12px;
                }

                /* Mobile optimizations */
                @media (max-width: 768px) {
                    .log-header {
                        padding: 10px;
                    }

                    .log-export-button,
                    .log-close-button {
                        padding: 8px 12px;
                        min-width: 44px;
                        min-height: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .logs-container {
                        padding: 8px;
                    }
                }

                #log-overlay.export-success {
                    background-color: rgba(0, 255, 0, 0.1);
                }

                #log-overlay.export-error {
                    background-color: rgba(255, 0, 0, 0.1);
                }

                #log-overlay::-webkit-scrollbar {
                    width: 8px;
                }

                #log-overlay::-webkit-scrollbar-track {
                    background: transparent;
                }

                #log-overlay::-webkit-scrollbar-thumb {
                    background: var(--logger-border);
                    border-radius: 4px;
                }

                #log-overlay div {
                    padding: 2px 0;
                    white-space: pre-wrap;
                    word-break: break-word;
                }

                #log-overlay div:not(:last-child) {
                    border-bottom: 1px solid var(--logger-border);
                    margin-bottom: 2px;
                }

                @media (prefers-reduced-motion: reduce) {
                    #log-toggle-button {
                        transition: none;
                    }
                }
            `;
        },

        // Only inject theme variables at document level
        injectThemeVariables() {
            const style = document.createElement('style');
            style.textContent = `
                :root {
                    --strip-bg: #f0f2f4;
                    --strip-border: rgba(0, 0, 0, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.05);
                    --tab-bg: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    --tab-border: rgba(0, 0, 0, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.05);
                    --tab-active-bg: #ffffff;
                    --tab-active-border: rgba(0, 0, 0, 0.2);
                    --tab-active-shadow: rgba(0, 0, 0, 0.1);
                    --tab-active-indicator: #0078D4;
                    --tab-text: #000000;
                    --tab-hover-bg: rgba(0, 0, 0, 0.05);
                    --add-btn-bg: #f8f9fa;
                    --add-btn-border: #ddd;
                    --add-btn-color: #666;
                    --add-btn-hover-bg: #fff;
                    --add-btn-hover-color: #000;
                }

                :root.dark-theme {
                    --strip-bg: #202124;
                    --strip-border: rgba(255, 255, 255, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.2);
                    --tab-bg: linear-gradient(to bottom, #292a2d, #202124);
                    --tab-border: rgba(255, 255, 255, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.2);
                    --tab-active-bg: #3c4043;
                    --tab-active-border: rgba(255, 255, 255, 0.2);
                    --tab-active-shadow: rgba(0, 0, 0, 0.3);
                    --tab-active-indicator: #8ab4f8;
                    --tab-text: #e8eaed;
                    --tab-hover-bg: rgba(255, 255, 255, 0.05);
                    --add-btn-bg: #292a2d;
                    --add-btn-border: #5f6368;
                    --add-btn-color: #e8eaed;
                    --add-btn-hover-bg: #3c4043;
                    --add-btn-hover-color: #ffffff;
                }
            `;
            document.head.appendChild(style);
        },

        // New method to protect against browser theme interference (less aggressive)
        injectThemeProtection() {
            const style = document.createElement('style');
            style.id = 'edgetabs-theme-protection';
            // Give it the highest priority
            style.setAttribute('data-priority', 'critical');
            style.textContent = `
                /* Forcefully prevent browser dark mode from affecting our theming */
                @media (prefers-color-scheme: dark) {
                    #edgetabs-plus-strip, #edgetabs-plus-strip * {
                        color-scheme: normal !important;
                    }
                }
                
                /* Essential override to prevent browser from imposing its theme */
                #edgetabs-plus-strip, .tab-item {
                    forced-colors: none !important;
                    forced-color-adjust: none !important;
                    -webkit-forced-color-adjust: none !important;
                    -ms-high-contrast-adjust: none !important;
                }
            `;
            // Insert at the beginning of the document to ensure it takes precedence
            const head = document.head || document.documentElement;
            if (head.firstChild) {
                head.insertBefore(style, head.firstChild);
            } else {
                head.appendChild(style);
            }
        },

        getBaseStyles() {
            return `
                :host {
                    display: block;
                    --transform-duration: ${EdgeTabsPlus.config.scroll.transformDuration};
                }
                
                *, *::before, *::after {
                    box-sizing: border-box;
                }
                
                /* Base styles for all elements */
                #edgetabs-plus-strip {
                    pointer-events: auto;
                    touch-action: auto;
                }

                /* Typography for text elements */
                #edgetabs-plus-strip *:not(.close-tab):not(.tab-favicon):not(#add-tab) {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
                    font-size: 14px;
                    font-weight: normal;
                    letter-spacing: normal;
                    text-transform: none;
                }
                /* Base strip styles */
                #edgetabs-plus-strip {
                    min-height: 40px;
                    padding: 2px 8px;
                    transition: transform var(--transform-duration, 0.2s) cubic-bezier(0.4, 0, 0.2, 1);
                    transform: translateY(0);
                    z-index: 9999999;
                    display: flex;
                    position: fixed;
                    bottom: var(--strip-bottom-offset, 0);
                    left: 0;
                    width: 100%;
                    background-color: var(--strip-bg);
                    border-top: 1px solid var(--strip-border);
                    box-shadow: 0 -2px 4px var(--strip-shadow);
                    will-change: transform;
                }

                /* Hide strip when hidden class is present */
                #edgetabs-plus-strip.hidden {
                    transform: translateY(100%) !important;
                    pointer-events: none;
                }

                /* Override hidden state when auto-hide is disabled */
                :host([no-auto-hide]) #edgetabs-plus-strip,
                :host([no-auto-hide]) #edgetabs-plus-strip.hidden {
                    transform: translateY(0) !important;
                    pointer-events: auto;
                }

                /* Handle display:none separately */
                :host([hidden]) #edgetabs-plus-strip {
                    display: none;
                }
                }
                
                /* Tabs list and scrolling */
                .tabs-list {
                    pointer-events: auto;
                    touch-action: pan-x; /* Allow horizontal panning */
                    overflow-x: auto; /* Enable native horizontal scrolling */
                    overflow-y: hidden; /* Prevent vertical scrolling */
                    scroll-behavior: smooth; /* Smooth programmatic scrolls (snap, etc.) */
                    -webkit-overflow-scrolling: touch; /* iOS momentum */
                    overscroll-behavior-x: contain; /* Prevent page pull-to-refresh */
                    scroll-snap-type: x proximity; /* Enable scroll snapping */
                    display: flex; /* Layout tabs horizontally */
                    gap: 2px; /* Space between tabs */
                    flex: 1; /* Take available space */
                    margin: 0;
                    padding: 0 8px; /* Padding inside the scroll area */
                    max-width: 100%;
                    position: relative; /* Needed for potential absolute children */
                    width: 100%;
                    cursor: grab; /* Indicate draggable */
                    /* Removed transform, backface-visibility, perspective, will-change: transform */
                    /* Native scrolling handles movement */
                    -ms-overflow-style: none;  /* IE/Edge scrollbar hide */
                    scrollbar-width: none; /* Firefox scrollbar hide */
                }

                /* Add grabbing cursor when actively scrolling */
                .tabs-list.grabbing {
                    cursor: grabbing;
                }

                /* Hide scrollbars but keep functionality */
                .tabs-list::-webkit-scrollbar {
                    display: none;
                }

                /* Add tab button container */
                .add-tab-container {
                    display: flex;
                    align-items: center;
                    margin-left: 8px;
                    border-left: 1px solid var(--tab-border);
                }

                /* Add tab button with theme variables */
                #add-tab {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 8px;
                    width: 28px;
                    height: 28px;
                    background: var(--add-btn-bg);
                    border: 1px solid var(--add-btn-border);
                    border-radius: 4px;
                    cursor: pointer;
                    color: var(--add-btn-color);
                    font-size: 18px;
                    line-height: 1;
                    transition: all 0.2s ease;
                }

                #add-tab:hover {
                    background: var(--add-btn-hover-bg);
                    color: var(--add-btn-hover-color);
                }

                #add-tab:active {
                    transform: scale(0.95);
                }

                /* Tab item styling */
                /* Base favicon styles */
                .tab-favicon {
                    width: 20px !important;
                    height: 20px !important;
                    background-size: contain !important;
                    background-repeat: no-repeat !important;
                    background-position: center !important;
                    flex-shrink: 0 !important;
                    display: inline-block !important;
                    min-width: 18px !important;
                    min-height: 18px !important;
                }

                /* Close button base styles */
                .close-tab {
                    width: 24px !important;
                    height: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: transparent !important;
                    border: none !important;
                    border-radius: 50% !important;
                    color: var(--tab-text) !important;
                    cursor: pointer !important;
                    opacity: 0.85 !important;
                    position: relative !important;
                    padding: 4px !important;
                    margin: 0 !important;
                    transition: transform 0.15s ease, opacity 0.2s ease, background-color 0.2s ease !important;
                    transform: scale(1) !important;
                }

                .close-tab svg {
                    width: 16px !important;
                    height: 16px !important;
                    display: block !important;
                    transform: scale(1) !important;
                    transition: transform 0.15s ease !important;
                }

                .close-tab:hover {
                    opacity: 1;
                    background-color: var(--tab-hover-bg);
                }

                /* Enhanced press feedback */
                .close-tab:active {
                    opacity: 1 !important;
                    background-color: var(--tab-active-indicator) !important;
                    transform: scale(0.85) !important;
                }

                .close-tab:active svg {
                    color: #ffffff !important;
                    transform: scale(0.9) !important;
                }

                /* Ensure minimum touch target size for mobile */
                /* Expanded touch target without affecting visual size */
                .close-tab::after {
                    content: '';
                    position: absolute;
                    top: -13px;
                    right: -13px;
                    bottom: -13px;
                    left: -13px;
                }

                /* Android-specific optimizations */
                @media screen and (-webkit-min-device-pixel-ratio: 0) {
                    .tab-favicon {
                        /* Force hardware acceleration */
                        transform: translateZ(0);
                        backface-visibility: hidden;
                        -webkit-backface-visibility: hidden;
                    }

                    .close-tab {
                        /* Use system font for better rendering */
                        font-family: system-ui, -apple-system, sans-serif;
                        /* Adjust line-height for better centering */
                        line-height: 16px;
                        /* Keep animations but optimize for mobile */
                        transition: transform 0.1s ease, opacity 0.2s ease, background-color 0.2s ease !important;
                        /* Add touch feedback ripple */
                        -webkit-tap-highlight-color: transparent;
                    }

                    /* Specific mobile active state */
                    .close-tab:active {
                        transform: scale(0.85) !important;
                        background-color: var(--tab-active-indicator) !important;
                        opacity: 1 !important;
                    }
                }

                .tab-item {
                    position: relative;
                    height: 38px; /* Increased from 32px */
                    min-height: 38px; /* Increased from 32px */
                    margin: 1px 0; /* Center tabs vertically */
                    border-radius: 8px;
                    background: var(--tab-bg);
                    border: 1px solid var(--tab-border);
                    box-shadow: 0 1px 2px var(--tab-shadow);
                    color: var(--tab-text);
                    width: var(--tab-width, 180px);
                    flex: 0 0 var(--tab-width, 180px);
                    transition: all 0.2s ease-out;
                    overflow: hidden;
                }

                /* Adjust tabstrip padding to accommodate taller tabs */
                #edgetabs-plus-strip {
                    padding: 2px 8px; /* Reduced from 4px to maintain overall height */
                }
    
                .tab-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 100%;
                    padding: 0 8px; /* Consistent padding on both sides */
                    gap: 8px; /* Standard gap */
                    position: relative; /* Create positioning context */
                }
    
                .tab-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    flex: 1; /* Take up available space */
                    position: relative; /* For absolute positioning of children if needed */
                    flex: 1;
                    height: 100%;
                }

                /* Adjust text size for better readability */
                .tab-title {
                    font-size: 13px; /* Increased from 12px */
                    line-height: 38px; /* Match tab height */
                    font-weight: 400;
                    letter-spacing: 0.01em;
                }

                /* Mobile optimizations */
                @media (pointer: coarse) {
                    .tab-content {
                        padding: 0 8px 0 12px; /* Larger padding for touch */
                    }

                    .tab-info {
                        gap: 12px; /* Larger gap for touch */
                    }
                }

                /* Tab hover effects */
                /* Tab hover/active states with isolation */
                #edgetabs-plus-strip .tab-item:hover {
                    background: var(--tab-hover-bg);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px var(--tab-shadow);
                }

                #edgetabs-plus-strip .tab-item:hover .tab-content,
                #edgetabs-plus-strip .tab-item:hover .tab-favicon,
                #edgetabs-plus-strip .tab-item:hover .close-tab {
                    transform: none !important;
                }

                #edgetabs-plus-strip .tab-item:active {
                    transform: scale(0.98);
                }

                #edgetabs-plus-strip .tab-item:active .tab-content,
                #edgetabs-plus-strip .tab-item:active .tab-favicon,
                #edgetabs-plus-strip .tab-item:active .close-tab {
                    transform: none !important;
                }

                /* Close button container */
                .close-button-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                }
    
                /* Critical styles for close button - maximum specificity */
                :host #edgetabs-plus-strip .tab-item .tab-content .close-button-container .close-tab {
                    width: 20px !important;
                    height: 20px !important;
                    border: none !important;
                    background: transparent !important;
                    color: var(--tab-text) !important;
                    font-size: 18px !important;
                    font-weight: 700 !important;
                    line-height: 1 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    opacity: 0.85 !important;
                    border-radius: 50% !important;
                    position: relative !important;
                    z-index: 1 !important;
                    -webkit-tap-highlight-color: transparent !important;
                    transition: opacity 0.2s ease !important;
                }
    /* Close button interactions for desktop */
    @media (hover: hover) and (pointer: fine) {
        #edgetabs-plus-strip .tab-item .tab-content .close-button-container .close-tab:hover {
            opacity: 1 !important;
            background-color: var(--tab-hover-bg) !important;
        }
    }

    /* Touch feedback without transforms */
    #edgetabs-plus-strip .tab-item .tab-content .close-button-container .close-tab:active {
        opacity: 1 !important;
        background-color: rgba(0, 0, 0, 0.1) !important;
    }

    /* Android-specific touch optimizations */
    @supports (-webkit-tap-highlight-color: transparent) {
        #edgetabs-plus-strip .tab-item .tab-content .close-button-container .close-tab {
            /* Increase touch target while keeping visual size */
            position: relative !important;
        }

        #edgetabs-plus-strip .tab-item .tab-content .close-button-container .close-tab::after {
            content: '' !important;
            position: absolute !important;
            top: -12px !important;
            right: -12px !important;
            bottom: -12px !important;
            left: -12px !important;
            z-index: 1 !important;
        }
    }
                }

                /* Ensure tab-content doesn't transform */
                #edgetabs-plus-strip .tab-item .tab-content {
                    transform: none !important;
                }
    
                /* Ensure text doesn't overflow */
                .tab-title {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 12px;
                }
    
                /* Favicon sizing & styling (using background-image) */
                /* Critical styles for favicon - maximum specificity */
                :host #edgetabs-plus-strip .tab-item .tab-content .tab-info .tab-favicon {
                    flex-shrink: 0 !important;
                    width: 20px !important;
                    height: 20px !important;
                    background-size: contain !important;
                    background-repeat: no-repeat !important;
                    background-position: center !important;
                    margin-right: 8px !important;
                    display: inline-block !important;
                    /* Control box model */
                    box-sizing: content-box !important;
                    /* Ensure consistent sizing */
                    min-width: 20px !important;
                    min-height: 20px !important;
                    max-width: 20px !important;
                    max-height: 20px !important;
                    /* Reset spacing */
                    margin: 0 !important;
                    padding: 0 !important;
                    /* Remove transforms */
                    transform: none !important;
                }

                /* Larger touch target for mobile */
                @media (pointer: coarse) {
                    .close-tab {
                        width: 24px;
                        height: 24px;
                    }

                    .close-tab::after {
                        content: '';
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        bottom: -8px;
                        left: -8px;
                    }
                }

                .tab-item:active {
                    transform: scale(0.98);
                }

                /* Active tab styling */
                .tab-item.active {
                    background: var(--tab-active-bg);
                    border-color: var(--tab-active-border);
                    box-shadow: 0 2px 6px var(--tab-active-shadow);
                    transform: translateY(-1px) scale(1.02);
                    z-index: 2;
                }

                .tab-item.active::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background-color: var(--tab-active-indicator);
                    border-radius: 8px 8px 0 0;
                }

                #log-overlay {
                    position: fixed;
                    bottom: 40px;
                    left: 0;
                    width: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    font-family: monospace;
                    font-size: 12px;
                    padding: 5px;
                    z-index: 2147483647;
                    overflow-y: auto;
                    max-height: 100px;
                    white-space: pre-wrap;
                    display: none;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                #log-toggle-button {
                    position: fixed;
                    bottom: 100px;
                    right: 10px;
                    z-index: 2147483647;
                    background-color: #0078D7;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    outline: none;
                }

                #log-toggle-button:active {
                    transform: scale(0.95);
                }
                
                /* Add a class for preventing text selection during drag */
                body.no-select {
                    user-select: none;
                    -webkit-user-select: none;
                }
            `;
            document.head.appendChild(style);
        },

        getTabWidthStyles() {
            return `
                /* Base tab dimensions with smooth transitions */
                .tab-item {
                    width: var(--tab-width, 180px);
                    min-width: auto;
                    max-width: none;
                    flex: 0 0 var(--tab-width, 180px);
                    transition: width 0.2s ease-in-out;
                    overflow: visible;
                    position: relative;
                }

                /* Base favicon styles with absolute positioning */
                .tab-favicon {
                    position: absolute;
                    left: 8px;
                    width: 18px !important;
                    height: 18px !important;
                    flex: none;
                    margin: 0;
                    z-index: 1;
                    transform: translateZ(0);
                }

                /* Tab info container with absolute favicon positioning */
                .tab-info {
                    display: flex;
                    align-items: center;
                    flex: 1;
                    min-width: 0;
                    padding-left: 32px; /* Increased space for favicon */
                    position: relative;
                }

                /* Minimal tab state */
                .tab-item.minimal {
                    width: 90px;
                    flex: 0 0 90px;
                }

                .tab-item.minimal .tab-title {
                    display: none;
                    visibility: hidden; /* Double-ensure it doesn't affect layout */
                }
            `;
        },

        getTabStateStyles() {
            return `
                /* Single tab state */
                .tab-item.single-tab {
                    min-width: 180px;
                    width: 180px;
                    max-width: 180px;
                    flex-basis: 180px;
                }

                .tab-item.single-tab span:not(.close-tab) {
                    opacity: 1;
                    max-width: 140px;
                }

                /* Regular tab states with consistent transitions */
                .tab-item:not(.minimal):not(.single-tab) {
                    transition: all 0.2s ease-in-out;
                }

                /* Simplified minimal state styles */
                .tab-item.minimal {
                    width: 90px;
                    flex: 0 0 90px;
                }

                .tab-item.minimal .tab-info {
                    justify-content: flex-start;
                }

                /* Ensure title is hidden but maintains layout */
                .tab-item.minimal .tab-title {
                    display: none;
                }

                /* Keep favicon size consistent at 18px */
                .tab-item.minimal .tab-favicon {
                    margin: 0;
                    width: 18px !important;
                    height: 18px !important;
                }

                /* Single tab state */
                .tab-item.single-tab {
                    width: 200px; /* Increased from 180px */
                    flex: 0 0 200px;
                }

                .tab-item.single-tab .tab-info {
                    flex: 1;
                }

                .tab-item.single-tab .tab-title {
                    max-width: none;
                    opacity: 1;
                }

                /* Active tab adjustments */
                .tab-item.active {
                    height: 40px; /* Slightly taller than regular tabs */
                    margin: 0; /* Remove margin to prevent jumping */
                    transform: translateY(-1px); /* Lift slightly */
                }

                .tab-item.active .tab-title {
                    opacity: 1;
                    font-weight: 500;
                }

                /* Touch device optimizations */
                @media (pointer: coarse) {
                    .tab-item.minimal .tab-favicon {
                        width: 18px; /* Maintain consistent size on touch devices */
                        height: 18px;
                    }
                }
            `;
        },
        
        getScrollingStyles() {
            return `
                /* Enhanced scrolling and touch interaction */
                .tabs-list {
                    scroll-snap-type: x proximity;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior-x: contain;
                    cursor: grab;
                }
                
                .tabs-list.grabbing {
                    cursor: grabbing;
                }
                
                /* Scroll snap alignment */
                .tab-item {
                    scroll-snap-align: center;
                    scroll-snap-stop: always;
                }
                
                /* Hover and focus effects for tab items */
                .tab-item:hover {
                    transform: translateY(-1px) scale(1.01);
                    box-shadow: 0 2px 8px var(--tab-shadow);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                
                .tab-item:active {
                    transform: translateY(0) scale(0.99);
                    transition: transform 0.1s ease;
                }
                
                /* Active tab styling enhancements */
                .tab-item.active {
                    transform: translateY(-2px) scale(1.03);
                    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                    z-index: 10;
                }

                /* Performance optimizations */
                .tabs-list, .tab-item {
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                
                /* Scroll indicators with smooth transitions */
                .tabs-list {
                    position: relative;
                }

                .tabs-list {
                    isolation: isolate;
                }

                .tabs-list::before,
                .tabs-list::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 24px;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    pointer-events: none;
                    z-index: 1;
                }
                
                .tabs-list::before {
                    left: 0;
                    background: linear-gradient(to right,
                        var(--strip-bg) 0%,
                        rgba(var(--strip-bg-rgb), 0.8) 50%,
                        transparent 100%
                    );
                }
                
                .tabs-list::after {
                    right: 0;
                    background: linear-gradient(to left,
                        var(--strip-bg) 0%,
                        rgba(var(--strip-bg-rgb), 0.8) 50%,
                        transparent 100%
                    );
                }
                
                .tabs-list.scroll-left::before {
                    opacity: 0.8;
                }
                
                .tabs-list.scroll-right::after {
                    opacity: 0.8;
                }
                
                /* Motion preferences and animations */
                @media (prefers-reduced-motion: no-preference) {
                    .tab-item, .tabs-list {
                        transition-duration: 0.25s;
                        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .tab-item, .tabs-list {
                        transition-duration: 0.1s;
                    }
                }
                
                /* Touch optimizations */
                .tab-item {
                    -webkit-tap-highlight-color: transparent;
                    touch-action: pan-x;
                }
                
                /* Interactive states */
                .tab-item:active:not(.active) {
                    opacity: 0.85;
                    transform: scale(0.98);
                }
                
                .tab-item.active:active {
                    transform: translateY(-1px) scale(0.99);
                }
                
                /* Mobile optimizations */
                @supports (-webkit-overflow-scrolling: touch) {
                    .tabs-list {
                        padding: 0 16px;
                    }
                    
                    .tabs-list::before,
                    .tabs-list::after {
                        width: 30px;
                    }
                    /* Ensure minimum touch target size while preserving visual size */
                    .close-tab {
                        position: relative;
                        min-width: 44px;
                        min-height: 44px;
                        padding: 10px; /* Create space around the button for touch target */
                    }

                    .close-tab::after {
                        content: '';
                        position: absolute;
                        top: -10px;
                        right: -10px;
                        bottom: -10px;
                        left: -10px;
                    }
                    }
                    
                    .tab-item:active {
                        opacity: 0.8;
                    }

                    /* Prevent rubber-banding on iOS */
                    .tabs-list {
                        overscroll-behavior-x: none;
                        -webkit-overflow-scrolling: touch;
                    }
                }

                /* High contrast mode support */
                @media (forced-colors: active) {
                    .tab-item {
                        border: 1px solid ButtonText;
                    }
                    
                    .tab-item.active {
                        border: 2px solid Highlight;
                    }
                }
            `;
        },

        getAdditionalStyles() {
            return `
                /* Host theme handling */
                :host {
                    color-scheme: light dark;
                    --strip-bg: #f0f2f4;
                    --strip-border: rgba(0, 0, 0, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.05);
                    --tab-bg: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    --tab-border: rgba(0, 0, 0, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.05);
                    --tab-active-bg: #ffffff;
                    --tab-active-border: rgba(0, 0, 0, 0.2);
                    --tab-active-shadow: rgba(0, 0, 0, 0.1);
                    --tab-active-indicator: #0078D4;
                    --tab-text: #000000;
                    --tab-hover-bg: rgba(0, 0, 0, 0.05);
                    --add-btn-bg: #f8f9fa;
                    --add-btn-border: #ddd;
                    --add-btn-color: #666;
                    --add-btn-hover-bg: #fff;
                    --add-btn-hover-color: #000;
                }

                /* Dark theme via host attribute */
                :host([theme="dark"]) {
                    --strip-bg: #202124;
                    --strip-border: rgba(255, 255, 255, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.2);
                    --tab-bg: linear-gradient(to bottom, #292a2d, #202124);
                    --tab-border: rgba(255, 255, 255, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.2);
                    --tab-active-bg: #3c4043;
                    --tab-active-border: rgba(255, 255, 255, 0.2);
                    --tab-active-shadow: rgba(0, 0, 0, 0.3);
                    --tab-active-indicator: #8ab4f8;
                    --tab-text: #e8eaed;
                    --tab-hover-bg: rgba(255, 255, 255, 0.05);
                    --add-btn-bg: #292a2d;
                    --add-btn-border: #5f6368;
                    --add-btn-color: #e8eaed;
                    --add-btn-hover-bg: #3c4043;
                    --add-btn-hover-color: #ffffff;
                }

                /* Theme transitions */
                *, *::before, *::after {
                    transition: background-color 0.3s ease,
                              border-color 0.3s ease,
                              box-shadow 0.3s ease,
                              color 0.3s ease;
                }

                /* Disable transitions during theme changes */
                :host(.theme-transitioning) * {
                    transition: none !important;
                }

                /* Apply theme variables to tab strip */
                #edgetabs-plus-strip {
                    background-color: var(--strip-bg) !important;
                    border-top: 1px solid var(--strip-border) !important;
                    box-shadow: 0 -2px 4px var(--strip-shadow) !important;
                    padding: 4px 8px !important;
                    transition: all 0.3s ease !important;
                }

                /* Apply theme to tab items with increased specificity */
                #edgetabs-plus-strip .tab-item,
                html.dark-theme #edgetabs-plus-strip .tab-item,
                html.light-theme #edgetabs-plus-strip .tab-item {
                    background: var(--tab-bg) !important;
                    border: 1px solid var(--tab-border) !important;
                    box-shadow: 0 1px 2px var(--tab-shadow) !important;
                    margin: 2px !important;
                    transition: all 0.3s ease !important;
                    color: var(--tab-text) !important;
                }

                /* Apply theme to tab button with increased specificity */
                #add-tab,
                html.dark-theme #add-tab,
                html.light-theme #add-tab {
                    background: var(--add-btn-bg) !important;
                    border-color: var(--add-btn-border) !important;
                    color: var(--add-btn-color) !important;
                }

                #add-tab:hover {
                    background: var(--add-btn-hover-bg) !important;
                    color: var(--add-btn-hover-color) !important;
                }

                #edgetabs-plus-strip .tab-item:hover {
                    background: var(--tab-hover-bg) !important;
                }

                #edgetabs-plus-strip .tab-item.active {
                    background: var(--tab-active-bg) !important;
                    border: 1px solid var(--tab-active-border) !important;
                    box-shadow: 0 2px 6px var(--tab-active-shadow) !important;
                    position: relative !important;
                    z-index: 2 !important;
                    transform: translateY(-1px) !important;
                    overflow: hidden !important;
                }

                #edgetabs-plus-strip .tab-item.active::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 1px !important;
                    right: 1px !important;
                    height: 2px !important;
                    background-color: var(--tab-active-indicator) !important;
                    border-radius: 1px 1px 0 0 !important;
                    box-sizing: border-box !important;
                }

                #edgetabs-plus-strip .tab-item.active span:not(.close-tab) {
                    color: var(--tab-text) !important;
                    font-weight: 500 !important;
                }

                /* Add tab container divider */
                .add-tab-container {
                    border-left-color: var(--tab-border) !important;
                }
                
                /* Close button styling */
                
                .close-tab:hover {
                    opacity: 1;
                    transform: scale(1.1);
                }

                .close-tab:active {
                    transform: scale(0.9);
                }
            `;
            document.head.appendChild(style);
        },
        
        getColorSchemeStyles() {
            return `
                /* Adaptive color scheme based on host attribute */
                :host {
                    color-scheme: light dark;
                    /* Add smooth transitions for theme changes */
                    transition: background-color 0.3s ease;
                }

                /* Apply transitions to all themed elements */
                #edgetabs-plus-strip, .tab-item, .close-tab {
                    transition:
                        background-color 0.3s ease,
                        border-color 0.3s ease,
                        box-shadow 0.3s ease,
                        color 0.3s ease;
                }

                /* Auto dark mode via system preference */
                @media (prefers-color-scheme: dark) {
                    :host(:not([theme="light"])) {
                        --strip-bg: #202124;
                        --strip-border: rgba(255, 255, 255, 0.1);
                        --strip-shadow: rgba(0, 0, 0, 0.2);
                        --tab-bg: linear-gradient(to bottom, #292a2d, #202124);
                        --tab-border: rgba(255, 255, 255, 0.1);
                        --tab-shadow: rgba(0, 0, 0, 0.2);
                        --tab-active-bg: #3c4043;
                        --tab-active-border: rgba(255, 255, 255, 0.2);
                        --tab-active-shadow: rgba(0, 0, 0, 0.3);
                        --tab-active-indicator: #8ab4f8;
                        --tab-text: #e8eaed;
                        --tab-hover-bg: rgba(255, 255, 255, 0.05);
                    }
                }

                /* Forced light mode */
                :host([theme="light"]) {
                    --strip-bg: #f0f2f4;
                    --strip-border: rgba(0, 0, 0, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.05);
                    --tab-bg: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    --tab-border: rgba(0, 0, 0, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.05);
                    --tab-text: #000000;
                }

                /* High contrast mode support */
                @media (forced-colors: active) {
                    :host {
                        forced-colors: none;
                    }

                    .tab-item {
                        border: solid 1px ButtonText;
                    }

                    .tab-item.active {
                        border: solid 2px Highlight;
                    }

                    .close-tab {
                        color: ButtonText;
                    }
                }
            `;
        },        getToggleStyles() {
            return `
                /* Toggle button base styling with complete theme isolation */
                .strip-toggle-btn {
                    --toggle-base-color: #09b4f6;
                    --toggle-hover-color: #0da2db;
                    --toggle-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    --button-size: 44px;  /* Mobile-first size */
                    --button-padding: 16px;  /* Mobile-first padding */

                    /* Base reset and interaction prevention */
                    -webkit-tap-highlight-color: transparent !important;
                    -webkit-touch-callout: none !important;
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    outline: none !important;

                    /* Core layout */
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    
                    /* Consistent sizing using CSS variables */
                    width: var(--button-size) !important;
                    height: var(--button-size) !important;
                    padding: var(--button-padding) !important;
                    margin: 0 !important;
                    border: none !important;
                    border-radius: 4px !important;
                    background-color: transparent !important;
                    color: var(--toggle-base-color) !important;
                    font-size: 18px !important;
                    font-weight: normal !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                    line-height: 1 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    z-index: 10 !important;
                    align-self: center !important;
                    
                    /* Enhanced isolation */
                    -webkit-font-smoothing: antialiased !important;
                    text-rendering: optimizeLegibility !important;
                    box-shadow: none !important;
                    text-shadow: none !important;
                    pointer-events: auto !important;
                }

                /* Button states with enforced colors */
                .strip-toggle-btn:hover {
                    color: var(--toggle-hover-color) !important;
                    background-color: transparent !important;
                }

                /* Enhanced active/focus states */
                .strip-toggle-btn:active,
                .strip-toggle-btn:focus {
                    transform: scale(0.95) !important;
                    outline: none !important;
                    background-color: transparent !important;
                    -webkit-tap-highlight-color: transparent !important;
                }

                /* Additional highlight prevention */
                .strip-toggle-btn:focus-visible {
                    outline: none !important;
                }

                /* Fixed state styling */
                /* Fixed state styling with improved positioning */
                .strip-toggle-btn.fixed {
                    position: fixed !important;
                    bottom: 4px !important;  /* Reduced from 8px to better match regular button position */
                    left: 4px !important;    /* Reduced from 8px to better match regular button position */
                    margin: 0 !important;
                    z-index: 10000000 !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    transition: opacity var(--toggle-transition) !important;
                }

                /* Dark theme adjustments */
                :host([theme="dark"]) .strip-toggle-btn.fixed {
                    background-color: transparent !important;
                    box-shadow: none !important;
                }

                /* Consistent symbol dimensions */
                .strip-toggle-btn::before {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 18px !important;
                    height: 18px !important;
                    line-height: inherit !important;
                    text-align: center !important;
                }

                /* Collapsed state styles */
                #edgetabs-plus-strip.collapsed {
                    height: auto;
                    min-height: 0;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0;
                    overflow: visible;
                    pointer-events: none;
                }

                /* Hide all elements except the toggle button in collapsed state */
                #edgetabs-plus-strip.collapsed > *:not(.strip-toggle-btn) {
                    display: none !important;
                }

                /* Hidden state for buttons */
                .strip-toggle-btn.hidden {
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
                
                /* Transition effects for collapsing/expanding */
                #edgetabs-plus-strip.transitioning > *:not(.strip-toggle-btn) {
                    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                /* Ensure toggle button is always visible and clickable */
                .strip-toggle-btn {
                    transform: translateY(0) !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                }
                /* Make strip transparent in collapsed state */
                #edgetabs-plus-strip.collapsed {
                    height: auto !important;
                    min-height: 0 !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    pointer-events: none !important;
                }

                /* Hide all elements except toggle button in collapsed state */
                #edgetabs-plus-strip.collapsed > *:not(.strip-toggle-btn) {
                    display: none !important;
                }
                
                /* Mobile optimizations */
                /* Mobile optimizations */
                @media (pointer: coarse) {
                    .strip-toggle-btn {
                        font-size: 22px !important;
                        border-radius: 6px !important;
                    }

                    /* Adjust fixed button position for mobile */
                    .strip-toggle-btn.fixed {
                        bottom: 4px !important;  /* Reduced to match regular button position */
                        left: 4px !important;   /* Reduced to match regular button position */
                    }

                    /* Enhanced touch target with larger hit area */
                    .strip-toggle-btn::after {
                        content: '' !important;
                        position: absolute !important;
                        top: -12px !important;
                        left: -12px !important;
                        right: -12px !important;
                        bottom: -12px !important;
                        z-index: -1 !important;
                    }

                    /* Improved visual feedback for touch */
                    .strip-toggle-btn:active {
                        transform: scale(0.92) !important;
                        transition: transform 0.1s ease !important;
                    }
                }

                /* Reduced motion preference */
                @media (prefers-reduced-motion: reduce) {
                    .strip-toggle-btn,
                    .strip-toggle-btn:active {
                        transition: none !important;
                        transform: none !important;
                    }
                }
            `;
        }
    };
})();
