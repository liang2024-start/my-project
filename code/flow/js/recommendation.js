/**
 * 首页推荐模块
 * 提供热门书籍和畅销书籍排行榜展示功能
 */

(function() {
    'use strict';

    // 推荐模块配置
    const CONFIG = {
        hotBooksLimit: 6,      // 热门书籍显示数量
        bestSellerLimit: 6,    // 畅销书籍显示数量
        recentDays: 7,         // 统计最近7天数据
        rankChangeHistoryKey: 'book_rank_history'  // 排名变化历史存储键
    };

    // DOM元素引用
    let hotBooksContainer;
    let bestSellerContainer;

    /**
     * 初始化推荐模块
     */
    function init() {
        // 获取容器元素
        hotBooksContainer = document.getElementById('hotBooksList');
        bestSellerContainer = document.getElementById('bestSellerList');

        if (!hotBooksContainer || !bestSellerContainer) {
            console.warn('推荐模块容器元素未找到');
            return;
        }

        // 显示加载状态
        showLoading();

        // 等待书籍数据初始化完成
        document.addEventListener('bookDataInitialized', handleBookDataInitialized);
        
        // 如果数据已经准备好了，直接加载
        if (localStorage.getItem('books')) {
            loadRecommendations();
        }
    }

    /**
     * 处理书籍数据初始化完成事件
     */
    function handleBookDataInitialized() {
        loadRecommendations();
    }

    /**
     * 显示加载状态
     */
    function showLoading() {
        const loadingHTML = `
            <div class="recommendation-loading">
                <div class="loading-spinner"></div>
                <p>正在加载推荐书籍...</p>
            </div>
        `;
        hotBooksContainer.innerHTML = loadingHTML;
        bestSellerContainer.innerHTML = loadingHTML;
    }

    /**
     * 显示空状态
     */
    function showEmpty(message = '暂无推荐书籍') {
        return `
            <div class="recommendation-empty">
                <div class="empty-icon">📚</div>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * 加载推荐书籍数据
     */
    function loadRecommendations() {
        try {
            // 初始化模拟数据（如果有需要）
            if (typeof BookStatsManager !== 'undefined') {
                const books = JSON.parse(localStorage.getItem('books') || '[]');
                const firstBook = books[0];
                if (firstBook) {
                    const stats = BookStatsManager.getBookStats(firstBook.id);
                    if (!stats.dailyViews || Object.keys(stats.dailyViews).length === 0) {
                        // 数据不存在，初始化模拟数据
                        BookStatsManager.initMockData();
                        console.log('已初始化书籍统计数据');
                    }
                }
            }

            // 获取热门书籍
            const hotBooks = getHotBooks(CONFIG.hotBooksLimit, CONFIG.recentDays);
            renderHotBooks(hotBooks);

            // 获取畅销书籍
            const bestSellers = getBestSellerBooks(CONFIG.bestSellerLimit, CONFIG.recentDays);
            renderBestSellers(bestSellers);

            // 更新统计信息
            updateStatsNotice();

        } catch (error) {
            console.error('加载推荐书籍失败:', error);
            showError();
        }
    }

    /**
     * 获取热门书籍（兼容旧版函数名）
     */
    function getHotBooks(limit, days) {
        if (typeof BookStatsManager !== 'undefined') {
            return BookStatsManager.getHotBooks(limit, days);
        }
        return [];
    }

    /**
     * 获取畅销书籍（兼容旧版函数名）
     */
    function getBestSellerBooks(limit, days) {
        if (typeof BookStatsManager !== 'undefined') {
            return BookStatsManager.getBestSellerBooks(limit, days);
        }
        return [];
    }

    /**
     * 渲染热门书籍列表
     */
    function renderHotBooks(books) {
        if (!hotBooksContainer) return;

        if (books.length === 0) {
            hotBooksContainer.innerHTML = showEmpty('暂无热门书籍');
            return;
        }

        // 获取之前的排名信息
        const previousRanks = getPreviousRanks('hot');

        hotBooksContainer.innerHTML = books.map((book, index) => {
            const rank = index + 1;
            const previousRank = previousRanks[book.id];
            const rankChange = previousRank ? previousRank - rank : null;

            return createBookRankItem(book, rank, rankChange, 'hot');
        }).join('');

        // 保存当前排名
        saveCurrentRanks(books, 'hot');
    }

    /**
     * 渲染畅销书籍列表
     */
    function renderBestSellers(books) {
        if (!bestSellerContainer) return;

        if (books.length === 0) {
            bestSellerContainer.innerHTML = showEmpty('暂无畅销书籍');
            return;
        }

        // 获取之前的排名信息
        const previousRanks = getPreviousRanks('bestseller');

        bestSellerContainer.innerHTML = books.map((book, index) => {
            const rank = index + 1;
            const previousRank = previousRanks[book.id];
            const rankChange = previousRank ? previousRank - rank : null;

            return createBookRankItem(book, rank, rankChange, 'bestseller');
        }).join('');

        // 保存当前排名
        saveCurrentRanks(books, 'bestseller');
    }

    /**
     * 创建书籍排名卡片HTML
     */
    function createBookRankItem(book, rank, rankChange, type) {
        // 获取书籍封面
        const coverUrl = book.images && book.images[0] 
            ? (book.images[0].url || book.images[0]) 
            : 'https://via.placeholder.com/60x80?text=书籍';

        // 获取书籍分类
        const category = book.category || '通用';

        // 计算排名变化显示
        let rankChangeHTML = '';
        if (rankChange !== null) {
            if (rankChange > 0) {
                rankChangeHTML = `<span class="rank-change up">↑${rankChange}</span>`;
            } else if (rankChange < 0) {
                rankChangeHTML = `<span class="rank-change down">↓${Math.abs(rankChange)}</span>`;
            } else {
                rankChangeHTML = `<span class="rank-change same">-</span>`;
            }
        }

        // 排名徽章类名
        let rankClass = 'normal';
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';

        // 统计类型
        const statType = type === 'hot' ? '浏览' : '成交';
        const statCount = type === 'hot' ? book.recentViews : book.recentSales;

        return `
            <div class="book-rank-item" onclick="viewBookDetail(${book.id})" data-book-id="${book.id}">
                <div class="rank-number ${rankClass}">${rank}</div>
                <div class="book-cover-wrapper">
                    <img src="${coverUrl}" alt="${book.title}" class="book-cover-small" onerror="this.src='https://via.placeholder.com/60x80?text=书籍'">
                    ${rankChangeHTML}
                </div>
                <div class="book-info-wrapper">
                    <h4 class="book-title-small">${book.title}</h4>
                    <p class="book-meta-small">${book.authors ? book.authors.join(', ') : '未知作者'} · ${category}</p>
                    <p class="book-price-small">
                        ¥${book.price ? book.price.toFixed(2) : '0.00'}
                        <span class="stat-badge">${statType}: ${statCount || 0}</span>
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * 获取之前的排名
     */
    function getPreviousRanks(type) {
        try {
            const history = JSON.parse(localStorage.getItem(CONFIG.rankChangeHistoryKey) || '{}');
            const today = new Date().toISOString().split('T')[0];
            return history[today]?.[type] || {};
        } catch (e) {
            return {};
        }
    }

    /**
     * 保存当前排名
     */
    function saveCurrentRanks(books, type) {
        try {
            const history = JSON.parse(localStorage.getItem(CONFIG.rankChangeHistoryKey) || '{}');
            const today = new Date().toISOString().split('T')[0];

            if (!history[today]) {
                history[today] = {};
            }

            // 只保留今天之前的数据（避免同一天多次刷新导致排名变化）
            if (!history[today][type]) {
                history[today][type] = {};
                books.forEach((book, index) => {
                    history[today][type][book.id] = index + 1;
                });

                // 清理7天前的历史数据
                const dates = Object.keys(history);
                dates.forEach(date => {
                    const diff = (new Date(today) - new Date(date)) / (1000 * 60 * 60 * 24);
                    if (diff > 7) {
                        delete history[date];
                    }
                });

                localStorage.setItem(CONFIG.rankChangeHistoryKey, JSON.stringify(history));
            }
        } catch (e) {
            console.warn('保存排名历史失败:', e);
        }
    }

    /**
     * 更新统计信息提示
     */
    function updateStatsNotice() {
        const noticeElements = document.querySelectorAll('.stats-notice');
        if (noticeElements.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const days = CONFIG.recentDays;
            noticeElements.forEach(el => {
                el.textContent = `统计时间：最近${days}天（截至 ${today}）`;
            });
        }
    }

    /**
     * 显示错误状态
     */
    function showError() {
        const errorHTML = `
            <div class="recommendation-empty">
                <div class="empty-icon">⚠️</div>
                <p>加载失败，请刷新页面重试</p>
            </div>
        `;
        if (hotBooksContainer) hotBooksContainer.innerHTML = errorHTML;
        if (bestSellerContainer) bestSellerContainer.innerHTML = errorHTML;
    }

    /**
     * 查看书籍详情
     */
    window.viewBookDetail = function(bookId) {
        // 记录浏览
        if (typeof recordBookView === 'function') {
            recordBookView(bookId);
        }

        // 跳转到详情页
        window.location.href = `book-detail.html?id=${bookId}`;
    };

    /**
     * 刷新推荐数据
     */
    window.refreshRecommendations = function() {
        showLoading();
        setTimeout(() => {
            loadRecommendations();
        }, 500);
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM已经加载完成
        init();
    }

})();
