// 搜索与发现模块
class SearchDiscovery {
    constructor() {
        this.currentUser = null;
        this.allBooks = [];
        this.filteredBooks = [];
        this.currentPage = 1;
        this.booksPerPage = 12;
        this.dataReady = false;
        this.init();
    }

    init() {
        this.checkLoginStatus();
        this.bindEvents();
        this.loadBooks();
        this.renderBooks();
    }

    // 检查登录状态
    checkLoginStatus() {
        const loginStatus = localStorage.getItem('loginStatus') || sessionStorage.getItem('loginStatus');
        
        if (loginStatus) {
            const data = JSON.parse(loginStatus);
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.id === data.userId);
            
            if (user) {
                this.currentUser = user;
                const usernameDisplay = document.getElementById('usernameDisplay');
                const loginBtn = document.getElementById('loginBtn');
                const registerBtn = document.getElementById('registerBtn');
                const logoutBtn = document.getElementById('logoutBtn');
                
                if (usernameDisplay) usernameDisplay.textContent = user.username;
                if (loginBtn) loginBtn.style.display = 'none';
                if (registerBtn) registerBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'inline-block';
            } else {
                // 用户不存在，跳转到登录页
                window.location.href = 'index.html';
            }
        } else {
            // 未登录，跳转到登录页
            window.location.href = 'index.html';
        }
    }

    // 加载书籍数据
    loadBooks() {
        // 首先尝试从localStorage获取数据
        const storedBooks = localStorage.getItem('books');
        
        if (storedBooks && JSON.parse(storedBooks).length > 0) {
            this.allBooks = JSON.parse(storedBooks);
            this.dataReady = true;
            this.filteredBooks = this.allBooks.filter(book => book.status !== 'sold');
        } else {
            // 如果localStorage中没有数据，尝试从bookData变量获取
            if (typeof bookData !== 'undefined') {
                this.allBooks = bookData;
                this.dataReady = true;
                this.filteredBooks = this.allBooks.filter(book => book.status !== 'sold');
                
                // 将数据保存到localStorage以备后用
                localStorage.setItem('books', JSON.stringify(bookData));
                console.log('已从bookData变量加载书籍数据');
            } else {
                // 如果两者都没有数据，等待bookDataInitialized事件
                console.log('等待书籍数据初始化...');
                const handleDataInitialized = (event) => {
                    this.allBooks = event.detail.books || JSON.parse(localStorage.getItem('books') || '[]');
                    this.dataReady = true;
                    this.filteredBooks = this.allBooks.filter(book => book.status !== 'sold');
                    this.renderBooks();
                    document.removeEventListener('bookDataInitialized', handleDataInitialized);
                };
                
                document.addEventListener('bookDataInitialized', handleDataInitialized);
                
                // 设置一个超时，确保即使事件不触发也能显示一些内容
                setTimeout(() => {
                    if (!this.dataReady) {
                        console.warn('数据初始化超时，尝试重新加载');
                        this.loadBooks();
                    }
                }, 2000);
            }
        }
    }

    // 绑定事件
    bindEvents() {
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }
        
        // 筛选功能
        const categoryFilter = document.getElementById('categoryFilter');
        const conditionFilter = document.getElementById('conditionFilter');
        const priceFilter = document.getElementById('priceFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (categoryFilter) categoryFilter.addEventListener('change', () => {
            this.applyFilters();
        });
        
        if (conditionFilter) conditionFilter.addEventListener('change', () => {
            this.applyFilters();
        });
        
        if (priceFilter) priceFilter.addEventListener('change', () => {
            this.applyFilters();
        });
        
        if (sortFilter) sortFilter.addEventListener('change', () => {
            this.applyFilters();
        });
    }

    // 执行搜索
    performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm) {
            this.filteredBooks = this.allBooks.filter(book => {
                return book.status !== 'sold' && (
                    book.title.toLowerCase().includes(searchTerm) ||
                    book.authors.some(author => author.toLowerCase().includes(searchTerm)) ||
                    book.isbn.includes(searchTerm) ||
                    book.publisher.toLowerCase().includes(searchTerm) ||
                    book.description.toLowerCase().includes(searchTerm)
                );
            });
        } else {
            this.filteredBooks = this.allBooks.filter(book => book.status !== 'sold');
        }
        
        this.currentPage = 1;
        this.renderBooks();
    }

    // 应用筛选
    applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const conditionFilter = document.getElementById('conditionFilter');
        const priceFilter = document.getElementById('priceFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (!searchInput || !categoryFilter || !conditionFilter || !priceFilter || !sortFilter) return;
        
        const searchTerm = searchInput.value.trim().toLowerCase();
        const category = categoryFilter.value;
        const condition = conditionFilter.value;
        const priceRange = priceFilter.value;
        const sortBy = sortFilter.value;
        
        let filtered = this.allBooks.filter(book => book.status !== 'sold');
        
        // 搜索词筛选
        if (searchTerm) {
            filtered = filtered.filter(book => {
                return book.title.toLowerCase().includes(searchTerm) ||
                       book.authors.some(author => author.toLowerCase().includes(searchTerm)) ||
                       book.isbn.includes(searchTerm) ||
                       book.publisher.toLowerCase().includes(searchTerm) ||
                       book.description.toLowerCase().includes(searchTerm);
            });
        }
        
        // 分类筛选
        if (category) {
            filtered = filtered.filter(book => book.category === category);
        }
        
        // 新旧程度筛选
        if (condition) {
            filtered = filtered.filter(book => book.condition === condition);
        }
        
        // 价格范围筛选
        if (priceRange) {
            const [min, max] = this.getPriceRange(priceRange);
            filtered = filtered.filter(book => book.price >= min && (max ? book.price <= max : true));
        }
        
        // 排序
        filtered = this.sortBooks(filtered, sortBy);
        
        this.filteredBooks = filtered;
        this.currentPage = 1;
        this.renderBooks();
    }

    // 获取价格范围
    getPriceRange(range) {
        switch(range) {
            case '0-20': return [0, 20];
            case '20-50': return [20, 50];
            case '50-100': return [50, 100];
            case '100+': return [100, Infinity];
            default: return [0, Infinity];
        }
    }

    // 排序书籍
    sortBooks(books, sortBy) {
        switch(sortBy) {
            case 'latest':
                return books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'price-asc':
                return books.sort((a, b) => a.price - b.price);
            case 'price-desc':
                return books.sort((a, b) => b.price - a.price);
            case 'views':
                return books.sort((a, b) => b.views - a.views);
            default:
                return books;
        }
    }

    // 渲染书籍列表
    renderBooks() {
        const startIndex = (this.currentPage - 1) * this.booksPerPage;
        const endIndex = startIndex + this.booksPerPage;
        const pageBooks = this.filteredBooks.slice(startIndex, endIndex);
        
        const bookList = document.getElementById('bookList');
        if (!bookList) return;
        
        bookList.innerHTML = '';
        
        if (pageBooks.length === 0) {
            bookList.innerHTML = '<p class="no-books">没有找到符合条件的书籍</p>';
            const pagination = document.getElementById('pagination');
            if (pagination) pagination.innerHTML = '';
            return;
        }
        
        pageBooks.forEach(book => {
            const bookCard = this.createBookCard(book);
            bookList.appendChild(bookCard);
        });
        
        this.renderPagination();
    }

    // 创建书籍卡片
    createBookCard(book) {
        const div = document.createElement('div');
        div.className = 'book-card';
        div.innerHTML = `
            <img src="${book.images[0] ? book.images[0].url : 'https://via.placeholder.com/280x200?text=暂无图片'}" 
                 alt="${book.title}" class="book-cover" onerror="this.src='https://via.placeholder.com/280x200?text=暂无图片'">
            <div class="book-info">
                <h3 class="book-title" title="${book.title}">${this.truncateText(book.title, 25)}</h3>
                <p class="book-author">作者：${book.authors.slice(0, 2).join(', ')}</p>
                <div class="book-details">
                    <span class="book-price">¥${book.price.toFixed(2)}</span>
                    <span class="book-condition">${book.condition}</span>
                </div>
                <div class="book-seller">
                    <img src="https://via.placeholder.com/24x24?text=头像" alt="卖家头像">
                    ${book.sellerName}${book.sellerVerified ? ' <span class="verified-badge">✓</span>' : ''}
                </div>
                <div class="book-actions">
                    <button class="btn btn-primary view-btn" data-book-id="${book.id}">查看详情</button>
                    <button class="btn btn-secondary favorite-btn" data-book-id="${book.id}">
                        <span class="heart">♡</span> 收藏
                    </button>
                    <button class="btn btn-success contact-seller-btn" data-book-id="${book.id}" data-seller-id="${book.sellerId}">
                        <span class="contact-icon">💬</span> 联系卖家
                    </button>
                </div>
            </div>
        `;
        
        // 绑定事件
        const viewBtn = div.querySelector('.view-btn');
        const favoriteBtn = div.querySelector('.favorite-btn');
        const contactBtn = div.querySelector('.contact-seller-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                this.viewBookDetails(book.id);
            });
        }
        
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(book.id);
            });
        }
        
        if (contactBtn) {
            contactBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.contactSeller(book.id, book.sellerId);
            });
        }
        
        return div;
    }

    // 截断文本
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // 联系卖家
    contactSeller(bookId, sellerId) {
        // 检查登录状态
        const loginStatus = localStorage.getItem('loginStatus') || sessionStorage.getItem('loginStatus');
        if (!loginStatus) {
            alert('请先登录后再联系卖家！');
            window.location.href = 'index.html';
            return;
        }

        const currentUserId = JSON.parse(loginStatus).userId;

        // 检查是否是自己的书籍
        if (currentUserId === sellerId) {
            alert('这是您自己发布的书籍，无法与自己沟通！');
            return;
        }

        // 跳转到消息页面
        window.location.href = `messages.html?bookId=${bookId}&sellerId=${sellerId}`;
    }

    // 查看书籍详情
    viewBookDetails(bookId) {
        // 更新浏览量
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const bookIndex = books.findIndex(b => b.id == bookId);
        if (bookIndex !== -1) {
            books[bookIndex].views = (books[bookIndex].views || 0) + 1;
            localStorage.setItem('books', JSON.stringify(books));
        }
        
        // 跳转到详情页（这里暂时跳转到列表页，实际项目中应有详情页）
        window.location.href = `book-detail.html?id=${bookId}`;
    }

    // 切换收藏
    toggleFavorite(bookId) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const book = books.find(b => b.id == bookId);
        
        if (book) {
            book.favorites = (book.favorites || 0) + 1;
            localStorage.setItem('books', JSON.stringify(books));
            
            // 更新UI
            const btn = document.querySelector(`.favorite-btn[data-book-id="${bookId}"]`);
            if (btn) {
                btn.innerHTML = '<span class="heart">♥</span> 已收藏';
                btn.disabled = true;
                btn.style.backgroundColor = '#bdc3c7';
            }
            
            this.showMessage('已收藏！', 'success');
        }
    }

    // 渲染分页
    renderPagination() {
        const totalPages = Math.ceil(this.filteredBooks.length / this.booksPerPage);
        
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        pagination.innerHTML = '';
        
        // 上一页
        if (this.currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'pagination-btn';
            prevBtn.textContent = '上一页';
            prevBtn.addEventListener('click', () => {
                this.currentPage--;
                this.renderBooks();
            });
            pagination.appendChild(prevBtn);
        }
        
        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.renderBooks();
            });
            pagination.appendChild(pageBtn);
        }
        
        // 下一页
        if (this.currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'pagination-btn';
            nextBtn.textContent = '下一页';
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderBooks();
            });
            pagination.appendChild(nextBtn);
        }
        
        // 显示当前页信息
        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页 (${this.filteredBooks.length} 本)`;
        pagination.appendChild(info);
    }

    // 显示消息
    showMessage(message, type) {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// 初始化搜索与发现模块
document.addEventListener('DOMContentLoaded', () => {
    new SearchDiscovery();
});