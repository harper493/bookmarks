class BookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.filteredBookmarks = [];
        this.currentBookmark = null;
        this.moveTargetFolder = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBookmarks();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterBookmarks(e.target.value);
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadBookmarks();
        });

        // Modal close buttons
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal('bookmarkModal');
        });

        document.querySelector('.close-move').addEventListener('click', () => {
            this.closeModal('moveModal');
        });

        // Bookmark actions
        document.getElementById('openBookmark').addEventListener('click', () => {
            this.openBookmark();
        });

        document.getElementById('deleteBookmark').addEventListener('click', () => {
            this.deleteBookmark();
        });

        document.getElementById('moveBookmark').addEventListener('click', () => {
            this.showMoveModal();
        });

        // Move modal actions
        document.getElementById('confirmMove').addEventListener('click', () => {
            this.confirmMove();
        });

        document.getElementById('cancelMove').addEventListener('click', () => {
            this.closeModal('moveModal');
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const bookmarkModal = document.getElementById('bookmarkModal');
            const moveModal = document.getElementById('moveModal');
            if (e.target === bookmarkModal) {
                this.closeModal('bookmarkModal');
            }
            if (e.target === moveModal) {
                this.closeModal('moveModal');
            }
        });
    }

    async loadBookmarks() {
        try {
            const bookmarkTree = await chrome.bookmarks.getTree();
            this.bookmarks = bookmarkTree[0].children || [];
            this.filteredBookmarks = [...this.bookmarks];
            this.renderBookmarks();
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            this.showError('Failed to load bookmarks');
        }
    }

    filterBookmarks(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredBookmarks = [...this.bookmarks];
        } else {
            this.filteredBookmarks = this.filterBookmarksRecursive(this.bookmarks, searchTerm.toLowerCase());
        }
        this.renderBookmarks();
    }

    filterBookmarksRecursive(bookmarks, searchTerm) {
        const filtered = [];
        
        for (const bookmark of bookmarks) {
            if (bookmark.children) {
                // It's a folder
                const filteredChildren = this.filterBookmarksRecursive(bookmark.children, searchTerm);
                if (filteredChildren.length > 0) {
                    filtered.push({
                        ...bookmark,
                        children: filteredChildren
                    });
                }
            } else {
                // It's a bookmark
                if (bookmark.title.toLowerCase().includes(searchTerm) || 
                    bookmark.url.toLowerCase().includes(searchTerm)) {
                    filtered.push(bookmark);
                }
            }
        }
        
        return filtered;
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarksTree');
        container.innerHTML = '';
        
        if (this.filteredBookmarks.length === 0) {
            container.innerHTML = '<div class="no-bookmarks">No bookmarks found</div>';
            return;
        }

        this.filteredBookmarks.forEach(bookmark => {
            const element = this.createBookmarkElement(bookmark);
            container.appendChild(element);
        });
    }

    createBookmarkElement(bookmark) {
        if (bookmark.children) {
            // It's a folder
            return this.createFolderElement(bookmark);
        } else {
            // It's a bookmark
            return this.createBookmarkItemElement(bookmark);
        }
    }

    createFolderElement(folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        
        const header = document.createElement('div');
        header.className = 'folder-header';
        header.innerHTML = `
            <span class="folder-icon">▶</span>
            <span class="folder-name">${this.escapeHtml(folder.title)}</span>
            <span class="folder-count">${this.countBookmarks(folder)}</span>
        `;
        
        const children = document.createElement('div');
        children.className = 'folder-children';
        
        folder.children.forEach(child => {
            children.appendChild(this.createBookmarkElement(child));
        });
        
        header.addEventListener('click', () => {
            const icon = header.querySelector('.folder-icon');
            const isExpanded = children.classList.contains('expanded');
            
            if (isExpanded) {
                children.classList.remove('expanded');
                icon.classList.remove('expanded');
            } else {
                children.classList.add('expanded');
                icon.classList.add('expanded');
            }
        });
        
        folderDiv.appendChild(header);
        folderDiv.appendChild(children);
        
        return folderDiv;
    }

    createBookmarkItemElement(bookmark) {
        const bookmarkDiv = document.createElement('div');
        bookmarkDiv.className = 'bookmark';
        bookmarkDiv.innerHTML = `
            <span class="bookmark-icon">🔗</span>
            <div>
                <div class="bookmark-title">${this.escapeHtml(bookmark.title)}</div>
                <div class="bookmark-url">${this.escapeHtml(bookmark.url)}</div>
            </div>
        `;
        
        bookmarkDiv.addEventListener('click', () => {
            this.showBookmarkDetails(bookmark);
        });
        
        return bookmarkDiv;
    }

    countBookmarks(folder) {
        let count = 0;
        if (folder.children) {
            folder.children.forEach(child => {
                if (child.children) {
                    count += this.countBookmarks(child);
                } else {
                    count++;
                }
            });
        }
        return count;
    }

    async showBookmarkDetails(bookmark) {
        this.currentBookmark = bookmark;
        
        document.getElementById('bookmarkTitle').textContent = bookmark.title;
        document.getElementById('bookmarkUrl').textContent = bookmark.url;
        document.getElementById('bookmarkFolder').textContent = this.getBookmarkFolder(bookmark);
        
        // Show loading state
        document.getElementById('thumbnailLoading').style.display = 'block';
        document.getElementById('bookmarkThumbnail').style.display = 'none';
        
        // Try to get thumbnail
        try {
            const thumbnail = await this.getThumbnail(bookmark.url);
            if (thumbnail) {
                document.getElementById('bookmarkThumbnail').src = thumbnail;
                document.getElementById('bookmarkThumbnail').style.display = 'block';
                document.getElementById('thumbnailLoading').style.display = 'none';
            } else {
                document.getElementById('thumbnailLoading').textContent = 'Thumbnail not available';
            }
        } catch (error) {
            console.error('Error loading thumbnail:', error);
            document.getElementById('thumbnailLoading').textContent = 'Failed to load thumbnail';
        }
        
        this.showModal('bookmarkModal');
    }

    async getThumbnail(url) {
        try {
            // Try to get favicon first (more reliable)
            const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(url).hostname}`;
            
            // Test if favicon loads
            const response = await fetch(faviconUrl, { method: 'HEAD' });
            if (response.ok) {
                return faviconUrl;
            }
        } catch (error) {
            console.error('Favicon error:', error);
        }
        
        // Fallback: try screenshot service (requires API key in production)
        try {
            const response = await fetch(`https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(url)}&dimension=400x300`);
            if (response.ok) {
                return response.url;
            }
        } catch (error) {
            console.error('Thumbnail service error:', error);
        }
        
        return null;
    }

    getBookmarkFolder(bookmark) {
        // This is a simplified version - in a real implementation,
        // you'd track the full path to the bookmark
        return 'Bookmarks Bar';
    }

    async openBookmark() {
        if (this.currentBookmark) {
            try {
                await chrome.tabs.create({ url: this.currentBookmark.url });
                this.closeModal('bookmarkModal');
            } catch (error) {
                console.error('Error opening bookmark:', error);
                this.showError('Failed to open bookmark');
            }
        }
    }

    async deleteBookmark() {
        if (this.currentBookmark && confirm('Are you sure you want to delete this bookmark?')) {
            try {
                await chrome.bookmarks.remove(this.currentBookmark.id);
                this.closeModal('bookmarkModal');
                this.loadBookmarks(); // Refresh the list
                this.showSuccess('Bookmark deleted successfully');
            } catch (error) {
                console.error('Error deleting bookmark:', error);
                this.showError('Failed to delete bookmark');
            }
        }
    }

    showMoveModal() {
        this.renderFoldersForMove();
        this.showModal('moveModal');
    }

    renderFoldersForMove() {
        const container = document.getElementById('foldersTree');
        container.innerHTML = '';
        
        const folders = this.getAllFolders(this.bookmarks);
        folders.forEach(folder => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-item';
            folderDiv.innerHTML = `
                <div class="folder-header" data-folder-id="${folder.id}">
                    <span class="folder-icon">📁</span>
                    <span class="folder-name">${this.escapeHtml(folder.title)}</span>
                </div>
            `;
            
            folderDiv.addEventListener('click', () => {
                // Remove previous selection
                container.querySelectorAll('.folder-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selection to clicked item
                folderDiv.classList.add('selected');
                this.moveTargetFolder = folder;
            });
            
            container.appendChild(folderDiv);
        });
    }

    getAllFolders(bookmarks, path = '') {
        const folders = [];
        
        bookmarks.forEach(bookmark => {
            if (bookmark.children) {
                const folderPath = path ? `${path} / ${bookmark.title}` : bookmark.title;
                folders.push({
                    ...bookmark,
                    path: folderPath
                });
                
                // Recursively get subfolders
                folders.push(...this.getAllFolders(bookmark.children, folderPath));
            }
        });
        
        return folders;
    }

    async confirmMove() {
        if (this.currentBookmark && this.moveTargetFolder) {
            try {
                await chrome.bookmarks.move(this.currentBookmark.id, {
                    parentId: this.moveTargetFolder.id
                });
                this.closeModal('moveModal');
                this.closeModal('bookmarkModal');
                this.loadBookmarks(); // Refresh the list
                this.showSuccess('Bookmark moved successfully');
            } catch (error) {
                console.error('Error moving bookmark:', error);
                this.showError('Failed to move bookmark');
            }
        } else {
            this.showError('Please select a destination folder');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        if (modalId === 'bookmarkModal') {
            this.currentBookmark = null;
        } else if (modalId === 'moveModal') {
            this.moveTargetFolder = null;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Simple error display - in a real app, you'd have a proper notification system
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple success display - in a real app, you'd have a proper notification system
        alert('Success: ' + message);
    }
}

// Initialize the bookmark manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BookmarkManager();
});