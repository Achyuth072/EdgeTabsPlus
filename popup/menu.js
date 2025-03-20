// Initialize menu functionality
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Menu initializing...'); // Direct console logging for debugging

    // Initialize required modules
    let retries = 5;
    while (retries > 0) {
        if (window.EdgeTabsPlus) {
            try {
                const { tabManager, config } = window.EdgeTabsPlus;
                await config.init();
                await tabManager.init();
                break;
            } catch (error) {
                console.error(`Module initialization failed (${retries} retries left):`, error);
                retries--;
                if (retries === 0) {
                    console.error('Failed to initialize modules after all retries');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
                continue;
            }
        } else {
            console.log(`Waiting for EdgeTabsPlus namespace... (${retries} retries left)`);
            retries--;
            if (retries === 0) {
                console.error('EdgeTabsPlus namespace not available after all retries');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // Get UI elements
    const toggleActions = document.querySelectorAll('.toggle-action');
    const themeToggle = document.getElementById('themeToggle');
    const addTabButton = document.getElementById('add-tab');
    const buttons = {
        newTab: document.getElementById('newTabBtn'),
        closeTab: document.getElementById('closeTabBtn'),
        reload: document.getElementById('reloadBtn')
    };

    // Initialize tabs list
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        tabManager.renderTabs(tabs).catch(error => {
            console.error('Failed to render initial tabs:', error);
        });
    });

    // Listen for tab updates
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'tabsUpdated' && request.tabs) {
            tabManager.renderTabs(request.tabs).catch(error => {
                console.error('Failed to render updated tabs:', error);
            });
        }
    });

    // Add tab button handler with long-press support
    let pressTimer;
    if (addTabButton) {
        addTabButton.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => {
                chrome.action.openPopup();
            }, 500);
        });

        addTabButton.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            chrome.runtime.sendMessage({ action: 'createTab' });
        });

        addTabButton.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });

        // Touch event support
        addTabButton.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                chrome.action.openPopup();
            }, 500);
        });

        addTabButton.addEventListener('touchend', (e) => {
            clearTimeout(pressTimer);
            if (e.cancelable) {
                e.preventDefault();
                chrome.runtime.sendMessage({ action: 'createTab' });
            }
        });

        addTabButton.addEventListener('touchcancel', () => {
            clearTimeout(pressTimer);
        });
    }

    // Theme Management
    function setTheme(isDark) {
        // Apply theme to both HTML and body elements to ensure complete styling
        document.documentElement.classList.toggle('dark-theme', isDark);
        document.body.classList.toggle('dark-theme', isDark);
        chrome.storage.sync.set({ isDarkMode: isDark });
        
        // Update theme toggle icon with animation
        const themeIcon = themeToggle.querySelector('i');
        themeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
        themeIcon.classList.add('rotate-out');
        
        // Trigger rotation animation
        setTimeout(() => {
            themeIcon.classList.remove('rotate-out');
            themeIcon.classList.add('rotate-in');
            // Remove animation classes after transition
            setTimeout(() => {
                themeIcon.classList.remove('rotate-in');
            }, 300);
        }, 150);

        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        themeToggle.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1000);
        
        // Broadcast theme change to all tabs via background script
        chrome.runtime.sendMessage({
            action: 'syncTheme',
            isDark: isDark
        });
        console.log('Theme updated:', isDark ? 'dark' : 'light');
    }

    // Toggle State Management
    function updateToggle(element, state) {
            const setting = element.dataset.setting;
            element.setAttribute('aria-checked', state);
            const isEnabled = state === 'true';
            
            // Update storage and notify all tabs
            chrome.storage.sync.set({ [setting]: isEnabled }, () => {
                console.log(`Toggle ${setting} updated:`, isEnabled);
                
                // Broadcast to all tabs with retry mechanism
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        const notifyTab = (retries = 3) => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'toggleUpdate',
                                key: setting,
                                value: isEnabled
                            }).catch(err => {
                                if (!err.message.includes('receiving end does not exist')) {
                                    if (retries > 0) {
                                        // Retry with exponential backoff
                                        setTimeout(() => notifyTab(retries - 1), (4 - retries) * 200);
                                    } else {
                                        console.error(`Failed to update toggle in tab ${tab.id} after retries:`, err);
                                    }
                                }
                            });
                        };
                        notifyTab();
                    });
                });
                
                // Double-check persistence after a delay
                setTimeout(() => {
                    chrome.storage.sync.get(setting, (result) => {
                        if (result[setting] !== isEnabled) {
                            console.warn(`Toggle state mismatch for ${setting}, correcting...`);
                            chrome.storage.sync.set({ [setting]: isEnabled });
                        }
                    });
                }, 1000);
            });
        }

    // Initialize toggle states
    function initToggles() {
        toggleActions.forEach(toggle => {
            const setting = toggle.dataset.setting;
            if (!setting) return;

            // Get current state
            chrome.storage.sync.get(setting, (result) => {
                const state = result[setting] !== undefined ? result[setting] : true;
                toggle.setAttribute('aria-checked', state);
                console.log(`Initialized toggle ${setting}:`, state);
            });

            // Add click handler
            toggle.addEventListener('click', () => {
                const newState = toggle.getAttribute('aria-checked') !== 'true';
                updateToggle(toggle, String(newState));
            });
        });
    }

    // Button click handlers
    if (buttons.newTab) {
        buttons.newTab.addEventListener('click', () => {
            console.log('Creating new tab...');
            chrome.runtime.sendMessage({ action: 'createTab' });
            window.close();
        });
    }

    if (buttons.closeTab) {
        buttons.closeTab.addEventListener('click', () => {
            console.log('Closing current tab...');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.remove(tabs[0].id);
                window.close();
            });
        });
    }

    if (buttons.reload) {
        buttons.reload.addEventListener('click', () => {
            console.log('Reloading current tab...');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.reload(tabs[0].id);
                window.close();
            });
        });
    }

    // Theme toggle handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = !document.body.classList.contains('dark-theme');
            setTheme(isDark);
            console.log('Theme toggled:', isDark ? 'dark' : 'light');
        });
    }

    // Initialize
    chrome.storage.sync.get('isDarkMode', (result) => {
        const isDark = result.isDarkMode !== undefined ? result.isDarkMode : true;
        setTheme(isDark);
    });
    
    initToggles();
    console.log('Menu initialization complete');
});