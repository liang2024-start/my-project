<template>
  <view class="mine-page">
    <!-- 用户头部 -->
    <view class="user-header">
      <view class="header-bg-deco"></view>
      <view class="header-content">
        <view class="avatar-wrap" @tap="goLogin">
          <image :src="userInfo.avatarUrl || '/static/logo.png'" mode="aspectFill" class="avatar" />
          <view class="avatar-ring"></view>
        </view>
        <view class="user-text">
          <text class="user-name">{{ userInfo.nickName || '点击登录' }}</text>
          <text class="user-tip">{{ isLogin ? '欢迎使用校园送 🎉' : '登录后享受更多服务' }}</text>
        </view>
        <view v-if="isLogin" class="login-badge">
          <view class="badge-dot"></view>
          <text>已登录</text>
        </view>
      </view>
    </view>

    <!-- 订单统计卡片 -->
    <view class="stats-card" v-if="isLogin">
      <view class="stat-item">
        <text class="stat-num">{{ orderStats.total || 0 }}</text>
        <text class="stat-label">总订单</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-num">{{ orderStats.monthCount || 0 }}</text>
        <text class="stat-label">本月</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-num">¥{{ orderStats.totalAmount?.toFixed(1) || '0.0' }}</text>
        <text class="stat-label">累计消费</text>
      </view>
    </view>

    <!-- 快捷订单 -->
    <view class="order-quick">
      <view class="section-head">
        <text class="section-title">我的订单</text>
        <text class="section-more" @tap="goOrders('')">全部 ›</text>
      </view>
      <view class="order-quick-tabs">
        <view v-for="tab in orderTabs" :key="tab.status" class="quick-tab" @tap="goOrders(tab.status)">
          <view class="quick-icon-wrap" :style="`background:${tab.bg}`">
            <text class="quick-icon">{{ tab.icon }}</text>
          </view>
          <text class="quick-label">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-list">
      <view class="menu-item" @tap="goOrders('')">
        <view class="menu-icon-wrap" style="background:#fff4f0">
          <text class="menu-icon">📋</text>
        </view>
        <text class="menu-text">全部订单</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showAbout">
        <view class="menu-icon-wrap" style="background:#f0f0ff">
          <text class="menu-icon">ℹ️</text>
        </view>
        <text class="menu-text">关于校园送</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showFeedback">
        <view class="menu-icon-wrap" style="background:#fff8e0">
          <text class="menu-icon">💬</text>
        </view>
        <text class="menu-text">意见反馈</text>
        <text class="menu-arrow">›</text>
      </view>
      <view v-if="isLogin" class="menu-item logout" @tap="logout">
        <view class="menu-icon-wrap" style="background:#fff0f0">
          <text class="menu-icon">🚪</text>
        </view>
        <text class="menu-text">退出登录</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version-info">
      <text class="version-text">校园送 v1.0.0</text>
      <text class="version-sub">专为校园生活打造</text>
    </view>
  </view>
</template>

<script>
import { showConfirm, showToast } from '../../../utils/api.js';

export default {
  data() {
    return {
      userInfo: {},
      orderStats: {
        total: 0,
        monthCount: 0,
        totalAmount: 0
      },
      orderTabs: [
        { icon: '⏳', label: '待接单', status: 1, bg: 'linear-gradient(135deg,#fff8e0,#ffefcc)' },
        { icon: '🍳', label: '制作中', status: 2, bg: 'linear-gradient(135deg,#e0f0ff,#cce5ff)' },
        { icon: '🛵', label: '待取餐', status: 3, bg: 'linear-gradient(135deg,#f0fff3,#dcffe6)' },
        { icon: '✅', label: '已完成', status: 4, bg: 'linear-gradient(135deg,#f5f5f5,#e8e8e8)' }
      ]
    };
  },

  computed: {
    isLogin() {
      return this.userInfo && this.userInfo.uid && !this.userInfo.isGuest;
    }
  },

  onShow() {
    const info = uni.getStorageSync('userInfo');
    this.userInfo = info || {};
  },

  methods: {
    goLogin() {
      if (this.isLogin) return;
      uni.navigateTo({ url: '/pages/auth/user-login' });
    },

    async logout() {
      const confirmed = await showConfirm('确认退出登录？');
      if (!confirmed) return;
      uni.removeStorageSync('userInfo');
      this.userInfo = {};
      showToast('已退出登录', 'success');
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/auth/user-login' });
      }, 600);
    },

    goOrders(status) {
      uni.switchTab({ url: '/pages/user/order/order-list' });
    },

    showAbout() {
      uni.showModal({
        title: '关于校园送',
        content: '校园送 - 专为在校学生打造的校园外卖平台\n让美食轻松送达宿舍！\n版本：1.0.0',
        showCancel: false
      });
    },

    showFeedback() {
      uni.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
};
</script>

<style lang="scss">
.mine-page { background: #f5f6f8; min-height: 100vh; padding-bottom: 40rpx; }

/* 用户头部 */
.user-header {
  position: relative;
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
  padding: 70rpx 30rpx 50rpx;
  overflow: hidden;
  .header-bg-deco {
    position: absolute;
    top: -100rpx;
    right: -80rpx;
    width: 360rpx;
    height: 360rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .header-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 24rpx;
    z-index: 2;
  }
  .avatar-wrap {
    position: relative;
    .avatar {
      width: 130rpx;
      height: 130rpx;
      border-radius: 50%;
      border: 5rpx solid rgba(255,255,255,0.7);
    }
    .avatar-ring {
      position: absolute;
      top: -8rpx; left: -8rpx;
      width: 146rpx; height: 146rpx;
      border-radius: 50%;
      border: 3rpx solid rgba(255,255,255,0.3);
    }
  }
  .user-text {
    flex: 1;
    .user-name { font-size: 36rpx; font-weight: bold; color: #fff; display: block; }
    .user-tip { font-size: 24rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 8rpx; }
  }
  .login-badge {
    display: flex;
    align-items: center;
    gap: 8rpx;
    background: rgba(255,255,255,0.2);
    backdrop-filter: blur(8rpx);
    padding: 12rpx 20rpx;
    border-radius: 30rpx;
    font-size: 22rpx;
    color: #fff;
    .badge-dot {
      width: 12rpx; height: 12rpx; border-radius: 50%;
      background: #4cd964;
      box-shadow: 0 0 8rpx #4cd964;
    }
  }
}

/* 统计卡片 */
.stats-card {
  display: flex;
  align-items: center;
  background: #fff;
  margin: -30rpx 20rpx 0;
  border-radius: 20rpx;
  padding: 30rpx 0;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
  position: relative;
  z-index: 5;
  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    .stat-num { font-size: 36rpx; font-weight: bold; color: #FF6B35; }
    .stat-label { font-size: 22rpx; color: #999; }
  }
  .stat-divider {
    width: 1rpx;
    height: 60rpx;
    background: #f0f0f0;
  }
}

/* 快捷订单 */
.order-quick {
  background: #fff;
  margin: 20rpx;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    .section-title { font-size: 30rpx; font-weight: bold; color: #1a1a1a; }
    .section-more { font-size: 24rpx; color: #999; }
  }
  .order-quick-tabs {
    display: flex;
    justify-content: space-around;
    .quick-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      padding: 8rpx 10rpx;
      .quick-icon-wrap {
        width: 90rpx;
        height: 90rpx;
        border-radius: 24rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      .quick-icon { font-size: 42rpx; }
      .quick-label { font-size: 22rpx; color: #555; }
      &:active .quick-icon-wrap { transform: scale(0.92); }
    }
  }
}

/* 功能菜单 */
.menu-list {
  background: #fff;
  margin: 0 20rpx 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  .menu-item {
    display: flex;
    align-items: center;
    padding: 28rpx 24rpx;
    border-bottom: 1rpx solid #f8f8f8;
    transition: background 0.2s;
    &:last-child { border-bottom: none; }
    &:active { background: #fafafa; }
    .menu-icon-wrap {
      width: 64rpx;
      height: 64rpx;
      border-radius: 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;
    }
    .menu-icon { font-size: 32rpx; }
    .menu-text { flex: 1; font-size: 28rpx; color: #333; }
    .menu-arrow { font-size: 36rpx; color: #ccc; }
    &.logout {
      .menu-text { color: #dd524d; }
    }
  }
}

/* 版本信息 */
.version-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 40rpx 0 20rpx;
  .version-text { font-size: 24rpx; color: #bbb; }
  .version-sub { font-size: 20rpx; color: #ddd; }
}
</style>
