# Chrome Bookmark Manager

A comprehensive Chrome extension for managing bookmarks with a modern, user-friendly interface.

## Features

- **Nested Dropdown Display**: View all bookmarks organized in a hierarchical folder structure
- **Thumbnail Previews**: Click on any bookmark to see a thumbnail preview of the webpage
- **Search Functionality**: Quickly find bookmarks by title or URL
- **Delete Bookmarks**: Remove unwanted bookmarks with confirmation
- **Move Bookmarks**: Move bookmarks between different folders
- **Modern UI**: Beautiful, responsive design with smooth animations

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension will appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Browse your bookmarks using the nested folder structure
3. Click on any bookmark to see a preview with thumbnail
4. Use the action buttons to:
   - **Open Bookmark**: Open the bookmark in a new tab
   - **Delete**: Remove the bookmark (with confirmation)
   - **Move to Folder**: Move the bookmark to a different folder
5. Use the search bar to quickly find specific bookmarks

## File Structure

```
├── manifest.json          # Chrome extension manifest
├── popup.html            # Main popup interface
├── popup.js              # JavaScript functionality
├── styles.css            # CSS styling
└── README.md             # This file
```

## Permissions

The extension requires the following permissions:
- `bookmarks`: To read, modify, and delete bookmarks
- `tabs`: To open bookmarks in new tabs
- `activeTab`: For enhanced functionality

## Technical Details

- Built with vanilla JavaScript (no external dependencies)
- Uses Chrome's Bookmarks API for all bookmark operations
- Implements thumbnail generation using external service
- Responsive design that works on different screen sizes
- Smooth animations and transitions for better UX

## Browser Compatibility

- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## Notes

- Thumbnail generation relies on an external service and may not work for all URLs
- The extension requires appropriate permissions to function properly
- All bookmark operations are performed through Chrome's official APIs