# EdgeTabs+

Learning to build a Microsoft Edge extension that adds a bottom-positioned tab strip for Android, enhancing tab management and navigation through a modular and efficient architecture.

## Features

### Core Features

- Bottom-positioned tab strip
- Reliable favicon system using DuckDuckGo's service
- Dynamic tab sizing based on count
- Hardware-accelerated animations
- Modular architecture for maintainability

### Tab Management

- Quick tab creation and closing
- Instant tab switching
- Smooth horizontal scrolling
- Smart favicon handling and caching
- Efficient state management

### Technical Features

- Modular code architecture
  - Independent, reusable components
  - Clear dependency management
  - Enhanced error recovery
- Optimized message passing
- Hardware-accelerated animations
- Robust error handling

## Usage

### Basic Controls

- Tap '+' to create new tab
- Tap tab to switch
- Tap '×' to close tab
- Scroll horizontally for more tabs
- Scroll page down to hide tab strip
- Toggle debug overlay with 📜

### Tab Features

- Dynamic width adjustment:
  - Single tab: 180px
  - 2 tabs: 160px each
  - 3 tabs: 120px each
  - 4 tabs: 100px each
  - 5+ tabs: 90px each
- Smooth transitions between states
- Reliable favicon loading
- Touch-optimized interactions

## Development Status

### ![License](https://img.shields.io/github/license/Achyuth072/EdgeTabsPlus) ![Version](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/Achyuth072/EdgeTabsPlus/main/manifest.json&label=version&query=$.version&color=blue) ![Development Status](https://img.shields.io/badge/status-alpha-red) ![Last Commit](https://img.shields.io/github/last-commit/Achyuth072/EdgeTabsPlus)

#### Completed Features

- Bottom tab strip implementation ✓
- Basic tab operations ✓
- Reliable favicon system ✓
- Settings interface ✓
- Font and layout customization ✓
- Module system implementation ✓
- Message passing improvements ✓
- Error handling enhancements ✓

#### In Progress

- Touch optimization refinements
- Mobile-specific improvements
- Performance optimizations
- Tab state persistence

### Module Architecture

```bash
modules/
├── namespace.js     # Core module system
├── config.js       # Settings management
├── logger.js       # Debug logging system
├── faviconHandler.js # Icon loading/caching
├── tabManager.js   # Tab operations
├── scrollHandler.js # Scroll behaviors
├── touchHandler.js # Touch interactions
├── styles.js      # CSS management
└── uiComponents.js # UI components
```

### Requirements

- Microsoft Edge Android Canary

## Technical Details

- Built with ES6+ JavaScript
- Chrome Extension Manifest V3
- Hardware-accelerated animations
- Event-based state management
- Modular component architecture
- Robust error recovery system
