<template>
  <view class="cart-page">
    <view v-if="cartItems.length === 0" class="empty-cart">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车是空的</text>
      <view class="go-order-btn" @tap="goHome">去点餐</view>
    </view>

    <view v-else>
      <!-- 商家信息 -->
      <view class="merchant-bar">
        <text class="merchant-name">🏪 {{ merchantName }}</text>
      </view>

      <!-- 商品列表 -->
      <view class="cart-items">
        <view v-for="item in cartItems" :key="`${item.goodsId}_${item.spec}`" class="cart-item">
          <image :src="item.goodsImage || '/static/logo.png'" mode="aspectFill" class="item-img" />
          <view class="item-info">
            <text class="item-name">{{ item.goodsName }}</text>
            <text v-if="item.spec" class="item-spec">规格：{{ item.spec }}</text>
            <view class="item-bottom">
              <text class="item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</text>
              <view class="item-control">
                <view class="ctrl-btn minus" @tap="decrease(item)">-</view>
                <text class="item-qty">{{ item.quantity }}</text>
                <view class="ctrl-btn plus" @tap="increase(item)">+</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 配送方式 -->
      <view class="section-card">
        <view class="section-title">配送方式</view>
        <view class="delivery-options">
          <view
            class="delivery-opt"
            :class="{ active: deliveryType === 1 }"
            @tap="deliveryType = 1"
          >
            <text class="opt-icon">🏠</text>
            <view class="opt-info">
              <text class="opt-name">送到宿舍</text>
              <text class="opt-desc">配送费 ¥{{ merchant.deliveryFee || 0 }}</text>
            </view>
            <view class="opt-radio" :class="{ checked: deliveryType === 1 }"></view>
          </view>
          <view
            class="delivery-opt"
            :class="{ active: deliveryType === 2 }"
            @tap="deliveryType = 2"
          >
            <text class="opt-icon">🚶</text>
            <view class="opt-info">
              <text class="opt-name">自取</text>
              <text class="opt-desc">{{ merchant.address || '到店自取，免配送费' }}</text>
            </view>
            <view class="opt-radio" :class="{ checked: deliveryType === 2 }"></view>
          </view>
        </view>

        <!-- F4: 地址选择 -->
        <view v-if="deliveryType === 1" class="address-section">
          <view v-if="selectedAddress" class="selected-addr" @tap="goSelectAddress">
            <view class="addr-left">
              <text class="addr-name">{{ selectedAddress.name }}</text>
              <text class="addr-phone">{{ selectedAddress.phone }}</text>
            </view>
            <view class="addr-detail-row">
              <text class="addr-detail-text">{{ selectedAddress.building }} {{ selectedAddress.room }}</text>
            </view>
            <text class="addr-arrow">›</text>
          </view>
          <view v-else class="no-addr" @tap="goSelectAddress">
            <text class="no-addr-text">+ 选择/新增收货地址</text>
          </view>
        </view>
      </view>

      <!-- F15: 预约取餐时间 -->
      <view class="section-card">
        <view class="section-title">取餐时间</view>
        <view class="time-options">
          <view class="time-opt" :class="{ active: !expectedTime }" @tap="expectedTime = ''">
            <text class="time-opt-text">尽快送达</text>
          </view>
          <picker mode="time" :value="expectedTime || '12:00'" start="08:00" end="22:00" @change="onTimePick">
            <view class="time-opt" :class="{ active: !!expectedTime }">
              <text class="time-opt-text">{{ expectedTime ? `预约 ${expectedTime}` : '预约时间' }}</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 备注 -->
      <view class="section-card">
        <view class="section-title">备注</view>
        <textarea
          class="remark-input"
          v-model="remark"
          placeholder="口味、忌口、其他要求..."
          maxlength="100"
          auto-height
        />
      </view>

      <!-- 价格明细 -->
      <view class="section-card price-detail">
        <view class="price-row">
          <text>商品总价</text>
          <text>¥{{ goodsTotal.toFixed(2) }}</text>
        </view>
        <view class="price-row" v-if="deliveryType === 1 && merchant.deliveryFee > 0">
          <text>配送费</text>
          <text>¥{{ merchant.deliveryFee.toFixed(2) }}</text>
        </view>
        <view class="price-row total">
          <text>合计</text>
          <text class="total-price">¥{{ actualTotal.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 底部结算 -->
      <view class="checkout-bar">
        <view class="clear-btn" @tap="clearAll">清空</view>
        <view class="submit-btn" @tap="submitOrder" :class="{ loading: submitting }">
          {{ submitting ? '提交中...' : `去支付 ¥${actualTotal.toFixed(2)}` }}
        </view>
      </view>
      <view style="height: 140rpx;"></view>
    </view>
  </view>
</template>

<script>
import cartState, { addToCart, removeFromCart, clearCart, totalAmount } from '../../../store/cart.js';
import { callOrder, showToast } from '../../../utils/api.js';

export default {
  data() {
    return {
      merchantId: '',
      merchant: {},
      deliveryType: 1,
      address: '',
      selectedAddress: null,
      expectedTime: '',
      remark: '',
      submitting: false
    };
  },

  computed: {
    cartItems() { return cartState.items; },
    merchantName() { return cartState.merchantName; },
    goodsTotal() { return totalAmount(); },
    actualTotal() {
      const fee = this.deliveryType === 1 ? (this.merchant.deliveryFee || 0) : 0;
      return this.goodsTotal + fee;
    }
  },

  onLoad(options) {
    this.merchantId = options.merchantId || cartState.merchantId;
    this.loadMerchant();
    // F4: 恢复已选地址
    const savedAddr = uni.getStorageSync('selectedAddress');
    if (savedAddr) this.selectedAddress = savedAddr;
  },

  onShow() {
    // 从地址列表页返回时刷新
    const savedAddr = uni.getStorageSync('selectedAddress');
    if (savedAddr) this.selectedAddress = savedAddr;
  },

  methods: {
    async loadMerchant() {
      if (!this.merchantId) return;
      const res = await uniCloud.callFunction({
        name: 'merchant',
        data: { action: 'getInfo', data: {}, merchantId: this.merchantId }
      });
      if (res.result?.code === 0) this.merchant = res.result.data;
    },

    increase(item) {
      addToCart(this.merchantId, this.merchantName, {
        _id: item.goodsId, name: item.goodsName, image: item.goodsImage, price: item.price
      }, item.spec);
    },

    decrease(item) {
      removeFromCart(item.goodsId, item.spec);
    },

    clearAll() {
      uni.showModal({
        title: '确认清空',
        content: '确定清空购物车吗？',
        success: res => {
          if (res.confirm) clearCart();
        }
      });
    },

    goHome() {
      uni.switchTab({ url: '/pages/user/home/home' });
    },

    // F4: 选择地址
    goSelectAddress() {
      uni.navigateTo({ url: '/pages/user/address/address-list?from=cart' });
    },

    // F15: 预约时间
    onTimePick(e) {
      this.expectedTime = e.detail.value;
    },

    async submitOrder() {
      if (this.submitting) return;

      // F4: 配送地址校验
      if (this.deliveryType === 1) {
        if (this.selectedAddress) {
          this.address = `${this.selectedAddress.building} ${this.selectedAddress.room} (${this.selectedAddress.name} ${this.selectedAddress.phone})`;
        } else {
          showToast('请选择收货地址');
          return;
        }
      }

      if (this.cartItems.length === 0) {
        showToast('购物车是空的');
        return;
      }

      this.submitting = true;
      try {
        const res = await callOrder('createOrder', {
          merchantId: this.merchantId,
          items: this.cartItems.map(i => ({
            goodsId: i.goodsId, quantity: i.quantity, spec: i.spec
          })),
          deliveryType: this.deliveryType,
          address: this.address,
          remark: this.remark,
          expectedTime: this.expectedTime
        });

        if (res.code === 0) {
          clearCart();
          // 清除已选地址
          uni.removeStorageSync('selectedAddress');
          showToast('下单成功！', 'success');
          setTimeout(() => {
            uni.navigateTo({ url: `/pages/user/order/order-detail?orderId=${res.data.orderId}` });
          }, 1000);
        } else {
          showToast(res.msg || '下单失败');
        }
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss">
.cart-page { background: #f5f5f5; min-height: 100vh; }

.empty-cart {
  display: flex; flex-direction: column; align-items: center;
  padding: 200rpx 0;
  .empty-icon { font-size: 100rpx; }
  .empty-text { font-size: 30rpx; color: #999; margin: 20rpx 0 40rpx; }
  .go-order-btn {
    background: #FF6B35; color: #fff; padding: 20rpx 60rpx;
    border-radius: 50rpx; font-size: 30rpx;
  }
}

.merchant-bar {
  background: #fff; padding: 24rpx 30rpx;
  .merchant-name { font-size: 30rpx; font-weight: bold; color: #333; }
}

.cart-items {
  background: #fff; margin-top: 16rpx;
  .cart-item {
    display: flex; padding: 24rpx 30rpx; border-bottom: 1rpx solid #f5f5f5;
    .item-img { width: 120rpx; height: 120rpx; border-radius: 10rpx; flex-shrink: 0; }
    .item-info {
      flex: 1; margin-left: 20rpx;
      .item-name { font-size: 28rpx; color: #333; display: block; }
      .item-spec { font-size: 22rpx; color: #999; display: block; margin-top: 6rpx; }
      .item-bottom {
        display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx;
        .item-price { font-size: 30rpx; color: #FF6B35; font-weight: bold; }
        .item-control {
          display: flex; align-items: center; gap: 16rpx;
          .ctrl-btn {
            width: 44rpx; height: 44rpx; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 28rpx; font-weight: bold;
          }
          .minus { border: 2rpx solid #FF6B35; color: #FF6B35; }
          .plus { background: #FF6B35; color: #fff; }
          .item-qty { font-size: 28rpx; min-width: 30rpx; text-align: center; }
        }
      }
    }
  }
}

.section-card {
  background: #fff; margin-top: 16rpx; padding: 24rpx 30rpx;
  .section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
}

.delivery-options {
  .delivery-opt {
    display: flex; align-items: center; padding: 20rpx 0; gap: 16rpx;
    border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .opt-icon { font-size: 44rpx; }
    .opt-info {
      flex: 1;
      .opt-name { font-size: 28rpx; color: #333; display: block; }
      .opt-desc { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
    }
    .opt-radio {
      width: 36rpx; height: 36rpx; border-radius: 50%;
      border: 2rpx solid #ddd;
      &.checked { border-color: #FF6B35; background: #FF6B35; box-shadow: inset 0 0 0 6rpx #fff; }
    }
    &.active .opt-name { color: #FF6B35; }
  }
}

/* F4: 地址选择 */
.address-section { margin-top: 16rpx; }
.selected-addr {
  display: flex; align-items: center; gap: 16rpx;
  background: #f9f9f9; border-radius: 12rpx; padding: 20rpx 24rpx;
  .addr-left {
    display: flex; gap: 16rpx;
    .addr-name { font-size: 28rpx; font-weight: bold; color: #333; }
    .addr-phone { font-size: 26rpx; color: #666; }
  }
  .addr-detail-row { flex: 1; }
  .addr-detail-text { font-size: 26rpx; color: #666; }
  .addr-arrow { font-size: 36rpx; color: #ccc; }
}
.no-addr {
  text-align: center; padding: 24rpx;
  background: #fff4f0; border-radius: 12rpx; border: 2rpx dashed #FF6B35;
  .no-addr-text { font-size: 28rpx; color: #FF6B35; }
}

/* F15: 时间选择 */
.time-options {
  display: flex; gap: 20rpx;
  .time-opt {
    flex: 1; text-align: center; padding: 20rpx;
    background: #f5f5f5; border-radius: 12rpx;
    border: 2rpx solid transparent;
    .time-opt-text { font-size: 26rpx; color: #666; }
    &.active {
      background: #fff4f0; border-color: #FF6B35;
      .time-opt-text { color: #FF6B35; font-weight: bold; }
    }
  }
}

.remark-input {
  width: 100%; font-size: 26rpx; color: #333;
  background: #f9f9f9; border-radius: 10rpx;
  padding: 16rpx 20rpx; min-height: 80rpx; box-sizing: border-box;
}

.price-detail {
  .price-row {
    display: flex; justify-content: space-between; padding: 12rpx 0;
    font-size: 26rpx; color: #666; border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }
    &.total { font-size: 28rpx; color: #333; font-weight: bold; padding-top: 16rpx; }
    .total-price { color: #FF6B35; font-size: 32rpx; }
  }
}

.checkout-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; display: flex; padding: 16rpx 30rpx;
  gap: 20rpx; border-top: 1rpx solid #f0f0f0; z-index: 100;
  .clear-btn {
    flex: 0 0 auto; padding: 20rpx 30rpx;
    border: 2rpx solid #ddd; border-radius: 50rpx;
    font-size: 28rpx; color: #999;
  }
  .submit-btn {
    flex: 1; background: #FF6B35; color: #fff;
    border-radius: 50rpx; font-size: 30rpx; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    &.loading { opacity: 0.7; }
  }
}
</style>
