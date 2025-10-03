# Chrome Bookmark Manager

A comprehensive Chrome extension for managing your bookmarks with search, preview, and organization features.

## Features

- 🔍 **Search**: Quickly find bookmarks by title or URL
- 👁️ **Preview**: View bookmark details with favicon placeholders
- 📁 **Organization**: Move bookmarks between folders
- 🗑️ **Management**: Delete unwanted bookmarks
- 🎨 **Modern UI**: Clean, responsive interface optimized for extension popup

## Installation

1. **Download the extension files** to your computer
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the folder containing these extension files
5. **Pin the extension** to your toolbar for easy access

## Usage

1. **Click the extension icon** in your Chrome toolbar
2. **Search** for bookmarks using the search bar
3. **Click on any bookmark** to preview it
4. **Use the action buttons** to:
   - Open the bookmark in a new tab
   - Delete the bookmark
   - Move it to a different folder

## Files

- `popup.html` - Main extension interface
- `popup.js` - Extension functionality
- `manifest.json` - Extension configuration
- `icon*.png` - Extension icons

## Permissions

This extension requires:
- `bookmarks` - To read and manage your bookmarks
- `tabs` - To open bookmarks in new tabs

## Development

To modify the extension:
1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes

## Troubleshooting

- **Bookmarks not loading**: Check that the extension has bookmark permissions
- **Thumbnails not showing**: This is normal - the extension will show favicon placeholders instead
- **Extension not working**: Make sure Developer mode is enabled and the extension is loaded properly