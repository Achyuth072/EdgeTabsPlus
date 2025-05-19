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
    
    // (All original style generator functions removed as per refactor plan)

    // Create the ShadowStylesManager object
    EdgeTabsPlus.shadowStylesManager = {
        /**
         * Get combined CSS styles from all style modules
         *
         * @param {Object} config - The EdgeTabsPlus.config object containing configuration settings
         * @returns {string} Combined CSS string with all shadow DOM styles
         */
        getCombinedStyles: function(config = {}, theme = {}, customCSS = '') {
            // Updated to use namespaced style generator functions as per refactor plan
            const ETP = window.EdgeTabsPlus; // Alias for convenience

            if (!ETP || !ETP.styleGenerators) {
                console.error('[EdgeTabsPlus] Error: EdgeTabsPlus.styleGenerators not found. Ensure style modules are loaded correctly in manifest.json.');
                return '/* Style generation failed: Core styleGenerators namespace not found. */';
            }

            const styles = [];
            if (ETP.styleGenerators.getCriticalFixesStyles) styles.push(ETP.styleGenerators.getCriticalFixesStyles());
            if (ETP.styleGenerators.getBaseStyles) styles.push(ETP.styleGenerators.getBaseStyles(config));
            if (ETP.styleGenerators.getTabWidthStyles) styles.push(ETP.styleGenerators.getTabWidthStyles(config));
            if (ETP.styleGenerators.getTabDynamicStyles) styles.push(ETP.styleGenerators.getTabDynamicStyles(config));
            if (ETP.styleGenerators.getThemeStyles) styles.push(ETP.styleGenerators.getThemeStyles(theme));
            if (ETP.styleGenerators.getCustomStyles) styles.push(ETP.styleGenerators.getCustomStyles(customCSS));

            // Add logging for missing style functions during development
            if (styles.length === 0 && Object.keys(ETP.styleGenerators).length === 0) {
                console.warn('[EdgeTabsPlus] Warning: No style generator functions seem to be loaded into EdgeTabsPlus.styleGenerators.');
            }

            return styles.join('\n\n');
        }
    };

    // Make it globally accessible for the content script
    window.shadowStylesManager = EdgeTabsPlus.shadowStylesManager;
})();