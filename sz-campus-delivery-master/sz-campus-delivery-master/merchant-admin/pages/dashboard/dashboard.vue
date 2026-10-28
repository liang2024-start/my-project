<template>
  <view class="dashboard-page">
    <!-- 顶部商家信息 -->
    <view class="top-bar">
      <view class="merchant-info">
        <image :src="merchant.cover || '/static/logo.png'" mode="aspectFill" class="m-avatar" />
        <view class="m-text">
          <text class="m-name">{{ merchant.name }}</text>
          <text class="m-category">{{ merchant.category }}</text>
        </view>
      </view>
      <view class="status-toggle" @tap="toggleStatus">
        <view class="status-dot" :class="merchant.status === 1 ? 'open' : 'close'"></view>
        <text class="status-text">{{ merchant.status === 1 ? '营业中' : '休息中' }}</text>
      </view>
    </view>

    <!-- F9: 数据统计 -->
    <view class="stats-section">
      <view class="stats-header">
        <text class="stats-title">经营数据</text>
        <view class="range-tabs">
          <text
            v-for="r in ranges"
            :key="r.value"
            class="range-tab"
            :class="{ active: currentRange === r.value }"
            @tap="switchRange(r.value)"
          >{{ r.label }}</text>
        </view>
      </view>

      <view class="stats-grid">
        <view class="stat-box">
          <text class="stat-val">{{ stats.totalOrders }}</text>
          <text class="stat-label">订单数</text>
        </view>
        <view class="stat-box">
          <text class="stat-val">¥{{ stats.totalRevenue.toFixed(0) }}</text>
          <text class="stat-label">总营收</text>
        </view>
        <view class="stat-box">
          <text class="stat-val">¥{{ stats.avgAmount }}</text>
          <text class="stat-label">客单价</text>
        </view>
      </view>

      <!-- 近7天趋势 -->
      <view class="chart-section">
        <text class="chart-title">近7天订单趋势</text>
        <view class="bar-chart">
          <view v-for="(d, i) in stats.dailyStats" :key="i" class="bar-col">
            <view class="bar-wrap">
              <view class="bar-fill" :style="{ height: getBarHeight(d.orders) + '%' }"></view>
            </view>
            <text class="bar-label">{{ d.date }}</text>
            <text class="bar-val">{{ d.orders }}</text>
          </view>
        </view>
      </view>

      <!-- 状态分布 -->
      <view class="dist-section">
        <text class="chart-title">订单状态分布</text>
        <view class="dist-list">
          <view class="dist-item">
            <text class="dist-label">待接单</text>
            <text class="dist-val">{{ stats.statusDist.pending }}</text>
          </view>
          <view class="dist-item">
            <text class="dist-label">制作中</text>
            <text class="dist-val">{{ stats.statusDist.cooking }}</text>
          </view>
          <view class="dist-item">
            <text class="dist-label">待取餐</text>
            <text class="dist-val">{{ stats.statusDist.waiting }}</text>
          </view>
          <view class="dist-item">
            <text class="dist-label">配送中</text>
            <text class="dist-val">{{ stats.statusDist.delivering }}</text>
          </view>
          <view class="dist-item">
            <text class="dist-label">已完成</text>
            <text class="dist-val">{{ stats.statusDist.finished }}</text>
          </view>
        </view>
      </view>

      <!-- 热销商品 -->
      <view class="top-goods-section" v-if="stats.topGoods && stats.topGoods.length > 0">
        <text class="chart-title">热销商品 Top5</text>
        <view v-for="(g, i) in stats.topGoods" :key="i" class="top-goods-item">
          <text class="goods-rank">{{ i + 1 }}</text>
          <text class="goods-name">{{ g.name }}</text>
          <text class="goods-sales">售{{ g.sales }}份</text>
          <text class="goods-revenue">¥{{ g.revenue.toFixed(0) }}</text>
        </view>
      </view>
    </view>

    <!-- 快速统计行 -->
    <view class="quick-stats-row">
      <view class="qstat-item">
        <text class="qstat-val">{{ pendingCount }}</text>
        <text class="qstat-label">待处理</text>
      </view>
      <view class="qstat-item">
        <text class="qstat-val">{{ activeOrders.length }}</text>
        <text class="qstat-label">进行中</text>
      </view>
      <view class="qstat-item">
        <text class="qstat-val">{{ merchant.salesCount || 0 }}</text>
        <text class="qstat-label">累计订单</text>
      </view>
    </view>

    <!-- 待接单提醒 -->
    <view v-if="newOrders.length > 0" class="new-orders-alert" @tap="goOrders(1)">
      <text class="alert-icon">🔔</text>
      <text class="alert-text">有 {{ newOrders.length }} 笔新订单待接单！</text>
      <text class="alert-btn">立即处理 →</text>
    </view>

    <!-- F16A: 新订单弹窗 -->
    <view v-if="showNewOrderPopup" class="new-order-popup-mask" @tap="dismissPopup">
      <view class="new-order-popup" @tap.stop>
        <view class="popup-header">
          <text class="popup-icon">🔔</text>
          <text class="popup-title">新订单提醒</text>
        </view>
        <view class="popup-body">
          <text class="popup-text">您有 {{ newOrders.length }} 笔新订单待处理！</text>
          <text class="popup-sub">请尽快接单，避免超时</text>
        </view>
        <view class="popup-actions">
          <view class="popup-btn dismiss" @tap="dismissPopup">稍后处理</view>
          <view class="popup-btn go" @tap="goHandleNewOrders">立即接单</view>
        </view>
      </view>
    </view>

    <!-- 进行中的订单 -->
    <view class="section-title">进行中的订单</view>
    <view v-if="activeOrders.length === 0" class="no-active">
      <text>暂无进行中的订单</text>
    </view>
    <view v-for="order in activeOrders" :key="order._id" class="active-order-card">
      <view class="ao-header">
        <text class="ao-no"># {{ order.orderNo?.slice(-6) }}</text>
        <text class="ao-status" :style="`color: ${statusColor(order.status)}`">{{ statusText(order.status) }}</text>
        <text class="ao-type">{{ order.deliveryType === 1 ? '🏠送餐' : '🚶自取' }}</text>
      </view>
      <view v-if="order.expectedTime" class="ao-expected">⏰ 预约 {{ order.expectedTime }}</view>
      <view class="ao-items">
        <text v-for="item in order.items" :key="item.goodsId" class="ao-item">
          {{ item.goodsName }} x{{ item.quantity }}
        </text>
      </view>
      <view v-if="order.address" class="ao-address">📍 {{ order.address }}</view>
      <view v-if="order.remark" class="ao-remark">📝 {{ order.remark }}</view>
      <view class="ao-amount">¥{{ order.actualAmount?.toFixed(2) }}</view>
      <view class="ao-actions">
        <view v-if="order.status === 1" class="ao-btn reject" @tap="rejectOrder(order)">拒单</view>
        <view v-if="order.status === 1" class="ao-btn accept" @tap="acceptOrder(order)">接单</view>
        <view v-if="order.status === 2" class="ao-btn cook" @tap="cookFinish(order)">出餐完成</view>
        <view v-if="order.status === 3 && order.deliveryType === 2" class="ao-btn pickup" @tap="finishOrder(order)">已取餐</view>
        <view v-if="order.status === 3 && order.deliveryType === 1" class="ao-btn sending">待骑手接单</view>
        <view v-if="order.status === 6" class="ao-btn delivering">骑手配送中</view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-nav">
      <view class="qn-item" @tap="goOrders('')">
        <text class="qn-icon">📋</text>
        <text class="qn-label">所有订单</text>
      </view>
      <view class="qn-item" @tap="goGoods">
        <text class="qn-icon">🍔</text>
        <text class="qn-label">商品管理</text>
      </view>
      <view class="qn-item" @tap="goProfile">
        <text class="qn-icon">⚙️</text>
        <text class="qn-label">店铺设置</text>
      </view>
      <view class="qn-item" @tap="logout">
        <text class="qn-icon">🚪</text>
        <text class="qn-label">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { callMerchant, callOrder, orderStatusText, orderStatusColor, showToast, showConfirm } from '../../utils/api.js';

export default {
  data() {
    return {
      merchant: {},
      newOrders: [],
      activeOrders: [],
      pendingCount: 0,
      pollingTimer: null,
      lastOrderCount: 0,
      showNewOrderPopup: false,
      // F9: 统计
      ranges: [
        { label: '今日', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' }
      ],
      currentRange: 'today',
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
        avgAmount: 0,
        statusDist: { pending: 0, cooking: 0, waiting: 0, delivering: 0, finished: 0 },
        topGoods: [],
        dailyStats: []
      }
    };
  },

  onLoad() {
    const info = uni.getStorageSync('merchantInfo');
    if (!info?.merchantId) {
      uni.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.loadDashboard();
  },

  onShow() {
    this.loadDashboard();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  methods: {
    statusText(s) { return orderStatusText(s); },
    statusColor(s) { return orderStatusColor(s); },

    // F16A: 轮询检测新订单
    startPolling() {
      this.pollingTimer = setInterval(() => {
        this.checkNewOrders();
      }, 10000); // 10秒轮询
    },

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    },

    async checkNewOrders() {
      const res = await callOrder('getMerchantOrders', { page: 1, pageSize: 50 });
      if (res.code === 0) {
        const pending = res.data.list.filter(o => o.status === 1);
        // F16A: 新订单检测
        if (pending.length > this.lastOrderCount && this.lastOrderCount > 0) {
          this.showNewOrderPopup = true;
          this.playNotificationSound();
        }
        this.lastOrderCount = pending.length;
        this.newOrders = pending;
        this.activeOrders = res.data.list.filter(o => [1, 2, 3, 6].includes(o.status));
        this.pendingCount = pending.length;
      }
    },

    // F16A: 播放提示音（用 Web Audio API 生成）
    playNotificationSound() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);

        // 第二声
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1000, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          osc2.start(audioCtx.currentTime);
          osc2.stop(audioCtx.currentTime + 0.5);
        }, 300);
      } catch (e) {
        console.log('提示音播放失败:', e.message);
      }
    },

    dismissPopup() {
      this.showNewOrderPopup = false;
    },

    goHandleNewOrders() {
      this.showNewOrderPopup = false;
      this.goOrders(1);
    },

    async loadDashboard() {
      const info = uni.getStorageSync('merchantInfo');
      if (!info) return;

      const mRes = await callMerchant('getInfo', {});
      if (mRes.code === 0) this.merchant = mRes.result || mRes.data;

      await this.loadOrders();
      await this.loadStats();
    },

    async loadOrders() {
      const res = await callOrder('getMerchantOrders', { page: 1, pageSize: 50 });
      if (res.code === 0) {
        const all = res.data.list;
        this.newOrders = all.filter(o => o.status === 1);
        this.activeOrders = all.filter(o => [1, 2, 3, 6].includes(o.status));
        this.pendingCount = this.newOrders.length;
        this.lastOrderCount = this.newOrders.length;
      }
    },

    // F9: 加载统计数据
    async loadStats() {
      const res = await callOrder('getStats', { range: this.currentRange });
      if (res.code === 0) {
        this.stats = res.data;
      }
    },

    switchRange(range) {
      this.currentRange = range;
      this.loadStats();
    },

    // 图表柱状高度
    getBarHeight(value) {
      const max = Math.max(...this.stats.dailyStats.map(d => d.orders), 1);
      return Math.max(5, (value / max) * 100);
    },

    async toggleStatus() {
      const newStatus = this.merchant.status === 1 ? 2 : 1;
      const msg = newStatus === 1 ? '确认开启营业？' : '确认暂停营业？';
      const confirmed = await showConfirm(msg);
      if (!confirmed) return;

      const res = await callMerchant('updateStatus', { status: newStatus });
      if (res.code === 0) {
        this.merchant.status = newStatus;
        showToast(res.msg, 'success');
      }
    },

    async acceptOrder(order) {
      const res = await callOrder('acceptOrder', { orderId: order._id });
      if (res.code === 0) {
        showToast('已接单！', 'success');
        this.loadOrders();
      } else showToast(res.msg);
    },

    async rejectOrder(order) {
      const confirmed = await showConfirm('确认拒绝该订单？');
      if (!confirmed) return;
      const res = await callOrder('cancelOrder', { orderId: order._id, reason: '商家拒单' });
      if (res.code === 0) {
        showToast('已拒单', 'success');
        this.loadOrders();
      } else showToast(res.msg);
    },

    async cookFinish(order) {
      const res = await callOrder('cookFinish', { orderId: order._id });
      if (res.code === 0) {
        showToast('已出餐！', 'success');
        this.loadOrders();
      } else showToast(res.msg);
    },

    async finishOrder(order) {
      const confirmed = await showConfirm('确认顾客已取餐？');
      if (!confirmed) return;
      const res = await callOrder('finishOrder', { orderId: order._id });
      if (res.code === 0) {
        showToast('订单完成！', 'success');
        this.loadOrders();
      } else showToast(res.msg);
    },

    goOrders(status) {
      uni.navigateTo({ url: `/pages/order/order-list?status=${status}` });
    },

    goGoods() {
      uni.navigateTo({ url: '/pages/goods/goods-list' });
    },

    goProfile() {
      uni.navigateTo({ url: '/pages/profile/profile' });
    },

    async logout() {
      const confirmed = await showConfirm('确认退出登录？');
      if (!confirmed) return;
      uni.removeStorageSync('merchantInfo');
      uni.reLaunch({ url: '/pages/login/login' });
    }
  }
};
</script>

<style lang="scss">
.dashboard-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 40rpx; }

.top-bar {
  background: linear-gradient(135deg, #FF6B35, #FF8C42);
  padding: 60rpx 30rpx 30rpx;
  display: flex; align-items: center; justify-content: space-between;
  .merchant-info {
    display: flex; align-items: center; gap: 20rpx;
    .m-avatar { width: 90rpx; height: 90rpx; border-radius: 50%; border: 3rpx solid rgba(255,255,255,0.6); }
    .m-text {
      .m-name { font-size: 32rpx; font-weight: bold; color: #fff; display: block; }
      .m-category { font-size: 22rpx; color: rgba(255,255,255,0.8); display: block; }
    }
  }
  .status-toggle {
    display: flex; align-items: center; gap: 10rpx;
    background: rgba(255,255,255,0.2); padding: 14rpx 24rpx; border-radius: 30rpx;
    .status-dot {
      width: 18rpx; height: 18rpx; border-radius: 50%;
      &.open { background: #4cd964; box-shadow: 0 0 8rpx #4cd964; }
      &.close { background: #ddd; }
    }
    .status-text { font-size: 26rpx; color: #fff; }
  }
}

/* F9: 统计区域 */
.stats-section {
  background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.stats-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx;
  .stats-title { font-size: 30rpx; font-weight: bold; color: #333; }
  .range-tabs { display: flex; gap: 8rpx; }
  .range-tab {
    font-size: 22rpx; padding: 8rpx 20rpx; border-radius: 20rpx;
    background: #f5f5f5; color: #999;
    &.active { background: #FF6B35; color: #fff; font-weight: bold; }
  }
}
.stats-grid {
  display: flex; gap: 16rpx; margin-bottom: 24rpx;
  .stat-box {
    flex: 1; text-align: center; background: #f9f9f9; border-radius: 12rpx; padding: 20rpx 0;
    .stat-val { font-size: 36rpx; font-weight: bold; color: #FF6B35; display: block; }
    .stat-label { font-size: 22rpx; color: #999; margin-top: 6rpx; }
  }
}

.chart-section { margin-bottom: 24rpx; }
.chart-title { font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; display: block; }
.bar-chart {
  display: flex; justify-content: space-between; align-items: flex-end; height: 200rpx; gap: 8rpx;
  .bar-col {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx;
    .bar-wrap {
      width: 100%; height: 140rpx; display: flex; align-items: flex-end; justify-content: center;
      .bar-fill {
        width: 70%; background: linear-gradient(180deg, #FF6B35, #FF8C42);
        border-radius: 6rpx 6rpx 0 0; min-height: 8rpx; transition: height 0.5s;
      }
    }
    .bar-label { font-size: 18rpx; color: #999; }
    .bar-val { font-size: 18rpx; color: #FF6B35; font-weight: bold; }
  }
}

.dist-section { margin-bottom: 24rpx; }
.dist-list {
  display: flex; flex-wrap: wrap; gap: 12rpx;
  .dist-item {
    flex: 1; min-width: 30%; background: #f9f9f9; border-radius: 10rpx; padding: 16rpx;
    text-align: center;
    .dist-label { font-size: 22rpx; color: #999; display: block; }
    .dist-val { font-size: 28rpx; font-weight: bold; color: #333; }
  }
}

.top-goods-section {}
.top-goods-item {
  display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  &:last-child { border-bottom: none; }
  .goods-rank {
    width: 36rpx; height: 36rpx; border-radius: 50%; background: #FF6B35; color: #fff;
    font-size: 22rpx; font-weight: bold; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .goods-name { flex: 1; font-size: 26rpx; color: #333; }
  .goods-sales { font-size: 22rpx; color: #999; }
  .goods-revenue { font-size: 26rpx; color: #FF6B35; font-weight: bold; }
}

/* 快速统计行 */
.quick-stats-row {
  display: flex; background: #fff; margin: 0 20rpx; border-radius: 16rpx; overflow: hidden;
  .qstat-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    padding: 24rpx 0; border-right: 1rpx solid #f5f5f5;
    &:last-child { border-right: none; }
    .qstat-val { font-size: 32rpx; font-weight: bold; color: #FF6B35; }
    .qstat-label { font-size: 22rpx; color: #999; margin-top: 4rpx; }
  }
}

.new-orders-alert {
  display: flex; align-items: center; gap: 12rpx;
  background: #fff4e6; margin: 20rpx; border-radius: 12rpx;
  padding: 20rpx 24rpx; border-left: 6rpx solid #FF6B35;
  .alert-icon { font-size: 36rpx; }
  .alert-text { flex: 1; font-size: 26rpx; color: #333; }
  .alert-btn { font-size: 26rpx; color: #FF6B35; font-weight: bold; }
}

/* F16A: 新订单弹窗 */
.new-order-popup-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.new-order-popup {
  background: #fff; border-radius: 20rpx; width: 80%; max-width: 600rpx;
  overflow: hidden; animation: popupIn 0.3s ease;
}
@keyframes popupIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.popup-header {
  background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30rpx;
  display: flex; align-items: center; gap: 16rpx;
  .popup-icon { font-size: 48rpx; }
  .popup-title { font-size: 32rpx; font-weight: bold; color: #fff; }
}
.popup-body {
  padding: 40rpx 30rpx; text-align: center;
  .popup-text { font-size: 32rpx; font-weight: bold; color: #333; display: block; }
  .popup-sub { font-size: 24rpx; color: #999; margin-top: 12rpx; }
}
.popup-actions {
  display: flex; border-top: 1rpx solid #f0f0f0;
  .popup-btn {
    flex: 1; text-align: center; padding: 28rpx; font-size: 28rpx; font-weight: bold;
    &.dismiss { color: #999; border-right: 1rpx solid #f0f0f0; }
    &.go { color: #FF6B35; }
  }
}

.section-title {
  font-size: 28rpx; font-weight: bold; color: #333;
  padding: 16rpx 30rpx;
}

.no-active {
  background: #fff; margin: 0 20rpx; padding: 40rpx;
  text-align: center; border-radius: 16rpx;
  font-size: 26rpx; color: #999;
}

.active-order-card {
  background: #fff; margin: 0 20rpx 16rpx; border-radius: 16rpx;
  padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  .ao-header {
    display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx;
    .ao-no { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
    .ao-status { font-size: 26rpx; font-weight: bold; }
    .ao-type { font-size: 22rpx; color: #666; background: #f5f5f5; padding: 4rpx 12rpx; border-radius: 20rpx; }
  }
  .ao-expected { font-size: 24rpx; color: #FF6B35; margin-bottom: 8rpx; font-weight: bold; }
  .ao-items {
    display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 12rpx;
    .ao-item { font-size: 26rpx; color: #555; background: #f9f9f9; padding: 6rpx 16rpx; border-radius: 8rpx; }
  }
  .ao-address { font-size: 24rpx; color: #FF6B35; margin-bottom: 8rpx; }
  .ao-remark { font-size: 24rpx; color: #999; margin-bottom: 8rpx; }
  .ao-amount { font-size: 30rpx; font-weight: bold; color: #FF6B35; text-align: right; margin-bottom: 16rpx; }
  .ao-actions {
    display: flex; gap: 16rpx; justify-content: flex-end;
    .ao-btn {
      padding: 16rpx 36rpx; border-radius: 40rpx; font-size: 26rpx; font-weight: bold;
    }
    .reject { border: 2rpx solid #ddd; color: #999; }
    .accept { background: #FF6B35; color: #fff; }
    .cook { background: #4ECDC4; color: #fff; }
    .pickup { background: #4cd964; color: #fff; }
    .sending { background: #f0ad4e; color: #fff; }
    .delivering { background: #FF8C42; color: #fff; }
  }
}

.quick-nav {
  display: flex; background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 10rpx 0;
  .qn-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20rpx;
    .qn-icon { font-size: 48rpx; }
    .qn-label { font-size: 22rpx; color: #666; margin-top: 8rpx; }
  }
}
</style>
