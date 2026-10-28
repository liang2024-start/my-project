// 消息中心模块
class MessageCenter {
    constructor() {
        this.currentUser = null;
        this.conversations = [];
        this.messages = {};
        this.activeConversationId = null;
        this.conversationsPage = 1;
        this.messagesPage = 1;
        this.messagesPerPage = 50;
        this.hasMoreMessages = true;
        this.drafts = new Map();
        this.unreadTotal = 0;
        
        // 快捷回复短语
        this.quickReplies = [
            "这本书还在吗？",
            "可以便宜一点吗？",
            "在哪里交易比较方便？",
            "书籍新旧程度怎么样？",
            "什么时间可以交易？",
            "能否提供更多书籍图片？",
            "谢谢，我考虑一下"
        ];
        
        this.init();
    }

    init() {
        this.checkLoginStatus();
        this.bindEvents();
        this.loadConversations();
        this.loadUnreadCount();
        this.loadDrafts();
        this.startPolling();
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
            } else {
                this.showAlert('请先登录！', () => {
                    window.location.href = 'index.html';
                });
            }
        } else {
            this.showAlert('请先登录！', () => {
                window.location.href = 'index.html';
            });
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
        // 发送按钮
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // 输入框事件
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => this.handleInput());
            messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        }

        // 会话搜索
        const conversationSearch = document.getElementById('conversationSearch');
        if (conversationSearch) {
            conversationSearch.addEventListener('input', (e) => this.filterConversations(e.target.value));
        }

        // 快捷回复按钮
        document.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const message = e.target.getAttribute('data-message');
                if (message) {
                    this.insertQuickReply(message);
                }
            });
        });

        // 新建会话按钮
        const newMessageBtn = document.getElementById('newMessageBtn');
        if (newMessageBtn) {
            newMessageBtn.addEventListener('click', () => this.showNewConversationModal());
        }

        // 浏览书籍按钮
        const browseBooksBtn = document.getElementById('browseBooksBtn');
        if (browseBooksBtn) {
            browseBooksBtn.addEventListener('click', () => {
                window.location.href = 'book-list.html';
            });
        }

        // 安全提示开关
        const toggleSafetyTips = document.getElementById('toggleSafetyTips');
        const safetyBanner = document.getElementById('safetyBanner');
        if (toggleSafetyTips && safetyBanner) {
            toggleSafetyTips.addEventListener('click', () => {
                safetyBanner.style.display = safetyBanner.style.display === 'none' ? 'flex' : 'none';
            });
        }

        // 关闭安全提示
        const closeBanner = document.querySelector('.close-banner');
        if (closeBanner) {
            closeBanner.addEventListener('click', () => {
                safetyBanner.style.display = 'none';
            });
        }

        // 弹窗事件
        this.bindModalEvents();
    }

    // 绑定弹窗事件
    bindModalEvents() {
        // 新建会话弹窗
        const modal = document.getElementById('newConversationModal');
        const modalClose = modal ? modal.querySelector('.modal-close') : null;
        const modalCancel = modal ? modal.querySelector('.modal-cancel') : null;
        const startBtn = document.getElementById('startConversationBtn');

        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal('newConversationModal'));
        }
        if (modalCancel) {
            modalCancel.addEventListener('click', () => this.hideModal('newConversationModal'));
        }
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startNewConversation());
        }

        // 点击弹窗外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal('newConversationModal');
                }
            });
        }

        // 确认弹窗
        const alertModal = document.getElementById('systemAlertModal');
        const alertConfirm = alertModal ? alertModal.querySelector('.alert-confirm') : null;
        if (alertConfirm) {
            alertConfirm.addEventListener('click', () => this.hideModal('systemAlertModal'));
        }
    }

    // 加载会话列表
    loadConversations() {
        const storedConversations = localStorage.getItem('conversations');
        let conversations = storedConversations ? JSON.parse(storedConversations) : this.generateMockConversations();
        
        // 过滤出当前用户的会话
        conversations = conversations.filter(c => 
            c.buyerId === this.currentUser.id || c.sellerId === this.currentUser.id
        );
        
        // 按最新消息时间排序
        conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        
        this.conversations = conversations;
        this.renderConversationList();
        
        // 保存到localStorage
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    // 生成模拟会话数据
    generateMockConversations() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        
        if (books.length === 0 || users.length === 0) {
            return [];
        }

        const mockConversations = [];
        const now = new Date();
        
        // 创建几个示例会话
        for (let i = 0; i < Math.min(5, books.length); i++) {
            const book = books[i];
            const isBuyer = i % 2 === 0;
            const otherUserId = isBuyer ? book.sellerId : (book.sellerId % users.length) + 1;
            const otherUser = users.find(u => u.id === otherUserId) || {
                id: otherUserId,
                username: otherUserId === 1 ? '张同学' : `用户${otherUserId}`
            };

            if (otherUserId === this.currentUser?.id) continue;

            const lastMessageTime = new Date(now - Math.random() * 86400000 * 3);
            const messageCount = Math.floor(Math.random() * 10) + 1;
            
            mockConversations.push({
                id: 2000 + i,
                bookId: book.id,
                bookTitle: book.title,
                buyerId: isBuyer ? this.currentUser?.id || 1 : otherUserId,
                sellerId: isBuyer ? otherUserId : this.currentUser?.id || 1,
                buyerName: isBuyer ? (this.currentUser?.username || '我') : otherUser.username,
                sellerName: isBuyer ? otherUser.username : (this.currentUser?.username || '我'),
                otherUserId: otherUserId,
                otherUserName: otherUser.username,
                otherUserAvatar: otherUser.avatar || `https://via.placeholder.com/40x40?text=${otherUser.username.charAt(0)}`,
                lastMessageContent: this.getMockLastMessage(i),
                lastMessageAt: lastMessageTime.toISOString(),
                unreadCount: Math.floor(Math.random() * 5),
                isPinned: i === 0,
                status: 'active'
            });
        }

        return mockConversations;
    }

    // 获取模拟最后消息
    getMockLastMessage(index) {
        const messages = [
            "这本书还在吗？我想购买",
            "可以便宜一点吗？",
            "好的，我们明天图书馆见",
            "收到，谢谢！",
            "请问这本书有笔记吗？",
            "价格可以再商量"
        ];
        return messages[index % messages.length];
    }

    // 渲染会话列表
    renderConversationList(filterText = '') {
        const container = document.getElementById('conversationList');
        if (!container) return;

        container.innerHTML = '';

        let filteredConversations = this.conversations;
        
        // 搜索过滤
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            filteredConversations = filteredConversations.filter(c =>
                c.otherUserName.toLowerCase().includes(lowerFilter) ||
                c.bookTitle.toLowerCase().includes(lowerFilter) ||
                c.lastMessageContent.toLowerCase().includes(lowerFilter)
            );
        }

        if (filteredConversations.length === 0) {
            container.innerHTML = `
                <div class="no-conversations">
                    <div class="icon">💬</div>
                    <p>没有找到相关会话</p>
                </div>
            `;
            return;
        }

        filteredConversations.forEach(conversation => {
            const item = this.createConversationItem(conversation);
            container.appendChild(item);
        });
    }

    // 创建会话项
    createConversationItem(conversation) {
        const div = document.createElement('div');
        div.className = `conversation-item${conversation.id === this.activeConversationId ? ' active' : ''}${conversation.unreadCount > 0 ? ' has-unread' : ''}`;
        div.setAttribute('data-conversation-id', conversation.id);
        
        const lastTime = this.formatTime(conversation.lastMessageAt);
        const preview = conversation.lastMessageContent.length > 30 
            ? conversation.lastMessageContent.substring(0, 30) + '...' 
            : conversation.lastMessageContent;

        div.innerHTML = `
            <img src="${conversation.otherUserAvatar}" alt="头像" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-header">
                    <span class="conversation-name">
                        ${conversation.otherUserName}
                        ${conversation.isPinned ? '<span class="pin-icon">📌</span>' : ''}
                    </span>
                    <span class="conversation-time">${lastTime}</span>
                </div>
                <div class="conversation-preview">${preview}</div>
                <div class="conversation-book">关于：${conversation.bookTitle}</div>
            </div>
            ${conversation.unreadCount > 0 ? `<span class="unread-badge">${conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>` : ''}
        `;

        div.addEventListener('click', () => this.selectConversation(conversation.id));

        return div;
    }

    // 选择会话
    selectConversation(conversationId) {
        this.activeConversationId = conversationId;
        
        // 更新选中状态
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.getAttribute('data-conversation-id')) === conversationId) {
                item.classList.add('active');
            }
        });

        // 清除未读标记
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation && conversation.unreadCount > 0) {
            conversation.unreadCount = 0;
            this.saveConversations();
            this.renderConversationList();
            this.updateUnreadCount();
        }

        // 显示聊天界面
        document.getElementById('emptyChatState').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'flex';

        // 更新聊天头部
        this.updateChatHeader(conversation);

        // 加载消息
        this.loadMessages(conversationId);

        // 恢复草稿
        this.restoreDraft(conversationId);
    }

    // 更新聊天头部
    updateChatHeader(conversation) {
        const avatar = document.getElementById('chatUserAvatar');
        const name = document.getElementById('chatUserName');
        const bookTitle = document.getElementById('chatBookTitle');

        if (avatar) avatar.src = conversation.otherUserAvatar;
        if (name) name.textContent = conversation.otherUserName;
        if (bookTitle) bookTitle.textContent = `关于：${conversation.bookTitle}`;
    }

    // 加载消息
    loadMessages(conversationId) {
        const storedMessages = localStorage.getItem('messages_' + conversationId);
        let messages = storedMessages ? JSON.parse(storedMessages) : this.generateMockMessages(conversationId);
        
        // 按时间排序
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        this.messages[conversationId] = messages;
        this.renderMessageList(conversationId);
    }

    // 生成模拟消息
    generateMockMessages(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return [];

        const now = new Date();
        const messages = [
            {
                id: `msg_${conversationId}_1`,
                conversationId: conversationId,
                senderId: conversation.buyerId,
                senderName: conversation.buyerName,
                receiverId: conversation.sellerId,
                receiverName: conversation.sellerName,
                type: 'text',
                content: `您好，我想咨询一下《${conversation.bookTitle}》这本书`,
                isRead: true,
                status: 'read',
                createdAt: new Date(now - 86400000 * 2).toISOString()
            },
            {
                id: `msg_${conversationId}_2`,
                conversationId: conversationId,
                senderId: conversation.sellerId,
                senderName: conversation.sellerName,
                receiverId: conversation.buyerId,
                receiverName: conversation.buyerName,
                type: 'text',
                content: '您好！书还在的，请问您什么时候方便交易？',
                isRead: true,
                status: 'read',
                createdAt: new Date(now - 86400000 * 2 + 3600000).toISOString()
            },
            {
                id: `msg_${conversationId}_3`,
                conversationId: conversationId,
                senderId: conversation.buyerId,
                senderName: conversation.buyerName,
                receiverId: conversation.sellerId,
                receiverName: conversation.sellerName,
                type: 'text',
                content: '明天上午10点图书馆见可以吗？',
                isRead: true,
                status: 'read',
                createdAt: new Date(now - 86400000 + 7200000).toISOString()
            },
            {
                id: `msg_${conversationId}_4`,
                conversationId: conversationId,
                senderId: conversation.sellerId,
                senderName: conversation.sellerName,
                receiverId: conversation.buyerId,
                receiverName: conversation.buyerName,
                type: 'system',
                content: '交易提醒：请双方在校园公共场合进行交易，注意人身和财产安全',
                isRead: false,
                status: 'read',
                createdAt: new Date(now - 86400000 + 10800000).toISOString()
            },
            {
                id: `msg_${conversationId}_5`,
                conversationId: conversationId,
                senderId: conversation.sellerId,
                senderName: conversation.sellerName,
                receiverId: conversation.buyerId,
                receiverName: conversation.buyerName,
                type: 'text',
                content: '好的，不见不散！',
                isRead: false,
                status: 'read',
                createdAt: new Date(now - 3600000).toISOString()
            }
        ];

        // 保存到localStorage
        localStorage.setItem('messages_' + conversationId, JSON.stringify(messages));
        
        return messages;
    }

    // 渲染消息列表
    renderMessageList(conversationId, prepend = false) {
        const container = document.getElementById('messageList');
        if (!container) return;

        const messages = this.messages[conversationId] || [];
        
        if (!prepend) {
            container.innerHTML = '';
            
            if (messages.length === 0) {
                container.innerHTML = `
                    <div class="time-divider">
                        <span>暂无消息记录</span>
                    </div>
                `;
                return;
            }

            // 按日期分组渲染
            let currentDate = null;
            messages.forEach((message, index) => {
                const messageDate = new Date(message.createdAt).toDateString();
                
                if (messageDate !== currentDate) {
                    currentDate = messageDate;
                    const divider = this.createTimeDivider(message.createdAt);
                    container.appendChild(divider);
                }

                const messageEl = this.createMessageItem(message, conversationId);
                container.appendChild(messageEl);
            });

            // 滚动到底部
            this.scrollToBottom();
        }
    }

    // 创建时间分组标签
    createTimeDivider(dateStr) {
        const date = new Date(dateStr);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        let text;
        if (date.toDateString() === today) {
            text = '今天';
        } else if (date.toDateString() === yesterday) {
            text = '昨天';
        } else {
            text = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        }

        const div = document.createElement('div');
        div.className = 'time-divider';
        div.innerHTML = `<span>${text}</span>`;
        return div;
    }

    // 创建消息项
    createMessageItem(message, conversationId) {
        const div = document.createElement('div');
        
        const isSent = message.senderId === this.currentUser.id;
        div.className = `message-item ${isSent ? 'sent' : 'received'}`;
        
        if (message.type === 'system') {
            div.className += ' system-message';
            div.innerHTML = `
                <div class="message-bubble">${this.escapeHtml(message.content)}</div>
            `;
        } else {
            const statusText = message.status === 'sending' ? '发送中...' : 
                              message.status === 'sent' ? '已发送' : 
                              message.status === 'read' ? '已读' : '';
            
            div.innerHTML = `
                <div class="message-bubble">${this.escapeHtml(message.content)}</div>
                <span class="message-time">${this.formatMessageTime(message.createdAt)}</span>
                ${isSent && statusText ? `<span class="message-status ${message.status}">${statusText}</span>` : ''}
            `;
        }

        return div;
    }

    // 处理输入
    handleInput() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const charCount = document.getElementById('charCount');
        
        if (!input || !sendBtn || !charCount) return;

        const length = input.value.length;
        charCount.textContent = `${length}/500`;
        
        if (length > 500) {
            charCount.classList.add('warning');
        } else {
            charCount.classList.remove('warning');
        }

        sendBtn.disabled = length === 0 || length > 500;

        // 保存草稿
        if (this.activeConversationId) {
            this.saveDraft(this.activeConversationId, input.value);
        }
    }

    // 处理键盘事件
    handleKeyDown(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    // 发送消息
    sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.activeConversationId) return;
        if (content.length > 500) {
            this.showAlert('消息长度不能超过500个字符');
            return;
        }

        const conversation = this.conversations.find(c => c.id === this.activeConversationId);
        if (!conversation) return;

        // 创建消息对象
        const message = {
            id: 'msg_' + Date.now(),
            conversationId: this.activeConversationId,
            senderId: this.currentUser.id,
            senderName: this.currentUser.username,
            receiverId: conversation.otherUserId,
            receiverName: conversation.otherUserName,
            type: 'text',
            content: content,
            isRead: false,
            status: 'sending',
            createdAt: new Date().toISOString()
        };

        // 添加到消息列表
        if (!this.messages[this.activeConversationId]) {
            this.messages[this.activeConversationId] = [];
        }
        this.messages[this.activeConversationId].push(message);
        
        // 渲染新消息
        const container = document.getElementById('messageList');
        const divider = this.createTimeDivider(message.createdAt);
        const lastDivider = container.querySelector('.time-divider:last-child');
        
        // 检查是否需要新的日期分组
        const lastDate = lastDivider ? new Date(lastDivider.querySelector('span').textContent) : null;
        const messageDate = new Date(message.createdAt);
        
        if (!lastDivider || lastDate.toDateString() !== messageDate.toDateString()) {
            container.appendChild(divider);
        }
        
        const messageEl = this.createMessageItem(message, this.activeConversationId);
        container.appendChild(messageEl);
        
        // 滚动到底部
        this.scrollToBottom();

        // 清空输入框
        input.value = '';
        this.handleInput();

        // 清除草稿
        this.clearDraft(this.activeConversationId);

        // 模拟发送成功
        setTimeout(() => {
            message.status = 'sent';
            this.renderMessageItemStatus(message);
            this.updateConversationLastMessage(message);
        }, 1000);

        // 模拟已读
        setTimeout(() => {
            message.status = 'read';
            this.renderMessageItemStatus(message);
        }, 3000);

        // 保存消息到localStorage
        localStorage.setItem('messages_' + this.activeConversationId, 
            JSON.stringify(this.messages[this.activeConversationId]));
    }

    // 渲染消息状态
    renderMessageItemStatus(message) {
        const messageEl = document.querySelector(`.message-item[data-message-id="${message.id}"]`);
        if (!messageEl) return;

        const statusEl = messageEl.querySelector('.message-status');
        if (statusEl) {
            const statusText = message.status === 'sent' ? '已发送' : '已读';
            statusEl.textContent = statusText;
            statusEl.className = 'message-status ' + message.status;
        }
    }

    // 更新会话最后消息
    updateConversationLastMessage(message) {
        const conversation = this.conversations.find(c => c.id === message.conversationId);
        if (conversation) {
            conversation.lastMessageContent = message.content;
            conversation.lastMessageAt = message.createdAt;
            this.saveConversations();
            this.renderConversationList();
        }
    }

    // 插入快捷回复
    insertQuickReply(message) {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = message;
            this.handleInput();
            input.focus();
        }
    }

    // 滚动到底部
    scrollToBottom() {
        const container = document.getElementById('messageList');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // 过滤会话
    filterConversations(query) {
        this.renderConversationList(query);
    }

    // 保存草稿
    saveDraft(conversationId, content) {
        this.drafts.set(conversationId, content);
        localStorage.setItem('messageDrafts', JSON.stringify([...this.drafts]));
    }

    // 恢复草稿
    restoreDraft(conversationId) {
        const input = document.getElementById('messageInput');
        const draft = this.drafts.get(conversationId);
        
        if (input && draft) {
            input.value = draft;
            this.handleInput();
        }
    }

    // 清除草稿
    clearDraft(conversationId) {
        this.drafts.delete(conversationId);
        localStorage.setItem('messageDrafts', JSON.stringify([...this.drafts]));
        
        const draftIndicator = document.querySelector('.draft-indicator');
        if (draftIndicator) {
            draftIndicator.style.display = 'none';
        }
    }

    // 加载草稿
    loadDrafts() {
        const stored = localStorage.getItem('messageDrafts');
        if (stored) {
            try {
                const draftsArray = JSON.parse(stored);
                this.drafts = new Map(draftsArray);
            } catch (e) {
                console.error('加载草稿失败:', e);
            }
        }
    }

    // 显示新建会话弹窗
    showNewConversationModal() {
        const modal = document.getElementById('newConversationModal');
        const bookSelect = document.getElementById('bookSelect');
        
        if (!modal || !bookSelect) return;

        // 加载书籍列表
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        bookSelect.innerHTML = '<option value="">请选择要咨询的书籍</option>';
        
        books.forEach(book => {
            if (book.sellerId !== this.currentUser.id) {
                const option = document.createElement('option');
                option.value = book.id;
                option.textContent = `${book.title} - ¥${book.price.toFixed(2)}`;
                bookSelect.appendChild(option);
            }
        });

        if (bookSelect.options.length <= 1) {
            this.showAlert('暂无可咨询的书籍');
            return;
        }

        modal.style.display = 'flex';
    }

    // 开始新会话
    startNewConversation() {
        const bookSelect = document.getElementById('bookSelect');
        const initialMessage = document.getElementById('initialMessage');
        
        if (!bookSelect || !initialMessage) return;

        const bookId = parseInt(bookSelect.value);
        if (!bookId) {
            this.showAlert('请选择要咨询的书籍');
            return;
        }

        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const book = books.find(b => b.id === bookId);
        
        if (!book) {
            this.showAlert('书籍不存在');
            return;
        }

        if (book.sellerId === this.currentUser.id) {
            this.showAlert('不能与自己发布的书籍进行会话');
            return;
        }

        // 检查是否已存在会话
        let conversation = this.conversations.find(c => 
            c.bookId === bookId && 
            ((c.buyerId === this.currentUser.id && c.sellerId === book.sellerId) ||
             (c.sellerId === this.currentUser.id && c.buyerId === book.sellerId))
        );

        if (conversation) {
            this.selectConversation(conversation.id);
            this.hideModal('newConversationModal');
            return;
        }

        // 创建新会话
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const seller = users.find(u => u.id === book.sellerId) || {
            id: book.sellerId,
            username: book.sellerName
        };

        conversation = {
            id: Date.now(),
            bookId: book.id,
            bookTitle: book.title,
            buyerId: this.currentUser.id,
            buyerName: this.currentUser.username,
            sellerId: book.sellerId,
            sellerName: book.sellerName,
            otherUserId: book.sellerId,
            otherUserName: book.sellerName,
            otherUserAvatar: seller.avatar || `https://via.placeholder.com/40x40?text=${book.sellerName.charAt(0)}`,
            lastMessageContent: initialMessage.value.trim() || '您好，我想咨询这本书',
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
            isPinned: false,
            status: 'active'
        };

        this.conversations.unshift(conversation);
        this.saveConversations();
        this.renderConversationList();

        // 创建初始消息
        if (initialMessage.value.trim()) {
            const message = {
                id: 'msg_' + Date.now(),
                conversationId: conversation.id,
                senderId: this.currentUser.id,
                senderName: this.currentUser.username,
                receiverId: book.sellerId,
                receiverName: book.sellerName,
                type: 'text',
                content: initialMessage.value.trim(),
                isRead: false,
                status: 'sent',
                createdAt: new Date().toISOString()
            };
            
            this.messages[conversation.id] = [message];
            localStorage.setItem('messages_' + conversation.id, JSON.stringify([message]));
        }

        this.hideModal('newConversationModal');
        this.selectConversation(conversation.id);
    }

    // 保存会话
    saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(this.conversations));
    }

    // 隐藏弹窗
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 显示提醒弹窗
    showAlert(message, callback) {
        const modal = document.getElementById('systemAlertModal');
        const messageEl = document.getElementById('alertMessage');
        
        if (modal && messageEl) {
            messageEl.textContent = message;
            modal.style.display = 'flex';
            
            if (callback) {
                const confirmBtn = modal.querySelector('.alert-confirm');
                confirmBtn.onclick = () => {
                    this.hideModal('systemAlertModal');
                    callback();
                };
            }
        }
    }

    // 加载未读消息数
    loadUnreadCount() {
        let total = 0;
        this.conversations.forEach(c => {
            total += c.unreadCount || 0;
        });
        
        this.unreadTotal = total;
        this.updateUnreadBadge();
    }

    // 更新未读消息徽章
    updateUnreadBadge() {
        const badge = document.getElementById('headerUnreadBadge');
        if (badge) {
            if (this.unreadTotal > 0) {
                badge.textContent = this.unreadTotal > 99 ? '99+' : this.unreadTotal;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // 轮询检查新消息
    startPolling() {
        setInterval(() => {
            this.checkNewMessages();
        }, 30000); // 每30秒检查一次
    }

    // 检查新消息
    checkNewMessages() {
        // 模拟收到新消息
        if (Math.random() > 0.8 && this.conversations.length > 0) {
            const randomConv = this.conversations[Math.floor(Math.random() * this.conversations.length)];
            
            if (randomConv && randomConv.otherUserId !== this.currentUser.id) {
                // 模拟收到新消息
                const newMessage = {
                    id: 'msg_' + Date.now(),
                    conversationId: randomConv.id,
                    senderId: randomConv.otherUserId,
                    senderName: randomConv.otherUserName,
                    receiverId: this.currentUser.id,
                    receiverName: this.currentUser.username,
                    type: 'text',
                    content: this.getMockLastMessage(Math.floor(Math.random() * 6)),
                    isRead: false,
                    status: 'read',
                    createdAt: new Date().toISOString()
                };

                // 如果不是当前活跃会话，更新未读数
                if (this.activeConversationId !== randomConv.id) {
                    randomConv.unreadCount = (randomConv.unreadCount || 0) + 1;
                    randomConv.lastMessageContent = newMessage.content;
                    randomConv.lastMessageAt = newMessage.createdAt;
                    this.saveConversations();
                    this.renderConversationList();
                    this.loadUnreadCount();
                }

                // 如果是当前活跃会话，添加到消息列表
                if (this.activeConversationId === randomConv.id) {
                    if (!this.messages[randomConv.id]) {
                        this.messages[randomConv.id] = [];
                    }
                    this.messages[randomConv.id].push(newMessage);
                    
                    const container = document.getElementById('messageList');
                    if (container) {
                        const divider = this.createTimeDivider(newMessage.createdAt);
                        const lastDivider = container.querySelector('.time-divider:last-child');
                        
                        if (!lastDivider || !lastDivider.querySelector('span')) {
                            container.appendChild(divider);
                        }
                        
                        const messageEl = this.createMessageItem(newMessage, randomConv.id);
                        container.appendChild(messageEl);
                        this.scrollToBottom();
                    }
                }

                // 触发新消息通知
                this.showNotification(newMessage);
            }
        }
    }

    // 显示通知
    showNotification(message) {
        // 浏览器标题闪烁
        if (document.hidden) {
            this.startTitleBlink();
        }

        // 显示系统通知（如果支持）
        if (Notification.permission === 'granted') {
            new Notification('新消息', {
                body: `${message.senderName}: ${message.content}`,
                icon: '/favicon.ico'
            });
        }
    }

    // 标题闪烁
    startTitleBlink() {
        const originalTitle = document.title;
        const blinkTitle = '💬 新消息';
        
        this.blinkInterval = setInterval(() => {
            document.title = document.title === blinkTitle ? originalTitle : blinkTitle;
        }, 1000);
    }

    // 停止标题闪烁
    stopTitleBlink() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            document.title = document.title.replace('💬 新消息', '');
        }
    }

    // 格式化时间
    formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return '刚刚';
        } else if (diff < 3600000) {
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) {
            return Math.floor(diff / 3600000) + '小时前';
        } else if (diff < 604800000) {
            return Math.floor(diff / 86400000) + '天前';
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    }

    // 格式化消息时间
    formatMessageTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 从书籍详情页发起会话的全局函数
function initiateConversation(bookId, sellerId) {
    const messageCenter = window.messageCenter;
    if (messageCenter) {
        return messageCenter.initiateSession(bookId, sellerId);
    }
    
    // 如果消息中心未初始化，保存参数并跳转
    localStorage.setItem('pendingConversation', JSON.stringify({ bookId, sellerId }));
    window.location.href = 'messages.html';
}

// 初始化消息中心
document.addEventListener('DOMContentLoaded', () => {
    window.messageCenter = new MessageCenter();
    
    // 处理URL参数中的会话请求
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = parseInt(urlParams.get('bookId'));
    const sellerId = parseInt(urlParams.get('sellerId'));
    
    if (bookId && sellerId) {
        // 检查登录状态
        const loginStatus = localStorage.getItem('loginStatus') || sessionStorage.getItem('loginStatus');
        if (!loginStatus) {
            window.location.href = 'index.html';
            return;
        }
        
        const userId = JSON.parse(loginStatus).userId;
        
        // 检查是否是自己发布的书籍
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const book = books.find(b => b.id === bookId);
        
        if (book && book.sellerId === userId) {
            alert('不能与自己发布的书籍进行会话');
            window.location.href = 'book-list.html';
            return;
        }
        
        // 检查是否已存在会话
        let conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
        let conversation = conversations.find(c => 
            c.bookId === bookId && 
            c.buyerId === userId
        );
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const seller = users.find(u => u.id === sellerId) || { 
            id: sellerId, 
            username: `用户${sellerId}` 
        };
        
        if (!conversation) {
            conversation = {
                id: Date.now(),
                bookId: bookId,
                bookTitle: book ? book.title : '书籍',
                buyerId: userId,
                buyerName: users.find(u => u.id === userId)?.username || '我',
                sellerId: sellerId,
                sellerName: seller.username,
                otherUserId: sellerId,
                otherUserName: seller.username,
                otherUserAvatar: seller.avatar || `https://via.placeholder.com/40x40?text=${seller.username.charAt(0)}`,
                lastMessageContent: '您好，我想咨询这本书',
                lastMessageAt: new Date().toISOString(),
                unreadCount: 0,
                isPinned: false,
                status: 'active'
            };
            
            conversations.unshift(conversation);
            localStorage.setItem('conversations', JSON.stringify(conversations));
        }
        
        // 选中该会话
        setTimeout(() => {
            if (window.messageCenter) {
                window.messageCenter.loadConversations();
                window.messageCenter.selectConversation(conversation.id);
            }
        }, 300);
    }
    
    // 处理localStorage中的待处理会话请求
    const pending = localStorage.getItem('pendingConversation');
    if (pending) {
        try {
            const { bookId: pid, sellerId: sid } = JSON.parse(pending);
            localStorage.removeItem('pendingConversation');
            
            const loginStatus = localStorage.getItem('loginStatus') || sessionStorage.getItem('loginStatus');
            if (!loginStatus) {
                window.location.href = 'index.html';
                return;
            }
            
            const books = JSON.parse(localStorage.getItem('books') || '[]');
            const book = books.find(b => b.id === pid);
            const userId = JSON.parse(loginStatus).userId;
            
            if (book && book.sellerId === userId) {
                alert('不能与自己发布的书籍进行会话');
                window.location.href = 'book-list.html';
                return;
            }
            
            let conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
            let conversation = conversations.find(c => 
                c.bookId === pid && 
                c.buyerId === userId
            );
            
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const seller = users.find(u => u.id === sid) || { username: '卖家' };
            
            if (!conversation) {
                conversation = {
                    id: Date.now(),
                    bookId: pid,
                    bookTitle: book ? book.title : '书籍',
                    buyerId: userId,
                    buyerName: users.find(u => u.id === userId)?.username || '我',
                    sellerId: sid,
                    sellerName: seller.username,
                    otherUserId: sid,
                    otherUserName: seller.username,
                    otherUserAvatar: `https://via.placeholder.com/40x40?text=${seller.username.charAt(0)}`,
                    lastMessageContent: '您好，我想咨询这本书',
                    lastMessageAt: new Date().toISOString(),
                    unreadCount: 0,
                    isPinned: false,
                    status: 'active'
                };
                
                conversations.unshift(conversation);
                localStorage.setItem('conversations', JSON.stringify(conversations));
            }
            
            setTimeout(() => {
                if (window.messageCenter) {
                    window.messageCenter.loadConversations();
                    window.messageCenter.selectConversation(conversation.id);
                }
            }, 300);
            
        } catch (e) {
            console.error('处理待处理会话失败:', e);
        }
    }
});

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.messageCenter) {
        window.messageCenter.stopTitleBlink();
    }
});
