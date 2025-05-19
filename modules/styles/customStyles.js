// modules/styles/customStyles.js
(function() {
  window.EdgeTabsPlus = window.EdgeTabsPlus || {};
  window.EdgeTabsPlus.styleGenerators = window.EdgeTabsPlus.styleGenerators || {};

  /**
   * Applies user-defined custom CSS.
   * @param {string} customCSS - Custom CSS string provided by the user.
   * @returns {string} CSS string.
   */
  function getCustomStyles(customCSS) {
    // Return the user-provided CSS directly, or wrap as needed.
    return customCSS ? String(customCSS) : '';
  }

  window.EdgeTabsPlus.styleGenerators.getCustomStyles = getCustomStyles;
})();