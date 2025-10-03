class ChromeBookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.filteredBookmarks = [];
        this.currentBookmark = null;
        this.folders = new Map();
        
        this.initializeEventListeners();
        this.loadBookmarks();
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.filterBookmarks(e.target.value));

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadBookmarks());

        // Action controls
        document.getElementById('openBookmark').addEventListener('click', () => this.openBookmark());
        document.getElementById('deleteBookmark').addEventListener('click', () => this.deleteBookmark());
        document.getElementById('moveBookmark').addEventListener('click', () => this.showMoveModal());
        document.getElementById('deleteBrokenLinks').addEventListener('click', () => this.deleteBrokenLinks());
        document.getElementById('checkAllLinks').addEventListener('click', () => this.checkAllLinks());

        // Move functionality
        document.getElementById('confirmMove').addEventListener('click', () => this.confirmMove());
        document.getElementById('cancelMove').addEventListener('click', () => this.hideMoveModal());
    }

    async loadBookmarks() {
        try {
            const bookmarkTree = await chrome.bookmarks.getTree();
            this.bookmarks = bookmarkTree[0].children || [];
            this.buildFolderMap();
            this.renderBookmarks();
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            this.showError('Failed to load bookmarks. Please check permissions.');
        }
    }

    buildFolderMap() {
        this.folders.clear();
        this.folders.set('', 'Root');
        
        const processNode = (nodes, parentPath = '') => {
            if (!nodes) return;
            
            nodes.forEach(node => {
                if (node.children) {
                    const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
                    this.folders.set(node.id, currentPath);
                    processNode(node.children, currentPath);
                }
            });
        };
        
        processNode(this.bookmarks);
    }

    renderBookmarks(bookmarks = null) {
        const container = document.getElementById('bookmarksTree');
        const bookmarksToRender = bookmarks || this.bookmarks;
        
        if (!bookmarksToRender || bookmarksToRender.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No bookmarks found</h3><p>Try adjusting your search or refresh the page.</p></div>';
            return;
        }

        container.innerHTML = '';
        this.renderBookmarkNodes(bookmarksToRender, container);
    }

    renderBookmarkNodes(nodes, container, level = 0) {
        if (!nodes) return;

        nodes.forEach(node => {
            if (node.children) {
                // It's a folder
                const folderElement = this.createFolderElement(node);
                container.appendChild(folderElement);
                
                const childrenContainer = folderElement.querySelector('.folder-children');
                this.renderBookmarkNodes(node.children, childrenContainer, level + 1);
            } else if (node.url) {
                // It's a bookmark
                const bookmarkElement = this.createBookmarkElement(node);
                container.appendChild(bookmarkElement);
            }
        });
    }

    createFolderElement(folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        folderDiv.innerHTML = `
            <div class="folder-header" data-folder-id="${folder.id}">
                <span class="folder-icon">▶</span>
                <span class="folder-name">${this.escapeHtml(folder.title)}</span>
            </div>
            <div class="folder-children"></div>
        `;

        const header = folderDiv.querySelector('.folder-header');
        const children = folderDiv.querySelector('.folder-children');
        const icon = folderDiv.querySelector('.folder-icon');

        header.addEventListener('click', () => {
            const isExpanded = children.classList.contains('expanded');
            if (isExpanded) {
                children.classList.remove('expanded');
                icon.classList.remove('expanded');
            } else {
                children.classList.add('expanded');
                icon.classList.add('expanded');
            }
        });

        return folderDiv;
    }

    createBookmarkElement(bookmark) {
        const bookmarkDiv = document.createElement('div');
        bookmarkDiv.className = 'bookmark';
        bookmarkDiv.innerHTML = `
            <span class="bookmark-icon">🔖</span>
            <span class="bookmark-title">${this.escapeHtml(bookmark.title)}</span>
            <span class="bookmark-url">${this.escapeHtml(bookmark.url)}</span>
        `;

        bookmarkDiv.addEventListener('click', () => this.showBookmarkPreview(bookmark));
        bookmarkDiv.setAttribute('data-bookmark-id', bookmark.id);

        // Check if this bookmark is broken and mark it
        this.checkAndMarkBrokenLink(bookmark, bookmarkDiv);

        return bookmarkDiv;
    }

    async showBookmarkPreview(bookmark) {
        this.currentBookmark = bookmark;
        const thumbnail = document.getElementById('previewThumbnail');

        // Show loading state
        thumbnail.innerHTML = '<div class="loading">Loading webpage preview...</div>';

        // Create iframe to show actual webpage
        try {
            const iframe = document.createElement('iframe');
            iframe.src = bookmark.url;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
            iframe.onload = () => {
                // Iframe loaded successfully
            };
            iframe.onerror = () => {
                // If iframe fails, show favicon fallback
                const favicon = this.getFavicon(bookmark.url);
                thumbnail.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                        <div style="font-size: 80px; margin-bottom: 15px;">${favicon}</div>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #333; text-align: center;">${bookmark.title}</div>
                        <div style="font-size: 12px; color: #666; text-align: center; max-width: 90%; word-break: break-all;">${bookmark.url}</div>
                    </div>
                `;
            };
            
            thumbnail.innerHTML = '';
            thumbnail.appendChild(iframe);
        } catch (error) {
            // Show favicon fallback
            const favicon = this.getFavicon(bookmark.url);
            thumbnail.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                    <div style="font-size: 80px; margin-bottom: 15px;">${favicon}</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #333; text-align: center;">${bookmark.title}</div>
                    <div style="font-size: 12px; color: #666; text-align: center; max-width: 90%; word-break: break-all;">${bookmark.url}</div>
                </div>
            `;
        }

        // Populate folder select for move functionality
        this.populateFolderSelect();
    }

    async generateThumbnail(url) {
        // Try multiple thumbnail services for better reliability
        const encodedUrl = encodeURIComponent(url);
        
        // Try screenshotapi.net (free tier)
        try {
            return `https://shot.screenshotapi.net/screenshot?token=YOUR_TOKEN&url=${encodedUrl}&width=400&height=300&format=png`;
        } catch (error) {
            // Fallback to a different service
            return `https://api.screenshotmachine.com?key=YOUR_KEY&url=${encodedUrl}&dimension=400x300`;
        }
    }

    getFavicon(url) {
        try {
            const domain = new URL(url).hostname.toLowerCase();
            if (domain.includes('google')) return '🔍';
            if (domain.includes('github')) return '🐙';
            if (domain.includes('stackoverflow')) return '📚';
            if (domain.includes('youtube')) return '📺';
            if (domain.includes('netflix')) return '🎬';
            if (domain.includes('mozilla')) return '🦊';
            if (domain.includes('react')) return '⚛️';
            if (domain.includes('facebook')) return '📘';
            if (domain.includes('twitter')) return '🐦';
            if (domain.includes('linkedin')) return '💼';
            if (domain.includes('reddit')) return '🤖';
            return '🌐';
        } catch {
            return '🌐';
        }
    }

    populateFolderSelect() {
        const select = document.getElementById('folderSelect');
        select.innerHTML = '<option value="">Choose a folder...</option>';
        
        this.folders.forEach((path, id) => {
            if (id !== this.currentBookmark.parentId) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = path;
                select.appendChild(option);
            }
        });
    }

    closeModal() {
        // Clear the preview
        const thumbnail = document.getElementById('previewThumbnail');
        thumbnail.innerHTML = '<div class="loading">Click on a bookmark to see preview</div>';
        this.currentBookmark = null;
        this.hideMoveModal();
    }

    openBookmark() {
        if (this.currentBookmark) {
            chrome.tabs.create({ url: this.currentBookmark.url });
            this.closeModal();
        }
    }

    async deleteBookmark() {
        if (!this.currentBookmark) return;

        if (confirm(`Are you sure you want to delete "${this.currentBookmark.title}"?`)) {
            try {
                await chrome.bookmarks.remove(this.currentBookmark.id);
                this.closeModal();
                this.loadBookmarks(); // Refresh the list
            } catch (error) {
                console.error('Error deleting bookmark:', error);
                this.showError('Failed to delete bookmark');
            }
        }
    }

    showMoveModal() {
        document.getElementById('moveFolderModal').style.display = 'block';
    }

    hideMoveModal() {
        document.getElementById('moveFolderModal').style.display = 'none';
    }

    async confirmMove() {
        const select = document.getElementById('folderSelect');
        const destinationFolderId = select.value;

        if (!destinationFolderId || !this.currentBookmark) return;

        try {
            await chrome.bookmarks.move(this.currentBookmark.id, {
                parentId: destinationFolderId
            });
            this.closeModal();
            this.loadBookmarks(); // Refresh the list
        } catch (error) {
            console.error('Error moving bookmark:', error);
            this.showError('Failed to move bookmark');
        }
    }

    filterBookmarks(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderBookmarks();
            return;
        }

        const filtered = this.filterBookmarkNodes(this.bookmarks, searchTerm.toLowerCase());
        this.renderBookmarks(filtered);
    }

    filterBookmarkNodes(nodes, searchTerm) {
        const results = [];

        nodes.forEach(node => {
            if (node.children) {
                // It's a folder
                const filteredChildren = this.filterBookmarkNodes(node.children, searchTerm);
                if (filteredChildren.length > 0) {
                    results.push({
                        ...node,
                        children: filteredChildren
                    });
                } else if (node.title.toLowerCase().includes(searchTerm)) {
                    // Folder name matches
                    results.push(node);
                }
            } else if (node.url && (
                node.title.toLowerCase().includes(searchTerm) ||
                node.url.toLowerCase().includes(searchTerm)
            )) {
                // It's a bookmark that matches
                results.push(node);
            }
        });

        return results;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorDiv.style.display = 'block';
        
        // Hide the loading state
        const bookmarksTree = document.getElementById('bookmarksTree');
        bookmarksTree.innerHTML = '<div class="empty-state"><h3>Error</h3><p>Unable to load bookmarks</p></div>';
    }

    async checkAllLinks() {
        try {
            // Get all bookmark elements in the current view
            const bookmarkElements = document.querySelectorAll('.bookmark');
            let checkedCount = 0;
            let brokenCount = 0;

            for (const bookmarkElement of bookmarkElements) {
                const bookmarkId = bookmarkElement.getAttribute('data-bookmark-id');
                if (!bookmarkId) continue;

                // Get the bookmark data
                const bookmark = await chrome.bookmarks.get(bookmarkId);
                if (!bookmark[0] || !bookmark[0].url) continue;

                checkedCount++;
                
                // Check if it's obviously broken
                if (this.isObviouslyBroken(bookmark[0].url)) {
                    bookmarkElement.classList.add('broken');
                    brokenCount++;
                    console.log(`Marked as broken: ${bookmark[0].title} - ${bookmark[0].url}`);
                } else {
                    // Try to check with a simple method
                    try {
                        const isBroken = await this.checkIfUrlIsBroken(bookmark[0].url);
                        if (isBroken) {
                            bookmarkElement.classList.add('broken');
                            brokenCount++;
                            console.log(`Marked as broken: ${bookmark[0].title} - ${bookmark[0].url}`);
                        }
                    } catch (error) {
                        console.log(`Could not check ${bookmark[0].url}:`, error);
                        // Don't mark as broken if we can't check
                    }
                }
            }

            alert(`Checked ${checkedCount} bookmarks. Found ${brokenCount} broken links.`);
            
        } catch (error) {
            console.error('Error checking links:', error);
            this.showError('Error checking links: ' + error.message);
        }
    }

    async deleteBrokenLinks() {
        try {
            // Get all bookmarks marked as broken in the current view
            const brokenElements = document.querySelectorAll('.bookmark.broken');
            
            if (brokenElements.length === 0) {
                alert('No broken links found in current view!');
                return;
            }

            const confirmed = confirm(`This will delete ${brokenElements.length} broken bookmarks. Are you sure?`);
            if (!confirmed) return;

            let deletedCount = 0;
            
            // Delete all broken bookmarks
            for (const bookmarkElement of brokenElements) {
                const bookmarkId = bookmarkElement.getAttribute('data-bookmark-id');
                if (!bookmarkId) continue;

                try {
                    await chrome.bookmarks.remove(bookmarkId);
                    deletedCount++;
                    console.log(`Deleted broken bookmark: ${bookmarkId}`);
                } catch (error) {
                    console.error(`Error deleting bookmark ${bookmarkId}:`, error);
                }
            }
            
            alert(`Successfully deleted ${deletedCount} broken bookmarks!`);
            
            // Refresh the bookmark list
            this.loadBookmarks();
            
        } catch (error) {
            console.error('Error deleting broken links:', error);
            this.showError('Error deleting broken links: ' + error.message);
        }
    }

    async checkIfUrlIsBroken(url) {
        try {
            // First, validate the URL format
            if (!this.isValidUrl(url)) {
                return true;
            }

            // Use a more reliable CORS proxy with better error handling
            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log(`Proxy failed for ${url}, status: ${response.status}`);
                    return false; // Don't mark as broken if proxy fails
                }
                
                const data = await response.json();
                
                // Check if we got valid content
                if (data.contents) {
                    // Check for common error indicators in the content
                    const content = data.contents.toLowerCase();
                    if (content.includes('404 not found') || 
                        content.includes('page not found') ||
                        content.includes('error 404') ||
                        content.includes('not found') ||
                        content.includes('this page cannot be found')) {
                        return true; // Definitely broken
                    }
                    return false; // Content exists, probably working
                }
                
                // Check HTTP status codes
                if (data.status && data.status.http_code) {
                    const statusCode = data.status.http_code;
                    if (statusCode >= 400 && statusCode < 500) {
                        return true; // Client error - broken
                    }
                    if (statusCode >= 500) {
                        return true; // Server error - broken
                    }
                    return false; // 2xx or 3xx - working
                }
                
                return false; // No clear indication of being broken
                
            } catch (proxyError) {
                console.log(`CORS proxy error for ${url}:`, proxyError);
                
                // Fallback: try a simple fetch with no-cors
                try {
                    await fetch(url, {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-cache'
                    });
                    return false; // If it doesn't throw, probably working
                } catch (fetchError) {
                    console.log(`Direct fetch also failed for ${url}:`, fetchError);
                    return false; // Don't mark as broken if we can't determine
                }
            }
            
        } catch (error) {
            console.log(`Error checking ${url}:`, error);
            return false; // Don't mark as broken if we can't check
        }
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async checkWithHeadRequest(url) {
        try {
            // Try a HEAD request first (lighter than GET)
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors', // This bypasses CORS for basic checks
                cache: 'no-cache'
            });
            
            // With no-cors, we can't read the status, but if it doesn't throw, it's probably working
            return false; // Not broken
        } catch (error) {
            // If HEAD fails, try GET
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                return false; // Not broken
            } catch (getError) {
                return true; // Probably broken
            }
        }
    }

    async checkWithCorsProxy(url) {
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                return null; // Can't determine, try other method
            }
            
            const data = await response.json();
            
            // Only mark as broken if we get a clear 4xx or 5xx error
            if (data.status && data.status.http_code >= 400 && data.status.http_code < 500) {
                return true; // Client error - definitely broken
            }
            
            return false; // Not broken
        } catch (error) {
            return null; // Can't determine, try other method
        }
    }

    async checkWithFavicon(url) {
        try {
            const domain = new URL(url).origin;
            const faviconUrl = `${domain}/favicon.ico`;
            
            const response = await fetch(faviconUrl, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            return false; // If favicon loads, site is probably working
        } catch (error) {
            return null; // Can't determine from favicon
        }
    }

    async checkAndMarkBrokenLink(bookmark, bookmarkDiv) {
        if (!bookmark.url) return; // Skip folders
        
        // Only check for obviously broken URLs - no complex detection
        if (this.isObviouslyBroken(bookmark.url)) {
            bookmarkDiv.classList.add('broken');
            console.log(`Marked as obviously broken: ${bookmark.title} - ${bookmark.url}`);
        }

        // Add a right-click context menu for manual marking
        bookmarkDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, bookmark, bookmarkDiv);
        });
    }

    showContextMenu(event, bookmark, bookmarkDiv) {
        // Remove existing context menu if any
        const existingMenu = document.getElementById('contextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const contextMenu = document.createElement('div');
        contextMenu.id = 'contextMenu';
        contextMenu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            padding: 5px 0;
            min-width: 150px;
        `;

        const markBrokenItem = document.createElement('div');
        markBrokenItem.textContent = 'Mark as Broken';
        markBrokenItem.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
        `;
        markBrokenItem.addEventListener('click', () => {
            bookmarkDiv.classList.add('broken');
            contextMenu.remove();
        });

        const markWorkingItem = document.createElement('div');
        markWorkingItem.textContent = 'Mark as Working';
        markWorkingItem.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
        `;
        markWorkingItem.addEventListener('click', () => {
            bookmarkDiv.classList.remove('broken');
            contextMenu.remove();
        });

        contextMenu.appendChild(markBrokenItem);
        contextMenu.appendChild(markWorkingItem);
        document.body.appendChild(contextMenu);

        // Remove context menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => {
                contextMenu.remove();
            }, { once: true });
        }, 100);
    }

    isObviouslyBroken(url) {
        try {
            const urlObj = new URL(url);
            
            // Check for obviously broken patterns
            if (urlObj.protocol === 'file:') return true;
            if (urlObj.protocol === 'chrome:') return true;
            if (urlObj.protocol === 'chrome-extension:') return true;
            if (urlObj.protocol === 'moz-extension:') return true;
            if (urlObj.protocol === 'about:') return true;
            
            // Check for localhost without port (usually broken)
            if (urlObj.hostname === 'localhost' && !urlObj.port) return true;
            if (urlObj.hostname === '127.0.0.1' && !urlObj.port) return true;
            if (urlObj.hostname === '0.0.0.0') return true;
            
            // Check for example/test domains
            if (urlObj.hostname.includes('example.com')) return true;
            if (urlObj.hostname.includes('test.com')) return true;
            if (urlObj.hostname.includes('example.org')) return true;
            if (urlObj.hostname.includes('example.net')) return true;
            
            // Check for malformed URLs
            if (urlObj.hostname === '' || urlObj.hostname === 'undefined') return true;
            if (urlObj.hostname === 'null') return true;
            if (urlObj.hostname === 'false') return true;
            
            // Check for URLs without proper domain structure
            if (urlObj.protocol === 'http:' && !urlObj.hostname.includes('.') && urlObj.hostname !== 'localhost') return true;
            if (urlObj.protocol === 'https:' && !urlObj.hostname.includes('.') && urlObj.hostname !== 'localhost') return true;
            
            // Check for common broken patterns
            if (url.includes('javascript:') && !url.includes('void(0)')) return true;
            if (url.includes('data:') && url.length < 50) return true; // Very short data URLs are usually broken
            
            return false;
        } catch (error) {
            return true; // Malformed URL
        }
    }
}

// Initialize the bookmark manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChromeBookmarkManager();
});