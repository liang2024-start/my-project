<template>
  <view class="order-detail-page" v-if="order._id">
    <!-- 状态卡片 -->
    <view class="status-card" :class="`status-${order.status}`">
      <text class="status-icon">{{ statusIcon(order.status) }}</text>
      <text class="status-text">{{ statusText(order.status) }}</text>
      <text class="status-desc">{{ statusDesc(order.status, order.deliveryType) }}</text>
    </view>

    <!-- F2: 订单状态进度条 -->
    <view class="progress-card" v-if="order.status !== 5 && order.status !== 0">
      <view class="progress-track">
        <view class="progress-line">
          <view class="progress-line-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <view class="progress-steps">
          <view v-for="(step, i) in progressSteps" :key="i" class="step-item" :class="{ active: step.active, done: step.done }">
            <view class="step-dot">
              <text v-if="step.done" class="step-check">✓</text>
              <text v-else class="step-num">{{ i + 1 }}</text>
            </view>
            <text class="step-label">{{ step.label }}</text>
            <text v-if="step.time" class="step-time">{{ formatTimeShort(step.time) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 预约时间 -->
    <view class="info-card" v-if="order.expectedTime">
      <view class="info-row">
        <text class="info-label">⏰ 预约取餐</text>
        <text class="info-val highlight">{{ order.expectedTime }}</text>
      </view>
    </view>

    <!-- 配送信息 -->
    <view class="info-card" v-if="order.deliveryType === 1 && order.address">
      <view class="info-row">
        <text class="info-label">🏠 送餐地址</text>
        <text class="info-val">{{ order.address }}</text>
      </view>
    </view>
    <view class="info-card" v-if="order.deliveryType === 2">
      <view class="info-row">
        <text class="info-label">🚶 取餐方式</text>
        <text class="info-val">自取 - {{ order.merchantName }}</text>
      </view>
    </view>

    <!-- 骑手信息 -->
    <view class="info-card" v-if="order.status === 6 && order.riderName">
      <view class="info-row">
        <text class="info-label">🛵 配送骑手</text>
        <text class="info-val">{{ order.riderName }} 正在配送中</text>
      </view>
    </view>

    <!-- 商家信息 -->
    <view class="info-card">
      <view class="info-row">
        <text class="info-label">🏪 商家</text>
        <text class="info-val">{{ order.merchantName }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="goods-card">
      <view class="goods-card-title">订单商品</view>
      <view v-for="item in order.items" :key="item.goodsId" class="goods-row">
        <image :src="item.goodsImage || '/static/logo.png'" mode="aspectFill" class="goods-img" />
        <view class="goods-info">
          <text class="goods-name">{{ item.goodsName }}</text>
          <text v-if="item.spec" class="goods-spec">{{ item.spec }}</text>
        </view>
        <view class="goods-right">
          <text class="goods-price">¥{{ item.price.toFixed(2) }}</text>
          <text class="goods-qty">x{{ item.quantity }}</text>
        </view>
      </view>
    </view>

    <!-- 备注 -->
    <view class="info-card" v-if="order.remark">
      <view class="info-row">
        <text class="info-label">📝 备注</text>
        <text class="info-val">{{ order.remark }}</text>
      </view>
    </view>

    <!-- 价格明细 -->
    <view class="price-card">
      <view class="price-row">
        <text>商品小计</text>
        <text>¥{{ order.totalAmount?.toFixed(2) }}</text>
      </view>
      <view class="price-row" v-if="order.deliveryFee > 0">
        <text>配送费</text>
        <text>¥{{ order.deliveryFee.toFixed(2) }}</text>
      </view>
      <view class="price-row total">
        <text>实付金额</text>
        <text class="total-price">¥{{ order.actualAmount?.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="info-card order-meta">
      <view class="info-row">
        <text class="info-label">订单号</text>
        <text class="info-val">{{ order.orderNo }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">下单时间</text>
        <text class="info-val">{{ formatTime(order.createTime) }}</text>
      </view>
      <view class="info-row" v-if="order.acceptTime">
        <text class="info-label">接单时间</text>
        <text class="info-val">{{ formatTime(order.acceptTime) }}</text>
      </view>
      <view class="info-row" v-if="order.cookFinishTime">
        <text class="info-label">出餐时间</text>
        <text class="info-val">{{ formatTime(order.cookFinishTime) }}</text>
      </view>
      <view class="info-row" v-if="order.finishTime">
        <text class="info-label">完成时间</text>
        <text class="info-val">{{ formatTime(order.finishTime) }}</text>
      </view>
      <view class="info-row" v-if="order.cancelReason">
        <text class="info-label">取消原因</text>
        <text class="info-val cancel-reason">{{ order.cancelReason }}</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-bar" v-if="order.status === 1 || order.status === 3 || order.status === 4">
      <view v-if="order.status === 1" class="action-btn cancel" @tap="cancelOrder">取消订单</view>
      <view v-if="order.status === 3" class="action-btn primary" @tap="confirmReceive">确认取餐</view>
      <!-- F3: 再来一单 -->
      <view v-if="order.status === 4" class="action-btn primary" @tap="reorder">再来一单</view>
    </view>
    <view style="height: 160rpx;"></view>
  </view>

  <view v-else class="loading-page">
    <text>加载中...</text>
  </view>
</template>

<script>
import { callOrder, formatTime, orderStatusText, showToast, showConfirm } from '../../../utils/api.js';
import { batchAddToCart } from '../../../store/cart.js';

export default {
  data() {
    return { orderId: '', order: {} };
  },

  onLoad(options) {
    this.orderId = options.orderId;
    this.loadOrder();
  },

  onShow() {
    if (this.orderId) this.loadOrder();
  },

  computed: {
    // F2: 进度条步骤
    progressSteps() {
      if (!this.order.status) return [];
      const s = this.order.status;
      // 配送订单: 下单 → 接单 → 制作 → 出餐 → 配送 → 完成
      // 自取订单: 下单 → 接单 → 制作 → 出餐 → 完成
      const isDelivery = this.order.deliveryType === 1;
      const steps = isDelivery
        ? [
            { label: '下单', time: this.order.createTime },
            { label: '接单', time: this.order.acceptTime },
            { label: '制作', time: this.order.acceptTime },
            { label: '出餐', time: this.order.cookFinishTime },
            { label: '配送', time: this.order.deliverStartTime },
            { label: '完成', time: this.order.finishTime }
          ]
        : [
            { label: '下单', time: this.order.createTime },
            { label: '接单', time: this.order.acceptTime },
            { label: '制作', time: this.order.acceptTime },
            { label: '出餐', time: this.order.cookFinishTime },
            { label: '完成', time: this.order.finishTime }
          ];

      const activeIndex = isDelivery
        ? [0, 1, 2, 3, 5, 6].indexOf(s) // 0→0, 1→1, 2→2, 3→3, 6→5(配送), 4→6(完成)
        : [0, 1, 2, 3, 4].indexOf(s);    // 0→0, 1→1, 2→2, 3→3, 4→4(完成)

      const resolvedIndex = activeIndex === -1 ? steps.length - 1 : activeIndex;

      return steps.map((step, i) => ({
        ...step,
        active: i === resolvedIndex,
        done: i < resolvedIndex || s === 4
      }));
    },

    progressPercent() {
      const total = this.progressSteps.length;
      if (total === 0) return 0;
      const activeIdx = this.progressSteps.findIndex(s => s.active);
      if (activeIdx === -1) return 100;
      return (activeIdx / (total - 1)) * 100;
    }
  },

  methods: {
    formatTime,

    formatTimeShort(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    async loadOrder() {
      const res = await callOrder('getOrderDetail', { orderId: this.orderId });
      if (res.code === 0) {
        this.order = res.data;
        uni.setNavigationBarTitle({ title: `订单详情` });
      }
    },

    statusText(s) { return orderStatusText(s); },

    statusIcon(s) {
      return ['💳','⏳','👨‍🍳','🛵','✅','❌','🛵'][s] || '📋';
    },

    statusDesc(status, deliveryType) {
      const map = {
        0: '等待支付', 1: '等待商家接单，请耐心等候',
        2: '商家正在努力制作中...', 3: deliveryType === 1 ? '餐已准备好，等待骑手配送' : '餐已准备好，请尽快来取',
        4: '订单已完成，感谢光顾 😊', 5: '订单已取消',
        6: '骑手正在配送中，请保持手机畅通'
      };
      return map[status] || '';
    },

    async cancelOrder() {
      const confirmed = await showConfirm('确认取消该订单吗？');
      if (!confirmed) return;
      const res = await callOrder('userCancelOrder', { orderId: this.orderId });
      if (res.code === 0) {
        showToast('已取消', 'success');
        this.loadOrder();
      } else showToast(res.msg);
    },

    async confirmReceive() {
      const confirmed = await showConfirm('确认已取到餐了吗？');
      if (!confirmed) return;
      const res = await callOrder('finishOrder', { orderId: this.orderId });
      if (res.code === 0) {
        showToast('感谢您的光顾！', 'success');
        this.loadOrder();
      } else showToast(res.msg);
    },

    // F3: 再来一单
    reorder() {
      const items = this.order.items.map(item => ({
        goodsId: item.goodsId,
        goodsName: item.goodsName,
        goodsImage: item.goodsImage,
        price: item.price,
        quantity: item.quantity,
        spec: item.spec || ''
      }));

      batchAddToCart(this.order.merchantId, this.order.merchantName, items);
      showToast('已加入购物车', 'success');

      setTimeout(() => {
        uni.navigateTo({
          url: `/pages/user/shop/shop?merchantId=${this.order.merchantId}`
        });
      }, 800);
    }
  }
};
</script>

<style lang="scss">
.order-detail-page { background: #f5f5f5; min-height: 100vh; padding: 20rpx; }

.status-card {
  border-radius: 20rpx; padding: 40rpx;
  display: flex; flex-direction: column; align-items: center;
  margin-bottom: 20rpx; color: #fff;
  &.status-0, &.status-5 { background: linear-gradient(135deg, #bbb, #999); }
  &.status-1 { background: linear-gradient(135deg, #FF6B35, #FF8C42); }
  &.status-2 { background: linear-gradient(135deg, #4ECDC4, #45B7D1); }
  &.status-3 { background: linear-gradient(135deg, #96CEB4, #4cd964); }
  &.status-4 { background: linear-gradient(135deg, #a8edea, #71c280); }
  &.status-6 { background: linear-gradient(135deg, #FF8C42, #FFA500); }
  .status-icon { font-size: 72rpx; }
  .status-text { font-size: 36rpx; font-weight: bold; margin: 10rpx 0; }
  .status-desc { font-size: 26rpx; opacity: 0.85; text-align: center; }
}

/* F2: 进度条 */
.progress-card {
  background: #fff; border-radius: 16rpx; padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
}
.progress-track { position: relative; }
.progress-line {
  position: absolute; top: 20rpx; left: 30rpx; right: 30rpx;
  height: 4rpx; background: #eee; z-index: 1;
  .progress-line-fill {
    height: 100%; background: linear-gradient(90deg, #4cd964, #FF6B35);
    transition: width 0.5s ease; border-radius: 2rpx;
  }
}
.progress-steps {
  display: flex; justify-content: space-between; position: relative; z-index: 2;
}
.step-item {
  display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  flex: 1;
  .step-dot {
    width: 40rpx; height: 40rpx; border-radius: 50%;
    background: #eee; display: flex; align-items: center; justify-content: center;
    font-size: 22rpx; color: #999; transition: all 0.3s;
    border: 4rpx solid #fff;
  }
  .step-label { font-size: 22rpx; color: #999; }
  .step-time { font-size: 18rpx; color: #ccc; }
  &.active {
    .step-dot {
      background: #FF6B35; color: #fff;
      box-shadow: 0 0 12rpx rgba(255,107,53,0.4);
      transform: scale(1.15);
    }
    .step-label { color: #FF6B35; font-weight: bold; }
  }
  &.done {
    .step-dot { background: #4cd964; color: #fff; }
    .step-label { color: #4cd964; }
  }
}

.info-card, .goods-card, .price-card {
  background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx;
  margin-bottom: 16rpx;
}

.info-row {
  display: flex; justify-content: space-between; padding: 10rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  &:last-child { border-bottom: none; }
  .info-label { font-size: 26rpx; color: #999; }
  .info-val { font-size: 26rpx; color: #333; flex: 1; text-align: right; padding-left: 20rpx; }
  .info-val.highlight { color: #FF6B35; font-weight: bold; }
  .cancel-reason { color: #dd524d; }
}

.goods-card-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }

.goods-row {
  display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5;
  &:last-child { border-bottom: none; }
  .goods-img { width: 80rpx; height: 80rpx; border-radius: 8rpx; }
  .goods-info {
    flex: 1; margin: 0 16rpx;
    .goods-name { font-size: 26rpx; color: #333; display: block; }
    .goods-spec { font-size: 22rpx; color: #999; display: block; }
  }
  .goods-right {
    text-align: right;
    .goods-price { display: block; font-size: 26rpx; color: #FF6B35; }
    .goods-qty { font-size: 22rpx; color: #999; }
  }
}

.price-card {
  .price-row {
    display: flex; justify-content: space-between; padding: 12rpx 0;
    font-size: 26rpx; color: #666; border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }
    &.total { font-size: 28rpx; color: #333; font-weight: bold; }
    .total-price { color: #FF6B35; font-size: 32rpx; }
  }
}

.order-meta .info-row .info-label { min-width: 120rpx; }

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; padding: 16rpx 30rpx; border-top: 1rpx solid #f0f0f0;
  display: flex; gap: 20rpx; justify-content: flex-end; z-index: 100;
  .action-btn {
    padding: 20rpx 50rpx; border-radius: 50rpx; font-size: 28rpx;
    &.cancel { border: 2rpx solid #ddd; color: #666; }
    &.primary { background: #FF6B35; color: #fff; font-weight: bold; }
  }
}

.loading-page { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 28rpx; color: #999; }
</style>
