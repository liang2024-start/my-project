// 书籍管理模块
class BookManagement {
    constructor() {
        this.currentUser = null;
        this.bookImages = [];
        this.init();
    }

    init() {
        this.checkLoginStatus();
        this.bindEvents();
        this.loadDraft();
        this.setupAutoSave();
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
                alert('请先登录！');
                window.location.href = 'index.html';
            }
        } else {
            // 未登录，跳转到登录页
            alert('请先登录！');
            window.location.href = 'index.html';
        }
    }

    // 绑定事件
    bindEvents() {
        // 添加作者按钮
        const addAuthorBtn = document.getElementById('addAuthorBtn');
        if (addAuthorBtn) addAuthorBtn.addEventListener('click', () => this.addAuthorInput());
        
        // ISBN扫码按钮
        const isbnScanBtn = document.getElementById('isbnScanBtn');
        if (isbnScanBtn) isbnScanBtn.addEventListener('click', () => this.scanISBN());
        
        // 图片上传
        const browseImagesBtn = document.getElementById('browseImagesBtn');
        const bookImagesInput = document.getElementById('bookImages');
        
        if (browseImagesBtn) browseImagesBtn.addEventListener('click', () => {
            if (bookImagesInput) bookImagesInput.click();
        });
        
        if (bookImagesInput) bookImagesInput.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });
        
        // 拖拽上传
        const uploadArea = document.getElementById('imageUploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('active');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('active');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('active');
                this.handleImageUpload(e.dataTransfer.files);
            });
        }
        
        // 描述模板
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.getAttribute('data-template');
                const description = document.getElementById('bookDescription');
                if (description) {
                    description.value = template;
                    this.updateCharCount('bookDescription', 'descriptionCharCount', 500);
                }
            });
        });
        
        // 字符计数
        const bookTitle = document.getElementById('bookTitle');
        const bookDescription = document.getElementById('bookDescription');
        
        if (bookTitle) bookTitle.addEventListener('input', () => {
            this.updateCharCount('bookTitle', 'titleCharCount', 100);
        });
        
        if (bookDescription) bookDescription.addEventListener('input', () => {
            this.updateCharCount('bookDescription', 'descriptionCharCount', 500);
        });
        
        // 表单提交
        const bookPublishForm = document.getElementById('bookPublishForm');
        if (bookPublishForm) bookPublishForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.publishBook();
        });
        
        // 保存草稿
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) saveDraftBtn.addEventListener('click', () => {
            this.saveDraft();
        });
        
        // 取消按钮
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            if (confirm('确定要取消发布吗？未保存的草稿将丢失。')) {
                window.location.href = 'book-list.html';
            }
        });
        
        // 表单验证
        this.setupFormValidation();
    }

    // 设置表单验证
    setupFormValidation() {
        const fields = [
            { id: 'bookTitle', validator: this.validateTitle.bind(this) },
            { id: 'bookAuthor', validator: this.validateAuthor.bind(this) },
            { id: 'bookISBN', validator: this.validateISBN.bind(this) },
            { id: 'bookPublisher', validator: this.validatePublisher.bind(this) },
            { id: 'bookCategory', validator: this.validateCategory.bind(this) },
            { id: 'bookPrice', validator: this.validatePrice.bind(this) },
            { id: 'bookDescription', validator: this.validateDescription.bind(this) }
        ];

        fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.addEventListener('blur', () => {
                    this.validateField(field.id, field.validator(element.value));
                });
            }
        });
    }

    // 验证字段
    validateField(fieldName, error) {
        const errorElement = document.getElementById(fieldName + 'Error');
        const inputElement = document.getElementById(fieldName);
        
        if (errorElement) {
            errorElement.textContent = error;
        }
        if (inputElement) {
            if (error) {
                inputElement.classList.add('error');
                return false;
            } else {
                inputElement.classList.remove('error');
                return true;
            }
        }
        return !error;
    }

    // 各种验证方法
    validateTitle(title) {
        if (!title) return '书名不能为空';
        if (title.length < 2) return '书名至少2个字符';
        if (title.length > 100) return '书名不能超过100个字符';
        return '';
    }

    validateAuthor(author) {
        if (!author) return '作者不能为空';
        if (author.length < 1) return '请输入作者姓名';
        return '';
    }

    validateISBN(isbn) {
        if (!isbn) return 'ISBN不能为空';
        // 简单验证ISBN格式
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
            return 'ISBN格式不正确（应为10位或13位数字）';
        }
        return '';
    }

    validatePublisher(publisher) {
        if (!publisher) return '出版社不能为空';
        if (publisher.length < 1) return '请输入出版社';
        return '';
    }

    validateCategory(category) {
        if (!category) return '请选择分类';
        return '';
    }

    validatePrice(price) {
        if (!price) return '价格不能为空';
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice <= 0) return '价格必须大于0';
        if (numPrice > 999.99) return '价格不能超过999.99元';
        return '';
    }

    validateDescription(description) {
        if (!description) return '书籍描述不能为空';
        if (description.length < 10) return '描述至少10个字符';
        if (description.length > 500) return '描述不能超过500个字符';
        return '';
    }

    // 添加作者输入框
    addAuthorInput() {
        const additionalAuthors = document.getElementById('additionalAuthors');
        if (!additionalAuthors) return;
        
        const authorCount = additionalAuthors.children.length + 2; // 包括主作者输入框
        
        if (authorCount > 5) {
            alert('最多只能添加5个作者');
            return;
        }
        
        const div = document.createElement('div');
        div.className = 'additional-author';
        div.innerHTML = `
            <input type="text" name="author${authorCount}" placeholder="作者${authorCount}">
            <button type="button" class="remove-author">×</button>
        `;
        
        additionalAuthors.appendChild(div);
        
        // 绑定删除事件
        const removeBtn = div.querySelector('.remove-author');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                div.remove();
            });
        }
    }

    // 扫描ISBN（模拟）
    scanISBN() {
        alert('扫码功能需要摄像头权限，这里模拟输入ISBN：9787115428028');
        const isbnInput = document.getElementById('bookISBN');
        if (isbnInput) isbnInput.value = '9787115428028';
    }

    // 处理图片上传
    handleImageUpload(files) {
        const maxFiles = 5;
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (this.bookImages.length >= maxFiles) {
                alert(`最多只能上传${maxFiles}张图片`);
                break;
            }
            
            if (file.size > maxSize) {
                alert(`文件 ${file.name} 大小超过5MB限制`);
                continue;
            }
            
            if (!allowedTypes.includes(file.type)) {
                alert(`文件 ${file.name} 格式不支持，仅支持JPG、PNG、GIF`);
                continue;
            }
            
            // 读取文件并预览
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgData = {
                    name: file.name,
                    url: e.target.result,
                    file: file
                };
                this.bookImages.push(imgData);
                this.renderImagePreview();
            };
            reader.readAsDataURL(file);
        }
    }

    // 渲染图片预览
    renderImagePreview() {
        const container = document.getElementById('imagePreviewContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.bookImages.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${img.url}" alt="书籍图片">
                <button type="button" class="remove-image" data-index="${index}">×</button>
            `;
            container.appendChild(div);
        });
        
        // 绑定删除事件
        document.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.bookImages.splice(index, 1);
                this.renderImagePreview();
            });
        });
    }

    // 更新字符计数
    updateCharCount(inputId, countId, maxLength) {
        const input = document.getElementById(inputId);
        const count = document.getElementById(countId);
        if (!input || !count) return;
        
        const currentLength = input.value.length;
        count.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength) {
            count.style.color = '#e74c3c';
        } else {
            count.style.color = '#7f8c8d';
        }
    }

    // 保存草稿
    saveDraft() {
        const formData = this.getFormData();
        const draft = {
            ...formData,
            images: this.bookImages,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('bookDraft', JSON.stringify(draft));
        this.showMessage('草稿已保存！', 'success');
    }

    // 加载草稿
    loadDraft() {
        const draft = localStorage.getItem('bookDraft');
        if (draft) {
            const data = JSON.parse(draft);
            
            if (confirm('检测到未完成的草稿，是否加载？')) {
                const bookTitle = document.getElementById('bookTitle');
                const bookAuthor = document.getElementById('bookAuthor');
                const bookISBN = document.getElementById('bookISBN');
                const bookPublisher = document.getElementById('bookPublisher');
                const bookCategory = document.getElementById('bookCategory');
                const bookPrice = document.getElementById('bookPrice');
                const bookDescription = document.getElementById('bookDescription');
                const bookContact = document.getElementById('bookContact');
                
                if (bookTitle) bookTitle.value = data.title || '';
                if (bookAuthor) bookAuthor.value = data.author || '';
                if (bookISBN) bookISBN.value = data.isbn || '';
                if (bookPublisher) bookPublisher.value = data.publisher || '';
                if (bookCategory) bookCategory.value = data.category || '';
                if (bookPrice) bookPrice.value = data.price || '';
                if (bookDescription) bookDescription.value = data.description || '';
                if (bookContact) bookContact.value = data.contact || '';
                
                // 设置单选框
                if (data.condition) {
                    const conditionRadio = document.querySelector(`input[name="condition"][value="${data.condition}"]`);
                    if (conditionRadio) conditionRadio.checked = true;
                }
                
                // 设置复选框
                if (data.transactionMethod) {
                    data.transactionMethod.forEach(method => {
                        const methodCheckbox = document.querySelector(`input[name="transactionMethod"][value="${method}"]`);
                        if (methodCheckbox) methodCheckbox.checked = true;
                    });
                }
                
                // 设置图片
                this.bookImages = data.images || [];
                this.renderImagePreview();
                
                // 更新字符计数
                this.updateCharCount('bookTitle', 'titleCharCount', 100);
                this.updateCharCount('bookDescription', 'descriptionCharCount', 500);
            }
        }
    }

    // 自动保存
    setupAutoSave() {
        let saveTimeout;
        
        // 监听表单变化
        const form = document.getElementById('bookPublishForm');
        if (form) {
            form.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveDraft();
                }, 5000); // 5秒后自动保存
            });
        }
    }

    // 获取表单数据
    getFormData() {
        const form = document.getElementById('bookPublishForm');
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // 如果已存在，转换为数组
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        // 处理额外的作者
        const additionalAuthors = [];
        document.querySelectorAll('#additionalAuthors input').forEach((input, index) => {
            if (input.value.trim()) {
                additionalAuthors.push(input.value.trim());
            }
        });
        
        if (additionalAuthors.length > 0) {
            data.additionalAuthors = additionalAuthors;
        }
        
        return data;
    }

    // 发布书籍
    publishBook() {
        // 验证所有字段
        const title = document.getElementById('bookTitle');
        const author = document.getElementById('bookAuthor');
        const isbn = document.getElementById('bookISBN');
        const publisher = document.getElementById('bookPublisher');
        const category = document.getElementById('bookCategory');
        const price = document.getElementById('bookPrice');
        const description = document.getElementById('bookDescription');
        
        if (!title || !author || !isbn || !publisher || !category || !price || !description) {
            this.showMessage('表单元素未找到！', 'error');
            return false;
        }
        
        const titleValid = this.validateField('bookTitle', this.validateTitle(title.value));
        const authorValid = this.validateField('bookAuthor', this.validateAuthor(author.value));
        const isbnValid = this.validateField('bookISBN', this.validateISBN(isbn.value));
        const publisherValid = this.validateField('bookPublisher', this.validatePublisher(publisher.value));
        const categoryValid = this.validateField('bookCategory', this.validateCategory(category.value));
        const priceValid = this.validateField('bookPrice', this.validatePrice(price.value));
        const descriptionValid = this.validateField('bookDescription', this.validateDescription(description.value));
        
        // 检查交易方式
        const transactionMethods = document.querySelectorAll('input[name="transactionMethod"]:checked');
        if (transactionMethods.length === 0) {
            if (document.getElementById('bookTransactionError')) {
                document.getElementById('bookTransactionError').textContent = '请选择至少一种交易方式';
            }
            return false;
        } else {
            if (document.getElementById('bookTransactionError')) {
                document.getElementById('bookTransactionError').textContent = '';
            }
        }
        
        // 检查图片
        if (this.bookImages.length === 0) {
            if (document.getElementById('bookImagesError')) {
                document.getElementById('bookImagesError').textContent = '请至少上传一张图片';
            }
            return false;
        } else {
            if (document.getElementById('bookImagesError')) {
                document.getElementById('bookImagesError').textContent = '';
            }
        }
        
        if (!titleValid || !authorValid || !isbnValid || !publisherValid || 
            !categoryValid || !priceValid || !descriptionValid || 
            transactionMethods.length === 0 || this.bookImages.length === 0) {
            this.showMessage('请检查表单信息！', 'error');
            return false;
        }
        
        // 获取所有表单数据
        const formData = this.getFormData();
        
        // 创建书籍对象
        const book = {
            id: Date.now(),
            title: formData.title,
            authors: [formData.author, ...(formData.additionalAuthors || [])].filter(a => a),
            isbn: formData.isbn,
            publisher: formData.publisher,
            category: formData.category,
            condition: formData.condition,
            price: parseFloat(formData.price),
            transactionMethods: Array.from(transactionMethods).map(cb => cb.value),
            description: formData.description,
            contact: formData.contact || '',
            images: this.bookImages,
            sellerId: this.currentUser.id,
            sellerName: this.currentUser.username,
            sellerVerified: this.currentUser.isVerified,
            status: 'active', // active, sold, inactive
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 0,
            favorites: 0
        };
        
        // 保存到本地存储
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        books.push(book);
        localStorage.setItem('books', JSON.stringify(books));
        
        // 添加到用户书籍列表
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            if (!users[userIndex].books) {
                users[userIndex].books = [];
            }
            users[userIndex].books.push(book.id);
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // 清除草稿
        localStorage.removeItem('bookDraft');
        
        // 显示成功消息并跳转
        this.showMessage('书籍发布成功！', 'success');
        setTimeout(() => {
            window.location.href = 'book-list.html';
        }, 1500);
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

// 初始化书籍管理
document.addEventListener('DOMContentLoaded', () => {
    new BookManagement();
});