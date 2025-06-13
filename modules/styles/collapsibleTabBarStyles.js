// modules/styles/collapsibleTabBarStyles.js

(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};
    window.EdgeTabsPlus.styleGenerators = window.EdgeTabsPlus.styleGenerators || {};

    const getCollapsibleTabBarStyles = () => `
/* Collapsible Tab Bar Styles for EdgeTabs+ */

.tab-bar-container {
    position: relative; /* Needed for positioning the collapse toggle */
    flex-grow: 1;
    display: flex;
    overflow: hidden;
    max-height: 100px; /* Arbitrary large value for expanded state */
    opacity: 1;
    transform: translateY(0);
    transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.tab-bar-container.is-collapsed {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
    visibility: hidden;
}

/* Ensure expand toggle remains clickable */
#edgetabs-plus-expand-toggle {
    pointer-events: auto;
    visibility: visible;
}

/* General Toggle Styles */
#edgetabs-plus-expand-toggle,
#edgetabs-plus-collapse-toggle {
    cursor: pointer;
    padding: 5px;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border-radius: 50%;
    z-index: 10000;
}

/* Toggle Container - Integrated with tab strip */
#edgetabs-plus-expand-toggle,
#edgetabs-plus-collapse-toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin: 4px;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.1);
    transition: background-color 0.2s;
}

#edgetabs-plus-expand-toggle:hover,
#edgetabs-plus-collapse-toggle:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

/* Expand toggle styles (positioned fixed to viewport) */
#edgetabs-plus-expand-toggle {
    position: fixed;
    bottom: 10px;
    left: 10px;
    z-index: 10001;
    background-color: rgba(0, 0, 0, 0.5);
    display: none; /* Hidden by default */
    pointer-events: auto;
}

/* Show expand toggle when collapsed */
[data-collapsed="true"] #edgetabs-plus-expand-toggle {
    display: flex;
    position: fixed;
    bottom: 10px;
    left: 10px;
    z-index: 10001;
}

/* Visibility and placement based on state */
[data-collapsed="true"] #edgetabs-plus-collapse-toggle {
    display: none;
}


[data-collapsed="false"] #edgetabs-plus-expand-toggle {
    display: none;
}

[data-collapsed="false"] #edgetabs-plus-collapse-toggle {
    display: flex;
}

/* Initial state */
#edgetabs-plus-expand-toggle,
#edgetabs-plus-collapse-toggle {
    display: none;
}
`;

    window.EdgeTabsPlus.styleGenerators.getCollapsibleTabBarStyles = getCollapsibleTabBarStyles;
})();