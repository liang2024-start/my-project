<template>
  <view class="orders-page">
    <!-- 状态筛选 Tab -->
    <view class="tab-bar-wrap">
      <scroll-view class="tab-bar" scroll-x>
        <view class="tab-inner">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-item"
            :class="{ active: activeTab === tab.value }"
            @tap="switchTab(tab.value)"
          >
            {{ tab.label }}
            <view v-if="activeTab === tab.value" class="tab-indicator"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 订单列表（页面滚动，不用 scroll-view） -->
    <view class="order-list">
      <view
        v-for="order in orderList"
        :key="order._id"
        class="order-card"
        @tap="goDetail(order._id)"
      >
        <!-- 订单头 -->
        <view class="order-card-header">
          <view class="merchant-info">
            <view class="merchant-avatar">{{ order.merchantName?.charAt(0) || '店' }}</view>
            <text class="order-merchant">{{ order.merchantName }}</text>
          </view>
          <view
            class="status-badge"
            :style="`background:${statusBg(order.status)};color:${statusColor(order.status)}`"
          >
            {{ statusText(order.status) }}
          </view>
        </view>

        <!-- 商品列表缩略 -->
        <view class="order-items-preview">
          <view class="preview-imgs">
            <image
              v-for="(item, idx) in order.items.slice(0, 4)"
              :key="item.goodsId"
              :src="item.goodsImage || '/static/logo.png'"
              mode="aspectFill"
              class="preview-img"
              :style="`margin-left:${idx === 0 ? 0 : -16}rpx;z-index:${10 - idx}`"
            />
          </view>
          <view class="preview-summary">
            <text class="preview-names">{{ order.items.map(i => i.goodsName).join('、') }}</text>
            <text class="preview-count">共{{ totalItemCount(order) }}件</text>
          </view>
          <view class="preview-amount">
            <text class="amount-label">实付</text>
            <text class="amount-val">¥{{ order.actualAmount?.toFixed(2) }}</text>
          </view>
        </view>

        <!-- 订单底部 -->
        <view class="order-card-bottom">
          <view class="order-meta-left">
            <text class="delivery-type-tag">{{ deliveryTypeText(order.deliveryType) }}</text>
            <text class="order-time">{{ formatTime(order.createTime) }}</text>
          </view>
          <view class="order-actions" v-if="order.status === 1 || order.status === 3">
            <view v-if="order.status === 1" class="action-btn cancel" @tap.stop="cancelOrder(order)">取消订单</view>
            <view v-if="order.status === 3" class="action-btn confirm" @tap.stop="confirmReceive(order)">确认取餐</view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">
        <view class="loading-dot"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="noMore && orderList.length > 0" class="no-more">
        <text class="no-more-line"></text>
        <text class="no-more-text">已加载全部</text>
        <text class="no-more-line"></text>
      </view>
      <view v-if="!loading && orderList.length === 0" class="empty">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无订单</text>
        <text class="empty-sub">快去下单吧～</text>
      </view>
    </view>
  </view>
</template>

<script>
import { callOrder, formatTime, orderStatusText, orderStatusColor, deliveryTypeText, showToast, showConfirm } from '../../../utils/api.js';

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
      orderList: [],
      page: 1,
      pageSize: 10,
      loading: false,
      noMore: false
    };
  },

  onLoad() {
    // 先加载缓存
    this.loadFromCache();
    // 再请求云端
    this.loadOrders(true);
  },

  onShow() {
    // 只在从详情页返回时刷新（通过 flag 控制）
    if (this._needRefresh) {
      this._needRefresh = false;
      this.loadOrders(true);
    }
  },

  onReachBottom() {
    if (!this.noMore && !this.loading) {
      this.loadOrders(false);
    }
  },

  methods: {
    statusText(s) { return orderStatusText(s); },
    statusColor(s) { return orderStatusColor(s); },
    statusBg(s) {
      const map = { 0: '#fff4f0', 1: '#fff8e0', 2: '#e0f0ff', 3: '#f0fff3', 4: '#f5f5f5', 5: '#f5f5f5', 6: '#fff4e6' };
      return map[s] || '#f5f5f5';
    },
    formatTime, deliveryTypeText,
    totalItemCount(order) { return order.items.reduce((sum, i) => sum + i.quantity, 0); },

    switchTab(val) {
      this.activeTab = val;
      this.loadOrders(true);
    },

    async loadOrders(reset = false) {
      if (this.loading) return;
      if (reset) { this.page = 1; this.noMore = false; this.orderList = []; }
      this.loading = true;

      try {
        const res = await callOrder('getUserOrders', {
          page: this.page, pageSize: this.pageSize,
          status: this.activeTab
        });
        if (res.code === 0) {
          this.orderList = reset ? res.data.list : [...this.orderList, ...res.data.list];
          if (this.orderList.length >= res.data.total) this.noMore = true;
          else this.page++;
        }
      } finally {
        this.loading = false;
      }
    },

    goDetail(orderId) {
      uni.navigateTo({ url: `/pages/user/order/order-detail?orderId=${orderId}` });
    },

    async cancelOrder(order) {
      const confirmed = await showConfirm('确认取消该订单吗？');
      if (!confirmed) return;
      const res = await callOrder('userCancelOrder', { orderId: order._id });
      if (res.code === 0) {
        showToast('已取消', 'success');
        this.loadOrders(true);
      } else {
        showToast(res.msg);
      }
    },

    async confirmReceive(order) {
      const confirmed = await showConfirm('确认已取到餐了吗？');
      if (!confirmed) return;
      const res = await callOrder('finishOrder', { orderId: order._id });
      if (res.code === 0) {
        showToast('感谢您的光顾！', 'success');
        this.loadOrders(true);
      } else {
        showToast(res.msg);
      }
    }
  }
};
</script>

<style lang="scss">
.orders-page { background: #f5f6f8; min-height: 100vh; padding-bottom: 20rpx; }

/* Tab 栏 */
.tab-bar-wrap {
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  position: sticky;
  top: 0;
  z-index: 10;
}
.tab-bar {
  white-space: nowrap;
  .tab-inner {
    display: inline-flex;
    padding: 0 20rpx;
  }
  .tab-item {
    position: relative;
    display: inline-block;
    padding: 26rpx 28rpx;
    font-size: 27rpx;
    color: #666;
    transition: color 0.2s;
    &.active {
      color: #FF6B35;
      font-weight: bold;
      .tab-indicator {
        position: absolute;
        bottom: 8rpx;
        left: 50%;
        transform: translateX(-50%);
        width: 36rpx;
        height: 6rpx;
        border-radius: 3rpx;
        background: linear-gradient(90deg, #FF6B35, #FF8C42);
      }
    }
  }
}

/* 订单列表 - 改为页面滚动，不限制高度 */
.order-list {
  padding: 0 0 20rpx;
}

/* 订单卡片 */
.order-card {
  background: #fff;
  margin: 16rpx 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
  transition: transform 0.2s;
  &:active { transform: scale(0.98); }
}

.order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 24rpx 16rpx;
  .merchant-info {
    display: flex;
    align-items: center;
    gap: 14rpx;
    .merchant-avatar {
      width: 56rpx;
      height: 56rpx;
      border-radius: 14rpx;
      background: linear-gradient(135deg, #FF6B35, #FF8C42);
      color: #fff;
      font-size: 26rpx;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .order-merchant { font-size: 28rpx; font-weight: bold; color: #1a1a1a; }
  }
  .status-badge {
    font-size: 24rpx;
    font-weight: 600;
    padding: 6rpx 18rpx;
    border-radius: 8rpx;
  }
}

/* 商品预览 */
.order-items-preview {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 20rpx;
  .preview-imgs {
    flex-shrink: 0;
    .preview-img {
      width: 80rpx;
      height: 80rpx;
      border-radius: 12rpx;
      border: 3rpx solid #fff;
    }
  }
  .preview-summary {
    flex: 1;
    overflow: hidden;
    .preview-names {
      font-size: 26rpx;
      color: #333;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview-count {
      font-size: 22rpx;
      color: #999;
      margin-top: 8rpx;
      display: block;
    }
  }
  .preview-amount {
    flex-shrink: 0;
    text-align: right;
    .amount-label { font-size: 22rpx; color: #999; display: block; }
    .amount-val { font-size: 32rpx; color: #FF6B35; font-weight: bold; }
  }
}

/* 订单底部 */
.order-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
  border-top: 1rpx solid #f5f5f5;
  .order-meta-left {
    display: flex;
    align-items: center;
    gap: 14rpx;
    .delivery-type-tag {
      font-size: 22rpx;
      color: #4ECDC4;
      background: #f0fffd;
      padding: 4rpx 14rpx;
      border-radius: 6rpx;
    }
    .order-time { font-size: 22rpx; color: #bbb; }
  }
  .order-actions {
    display: flex;
    gap: 16rpx;
    .action-btn {
      padding: 12rpx 36rpx;
      border-radius: 40rpx;
      font-size: 24rpx;
      transition: all 0.2s;
      &.cancel {
        border: 2rpx solid #ddd;
        color: #777;
        &:active { background: #f5f5f5; }
      }
      &.confirm {
        background: linear-gradient(135deg, #FF6B35, #FF8C42);
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(255,107,53,0.3);
        &:active { transform: scale(0.95); }
      }
    }
  }
}

/* 加载/空状态 */
.loading {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 30rpx; font-size: 26rpx; color: #ccc;
  .loading-dot {
    width: 16rpx; height: 16rpx; border-radius: 50%;
    border: 3rpx solid #FF6B35;
    border-top-color: transparent;
    animation: spin 0.8s linear infinite;
  }
}
@keyframes spin { to { transform: rotate(360deg); } }

.no-more {
  display: flex; align-items: center; justify-content: center; gap: 16rpx;
  padding: 30rpx 0;
  .no-more-line { width: 60rpx; height: 2rpx; background: #ddd; }
  .no-more-text { font-size: 24rpx; color: #ccc; }
}

.empty {
  display: flex; flex-direction: column; align-items: center; padding: 120rpx 0;
  .empty-icon { font-size: 120rpx; margin-bottom: 24rpx; }
  .empty-text { font-size: 30rpx; color: #666; font-weight: 500; }
  .empty-sub { font-size: 24rpx; color: #bbb; margin-top: 8rpx; }
}
</style>
