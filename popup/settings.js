// Default settings
const defaultSettings = {
    showFavicons: true,
    showTitles: true,
    autoHide: true,
    scrollThreshold: 50,
    minTabWidth: 48,
    maxTabWidth: 180
};

// Load settings
function loadSettings() {
    chrome.storage.sync.get(defaultSettings, (settings) => {
        document.getElementById('showFavicons').checked = settings.showFavicons;
        document.getElementById('showTitles').checked = settings.showTitles;
        document.getElementById('autoHide').checked = settings.autoHide;
        document.getElementById('scrollThreshold').value = settings.scrollThreshold;
        document.getElementById('minTabWidth').value = settings.minTabWidth;
        document.getElementById('maxTabWidth').value = settings.maxTabWidth;
    });
}

// Save settings
function saveSettings() {
    const settings = {
        showFavicons: document.getElementById('showFavicons').checked,
        showTitles: document.getElementById('showTitles').checked,
        autoHide: document.getElementById('autoHide').checked,
        scrollThreshold: parseInt(document.getElementById('scrollThreshold').value),
        minTabWidth: parseInt(document.getElementById('minTabWidth').value),
        maxTabWidth: parseInt(document.getElementById('maxTabWidth').value)
    };

    chrome.storage.sync.set(settings);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', saveSettings);
});