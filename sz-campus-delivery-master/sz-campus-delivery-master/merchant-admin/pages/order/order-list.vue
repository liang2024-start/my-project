<template>
  <view class="m-orders-page">
    <!-- 状态筛选 -->
    <scroll-view class="tab-bar" scroll-x>
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @tap="switchTab(tab.value)"
      >{{ tab.label }}</view>
    </scroll-view>

    <scroll-view scroll-y class="order-list" @scrolltolower="loadMore" refresher-enabled @refresherrefresh="refresh" :refresher-triggered="refreshing">
      <view v-for="order in orderList" :key="order._id" class="order-card">
        <!-- 头部 -->
        <view class="oc-header">
          <text class="oc-no"># {{ order.orderNo?.slice(-8) }}</text>
          <text class="oc-time">{{ formatTime(order.createTime) }}</text>
          <text class="oc-status" :style="`color:${statusColor(order.status)}`">{{ statusText(order.status) }}</text>
        </view>

        <!-- 用户信息 -->
        <view class="oc-user">
          <text class="oc-user-info">👤 {{ order.userNickName }} {{ order.userPhone ? '| ' + order.userPhone : '' }}</text>
          <text class="oc-delivery">{{ order.deliveryType === 1 ? `🏠 ${order.address}` : '🚶 自取' }}</text>
        </view>

        <!-- 商品 -->
        <view class="oc-items">
          <view v-for="item in order.items" :key="item.goodsId" class="oc-item">
            <text class="oc-item-name">{{ item.goodsName }}</text>
            <text v-if="item.spec" class="oc-item-spec">{{ item.spec }}</text>
            <text class="oc-item-qty">x{{ item.quantity }}</text>
            <text class="oc-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 备注 -->
        <view v-if="order.remark" class="oc-remark">📝 {{ order.remark }}</view>

        <!-- 金额 -->
        <view class="oc-amount">
          <text>合计 <text class="price">¥{{ order.actualAmount?.toFixed(2) }}</text></text>
          <text v-if="order.deliveryFee > 0" class="delivery-fee">含配送 ¥{{ order.deliveryFee.toFixed(2) }}</text>
        </view>

        <!-- 操作按钮 -->
        <view class="oc-actions">
          <view v-if="order.status === 1" class="oc-btn reject" @tap="rejectOrder(order)">拒单</view>
          <view v-if="order.status === 1" class="oc-btn accept" @tap="acceptOrder(order)">接单</view>
          <view v-if="order.status === 2" class="oc-btn cook" @tap="cookFinish(order)">出餐完成</view>
          <view v-if="order.status === 3 && order.deliveryType === 2" class="oc-btn pickup" @tap="finishOrder(order)">顾客已取餐</view>
          <view v-if="order.status === 3 && order.deliveryType === 1" class="oc-btn sending">待骑手接单</view>
          <view v-if="order.status === 6" class="oc-btn delivering">配送中</view>
        </view>
      </view>

      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="noMore && orderList.length > 0" class="no-more">— 已加载全部 —</view>
      <view v-if="!loading && orderList.length === 0" class="empty">
        <text class="empty-icon">📋</text>
        <text>暂无订单</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { callOrder, formatTime, orderStatusText, orderStatusColor, showToast, showConfirm } from '../../utils/api.js';

export default {
  data() {
    return {
      tabs: [
        { label: '全部', value: '' },
        { label: '待接单', value: 1 },
        { label: '制作中', value: 2 },
        { label: '待取餐', value: 3 },
        { label: '配送中', value: 6 },
        { label: '已完成', value: 4 },
        { label: '已取消', value: 5 }
      ],
      activeTab: '',
      orderList: [], page: 1, pageSize: 15,
      loading: false, noMore: false, refreshing: false
    };
  },

  onLoad(options) {
    if (options.status !== undefined) this.activeTab = options.status === '' ? '' : Number(options.status);
    this.loadOrders(true);
  },

  onShow() {
    this.loadOrders(true);
  },

  methods: {
    statusText(s) { return orderStatusText(s); },
    statusColor(s) { return orderStatusColor(s); },
    formatTime,

    switchTab(v) { this.activeTab = v; this.loadOrders(true); },

    async refresh() {
      this.refreshing = true;
      await this.loadOrders(true);
      this.refreshing = false;
    },

    async loadOrders(reset = false) {
      if (this.loading) return;
      if (reset) { this.page = 1; this.noMore = false; this.orderList = []; }
      this.loading = true;
      try {
        const res = await callOrder('getMerchantOrders', {
          page: this.page, pageSize: this.pageSize, status: this.activeTab
        });
        if (res.code === 0) {
          this.orderList = reset ? res.data.list : [...this.orderList, ...res.data.list];
          if (this.orderList.length >= res.data.total) this.noMore = true;
          else this.page++;
        }
      } finally { this.loading = false; }
    },

    loadMore() { if (!this.noMore) this.loadOrders(false); },

    async acceptOrder(order) {
      const res = await callOrder('acceptOrder', { orderId: order._id });
      if (res.code === 0) { showToast('已接单！', 'success'); this.loadOrders(true); }
      else showToast(res.msg);
    },

    async rejectOrder(order) {
      const confirmed = await showConfirm('确认拒绝该订单？');
      if (!confirmed) return;
      const res = await callOrder('cancelOrder', { orderId: order._id, reason: '商家拒单' });
      if (res.code === 0) { showToast('已拒单', 'success'); this.loadOrders(true); }
      else showToast(res.msg);
    },

    async cookFinish(order) {
      const res = await callOrder('cookFinish', { orderId: order._id });
      if (res.code === 0) { showToast('已出餐！', 'success'); this.loadOrders(true); }
      else showToast(res.msg);
    },

    async finishOrder(order) {
      const confirmed = await showConfirm('确认顾客已取餐？');
      if (!confirmed) return;
      const res = await callOrder('finishOrder', { orderId: order._id });
      if (res.code === 0) { showToast('完成！', 'success'); this.loadOrders(true); }
      else showToast(res.msg);
    }
  }
};
</script>

<style lang="scss">
.m-orders-page { background: #f5f5f5; min-height: 100vh; }
.tab-bar {
  background: #fff; white-space: nowrap; border-bottom: 1rpx solid #f0f0f0;
  .tab-item {
    display: inline-block; padding: 24rpx 28rpx; font-size: 26rpx; color: #666;
    &.active { color: #FF6B35; border-bottom: 4rpx solid #FF6B35; font-weight: bold; }
  }
}
.order-list { height: calc(100vh - 100rpx); }
.order-card {
  background: #fff; margin: 16rpx 20rpx; border-radius: 16rpx;
  overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  .oc-header {
    display: flex; align-items: center; padding: 20rpx 24rpx; background: #f9f9f9; gap: 16rpx;
    .oc-no { font-size: 26rpx; font-weight: bold; color: #333; }
    .oc-time { flex: 1; font-size: 22rpx; color: #999; }
    .oc-status { font-size: 26rpx; font-weight: bold; }
  }
  .oc-user {
    padding: 16rpx 24rpx; border-bottom: 1rpx solid #f5f5f5;
    .oc-user-info { font-size: 24rpx; color: #666; display: block; }
    .oc-delivery { font-size: 26rpx; color: #FF6B35; display: block; margin-top: 6rpx; font-weight: bold; }
  }
  .oc-items {
    padding: 10rpx 24rpx;
    .oc-item {
      display: flex; align-items: center; gap: 12rpx; padding: 10rpx 0;
      border-bottom: 1rpx solid #f9f9f9;
      .oc-item-name { flex: 1; font-size: 26rpx; color: #333; }
      .oc-item-spec { font-size: 22rpx; color: #999; }
      .oc-item-qty { font-size: 24rpx; color: #999; }
      .oc-item-price { font-size: 26rpx; color: #FF6B35; }
    }
  }
  .oc-remark { padding: 12rpx 24rpx; font-size: 24rpx; color: #999; border-bottom: 1rpx solid #f5f5f5; }
  .oc-amount {
    padding: 16rpx 24rpx; display: flex; justify-content: space-between; align-items: center;
    font-size: 26rpx; color: #666; border-bottom: 1rpx solid #f5f5f5;
    .price { color: #FF6B35; font-size: 32rpx; font-weight: bold; }
    .delivery-fee { font-size: 22rpx; color: #999; }
  }
  .oc-actions {
    display: flex; gap: 16rpx; justify-content: flex-end; padding: 16rpx 24rpx;
    .oc-btn {
      padding: 14rpx 30rpx; border-radius: 40rpx; font-size: 24rpx; font-weight: bold;
    }
    .reject { border: 2rpx solid #ddd; color: #999; }
    .accept { background: #FF6B35; color: #fff; }
    .cook { background: #4ECDC4; color: #fff; }
    .pickup { background: #4cd964; color: #fff; }
    .sending { background: #f0ad4e; color: #fff; }
    .delivering { background: #FF8C42; color: #fff; }
  }
}
.loading, .no-more { text-align: center; padding: 30rpx; font-size: 26rpx; color: #ccc; }
.empty {
  display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; gap: 20rpx;
  .empty-icon { font-size: 80rpx; }
  font-size: 28rpx; color: #999;
}
</style>
