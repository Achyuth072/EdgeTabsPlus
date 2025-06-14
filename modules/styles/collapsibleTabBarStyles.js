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

/* Toggle Styles */
#edgetabs-plus-expand-toggle {
    position: fixed;
    bottom: 6px; /* 2px parent padding + 4px self margin */
    left: 12px;  /* 8px parent padding + 4px self margin */
    z-index: 10001;
    cursor: pointer;
    padding: 5px;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.1);
    transition: background-color 0.2s;
    border-radius: 4px;
}

#edgetabs-plus-collapse-toggle {
    cursor: pointer;
    padding: 5px;
    position: relative;
    width: 28px;
    height: 28px;
    margin-right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.1);
    transition: background-color 0.2s;
    border-radius: 4px;
}

#edgetabs-plus-expand-toggle:hover,
#edgetabs-plus-collapse-toggle:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

/* Visibility based on state */
[data-collapsed="true"] #edgetabs-plus-expand-toggle {
    display: flex;
}

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
