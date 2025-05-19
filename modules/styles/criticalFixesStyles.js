// modules/styles/criticalFixesStyles.js
(function() {
  window.EdgeTabsPlus = window.EdgeTabsPlus || {};
  window.EdgeTabsPlus.styleGenerators = window.EdgeTabsPlus.styleGenerators || {};

  /**
   * Returns critical CSS fixes.
   * @returns {string} CSS string containing critical fixes.
   */
  function getCriticalFixesStyles() {
    return `
      /* --- CRITICAL FIXES --- */

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
          /* Removed enlarged close-tab touch target to restore original size */
          .tab-title {
              font-size: 14px;
          }
      }
      /* Enhanced close button with Unicode character */
      .close-tab {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          height: 12px;
          padding: 0;
          border: none;
          background: transparent;
          font-size: 9px;
          font-weight: bold;
          line-height: 1;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          color: rgba(0,0,0,0.7);
      }
      :host([theme="dark"]) .close-tab {
          color: rgba(255,255,255,0.8);
      }
      .close-tab:focus, .close-tab:hover {
          background: rgba(0,0,0,0.12);
          color: rgba(0,0,0,0.9);
      }
      :host([theme="dark"]) .close-tab:focus,
      :host([theme="dark"]) .close-tab:hover {
          background: rgba(255,255,255,0.2);
          color: rgba(255,255,255,1);
      }
    `;
  }

  window.EdgeTabsPlus.styleGenerators.getCriticalFixesStyles = getCriticalFixesStyles;
})();