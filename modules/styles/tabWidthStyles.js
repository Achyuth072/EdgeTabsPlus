// modules/styles/tabWidthStyles.js
(function() {
  window.EdgeTabsPlus = window.EdgeTabsPlus || {};
  window.EdgeTabsPlus.styleGenerators = window.EdgeTabsPlus.styleGenerators || {};

  /**
   * Generates styles related to tab width.
   * @param {object} config - The application configuration.
   * @returns {string} CSS string.
   */
  function getTabWidthStyles(config) {
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

  window.EdgeTabsPlus.styleGenerators.getTabWidthStyles = getTabWidthStyles;
})();