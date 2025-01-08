# EdgeTabs+

Learning to build a Microsoft Edge extension that adds a tab strip above the address bar(bottom) in Edge for Android, improving tab management and navigation.

## Features

- Bottom-positioned tab strip for easy access
- Create new tabs with a single tap
- Switch between tabs quickly
- Close tabs directly from the strip
- Designed for touch interaction

## Installation

1. Download the extension from releases
2. Open Edge Android Canary
3. Go to Settings > Developer options > Extension Install by crx

## Usage

- Tap '+' to create a new tab
- Tap on any tab to switch to it
- Tap 'x' on a tab to close it
- Scroll webpage normally with the tab strip present

<!-- ## Current Limitations

- Tab strip only shows tabs that are loaded in memory
- After browser restart, only the last active tab is visible
- Some websites may experience scroll interaction issues -->

## Development Status

This extension is in active development. Current version: 0.5

### Working Features

- Tab strip UI
- Tab creation
- Tab switching
- Tab closing
- Basic error handling

### Known Issues

- Memory-related tab visibility
- UI positioning refinements needed
- Performance optimizations pending
- New tab button positioning needs adjustment

## Technical Details

Built using:

- Edge Extensions API (MV3)
- Core APIs: tabs, runtime, storage (planned)
- Pure JavaScript without dependencies

## License

MIT License

## Contributing

<!-- Issues and pull requests are welcome. Please check the [PROGRESS.md](PROGRESS.md) file for current development status and planned improvements. -->