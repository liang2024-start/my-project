// 书籍详情页模块
class BookDetail {
    constructor() {
        this.currentUser = null;
        this.bookId = null;
        this.book = null;
        this.relatedBooks = [];
        this.sellerBooks = [];
        
        this.init();
    }

    init() {
        this.parseUrlParams();
        this.checkLoginStatus();
        this.bindEvents();
        this.loadBookData();
        this.loadUnreadCount();
    }

    // 解析URL参数
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.bookId = parseInt(urlParams.get('id'));
        
        if (!this.bookId || isNaN(this.bookId)) {
            this.showError('书籍ID无效');
            return;
        }
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
                this.updateUserDisplay(user);
            }
        }
    }

    // 更新用户显示
    updateUserDisplay(user) {
        const usernameDisplay = document.getElementById('usernameDisplay');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (usernameDisplay) usernameDisplay.textContent = user.username;
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    }

    // 绑定事件
    bindEvents() {
        // 联系卖家按钮
        const contactSellerBtn = document.getElementById('contactSellerBtn');
        if (contactSellerBtn) {
            contactSellerBtn.addEventListener('click', () => this.contactSeller());
        }

        // 收藏按钮
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        }

        // 分享按钮
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.showShareModal());
        }

        // 复制链接按钮
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyShareLink());
        }

        // 编辑书籍按钮
        const editBookBtn = document.getElementById('editBookBtn');
        if (editBookBtn) {
            editBookBtn.addEventListener('click', () => this.editBook());
        }

        // 删除书籍按钮
        const deleteBookBtn = document.getElementById('deleteBookBtn');
        if (deleteBookBtn) {
            deleteBookBtn.addEventListener('click', () => this.deleteBook());
        }

        // 弹窗关闭事件
        this.bindModalEvents();
    }

    // 绑定弹窗事件
    bindModalEvents() {
        const shareModal = document.getElementById('shareModal');
        const shareClose = shareModal ? shareModal.querySelector('.modal-close') : null;
        
        if (shareClose) {
            shareClose.addEventListener('click', () => this.hideShareModal());
        }

        if (shareModal) {
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) {
                    this.hideShareModal();
                }
            });
        }

        // 确认弹窗
        const alertModal = document.getElementById('alertModal');
        const alertConfirm = alertModal ? alertModal.querySelector('.alert-confirm') : null;
        if (alertConfirm) {
            alertConfirm.addEventListener('click', () => this.hideAlert());
        }
    }

    // 加载书籍数据
    loadBookData() {
        // 从localStorage获取书籍数据
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        this.book = books.find(b => b.id === this.bookId);
        
        if (!this.book) {
            this.showError('书籍不存在或已被删除');
            return;
        }

        // 检查书籍状态
        if (this.book.status === 'sold') {
            this.showError('该书籍已售出');
            return;
        }

        // 渲染书籍信息
        this.renderBookDetail();
        
        // 加载相关推荐
        this.loadRelatedRecommendations();
        
        // 加载卖家其他书籍
        this.loadSellerOtherBooks();
        
        // 检查是否已收藏
        this.checkFavoriteStatus();
        
        // 更新浏览量
        this.incrementViews();
    }

    // 渲染书籍详情
    renderBookDetail() {
        // 显示内容区域
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('bookContent').style.display = 'block';

        // 书籍封面
        const coverImg = document.getElementById('bookCover');
        if (this.book.images && this.book.images.length > 0) {
            coverImg.src = this.book.images[0].url;
            coverImg.onerror = () => {
                coverImg.src = 'https://via.placeholder.com/400x500?text=暂无图片';
            };
        } else {
            coverImg.src = 'https://via.placeholder.com/400x500?text=暂无图片';
        }

        // 状态标签
        const conditionBadge = document.getElementById('conditionBadge');
        conditionBadge.textContent = this.getConditionText(this.book.condition);
        conditionBadge.className = 'condition-badge-large ' + this.getConditionClass(this.book.condition);

        // 书籍标题
        document.getElementById('bookTitle').textContent = this.book.title;

        // 价格
        const priceEl = document.getElementById('bookPrice');
        priceEl.textContent = '¥' + this.book.price.toFixed(2);

        // 元数据标签
        const metaTags = document.getElementById('metaTags');
        metaTags.innerHTML = `
            <span class="meta-tag">${this.book.category}</span>
            <span class="meta-tag">${this.book.condition}</span>
            <span class="meta-tag">浏览量：${this.book.views || 0}</span>
        `;

        // 书籍元数据表格
        const metaTable = document.getElementById('bookMetaTable');
        const authors = Array.isArray(this.book.authors) ? this.book.authors.join(', ') : this.book.authors;
        metaTable.innerHTML = `
            <div class="meta-row">
                <span class="meta-label">作者</span>
                <span class="meta-value">${this.escapeHtml(authors)}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">出版社</span>
                <span class="meta-value">${this.escapeHtml(this.book.publisher)}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">ISBN</span>
                <span class="meta-value">${this.book.isbn}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">分类</span>
                <span class="meta-value">${this.book.category}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">新旧程度</span>
                <span class="meta-value">${this.book.condition}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">发布时间</span>
                <span class="meta-value">${this.formatDate(this.book.createdAt)}</span>
            </div>
        `;

        // 卖家信息
        this.renderSellerInfo();

        // 书籍描述
        const descriptionEl = document.getElementById('descriptionContent');
        descriptionEl.textContent = this.book.description || '暂无详细描述';

        // 交易方式
        const transactionEl = document.getElementById('transactionMethods');
        if (this.book.transactionMethods && this.book.transactionMethods.length > 0) {
            transactionEl.innerHTML = this.book.transactionMethods.map(method => `
                <div class="transaction-method">
                    <span class="method-icon">${this.getTransactionIcon(method)}</span>
                    <span>${method}</span>
                </div>
            `).join('');
        } else {
            transactionEl.innerHTML = '<p style="color: #999; margin: 0;">暂未设置交易方式</p>';
        }

        // 更新页面标题
        document.title = `${this.book.title} - 校园二手书交易平台`;

        // 检查是否是卖家本人
        this.checkSellerOwner();
    }

    // 渲染卖家信息
    renderSellerInfo() {
        const sellerAvatar = document.getElementById('sellerAvatar');
        const sellerName = document.getElementById('sellerName');
        const sellerVerified = document.getElementById('sellerVerified');
        const sellerBio = document.getElementById('sellerBio');
        const sellerStats = document.getElementById('sellerStats');

        // 头像
        sellerAvatar.src = `https://via.placeholder.com/56x56?text=${this.book.sellerName.charAt(0)}`;
        sellerAvatar.onerror = () => {
            sellerAvatar.src = 'https://via.placeholder.com/56x56?text=头';
        };

        // 名称和认证
        sellerName.textContent = this.book.sellerName;
        if (this.book.sellerVerified) {
            sellerVerified.textContent = '✓';
            sellerVerified.title = '已认证用户';
            sellerVerified.style.display = 'inline-flex';
        } else {
            sellerVerified.style.display = 'none';
        }

        // 个人简介
        sellerBio.textContent = '校园二手书交易平台用户';

        // 统计数据
        sellerStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${this.book.views || 0}</span>
                <span class="stat-label">浏览量</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${this.book.favorites || 0}</span>
                <span class="stat-label">收藏数</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${this.formatDate(this.book.createdAt)}</span>
                <span class="stat-label">发布于</span>
            </div>
        `;
    }

    // 检查是否是卖家本人
    checkSellerOwner() {
        const contactActions = document.getElementById('contactActions');
        const editActions = document.getElementById('editActions');
        
        if (this.currentUser && this.currentUser.id === this.book.sellerId) {
            // 是卖家本人
            if (contactActions) contactActions.style.display = 'none';
            if (editActions) editActions.style.display = 'flex';
        } else {
            // 不是卖家本人
            if (contactActions) contactActions.style.display = 'block';
            if (editActions) editActions.style.display = 'none';
        }
    }

    // 联系卖家
    contactSeller() {
        if (!this.currentUser) {
            this.showAlert('请先登录后再联系卖家！', () => {
                window.location.href = 'index.html';
            });
            return;
        }

        if (this.currentUser.id === this.book.sellerId) {
            this.showAlert('这是您自己发布的书籍，无法与自己沟通！');
            return;
        }

        // 跳转到消息页面
        window.location.href = `messages.html?bookId=${this.book.id}&sellerId=${this.book.sellerId}`;
    }

    // 收藏功能
    toggleFavorite() {
        if (!this.currentUser) {
            this.showAlert('请先登录后再收藏书籍！', () => {
                window.location.href = 'index.html';
            });
            return;
        }

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const index = favorites.indexOf(this.bookId);
        const favoriteBtn = document.getElementById('favoriteBtn');
        const btnText = favoriteBtn ? favoriteBtn.querySelector('.btn-text') : null;
        const btnIcon = favoriteBtn ? favoriteBtn.querySelector('.btn-icon') : null;

        if (index === -1) {
            // 添加收藏
            favorites.push(this.bookId);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            
            if (favoriteBtn) favoriteBtn.classList.add('active');
            if (btnText) btnText.textContent = '已收藏';
            if (btnIcon) btnIcon.textContent = '♥';
            
            // 更新书籍收藏数
            this.updateBookFavoriteCount(1);
            
            this.showAlert('收藏成功！');
        } else {
            // 取消收藏
            favorites.splice(index, 1);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            
            if (favoriteBtn) favoriteBtn.classList.remove('active');
            if (btnText) btnText.textContent = '收藏';
            if (btnIcon) btnIcon.textContent = '♡';
            
            // 更新书籍收藏数
            this.updateBookFavoriteCount(-1);
            
            this.showAlert('已取消收藏');
        }
    }

    // 检查收藏状态
    checkFavoriteStatus() {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const favoriteBtn = document.getElementById('favoriteBtn');
        const btnText = favoriteBtn ? favoriteBtn.querySelector('.btn-text') : null;
        const btnIcon = favoriteBtn ? favoriteBtn.querySelector('.btn-icon') : null;

        if (favorites.includes(this.bookId)) {
            if (favoriteBtn) favoriteBtn.classList.add('active');
            if (btnText) btnText.textContent = '已收藏';
            if (btnIcon) btnIcon.textContent = '♥';
        }
    }

    // 更新书籍收藏数
    updateBookFavoriteCount(delta) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const bookIndex = books.findIndex(b => b.id === this.bookId);
        
        if (bookIndex !== -1) {
            books[bookIndex].favorites = (books[bookIndex].favorites || 0) + delta;
            localStorage.setItem('books', JSON.stringify(books));
            this.book.favorites = books[bookIndex].favorites;
            
            // 更新显示
            const sellerStats = document.getElementById('sellerStats');
            if (sellerStats) {
                sellerStats.innerHTML = `
                    <div class="stat-item">
                        <span class="stat-value">${this.book.views || 0}</span>
                        <span class="stat-label">浏览量</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.book.favorites || 0}</span>
                        <span class="stat-label">收藏数</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.formatDate(this.book.createdAt)}</span>
                        <span class="stat-label">发布于</span>
                    </div>
                `;
            }
        }
    }

    // 显示分享弹窗
    showShareModal() {
        const modal = document.getElementById('shareModal');
        const shareLink = document.getElementById('shareLink');
        
        if (modal && shareLink) {
            const url = window.location.href;
            shareLink.value = url;
            modal.style.display = 'flex';
        }
    }

    // 隐藏分享弹窗
    hideShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 复制分享链接
    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.select();
            document.execCommand('copy');
            this.showAlert('链接已复制到剪贴板！');
        }
    }

    // 编辑书籍
    editBook() {
        window.location.href = `book-publish.html?edit=${this.bookId}`;
    }

    // 删除书籍
    deleteBook() {
        if (confirm('确定要删除这本书吗？此操作不可恢复。')) {
            const books = JSON.parse(localStorage.getItem('books') || '[]');
            const bookIndex = books.findIndex(b => b.id === this.bookId);
            
            if (bookIndex !== -1) {
                books.splice(bookIndex, 1);
                localStorage.setItem('books', JSON.stringify(books));
                
                this.showAlert('书籍已删除', () => {
                    window.location.href = 'book-list.html';
                });
            }
        }
    }

    // 加载相关推荐
    loadRelatedRecommendations() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        
        // 过滤同类别但不同ID的书籍
        this.relatedBooks = books.filter(b => 
            b.id !== this.bookId && 
            b.category === this.book.category &&
            b.status === 'active'
        ).slice(0, 4);

        this.renderRelatedRecommendations();
    }

    // 渲染相关推荐
    renderRelatedRecommendations() {
        const grid = document.getElementById('recommendationGrid');
        const section = document.getElementById('recommendationsSection');
        
        if (!grid) return;

        if (this.relatedBooks.length === 0) {
            grid.innerHTML = `
                <div class="no-recommendations">
                    <div class="icon">📚</div>
                    <p>暂无相关推荐</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.relatedBooks.map(book => `
            <div class="recommend-book-card" onclick="window.location.href='book-detail.html?id=${book.id}'">
                <img src="${book.images && book.images[0] ? book.images[0].url : 'https://via.placeholder.com/180x140?text=暂无图片'}" 
                     alt="${book.title}" class="recommend-cover"
                     onerror="this.src='https://via.placeholder.com/180x140?text=暂无图片'">
                <div class="recommend-info">
                    <h4 class="recommend-title">${this.truncateText(book.title, 20)}</h4>
                    <p class="recommend-price">¥${book.price.toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    }

    // 加载卖家其他书籍
    loadSellerOtherBooks() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        
        // 过滤同卖家但不同ID的书籍
        this.sellerBooks = books.filter(b => 
            b.id !== this.bookId && 
            b.sellerId === this.book.sellerId &&
            b.status === 'active'
        ).slice(0, 4);

        this.renderSellerOtherBooks();
    }

    // 渲染卖家其他书籍
    renderSellerOtherBooks() {
        const grid = document.getElementById('sellerBooksGrid');
        const section = document.getElementById('moreFromSeller');
        
        if (!grid) return;

        if (this.sellerBooks.length === 0) {
            section.style.display = 'none';
            return;
        }

        grid.innerHTML = this.sellerBooks.map(book => `
            <div class="recommend-book-card" onclick="window.location.href='book-detail.html?id=${book.id}'">
                <img src="${book.images && book.images[0] ? book.images[0].url : 'https://via.placeholder.com/180x140?text=暂无图片'}" 
                     alt="${book.title}" class="recommend-cover"
                     onerror="this.src='https://via.placeholder.com/180x140?text=暂无图片'">
                <div class="recommend-info">
                    <h4 class="recommend-title">${this.truncateText(book.title, 20)}</h4>
                    <p class="recommend-price">¥${book.price.toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    }

    // 更新浏览量
    incrementViews() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const bookIndex = books.findIndex(b => b.id === this.bookId);
        
        if (bookIndex !== -1) {
            books[bookIndex].views = (books[bookIndex].views || 0) + 1;
            localStorage.setItem('books', JSON.stringify(books));
            
            // 调用统计管理器记录浏览量
            if (typeof recordBookView === 'function') {
                recordBookView(this.bookId);
            }
        }
    }

    // 加载未读消息数
    loadUnreadCount() {
        const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
        const loginStatus = localStorage.getItem('loginStatus') || sessionStorage.getItem('loginStatus');
        
        if (!loginStatus) return;
        
        const userId = JSON.parse(loginStatus).userId;
        let total = 0;
        
        conversations.forEach(c => {
            if ((c.buyerId === userId || c.sellerId === userId) && c.unreadCount > 0) {
                total += c.unreadCount;
            }
        });
        
        const badge = document.getElementById('headerUnreadBadge');
        if (badge) {
            if (total > 0) {
                badge.textContent = total > 99 ? '99+' : total;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // 显示错误
    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('bookContent').style.display = 'none';
        
        const errorState = document.getElementById('errorState');
        const h2 = errorState.querySelector('h2');
        const p = errorState.querySelector('p');
        
        if (h2) h2.textContent = message;
        if (p) p.textContent = '您可以返回书籍列表浏览其他书籍';
    }

    // 显示提醒弹窗
    showAlert(message, callback) {
        const modal = document.getElementById('alertModal');
        const messageEl = document.getElementById('alertMessage');
        
        if (modal && messageEl) {
            messageEl.textContent = message;
            modal.style.display = 'flex';
            
            const confirmBtn = modal.querySelector('.alert-confirm');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    this.hideAlert();
                    if (callback) callback();
                };
            }
        }
    }

    // 隐藏提醒弹窗
    hideAlert() {
        const modal = document.getElementById('alertModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 辅助方法：获取状态文本
    getConditionText(condition) {
        const conditionMap = {
            '全新': '全新',
            '几乎全新': '99新',
            '轻微使用痕迹': '95新',
            '有明显使用痕迹': '8成新',
            '旧书': '5成新'
        };
        return conditionMap[condition] || condition;
    }

    // 辅助方法：获取状态样式类
    getConditionClass(condition) {
        const classMap = {
            '全新': 'condition-new',
            '几乎全新': 'condition-like-new',
            '轻微使用痕迹': 'condition-good',
            '有明显使用痕迹': 'condition-fair',
            '旧书': 'condition-poor'
        };
        return classMap[condition] || '';
    }

    // 辅助方法：获取交易方式图标
    getTransactionIcon(method) {
        const iconMap = {
            '当面交易': '🤝',
            '校内配送': '🚗',
            '邮寄': '📦'
        };
        return iconMap[method] || '📍';
    }

    // 辅助方法：格式化日期
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) {
            return '今天';
        } else if (diff < 172800000) {
            return '昨天';
        } else if (diff < 604800000) {
            return Math.floor(diff / 86400000) + '天前';
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    }

    // 辅助方法：截断文本
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // 辅助方法：HTML转义
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化书籍详情页
document.addEventListener('DOMContentLoaded', () => {
    window.bookDetail = new BookDetail();
});
