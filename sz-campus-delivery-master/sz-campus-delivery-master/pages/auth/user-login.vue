<template>
  <view class="login-page">
    <view class="login-header">
      <image src="/static/logo.png" mode="aspectFill" class="logo" />
      <text class="login-title">校园送</text>
      <text class="login-sub">校园外卖，轻松送达</text>
    </view>

    <view class="login-card">
      <view class="login-tip">
        <text>登录后即可点餐、查看订单</text>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <button class="wx-login-btn" open-type="getUserInfo" @getuserinfo="handleGetUserInfo">
        <text class="wx-icon">☁</text>
        <text>微信一键登录</text>
      </button>
      <!-- #endif -->

      <!-- #ifdef H5 -->
      <view class="h5-login-box">
        <input class="h5-input" v-model="testNickName" placeholder="请输入昵称（测试登录）" maxlength="20" />
        <view class="wx-login-btn" @tap="h5TestLogin">
          <text>游客测试登录</text>
        </view>
      </view>
      <!-- #endif -->

      <view class="guest-btn" @tap="guestLogin">
        <text>暂不登录，先逛逛</text>
      </view>
    </view>

    <view class="login-footer">
      <text>登录即代表同意《校园送用户协议》</text>
    </view>
  </view>
</template>

<script>
import { callUser, showToast } from '../../utils/api.js';

export default {
  data() {
    return {
      testNickName: '校园用户',
      redirectUrl: ''
    };
  },

  onLoad(options) {
    // 如果有重定向地址，登录成功后跳转
    this.redirectUrl = options.redirect || '';
    // 如果已经登录，直接跳走
    const userInfo = uni.getStorageSync('userInfo');
    if (userInfo && userInfo.uid) {
      this.goHome();
    }
  },

  methods: {
    // 微信小程序获取用户信息并登录（兼容旧版 getUserInfo）
    handleGetUserInfo(e) {
      const detail = e.detail || {};
      const userInfo = detail.userInfo || {};
      this.doWxLogin(userInfo);
    },

    async doWxLogin(profile = {}) {
      uni.showLoading({ title: '登录中...', mask: true });
      try {
        // 先获取微信登录 code（某些场景下云函数可能需要）
        const loginRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject
          });
        });

        const res = await callUser('login', {
          code: loginRes.code,
          nickName: profile.nickName || '',
          avatarUrl: profile.avatarUrl || ''
        });

        if (res.code === 0) {
          const data = res.data || {};
          const userInfo = {
            uid: data.uid || data.openid || `user_${Date.now()}`,
            token: data.token || '',
            nickName: data.nickName || profile.nickName || '校园用户',
            avatarUrl: data.avatarUrl || profile.avatarUrl || ''
          };
          uni.setStorageSync('userInfo', userInfo);
          showToast('登录成功', 'success');
          setTimeout(() => this.goHome(), 600);
        } else {
          showToast(res.msg || '登录失败');
        }
      } catch (e) {
        console.error('登录异常:', e);
        showToast('登录异常，请重试');
      } finally {
        uni.hideLoading();
      }
    },

    // H5 测试登录
    async h5TestLogin() {
      if (!this.testNickName.trim()) {
        showToast('请输入昵称');
        return;
      }
      uni.showLoading({ title: '登录中...' });
      try {
        const res = await callUser('login', {
          mock: true,
          nickName: this.testNickName,
          avatarUrl: ''
        });
        if (res.code === 0) {
          const data = res.data || {};
          const userInfo = {
            uid: data.uid || `h5_user_${Date.now()}`,
            token: data.token || '',
            nickName: data.nickName || this.testNickName,
            avatarUrl: data.avatarUrl || ''
          };
          uni.setStorageSync('userInfo', userInfo);
          showToast('登录成功', 'success');
          setTimeout(() => this.goHome(), 600);
        } else {
          showToast(res.msg || '登录失败');
        }
      } catch (e) {
        showToast('登录失败');
      } finally {
        uni.hideLoading();
      }
    },

    // 游客模式（仅允许浏览，下单时再次提示登录）
    guestLogin() {
      const guestInfo = {
        uid: `guest_${Date.now()}`,
        nickName: '游客',
        avatarUrl: '',
        isGuest: true
      };
      uni.setStorageSync('userInfo', guestInfo);
      this.goHome();
    },

    goHome() {
      const url = this.redirectUrl || '/pages/user/home/home';
      if (url.startsWith('/pages/user/home/home')) {
        uni.switchTab({ url: '/pages/user/home/home' });
      } else {
        uni.redirectTo({ url });
      }
    }
  }
};
</script>

<style lang="scss">
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #FF6B35 0%, #FF8C42 45%, #f5f5f5 45%);
  padding: 0 40rpx 60rpx;
  display: flex;
  flex-direction: column;
}

.login-header {
  padding: 120rpx 0 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  .logo {
    width: 160rpx;
    height: 160rpx;
    border-radius: 40rpx;
    border: 6rpx solid rgba(255,255,255,0.4);
    background: #fff;
  }
  .login-title {
    font-size: 52rpx;
    font-weight: bold;
    color: #fff;
    margin-top: 30rpx;
  }
  .login-sub {
    font-size: 28rpx;
    color: rgba(255,255,255,0.85);
    margin-top: 12rpx;
  }
}

.login-card {
  flex: 1;
  background: #fff;
  border-radius: 32rpx;
  padding: 50rpx 40rpx;
  box-shadow: 0 16rpx 60rpx rgba(0,0,0,0.12);
  .login-tip {
    text-align: center;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 50rpx;
  }
}

.wx-login-btn {
  background: #07C160;
  color: #fff;
  border-radius: 50rpx;
  padding: 28rpx 0;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 30rpx;
  &::after { border: none; }
  .wx-icon { font-size: 40rpx; }
}

.h5-login-box {
  .h5-input {
    border: 2rpx solid #eee;
    border-radius: 16rpx;
    padding: 24rpx;
    font-size: 28rpx;
    margin-bottom: 24rpx;
  }
}

.guest-btn {
  text-align: center;
  padding: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.login-footer {
  text-align: center;
  padding: 40rpx 0 20rpx;
  font-size: 22rpx;
  color: #999;
}
</style>
