<script>
const loginPage = '/pages/auth/user-login';

// 不需要登录就能访问的页面白名单
const whiteList = [
  loginPage,
  '/pages/auth/user-login'
];

export default {
  onLaunch: function() {
    console.log('🎓 校园送 App Launch');
    this.checkLoginStatus();
  },
  onShow: function(options) {
    console.log('App Show', options);
    this.checkLoginStatus();
  },
  onHide: function() {
    console.log('App Hide');
  },

  methods: {
    checkLoginStatus() {
      // 获取当前页面路径，页面栈未就绪时跳过本次检查
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) return;
      const currentPage = pages[pages.length - 1];
      const currentRoute = currentPage ? '/' + currentPage.route : '';
      if (!currentRoute) return;

      const userInfo = uni.getStorageSync('userInfo');
      // uid 存在即可视为已登录（游客模式也可浏览，下单时再要求登录）
      const isLoggedIn = userInfo && userInfo.uid;

      // 如果是 H5，则这里是商家后台，不做客户端登录拦截（商家后台自己处理登录）
      // #ifdef H5
      return;
      // #endif

      // 未登录且不在白名单，跳登录页
      if (!isLoggedIn && !whiteList.includes(currentRoute)) {
        uni.reLaunch({ url: loginPage });
      }
    }
  }
}
</script>

<style lang="scss">
/* 全局样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  background: #f5f5f5;
  color: #333;
  box-sizing: border-box;
}

/* 通用动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

/* 主题色 */
$primary: #FF6B35;
$primary-light: #fff4f0;
$success: #4cd964;
$warning: #f0ad4e;
$danger: #dd524d;
$bg: #f5f5f5;
$card-bg: #fff;
$text-main: #333;
$text-sub: #666;
$text-light: #999;
$border: #f0f0f0;

/* 通用卡片 */
.card {
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  overflow: hidden;
}

/* 通用按钮 */
.btn-primary {
  background: $primary;
  color: #fff;
  border-radius: 50rpx;
  font-size: 28rpx;
  font-weight: bold;
  text-align: center;
  padding: 20rpx 40rpx;
}

/* 文字截断 */
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 安全区域 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
