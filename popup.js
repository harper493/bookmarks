class BookmarkManager {
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

        // Modal controls
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('openBookmark').addEventListener('click', () => this.openBookmark());
        document.getElementById('deleteBookmark').addEventListener('click', () => this.deleteBookmark());
        document.getElementById('moveBookmark').addEventListener('click', () => this.showMoveModal());

        // Move functionality
        document.getElementById('confirmMove').addEventListener('click', () => this.confirmMove());
        document.getElementById('cancelMove').addEventListener('click', () => this.hideMoveModal());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('previewModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
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

        return bookmarkDiv;
    }

    async showBookmarkPreview(bookmark) {
        this.currentBookmark = bookmark;
        const modal = document.getElementById('previewModal');
        const title = document.getElementById('previewTitle');
        const thumbnail = document.getElementById('previewThumbnail');

        title.textContent = bookmark.title;
        
        // Show loading state
        thumbnail.innerHTML = '<div class="loading">Loading thumbnail...</div>';
        modal.style.display = 'block';

        // Generate thumbnail using a service
        try {
            const thumbnailUrl = await this.generateThumbnail(bookmark.url);
            thumbnail.innerHTML = `<img src="${thumbnailUrl}" alt="Page thumbnail" onerror="this.parentElement.innerHTML='<div class=\\"loading\\">Thumbnail not available</div>'">`;
        } catch (error) {
            thumbnail.innerHTML = '<div class="loading">Thumbnail not available</div>';
        }

        // Populate folder select for move functionality
        this.populateFolderSelect();
    }

    async generateThumbnail(url) {
        // Using a free thumbnail service
        const encodedUrl = encodeURIComponent(url);
        return `https://api.thumbnail.ws/api/86b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8/thumbnail/get?url=${encodedUrl}&width=400&height=200`;
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
        document.getElementById('previewModal').style.display = 'none';
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
        // Simple error display - in a real app you might want a more sophisticated notification system
        alert(message);
    }
}

// Initialize the bookmark manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BookmarkManager();
});