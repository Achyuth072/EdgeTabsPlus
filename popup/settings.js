// Wait for EdgeTabsPlus namespace to be available
document.addEventListener('DOMContentLoaded', () => {
    const { config, logger } = window.EdgeTabsPlus;

    // Initialize required modules
    logger.init();
    config.init();

    // Default settings from config module
    const defaultSettings = {
        showFavicons: true,
        showTitles: true,
        autoHide: true,
        scrollThreshold: config.scroll.threshold,
        minTabWidth: config.tabWidths.multi,
        maxTabWidth: config.tabWidths.single,
        retainScrollPosition: config.settings.retainScrollPosition
    };

    // Load settings
    function loadSettings() {
        chrome.storage.sync.get(defaultSettings, (settings) => {
            try {
                // Update input elements with loaded settings
                document.getElementById('showFavicons').checked = settings.showFavicons;
                document.getElementById('showTitles').checked = settings.showTitles;
                document.getElementById('autoHide').checked = settings.autoHide;
                document.getElementById('scrollThreshold').value = settings.scrollThreshold;
                document.getElementById('minTabWidth').value = settings.minTabWidth;
                document.getElementById('maxTabWidth').value = settings.maxTabWidth;
                document.getElementById('retainScrollPosition').checked = settings.retainScrollPosition;

                // Update config module with loaded settings
                Object.assign(config.settings, {
                    retainScrollPosition: settings.retainScrollPosition
                });

                config.scroll.threshold = settings.scrollThreshold;
                config.tabWidths.multi = settings.minTabWidth;
                config.tabWidths.single = settings.maxTabWidth;

                logger.addLog('Settings loaded successfully');
            } catch (error) {
                logger.error('Failed to load settings:', error);
            }
        });
    }

    // Save settings
    function saveSettings() {
        try {
            const settings = {
                showFavicons: document.getElementById('showFavicons').checked,
                showTitles: document.getElementById('showTitles').checked,
                autoHide: document.getElementById('autoHide').checked,
                scrollThreshold: parseInt(document.getElementById('scrollThreshold').value),
                minTabWidth: parseInt(document.getElementById('minTabWidth').value),
                maxTabWidth: parseInt(document.getElementById('maxTabWidth').value),
                retainScrollPosition: document.getElementById('retainScrollPosition').checked
            };

            // Update config module with new settings
            Object.assign(config.settings, {
                retainScrollPosition: settings.retainScrollPosition
            });

            config.scroll.threshold = settings.scrollThreshold;
            config.tabWidths.multi = settings.minTabWidth;
            config.tabWidths.single = settings.maxTabWidth;

            // Save to storage
            chrome.storage.sync.set(settings, () => {
                logger.addLog('Settings saved successfully');
                // Notify that settings have changed
                chrome.runtime.sendMessage({ 
                    action: 'settingsUpdated', 
                    settings: settings 
                });
            });
        } catch (error) {
            logger.error('Failed to save settings:', error);
        }
    }

    // Add event listeners
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveSettings);
    });

    // Load settings on startup
    loadSettings();
    logger.addLog('Settings interface initialized');

    // Hide any popup UI elements that might be showing
    const tabStrip = document.getElementById('tab-strip');
    if (tabStrip) {
        tabStrip.style.display = 'none';
    }
});