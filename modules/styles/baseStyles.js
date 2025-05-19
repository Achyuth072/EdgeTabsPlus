// modules/styles/baseStyles.js
(function() {
  // Ensure the global namespace and styleGenerators object exist
  window.EdgeTabsPlus = window.EdgeTabsPlus || {};
  window.EdgeTabsPlus.styleGenerators = window.EdgeTabsPlus.styleGenerators || {};

  /**
   * Generates base styles for the EdgeTabsPlus UI.
   * @param {object} config - The application configuration.
   * @returns {string} CSS string containing base styles.
   */
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

            /* Ensure add-tab button and separator are horizontally aligned and vertically centered */
            .add-tab-container {
                display: flex;
                flex-direction: row;
                align-items: center;
                height: 30px;
            }
            #add-tab,
            .plus-separator {
                display: flex;
                align-items: center;
                height: 30px;
                margin-left: 4px;
                margin-right: 0;
                vertical-align: middle;
                float: none;
                width: auto;
                position: static;
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

  // Assign the function to the namespace
  window.EdgeTabsPlus.styleGenerators.getBaseStyles = getBaseStyles;
})();