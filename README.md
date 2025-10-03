# Chrome Bookmark Manager

A comprehensive Chrome extension for managing bookmarks with a modern, user-friendly interface.

## Features

- **Nested Dropdown Display**: View all bookmarks in a hierarchical tree structure
- **Search Functionality**: Quickly find bookmarks by title or URL
- **Thumbnail Preview**: See page thumbnails when clicking on bookmarks
- **Bookmark Actions**: Open, delete, or move bookmarks to different folders
- **Modern UI**: Beautiful, responsive design with smooth animations
- **Real-time Updates**: Automatically refreshes when bookmarks are modified

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Bookmark Manager icon will appear in your Chrome toolbar

## Usage

1. Click the Bookmark Manager icon in your Chrome toolbar
2. Browse your bookmarks in the nested dropdown structure
3. Use the search bar to quickly find specific bookmarks
4. Click on any bookmark to see details and actions:
   - **Open Bookmark**: Opens the bookmark in a new tab
   - **Delete**: Removes the bookmark (with confirmation)
   - **Move to Folder**: Move the bookmark to a different folder
5. Click on folder headers to expand/collapse folders

## File Structure

```
├── manifest.json          # Chrome extension manifest
├── popup.html            # Main extension popup interface
├── popup.js              # JavaScript functionality
├── styles.css            # CSS styling and animations
└── README.md             # This file
```

## Permissions

The extension requires the following permissions:
- `bookmarks`: To read, create, update, and delete bookmarks
- `tabs`: To open bookmarks in new tabs
- `activeTab`: To interact with the current tab

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Development

To modify or extend the bookmark manager:

1. Edit the relevant files (HTML, CSS, or JavaScript)
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Bookmark Manager extension
4. Test your changes

## Features in Detail

### Nested Dropdown
- Folders are displayed with expand/collapse functionality
- Bookmark count is shown for each folder
- Smooth animations for expanding/collapsing

### Search
- Real-time search as you type
- Searches both bookmark titles and URLs
- Maintains folder structure in search results

### Thumbnail Display
- Attempts to load page thumbnails using external services
- Falls back to favicon if thumbnail is unavailable
- Shows loading state while fetching thumbnails

### Bookmark Management
- **Open**: Creates a new tab with the bookmark URL
- **Delete**: Removes the bookmark with confirmation dialog
- **Move**: Allows moving bookmarks between folders

## Customization

You can customize the appearance by modifying `styles.css`:
- Change colors in the CSS variables
- Modify animations and transitions
- Adjust spacing and layout
- Add your own themes

## Troubleshooting

If the extension doesn't work properly:
1. Check that all required permissions are granted
2. Ensure you're using a supported browser
3. Try reloading the extension
4. Check the browser console for error messages

## License

This project is open source and available under the MIT License.