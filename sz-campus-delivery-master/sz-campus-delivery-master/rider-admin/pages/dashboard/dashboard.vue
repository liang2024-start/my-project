<template>
  <view class="rider-dashboard">
    <!-- 顶部骑手信息 -->
    <view class="top-bar">
      <view class="rider-info">
        <view class="rider-avatar">🛵</view>
        <view class="rider-text">
          <text class="rider-name">{{ riderInfo.name }}</text>
          <text class="rider-stat">已配送 {{ riderInfo.totalDeliveries || 0 }} 单</text>
        </view>
      </view>
      <view class="status-badge" :class="riderStatusClass">
        <view class="status-dot"></view>
        <text>{{ riderStatusText }}</text>
      </view>
    </view>

    <!-- 统计 -->
    <view class="stats-row">
      <view class="stat-item">
        <text class="stat-val">{{ pendingDeliveries.length }}</text>
        <text class="stat-label">待接配送</text>
      </view>
      <view class="stat-item">
        <text class="stat-val">{{ myActiveOrders.length }}</text>
        <text class="stat-label">配送中</text>
      </view>
      <view class="stat-item">
        <text class="stat-val">{{ riderInfo.totalDeliveries || 0 }}</text>
        <text class="stat-label">累计完成</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: activeTab === 'pending' }" @tap="switchTab('pending')">
        待接配送 ({{ pendingDeliveries.length }})
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'active' }" @tap="switchTab('active')">
        我的配送 ({{ myActiveOrders.length }})
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'history' }" @tap="switchTab('history')">
        历史记录
      </view>
    </view>

    <!-- 待接配送列表 -->
    <view v-if="activeTab === 'pending'">
      <view v-if="pendingDeliveries.length === 0" class="empty">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无待接配送订单</text>
      </view>
      <view v-for="order in pendingDeliveries" :key="order._id" class="order-card">
        <view class="oc-header">
          <text class="oc-no"># {{ order.orderNo?.slice(-6) }}</text>
          <text class="oc-merchant">🏪 {{ order.merchantName }}</text>
        </view>
        <view class="oc-items">
          <text v-for="item in order.items" :key="item.goodsId" class="oc-item">
            {{ item.goodsName }} x{{ item.quantity }}
          </text>
        </view>
        <view class="oc-address">
          <text class="addr-label">📍 配送地址</text>
          <text class="addr-text">{{ order.address }}</text>
        </view>
        <view class="oc-amount">¥{{ order.actualAmount?.toFixed(2) }}</view>
        <view class="oc-actions">
          <view class="oc-btn accept" @tap="acceptDelivery(order)">接单配送</view>
        </view>
      </view>
    </view>

    <!-- 我的配送中 -->
    <view v-if="activeTab === 'active'">
      <view v-if="myActiveOrders.length === 0" class="empty">
        <text class="empty-icon">🛵</text>
        <text class="empty-text">暂无配送中订单</text>
      </view>
      <view v-for="order in myActiveOrders" :key="order._id" class="order-card">
        <view class="oc-header">
          <text class="oc-no"># {{ order.orderNo?.slice(-6) }}</text>
          <text class="oc-status delivering">配送中</text>
        </view>
        <view class="oc-items">
          <text v-for="item in order.items" :key="item.goodsId" class="oc-item">
            {{ item.goodsName }} x{{ item.quantity }}
          </text>
        </view>
        <view class="oc-address">
          <text class="addr-label">📍 配送地址</text>
          <text class="addr-text">{{ order.address }}</text>
        </view>
        <view class="oc-amount">¥{{ order.actualAmount?.toFixed(2) }}</view>
        <view class="oc-actions">
          <view class="oc-btn complete" @tap="completeDelivery(order)">确认送达</view>
        </view>
      </view>
    </view>

    <!-- 历史记录 -->
    <view v-if="activeTab === 'history'">
      <view v-if="historyOrders.length === 0" class="empty">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无配送记录</text>
      </view>
      <view v-for="order in historyOrders" :key="order._id" class="order-card">
        <view class="oc-header">
          <text class="oc-no"># {{ order.orderNo?.slice(-6) }}</text>
          <text class="oc-status done">已完成</text>
        </view>
        <view class="oc-items">
          <text v-for="item in order.items" :key="item.goodsId" class="oc-item">
            {{ item.goodsName }} x{{ item.quantity }}
          </text>
        </view>
        <view class="oc-address">
          <text class="addr-label">📍</text>
          <text class="addr-text">{{ order.address }}</text>
        </view>
        <view class="oc-time">{{ formatTime(order.finishTime) }}</view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @tap="logout">退出登录</view>
  </view>
</template>

<script>
import { callOrder, formatTime, showToast, showConfirm } from '../../utils/api.js';

export default {
  data() {
    return {
      riderInfo: {},
      activeTab: 'pending',
      pendingDeliveries: [],
      myActiveOrders: [],
      historyOrders: [],
      pollingTimer: null
    };
  },

  computed: {
    riderStatusText() {
      return this.myActiveOrders.length > 0 ? '配送中' : '空闲';
    },
    riderStatusClass() {
      return this.myActiveOrders.length > 0 ? 'busy' : 'free';
    }
  },

  onLoad() {
    const info = uni.getStorageSync('riderInfo');
    if (!info?.riderId) {
      uni.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.riderInfo = info;
    this.loadData();
  },

  onShow() {
    this.loadData();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  methods: {
    formatTime,

    startPolling() {
      this.pollingTimer = setInterval(() => {
        this.loadPendingDeliveries();
        this.loadMyOrders();
      }, 15000);
    },

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    },

    switchTab(tab) {
      this.activeTab = tab;
      if (tab === 'history') this.loadHistory();
    },

    async loadData() {
      await Promise.all([
        this.loadPendingDeliveries(),
        this.loadMyOrders()
      ]);
    },

    async loadPendingDeliveries() {
      const res = await callOrder('getPendingDeliveries', { page: 1, pageSize: 20 });
      if (res.code === 0) {
        this.pendingDeliveries = res.data.list;
      }
    },

    async loadMyOrders() {
      const res = await callOrder('getRiderOrders', { page: 1, pageSize: 20, status: 6 });
      if (res.code === 0) {
        this.myActiveOrders = res.data.list;
      }
    },

    async loadHistory() {
      const res = await callOrder('getRiderOrders', { page: 1, pageSize: 50, status: 4 });
      if (res.code === 0) {
        this.historyOrders = res.data.list;
      }
    },

    async acceptDelivery(order) {
      const confirmed = await showConfirm('确认接单配送？');
      if (!confirmed) return;
      const res = await callOrder('riderAcceptDelivery', { orderId: order._id });
      if (res.code === 0) {
        showToast('接单成功！', 'success');
        this.loadData();
      } else {
        showToast(res.msg);
      }
    },

    async completeDelivery(order) {
      const confirmed = await showConfirm('确认已送达？');
      if (!confirmed) return;
      const res = await callOrder('riderCompleteDelivery', { orderId: order._id });
      if (res.code === 0) {
        showToast('配送完成！', 'success');
        // 更新骑手信息
        this.riderInfo.totalDeliveries = (this.riderInfo.totalDeliveries || 0) + 1;
        uni.setStorageSync('riderInfo', this.riderInfo);
        this.loadData();
      } else {
        showToast(res.msg);
      }
    },

    async logout() {
      const confirmed = await showConfirm('确认退出登录？');
      if (!confirmed) return;
      uni.removeStorageSync('riderInfo');
      uni.reLaunch({ url: '/pages/login/login' });
    }
  }
};
</script>

<style lang="scss">
.rider-dashboard { background: #f5f5f5; min-height: 100vh; padding-bottom: 40rpx; }

.top-bar {
  background: linear-gradient(135deg, #4ECDC4, #45B7D1);
  padding: 50rpx 30rpx 30rpx;
  display: flex; align-items: center; justify-content: space-between;
  .rider-info {
    display: flex; align-items: center; gap: 20rpx;
    .rider-avatar {
      width: 90rpx; height: 90rpx; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 48rpx;
    }
    .rider-text {
      .rider-name { font-size: 32rpx; font-weight: bold; color: #fff; display: block; }
      .rider-stat { font-size: 22rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 4rpx; }
    }
  }
  .status-badge {
    display: flex; align-items: center; gap: 8rpx;
    background: rgba(255,255,255,0.2); padding: 12rpx 20rpx; border-radius: 30rpx;
    font-size: 24rpx; color: #fff;
    .status-dot { width: 14rpx; height: 14rpx; border-radius: 50%; }
    &.free .status-dot { background: #4cd964; box-shadow: 0 0 6rpx #4cd964; }
    &.busy .status-dot { background: #FFA500; box-shadow: 0 0 6rpx #FFA500; }
  }
}

.stats-row {
  display: flex; background: #fff; margin: 20rpx; border-radius: 16rpx; overflow: hidden;
  .stat-item {
    flex: 1; text-align: center; padding: 24rpx 0;
    border-right: 1rpx solid #f5f5f5;
    &:last-child { border-right: none; }
    .stat-val { font-size: 36rpx; font-weight: bold; color: #4ECDC4; }
    .stat-label { font-size: 22rpx; color: #999; margin-top: 4rpx; }
  }
}

.tab-bar {
  display: flex; background: #fff; margin: 0 20rpx; border-radius: 12rpx; overflow: hidden;
  .tab-item {
    flex: 1; text-align: center; padding: 20rpx; font-size: 24rpx; color: #666;
    border-bottom: 4rpx solid transparent;
    &.active { color: #4ECDC4; border-bottom-color: #4ECDC4; font-weight: bold; }
  }
}

.empty {
  display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; gap: 16rpx;
  .empty-icon { font-size: 80rpx; }
  .empty-text { font-size: 26rpx; color: #999; }
}

.order-card {
  background: #fff; margin: 16rpx 20rpx; border-radius: 16rpx;
  padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  .oc-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx;
    .oc-no { font-size: 26rpx; font-weight: bold; color: #333; }
    .oc-merchant { font-size: 24rpx; color: #666; }
    .oc-status { font-size: 24rpx; font-weight: bold; padding: 4rpx 16rpx; border-radius: 20rpx; }
    .oc-status.delivering { color: #FF8C42; background: #fff4e6; }
    .oc-status.done { color: #999; background: #f5f5f5; }
  }
  .oc-items {
    display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 12rpx;
    .oc-item { font-size: 24rpx; color: #555; background: #f9f9f9; padding: 6rpx 14rpx; border-radius: 8rpx; }
  }
  .oc-address {
    background: #f0fff3; border-radius: 10rpx; padding: 16rpx; margin-bottom: 12rpx;
    .addr-label { font-size: 22rpx; color: #4cd964; display: block; margin-bottom: 6rpx; }
    .addr-text { font-size: 26rpx; color: #333; font-weight: bold; }
  }
  .oc-amount { font-size: 30rpx; font-weight: bold; color: #FF6B35; text-align: right; margin-bottom: 16rpx; }
  .oc-time { font-size: 22rpx; color: #999; text-align: right; }
  .oc-actions {
    display: flex; justify-content: flex-end;
    .oc-btn {
      padding: 16rpx 40rpx; border-radius: 40rpx; font-size: 26rpx; font-weight: bold;
    }
    .accept { background: #4ECDC4; color: #fff; }
    .complete { background: #4cd964; color: #fff; }
  }
}

.logout-btn {
  margin: 40rpx 20rpx; text-align: center; padding: 24rpx;
  background: #fff; border-radius: 16rpx; color: #dd524d; font-size: 28rpx;
}
</style>
