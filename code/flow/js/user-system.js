// 用户系统模块
class UserSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkLoginStatus();
    }

    // 绑定事件
    bindEvents() {
        // 模态框相关
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const modal = document.getElementById('authModal');
        const closeBtn = document.querySelector('.close');
        const showRegisterForm = document.getElementById('showRegisterForm');
        const showLoginForm = document.getElementById('showLoginForm');

        // 登录/注册按钮
        if (loginBtn) loginBtn.addEventListener('click', () => this.showModal('login'));
        if (registerBtn) registerBtn.addEventListener('click', () => this.showModal('register'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // 模态框关闭
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal());
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal();
        });

        // 表单切换
        if (showRegisterForm) showRegisterForm.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('register');
        });
        if (showLoginForm) showLoginForm.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        // 表单提交
        const loginForm = document.getElementById('loginFormElement');
        const registerForm = document.getElementById('registerFormElement');
        
        if (loginForm) loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        if (registerForm) registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // 表单验证
        this.setupFormValidation();
    }

    // 设置表单验证
    setupFormValidation() {
        // 登录表单验证
        const loginUsername = document.getElementById('loginUsername');
        const loginPassword = document.getElementById('loginPassword');

        if (loginUsername) loginUsername.addEventListener('blur', () => {
            this.validateField('loginUsername', this.validateUsername(loginUsername.value));
        });
        if (loginPassword) loginPassword.addEventListener('blur', () => {
            this.validateField('loginPassword', this.validatePassword(loginPassword.value));
        });

        // 注册表单验证
        const registerUsername = document.getElementById('registerUsername');
        const registerEmail = document.getElementById('registerEmail');
        const registerStudentId = document.getElementById('registerStudentId');
        const registerPassword = document.getElementById('registerPassword');
        const registerConfirmPassword = document.getElementById('registerConfirmPassword');

        if (registerUsername) registerUsername.addEventListener('blur', () => {
            this.validateField('registerUsername', this.validateUsername(registerUsername.value));
        });
        if (registerEmail) registerEmail.addEventListener('blur', () => {
            this.validateField('registerEmail', this.validateEmail(registerEmail.value));
        });
        if (registerStudentId) registerStudentId.addEventListener('blur', () => {
            this.validateField('registerStudentId', this.validateStudentId(registerStudentId.value));
        });
        if (registerPassword) registerPassword.addEventListener('blur', () => {
            this.validateField('registerPassword', this.validatePassword(registerPassword.value));
        });
        if (registerConfirmPassword) registerConfirmPassword.addEventListener('blur', () => {
            this.validateField('registerConfirmPassword', 
                registerPassword && registerConfirmPassword ? 
                (registerPassword.value === registerConfirmPassword.value ? '' : '密码不匹配') : '');
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
    validateUsername(username) {
        if (!username) return '用户名不能为空';
        if (username.length < 3) return '用户名至少3个字符';
        if (username.length > 20) return '用户名不能超过20个字符';
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) return '用户名只能包含字母、数字、下划线和中文';
        return '';
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return '邮箱不能为空';
        if (!emailRegex.test(email)) return '邮箱格式不正确';
        return '';
    }

    validateStudentId(studentId) {
        if (!studentId) return '学号不能为空';
        if (!/^\d{8,12}$/.test(studentId)) return '学号格式不正确（8-12位数字）';
        return '';
    }

    validatePassword(password) {
        if (!password) return '密码不能为空';
        if (password.length < 6) return '密码至少6个字符';
        if (password.length > 20) return '密码不能超过20个字符';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return '密码必须包含大小写字母和数字';
        return '';
    }

    // 显示模态框
    showModal(formType) {
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = 'block';
        this.showForm(formType);
    }

    // 隐藏模态框
    hideModal() {
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = 'none';
        this.clearFormErrors();
    }

    // 显示指定表单
    showForm(formType) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) loginForm.style.display = formType === 'login' ? 'block' : 'none';
        if (registerForm) registerForm.style.display = formType === 'register' ? 'block' : 'none';
        this.clearFormErrors();
    }

    // 清除表单错误
    clearFormErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => el.textContent = '');
        
        const inputElements = document.querySelectorAll('input.error');
        inputElements.forEach(el => el.classList.remove('error'));
    }

    // 处理登录
    handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe');
        const rememberMeChecked = rememberMe ? rememberMe.checked : false;

        // 验证表单
        const usernameValid = this.validateField('loginUsername', this.validateUsername(username));
        const passwordValid = this.validateField('loginPassword', this.validatePassword(password));

        if (!usernameValid || !passwordValid) return;

        // 模拟登录请求
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => (u.username === username || u.email === username) && u.password === this.hashPassword(password));

        if (user) {
            this.currentUser = user;
            this.setLoginStatus(user, rememberMeChecked);
            this.hideModal();
            this.showMessage('登录成功！', 'success');
            
            // 延迟刷新页面以确保状态更新
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            this.showMessage('用户名或密码错误！', 'error');
        }
    }

    // 处理注册
    handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const studentId = document.getElementById('registerStudentId').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        // 验证所有字段
        const usernameValid = this.validateField('registerUsername', this.validateUsername(username));
        const emailValid = this.validateField('registerEmail', this.validateEmail(email));
        const studentIdValid = this.validateField('registerStudentId', this.validateStudentId(studentId));
        const passwordValid = this.validateField('registerPassword', this.validatePassword(password));
        const confirmPasswordValid = this.validateField('registerConfirmPassword', 
            password === confirmPassword ? '' : '密码不匹配');

        if (!usernameValid || !emailValid || !studentIdValid || !passwordValid || !confirmPasswordValid) return;

        // 检查用户名和邮箱是否已存在
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.username === username)) {
            this.showMessage('用户名已存在！', 'error');
            return;
        }
        if (users.some(u => u.email === email)) {
            this.showMessage('邮箱已存在！', 'error');
            return;
        }

        // 创建新用户
        const newUser = {
            id: Date.now(),
            username: username,
            email: email,
            studentId: studentId,
            password: this.hashPassword(password),
            avatar: 'default-avatar.png',
            realName: '',
            department: '',
            phone: '',
            isVerified: false,
            createdAt: new Date().toISOString(),
            books: [] // 用户发布的书籍
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // 自动登录新用户
        this.currentUser = newUser;
        this.setLoginStatus(newUser, false);
        this.hideModal();
        this.showMessage('注册成功！', 'success');
        
        // 延迟刷新页面以确保状态更新
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    // 设置登录状态
    setLoginStatus(user, rememberMe) {
        const usernameDisplay = document.getElementById('usernameDisplay');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (usernameDisplay) usernameDisplay.textContent = user.username;
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';

        // 存储登录状态
        const loginData = {
            userId: user.id,
            username: user.username,
            loginTime: new Date().toISOString()
        };
        
        if (rememberMe) {
            localStorage.setItem('loginStatus', JSON.stringify(loginData));
        } else {
            sessionStorage.setItem('loginStatus', JSON.stringify(loginData));
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
                const usernameDisplay = document.getElementById('usernameDisplay');
                const loginBtn = document.getElementById('loginBtn');
                const registerBtn = document.getElementById('registerBtn');
                const logoutBtn = document.getElementById('logoutBtn');
                
                if (usernameDisplay) usernameDisplay.textContent = user.username;
                if (loginBtn) loginBtn.style.display = 'none';
                if (registerBtn) registerBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'inline-block';
            } else {
                // 用户不存在，清除登录状态
                localStorage.removeItem('loginStatus');
                sessionStorage.removeItem('loginStatus');
            }
        }
    }

    // 退出登录
    logout() {
        if (confirm('确定要退出登录吗？')) {
            this.currentUser = null;
            localStorage.removeItem('loginStatus');
            sessionStorage.removeItem('loginStatus');
            
            const usernameDisplay = document.getElementById('usernameDisplay');
            const loginBtn = document.getElementById('loginBtn');
            const registerBtn = document.getElementById('registerBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (usernameDisplay) usernameDisplay.textContent = '游客';
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (registerBtn) registerBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            
            this.showMessage('已退出登录！', 'info');
            
            // 延迟刷新页面以确保状态更新
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    // 密码哈希（简单实现，实际项目中应使用更强的加密）
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString();
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

// 初始化用户系统
document.addEventListener('DOMContentLoaded', () => {
    new UserSystem();
});