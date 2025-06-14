// modules/collapsibleTabBar.js
// Collapsible Tab Bar logic for EdgeTabs+
// Follows plan in docs/collapsible-tab-bar-plan.md

(function() {
    if (typeof window.EdgeTabsPlus === 'undefined') {
        window.EdgeTabsPlus = {};
    }

    const STORAGE_KEY = 'tabBarCollapsedState';

    /**
     * Creates the expand and collapse toggle buttons styled like tab strip controls.
     * @returns {{expandToggle: HTMLButtonElement, collapseToggle: HTMLButtonElement}}
     */
    function createToggleButtons() {
        // Expand Toggle (Up Arrow)
        const expandToggle = document.createElement('button');
        expandToggle.id = 'edgetabs-plus-expand-toggle';
        expandToggle.className = 'tab-strip-button';
        expandToggle.setAttribute('title', 'Show tabs');
        expandToggle.innerHTML = '&#9650;'; // Up-arrow character
    
        // Collapse Toggle (Down Arrow)
        const collapseToggle = document.createElement('button');
        collapseToggle.id = 'edgetabs-plus-collapse-toggle';
        collapseToggle.className = 'tab-strip-button';
        collapseToggle.setAttribute('title', 'Hide tabs');
        collapseToggle.innerHTML = '&#9660;'; // Down-arrow character
    
        return { expandToggle, collapseToggle };
    }

    /**
     * Save the collapsed state to chrome.storage.local.
     * @param {boolean} isExpanded
     */
    function saveState(isExpanded) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [STORAGE_KEY]: !isExpanded });
        }
    }

    /**
     * Expands the tab bar and updates toggle visibility.
     * @param {HTMLElement} container
     * @param {HTMLElement} expandToggle
     * @param {HTMLElement} collapseToggle
     */
    function expandTabBar(container, expandToggle, collapseToggle) {
        // Update button visibility with flex layout
        expandToggle.style.display = 'none';
        collapseToggle.style.display = 'flex';

        // Update container state
        container.classList.remove('is-collapsed');
        container.setAttribute('data-collapsed', 'false');

        // Fix transition glitch by resetting
        container.style.transition = 'none';
        setTimeout(() => container.style.transition = '', 50);
        
        saveState(true); // true for isExpanded
    }

    /**
     * Collapses the tab bar and updates toggle visibility.
     * @param {HTMLElement} container
     * @param {HTMLElement} expandToggle
     * @param {HTMLElement} collapseToggle
     */
    function collapseTabBar(container, expandToggle, collapseToggle) {
        // Update container state
        container.classList.add('is-collapsed');
        container.setAttribute('data-collapsed', 'true');

        // Update button visibility with flex layout
        expandToggle.style.display = 'flex';
        collapseToggle.style.display = 'none';

        // Fix transition glitch by resetting
        container.style.transition = 'none';
        setTimeout(() => container.style.transition = '', 50);

        saveState(false); // false for isExpanded
    }

    /**
     * Load and apply the persisted state from storage.
     * @param {HTMLElement} container The container element to collapse/expand.
     * @param {HTMLElement} expandToggle
     * @param {HTMLElement} collapseToggle
     */
    async function loadAndApplyState(container, expandToggle, collapseToggle) {
        // Temporarily disable transitions
        container.style.transition = 'none';
        
        // Load saved state with default to expanded
        let isCollapsed = false;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
                const result = await new Promise(resolve => chrome.storage.local.get(STORAGE_KEY, resolve));
                isCollapsed = result[STORAGE_KEY] === true;
            } catch (e) {
                console.error('EdgeTabs+ Error loading tab bar state:', e);
            }
        }

        // Apply state
        if (isCollapsed) {
            container.classList.add('is-collapsed');
            container.setAttribute('data-collapsed', 'true');
            expandToggle.style.display = 'flex';
            collapseToggle.style.display = 'none';
        } else {
            container.classList.remove('is-collapsed');
            container.setAttribute('data-collapsed', 'false');
            expandToggle.style.display = 'none';
            collapseToggle.style.display = 'flex';
        }

        // Re-enable transitions after a short delay
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                container.style.transition = '';
            });
        });
    }

    /**
     * Initialize the collapsible tab bar feature.
     */
    function init() {
        const shadowRoot = window.EdgeTabsPlus.uiComponents.shadow;
        if (!shadowRoot) {
            EdgeTabsPlus.logToEruda('Collapsible bar init failed: Shadow DOM not found.', 'error');
            return;
        }

        const mainContainer = shadowRoot.getElementById('edgetabs-plus-strip');
        if (!mainContainer) {
            EdgeTabsPlus.logToEruda('Collapsible bar init failed: Required container not found in Shadow DOM.', 'error');
            return;
        }
        
        // Prevent re-initialization
        if (shadowRoot.getElementById('edgetabs-plus-collapse-toggle')) {
            EdgeTabsPlus.logToEruda('Collapsible bar init aborted: Toggle button already exists.', 'warn');
            return;
        }

        // Initialize container with base class and hidden state to prevent flash
        mainContainer.classList.add('tab-bar-container');
        mainContainer.style.visibility = 'hidden'; // Hide initially
        mainContainer.style.maxHeight = '0'; // Start collapsed visually
        mainContainer.style.opacity = '0'; // Start invisible

        // Create and prepare toggle buttons
        const { expandToggle, collapseToggle } = createToggleButtons();
        // Toggles will be managed by loadAndApplyState, so no initial display here

        // Insert collapse toggle as first child of main container
        mainContainer.insertBefore(collapseToggle, mainContainer.firstChild);

        // Insert expand toggle directly into shadow root before main container
        shadowRoot.insertBefore(expandToggle, mainContainer);

        // Set up event handlers with propagation stopped
        expandToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            expandTabBar(mainContainer, expandToggle, collapseToggle);
        });
        
        collapseToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            collapseTabBar(mainContainer, expandToggle, collapseToggle);
        });

        // Load and apply saved state immediately
        loadAndApplyState(mainContainer, expandToggle, collapseToggle).then(() => {
            // After state is applied, make visible and re-enable transitions
            mainContainer.style.visibility = ''; // Revert to default visibility
            mainContainer.style.maxHeight = ''; // Revert to default max-height (from CSS)
            mainContainer.style.opacity = ''; // Revert to default opacity (from CSS)
            mainContainer.style.transition = ''; // Re-enable transitions
        });
    }

    // Expose public API
    window.EdgeTabsPlus.collapsibleTabBar = {
        init
    };
})();