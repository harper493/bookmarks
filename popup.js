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

    async deleteBrokenLinks() {
        if (!this.currentBookmark) {
            this.showError('Please select a bookmark first');
            return;
        }

        const confirmed = confirm('This will delete ALL broken bookmarks. Are you sure?');
        if (!confirmed) return;

        try {
            // Get all bookmarks
            const bookmarks = await chrome.bookmarks.getTree();
            const allBookmarks = this.flattenBookmarks(bookmarks);
            
            // Filter out folders (bookmarks without URLs)
            const urlBookmarks = allBookmarks.filter(bookmark => bookmark.url);
            
            console.log(`Checking ${urlBookmarks.length} bookmarks for broken links...`);
            
            const brokenBookmarks = [];
            
            // Check each bookmark URL
            for (const bookmark of urlBookmarks) {
                try {
                    const isBroken = await this.checkIfUrlIsBroken(bookmark.url);
                    if (isBroken) {
                        brokenBookmarks.push(bookmark);
                        console.log(`Broken link found: ${bookmark.title} - ${bookmark.url}`);
                    }
                } catch (error) {
                    console.log(`Error checking ${bookmark.url}:`, error);
                    // Consider it broken if we can't check it
                    brokenBookmarks.push(bookmark);
                }
            }
            
            if (brokenBookmarks.length === 0) {
                alert('No broken links found!');
                return;
            }
            
            const deleteConfirmed = confirm(`Found ${brokenBookmarks.length} broken links. Delete them all?`);
            if (!deleteConfirmed) return;
            
            // Delete all broken bookmarks
            for (const bookmark of brokenBookmarks) {
                try {
                    await chrome.bookmarks.remove(bookmark.id);
                    console.log(`Deleted broken bookmark: ${bookmark.title}`);
                } catch (error) {
                    console.error(`Error deleting bookmark ${bookmark.title}:`, error);
                }
            }
            
            alert(`Successfully deleted ${brokenBookmarks.length} broken bookmarks!`);
            
            // Refresh the bookmark list
            this.loadBookmarks();
            
        } catch (error) {
            console.error('Error deleting broken links:', error);
            this.showError('Error deleting broken links: ' + error.message);
        }
    }

    async checkIfUrlIsBroken(url) {
        try {
            // Use a CORS proxy or try to fetch the URL
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                return true; // Consider broken if proxy fails
            }
            
            const data = await response.json();
            
            // Check if the response indicates a broken link
            if (data.status && data.status.http_code >= 400) {
                return true;
            }
            
            // If we get here, the link is probably working
            return false;
            
        } catch (error) {
            // If we can't check it, consider it broken
            return true;
        }
    }

    async checkAndMarkBrokenLink(bookmark, bookmarkDiv) {
        if (!bookmark.url) return; // Skip folders
        
        try {
            const isBroken = await this.checkIfUrlIsBroken(bookmark.url);
            if (isBroken) {
                bookmarkDiv.classList.add('broken');
                console.log(`Marked as broken: ${bookmark.title} - ${bookmark.url}`);
            }
        } catch (error) {
            console.log(`Error checking ${bookmark.url}:`, error);
            // Mark as broken if we can't check it
            bookmarkDiv.classList.add('broken');
        }
    }
}

// Initialize the bookmark manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChromeBookmarkManager();
});