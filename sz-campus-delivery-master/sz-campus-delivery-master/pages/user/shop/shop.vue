<template>
  <view class="shop-page">
    <!-- 顶部商家信息 -->
    <view class="shop-header">
      <image v-if="merchant.cover" :src="merchant.cover" mode="aspectFill" class="shop-bg" />
      <view v-else class="shop-bg-placeholder"></view>
      <view class="shop-header-overlay">
        <view class="shop-header-info">
          <text class="shop-h-name">{{ merchant.name }}</text>
          <view class="shop-h-meta">
            <text class="tag-item">★ {{ merchant.rating?.toFixed(1) }}</text>
            <text class="tag-item">月售 {{ merchant.salesCount }}</text>
            <text class="tag-item">{{ merchant.openTime }}</text>
          </view>
          <text class="shop-h-desc" v-if="merchant.description">{{ merchant.description }}</text>
          <view class="shop-h-bottom">
            <text class="addr">📍 取餐：{{ merchant.address || '请联系商家' }}</text>
            <text v-if="merchant.deliveryFee > 0" class="fee">配送费 ¥{{ merchant.deliveryFee }}</text>
            <text v-else class="fee free">免配送费</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 商品分类+列表 -->
    <view class="goods-container">
      <!-- 左侧分类 -->
      <scroll-view class="category-scroll" scroll-y :scroll-top="catScrollTop">
        <view
          v-for="(cat, i) in goodsGroups"
          :key="cat._id"
          class="cat-menu-item"
          :class="{ active: activeCatIndex === i }"
          @tap="switchCategory(i)"
        >
          <text>{{ cat.name }}</text>
          <text v-if="getCatCartCount(cat)" class="cat-badge">{{ getCatCartCount(cat) }}</text>
        </view>
      </scroll-view>

      <!-- 右侧商品 -->
      <scroll-view class="goods-scroll" scroll-y :scroll-into-view="scrollIntoView" @scroll="onGoodsScroll">
        <view v-for="(group, gi) in goodsGroups" :key="group._id" :id="`group_${gi}`">
          <view class="goods-group-title">{{ group.name }}</view>
          <view
            v-for="goods in group.goods"
            :key="goods._id"
            class="goods-item"
          >
            <image :src="goods.image || '/static/logo.png'" mode="aspectFill" class="goods-img" />
            <view class="goods-detail">
              <text class="goods-name">{{ goods.name }}</text>
              <text class="goods-desc" v-if="goods.description">{{ goods.description }}</text>
              <view class="goods-sales">月售 {{ goods.sales }}</view>
              <view class="goods-price-row">
                <view class="price-wrap">
                  <text class="price">¥{{ goods.price.toFixed(2) }}</text>
                  <text v-if="goods.originalPrice > goods.price" class="original-price">¥{{ goods.originalPrice.toFixed(2) }}</text>
                </view>
                <view class="cart-control">
                  <view v-if="getCount(goods._id) > 0" class="minus-btn" @tap.stop="decrease(goods)">
                    <text>-</text>
                  </view>
                  <text v-if="getCount(goods._id) > 0" class="goods-count">{{ getCount(goods._id) }}</text>
                  <view class="add-btn" @tap.stop="increase(goods)">
                    <text>+</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 购物车底栏 -->
    <view class="cart-bar" v-if="cartTotalCount > 0" @tap="goCart">
      <view class="cart-icon-wrap">
        <text class="cart-icon">🛒</text>
        <view class="cart-badge">{{ cartTotalCount }}</view>
      </view>
      <view class="cart-amount">
        <text>¥{{ cartTotalAmount.toFixed(2) }}</text>
        <text class="cart-min" v-if="merchant.minOrderAmount > 0 && cartTotalAmount < merchant.minOrderAmount">
          还差¥{{ (merchant.minOrderAmount - cartTotalAmount).toFixed(2) }}起送
        </text>
        <text class="cart-min ok" v-else-if="cartTotalCount > 0">已满足起送</text>
      </view>
      <view
        class="checkout-btn"
        :class="{ disabled: merchant.minOrderAmount > 0 && cartTotalAmount < merchant.minOrderAmount }"
        @tap.stop="goCheckout"
      >去结算</view>
    </view>
    <view class="cart-bar-placeholder" v-if="cartTotalCount > 0"></view>
  </view>
</template>

<script>
import { callGoods } from '../../../utils/api.js';
import cartState, { addToCart, removeFromCart, getCartCount, totalCount, totalAmount } from '../../../store/cart.js';

export default {
  data() {
    return {
      merchantId: '',
      merchant: {},
      goodsGroups: [],
      activeCatIndex: 0,
      catScrollTop: 0,
      scrollIntoView: '',
      isManualScroll: false
    };
  },

  computed: {
    cartTotalCount() { return totalCount(); },
    cartTotalAmount() { return totalAmount(); }
  },

  onLoad(options) {
    this.merchantId = options.merchantId;
    this.loadData();
  },

  methods: {
    async loadData() {
      uni.showLoading({ title: '加载中' });
      try {
        const [merchantRes, goodsRes] = await Promise.all([
          uniCloud.callFunction({
            name: 'merchant',
            data: { action: 'getInfo', data: {}, merchantId: this.merchantId }
          }),
          callGoods('getMerchantGoods', { merchantId: this.merchantId })
        ]);

        if (merchantRes.result?.code === 0) this.merchant = merchantRes.result.data;
        if (goodsRes.code === 0) this.goodsGroups = goodsRes.data;
      } finally {
        uni.hideLoading();
      }
    },

    getCount(goodsId) { return getCartCount(goodsId); },

    getCatCartCount(cat) {
      return cat.goods.reduce((sum, g) => sum + getCartCount(g._id), 0);
    },

    increase(goods) {
      addToCart(this.merchantId, this.merchant.name, goods);
    },

    decrease(goods) {
      removeFromCart(goods._id);
    },

    switchCategory(i) {
      this.activeCatIndex = i;
      this.isManualScroll = true;
      this.scrollIntoView = `group_${i}`;
      setTimeout(() => { this.isManualScroll = false; }, 500);
    },

    onGoodsScroll(e) {
      if (this.isManualScroll) return;
      // 根据滚动位置更新左侧高亮（简化版）
    },

    goCart() {
      uni.navigateTo({ url: `/pages/user/cart/cart?merchantId=${this.merchantId}` });
    },

    goCheckout() {
      if (this.merchant.minOrderAmount > 0 && this.cartTotalAmount < this.merchant.minOrderAmount) {
        uni.showToast({ title: `还差¥${(this.merchant.minOrderAmount - this.cartTotalAmount).toFixed(2)}起送`, icon: 'none' });
        return;
      }
      uni.navigateTo({ url: `/pages/user/cart/cart?merchantId=${this.merchantId}` });
    }
  }
};
</script>

<style lang="scss">
.shop-page { background: #f5f5f5; min-height: 100vh; }

.shop-header {
  position: relative; height: 320rpx;
  .shop-bg { width: 100%; height: 100%; }
  .shop-bg-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #FF6B35, #FF8C42); }
  .shop-header-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(transparent 30%, rgba(0,0,0,0.7));
    display: flex; align-items: flex-end; padding: 20rpx 24rpx;
  }
  .shop-header-info {
    .shop-h-name { font-size: 36rpx; font-weight: bold; color: #fff; display: block; }
    .shop-h-meta {
      display: flex; gap: 16rpx; margin: 8rpx 0;
      .tag-item { font-size: 22rpx; color: rgba(255,255,255,0.85); }
    }
    .shop-h-desc { font-size: 24rpx; color: rgba(255,255,255,0.7); display: block; margin-bottom: 8rpx; }
    .shop-h-bottom {
      display: flex; gap: 20rpx; align-items: center;
      .addr { font-size: 22rpx; color: rgba(255,255,255,0.85); }
      .fee { font-size: 22rpx; color: #FFD700; }
      .free { color: #90EE90; }
    }
  }
}

.goods-container {
  display: flex;
  height: calc(100vh - 320rpx - 140rpx);
}

.category-scroll {
  width: 180rpx; background: #f5f5f5;
  .cat-menu-item {
    padding: 28rpx 16rpx; font-size: 26rpx; color: #666;
    text-align: center; position: relative;
    border-left: 6rpx solid transparent;
    &.active {
      background: #fff; color: #FF6B35; font-weight: bold;
      border-left-color: #FF6B35;
    }
    .cat-badge {
      position: absolute; top: 10rpx; right: 10rpx;
      background: #FF6B35; color: #fff; font-size: 18rpx;
      width: 32rpx; height: 32rpx; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
  }
}

.goods-scroll {
  flex: 1; background: #fff;
  .goods-group-title {
    padding: 16rpx 24rpx; font-size: 26rpx; color: #999;
    background: #f9f9f9; font-weight: bold;
  }
  .goods-item {
    display: flex; padding: 24rpx; border-bottom: 1rpx solid #f5f5f5;
    .goods-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
    .goods-detail {
      flex: 1; margin-left: 20rpx; display: flex; flex-direction: column;
      .goods-name { font-size: 30rpx; color: #333; font-weight: bold; }
      .goods-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; line-height: 1.4; }
      .goods-sales { font-size: 22rpx; color: #ccc; margin-top: 8rpx; }
      .goods-price-row {
        display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 12rpx;
        .price-wrap {
          display: flex; align-items: baseline; gap: 8rpx;
          .price { font-size: 32rpx; color: #FF6B35; font-weight: bold; }
          .original-price { font-size: 24rpx; color: #ccc; text-decoration: line-through; }
        }
        .cart-control {
          display: flex; align-items: center; gap: 12rpx;
          .minus-btn, .add-btn {
            width: 48rpx; height: 48rpx; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 32rpx; font-weight: bold;
          }
          .minus-btn { border: 2rpx solid #FF6B35; color: #FF6B35; }
          .add-btn { background: #FF6B35; color: #fff; }
          .goods-count { font-size: 28rpx; font-weight: bold; color: #333; min-width: 30rpx; text-align: center; }
        }
      }
    }
  }
}

.cart-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #333; height: 120rpx;
  display: flex; align-items: center; padding: 0 24rpx;
  z-index: 100;
  .cart-icon-wrap {
    position: relative; margin-right: 20rpx;
    .cart-icon { font-size: 52rpx; }
    .cart-badge {
      position: absolute; top: -10rpx; right: -10rpx;
      background: #FF6B35; color: #fff; font-size: 18rpx;
      min-width: 32rpx; height: 32rpx; border-radius: 16rpx;
      display: flex; align-items: center; justify-content: center; padding: 0 6rpx;
    }
  }
  .cart-amount {
    flex: 1;
    text { font-size: 32rpx; color: #fff; font-weight: bold; display: block; }
    .cart-min { font-size: 22rpx; color: #ccc; font-weight: normal; }
    .cart-min.ok { color: #4cd964; }
  }
  .checkout-btn {
    background: #FF6B35; color: #fff; padding: 20rpx 36rpx;
    border-radius: 50rpx; font-size: 28rpx; font-weight: bold;
    &.disabled { background: #888; }
  }
}

.cart-bar-placeholder { height: 120rpx; }
</style>
