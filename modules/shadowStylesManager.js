/**
 * Shadow DOM Style Manager for EdgeTabs+
 *
 * This module is responsible for combining all style-generating
 * functions and providing a single comprehensive stylesheet
 * for injection into Shadow DOM roots.
 *
 * Android-optimized version with reduced !important usage
 * and consolidated styles.
 */

(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};
    
    // Base styles function - Android optimized
    function getBaseStyles(config) {
        return `
            :host {
                display: block;
                --transform-duration: ${config.scroll.transformDuration};
                color-scheme: light dark;
                
                /* Light theme variables */
                --strip-bg: #f0f2f4;
                --strip-border: rgba(0, 0, 0, 0.1);
                --strip-shadow: rgba(0, 0, 0, 0.05);
                --tab-bg: #ffffff;
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
                --tab-bg: #292a2d;
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
            
            *, *::before, *::after {
                box-sizing: border-box;
                transition: background-color 0.3s ease,
                          border-color 0.3s ease,
                          box-shadow 0.3s ease,
                          color 0.3s ease;
            }
            
            /* Base styles for all elements */
            #edgetabs-plus-strip {
                pointer-events: auto;
                touch-action: auto;
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
                align-items: center;
                justify-content: flex-start;
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
            
            /* Typography for text elements */
            #edgetabs-plus-strip *:not(.close-tab):not(.tab-favicon):not(#add-tab) {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
                font-size: 14px;
                font-weight: normal;
                letter-spacing: normal;
                text-transform: none;
            }
            
            /* Tab item base styling - ensure correct centering */
            .tab-item {
                position: relative;
                height: 38px;
                min-height: 38px;
                margin: 1px 0;
                border-radius: 8px;
                background: var(--tab-bg);
                border: 1px solid var(--tab-border);
                box-shadow: 0 1px 2px var(--tab-shadow);
                color: var(--tab-text);
                overflow: hidden;
                width: var(--tab-width, 180px);
                min-width: auto;
                max-width: none;
                flex: 0 0 var(--tab-width, 180px);
                transition: transform 0.2s ease-out,
                          width 0.2s ease-in-out,
                          background-color 0.3s ease;
                -webkit-tap-highlight-color: transparent;
                /* Android-specific hardware acceleration */
                transform: translateZ(0);
            }
            
            /* Tab content layout with proper alignment */
            .tab-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                padding: 0 8px;
                gap: 8px;
                position: relative;
                /* Remove all transforms for better Android performance */
                transform: none !important;
            }
            
            /* Tab info section with proper alignment */
            .tab-info {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
                flex: 1;
                height: 100%;
            }
            
            /* Favicon styling optimized for Android */
            .tab-favicon {
                width: 20px;
                height: 20px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                flex-shrink: 0;
                display: inline-block;
                min-width: 18px;
                min-height: 18px;
                margin-right: 8px;
                /* Hardware acceleration for smoother rendering */
                transform: translateZ(0);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            }
            
            /* Title text overflow handling */
            .tab-title {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: calc(100% - 40px);
                font-size: 13px;
                line-height: 38px;
                font-weight: 400;
            }
        `;
    }

    // Tab width and minimal state styles
    function getTabWidthStyles() {
        return `
            /* Minimal tab state */
            .tab-item.minimal {
                width: 90px;
                flex: 0 0 90px;
            }
    
            .tab-item.minimal .tab-title {
                display: none;
                visibility: hidden;
            }
            
            /* Single tab state */
            .tab-item.single-tab {
                min-width: 180px;
                width: 180px;
                flex-basis: 180px;
            }
            
            /* Close button container */
            .close-button-container {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
            }
        `;
    }

    // Tab state styles
    function getTabStateStyles() {
        return `
            /* Active tab styling */
            .tab-item.active {
                background: var(--tab-active-bg);
                border-color: var(--tab-active-border);
                box-shadow: 0 2px 6px var(--tab-active-shadow);
                transform: translateY(-1px);
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
            
            /* Tab hover effects */
            .tab-item:hover {
                background: var(--tab-hover-bg);
                transform: translateY(-1px);
            }
            
            /* Active tab text styling */
            .tab-item.active .tab-title {
                font-weight: 500;
                opacity: 1;
            }
        `;
    }

    // Scrolling styles optimized for Android
    function getScrollingStyles() {
        return `
            /* Tabs list and scrolling */
            .tabs-list {
                pointer-events: auto;
                touch-action: pan-x;
                overflow-x: auto;
                overflow-y: hidden;
                scroll-behavior: auto; /* Let JS handle smooth scrolling for better Android performance */
                overscroll-behavior-x: contain;
                scroll-snap-type: x proximity;
                display: flex;
                gap: 8px;
                flex: 1;
                margin: 0;
                padding: 0 8px;
                max-width: 100%;
                position: relative;
                width: 100%;
                cursor: grab;
                -ms-overflow-style: none;
                scrollbar-width: none;
                justify-content: flex-start;
                align-items: center;
                /* Android optimization */
                -webkit-overflow-scrolling: touch;
                transform: translateZ(0);
                will-change: scroll-position;
            }
    
            /* Add grabbing cursor when actively scrolling */
            .tabs-list.grabbing {
                cursor: grabbing;
            }
    
            /* Hide scrollbars but keep functionality */
            .tabs-list::-webkit-scrollbar {
                display: none;
            }
            
            /* Add tab button container styling */
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
            
            /* Android-specific touch improvements */
            @media (pointer: coarse) {
                .tabs-list {
                    gap: 6px; /* Slightly smaller for Android for more tabs */
                    touch-action: pan-x;
                }
                
                #add-tab {
                    min-width: 32px; /* Slightly larger touch target */
                    min-height: 32px;
                }
            }
        `;
    }

    // Close button styles optimized for Android touch
    function getAdditionalStyles() {
        return `
            /* Close button styling - Android optimized */
            .close-tab {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                border-radius: 50%;
                color: var(--tab-text);
                cursor: pointer;
                opacity: 0.85;
                position: relative;
                padding: 4px;
                margin: 0;
                transition: transform 0.15s ease,
                          opacity 0.2s ease,
                          background-color 0.2s ease;
                /* Android optimization */
                -webkit-tap-highlight-color: transparent;
                transform: translateZ(0);
            }

            .close-tab svg {
                width: 16px;
                height: 16px;
                display: block;
                transform: translateZ(0);
            }

            .close-tab:hover {
                opacity: 1;
                background-color: var(--tab-hover-bg);
            }

            .close-tab:active {
                opacity: 1;
                background-color: var(--tab-active-indicator);
                transform: scale(0.85);
            }

            .close-tab:active svg {
                color: #ffffff;
            }
            
            /* Enhanced touch target for Android */
            .close-tab::after {
                content: '';
                position: absolute;
                top: -10px;
                right: -10px;
                bottom: -10px;
                left: -10px;
            }
        `;
    }

    // Toggle button styles - Android optimized
    function getToggleStyles() {
        return `
            /* Toggle button styling - Android optimized */
            .strip-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px; /* Reduced from 44px */
                height: 24px; /* Reduced from 44px */
                padding: 0;
                margin: 0;
                border: none;
                border-radius: 3px; /* Reduced from 4px to fit smaller size */
                background-color: transparent;
                color: var(--tab-active-indicator);
                cursor: pointer;
                transition: transform 0.2s ease;
                z-index: 10;
                -webkit-tap-highlight-color: transparent;
                position: relative;
                margin-right: 6px; /* Reduced from 8px */
                visibility: visible;
                pointer-events: auto;
            }
    
            .strip-toggle-btn:active {
                transform: scale(0.9); /* Slightly smaller scale for smaller button */
            }
            
            /* Touch target enhancement for mobile */
            .strip-toggle-btn::after {
                content: '';
                position: absolute;
                top: -10px;
                right: -10px;
                bottom: -10px;
                left: -10px;
            }
            
            /* Ensure toggle button remains visible and in same position when strip is collapsed */
            .strip-toggle-btn.strip-collapsed-state {
                display: flex;
                visibility: visible;
                position: fixed;
                z-index: 999999;
                pointer-events: auto;
            }
            
            /* When strip is collapsed, make sure toggle button remains visible and clickable */
            #edgetabs-plus-strip.collapsed .strip-toggle-btn,
            .strip-toggle-btn.strip-collapsed-state {
                display: flex;
                visibility: visible;
                pointer-events: auto;
            }
        `;
    }

    // Create the ShadowStylesManager object
    EdgeTabsPlus.shadowStylesManager = {
        /**
         * Get combined CSS styles from all style modules
         *
         * @param {Object} config - The EdgeTabsPlus.config object containing configuration settings
         * @returns {string} Combined CSS string with all shadow DOM styles
         */
        getCombinedStyles: function(config) {
            // Start with an empty string
            let combinedStyles = '';

            // Add each style component in the appropriate order
            combinedStyles += getBaseStyles(config);
            combinedStyles += getTabWidthStyles();
            combinedStyles += getTabStateStyles();
            combinedStyles += getScrollingStyles();
            combinedStyles += getAdditionalStyles();
            combinedStyles += getToggleStyles();

            // Add critical fixes and Android optimizations
            combinedStyles += `
                /* Critical Android-specific optimizations */
                
                /* Reduce repaints for smoother performance */
                .tab-item, .tab-content, .tab-info {
                    will-change: transform;
                    backface-visibility: hidden;
                }
                
                /* Force hardware acceleration for smoother animations */
                .tabs-list, .tab-item {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }
                
                /* Larger touch targets for Android */
                @media (pointer: coarse) {
                    .close-tab {
                        min-width: 36px;
                        min-height: 36px;
                    }
                    
                    .tab-title {
                        font-size: 14px;
                    }
                }
            `;

            return combinedStyles;
        }
    };

    // Make it globally accessible for the content script
    window.shadowStylesManager = EdgeTabsPlus.shadowStylesManager;
})();