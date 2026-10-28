<template>
  <view class="home-page">
    <!-- 顶部区域：位置 + 搜索 -->
    <view class="top-area">
      <view class="location-bar">
        <text class="loc-emoji">📍</text>
        <text class="loc-text">{{ campusName }}</text>
        <text class="loc-arrow">▾</text>
      </view>
      <view class="search-bar">
        <view class="search-inner" @tap="goSearch">
          <text class="search-emoji">🔍</text>
          <text class="search-placeholder">搜索校园美食、店铺</text>
        </view>
      </view>
    </view>

    <!-- Banner 轮播 -->
    <view class="banner-wrap">
      <swiper
        class="banner"
        autoplay
        circular
        indicator-dots
        indicator-color="rgba(255,255,255,0.4)"
        indicator-active-color="#fff"
      >
        <swiper-item v-for="(item, i) in banners" :key="i">
          <view class="banner-item" :style="`background:${item.bg}`">
            <view class="banner-content">
              <text class="banner-title">{{ item.title }}</text>
              <text class="banner-sub">{{ item.sub }}</text>
              <view class="banner-tag">{{ item.tag }}</view>
            </view>
            <text class="banner-deco">{{ item.deco }}</text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view
        v-for="entry in quickEntries"
        :key="entry.name"
        class="entry-item"
        @tap="filterCategory(entry.name)"
      >
        <view class="entry-icon-wrap" :style="`background:${entry.bg}`">
          <text class="entry-icon">{{ entry.icon }}</text>
        </view>
        <text class="entry-name">{{ entry.name }}</text>
      </view>
    </view>

    <!-- 商家列表标题 -->
    <view class="section-header">
      <view class="section-left">
        <text class="section-bar"></text>
        <text class="section-text">{{ activeCategory === '全部' ? '附近商家' : activeCategory }}</text>
      </view>
      <view class="section-right">
        <text class="section-count">{{ total }}家</text>
        <text class="section-sort">综合排序 ▾</text>
      </view>
    </view>

    <!-- 商家列表 -->
    <view class="shop-list">
      <view
        v-for="shop in shopList"
        :key="shop._id"
        class="shop-card"
        @tap="goShop(shop)"
      >
        <view class="shop-cover">
          <image v-if="shop.cover" :src="shop.cover" mode="aspectFill" class="cover-img" @error="onCoverError(shop)" />
          <view v-else class="cover-placeholder" :style="`background:${placeholderBg(shop.name)}`">
            <text class="placeholder-emoji">🍽️</text>
          </view>
          <view class="cover-gradient"></view>
          <view class="shop-status-badge" :class="shop.status === 1 ? 'open' : 'close'">
            <view class="status-dot"></view>
            <text>{{ shop.status === 1 ? '营业中' : '休息中' }}</text>
          </view>
        </view>
        <view class="shop-info">
          <view class="shop-name-row">
            <text class="shop-name">{{ shop.name }}</text>
            <view class="shop-name-right">
              <text class="fav-btn" @tap.stop="toggleFavorite(shop)">{{ isFavorite(shop._id) ? '❤️' : '🤍' }}</text>
              <view class="shop-rating">
                <text class="star">★</text>
                <text class="rating-val">{{ shop.rating?.toFixed(1) }}</text>
              </view>
            </view>
          </view>
          <view class="shop-meta">
            <text class="shop-category tag">{{ shop.category }}</text>
            <text v-if="shop.deliveryFee > 0" class="delivery-fee tag">配送 ¥{{ shop.deliveryFee }}</text>
            <text v-else class="delivery-fee tag free">免配送费</text>
          </view>
          <view class="shop-bottom">
            <text class="sales">月售 {{ shop.salesCount }} 单</text>
            <text v-if="shop.minOrderAmount > 0" class="min-order">起送 ¥{{ shop.minOrderAmount }}</text>
            <text class="open-time">{{ shop.openTime }}</text>
          </view>
          <view v-if="shop.tags && shop.tags.length" class="shop-tags">
            <text v-for="tag in shop.tags.slice(0,3)" :key="tag" class="shop-tag">{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-more">
        <view class="loading-dot"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="noMore" class="no-more">
        <text class="no-more-line"></text>
        <text class="no-more-text">到底啦</text>
        <text class="no-more-line"></text>
      </view>
      <view v-if="!loading && shopList.length === 0" class="empty">
        <text class="empty-icon">🍽️</text>
        <text class="empty-text">暂无商家，敬请期待</text>
      </view>
    </view>
  </view>
</template>

<script>
import { callMerchant } from '../../../utils/api.js';

export default {
  data() {
    return {
      campusName: '深圳职业技术大学',
      banners: [
        { title: '校园美食节', sub: '超值优惠等你来', tag: '限时活动', deco: '🎉', bg: 'linear-gradient(135deg,#FF6B35,#FF8C42)' },
        { title: '宿舍专属配送', sub: '足不出户享美食', tag: '送到宿舍', deco: '🛵', bg: 'linear-gradient(135deg,#4ECDC4,#45B7D1)' },
        { title: '新店开业', sub: '打折优惠火热进行中', tag: '新人立减', deco: '🎊', bg: 'linear-gradient(135deg,#667eea,#764ba2)' }
      ],
      quickEntries: [
        { name: '快餐', icon: '🍔', bg: 'linear-gradient(135deg,#fff4f0,#ffe0cc)' },
        { name: '中餐', icon: '🍜', bg: 'linear-gradient(135deg,#fff8e0,#ffefcc)' },
        { name: '饮品', icon: '🧋', bg: 'linear-gradient(135deg,#f0fff3,#dcffe6)' },
        { name: '水果', icon: '🍓', bg: 'linear-gradient(135deg,#fff0f5,#ffd6e8)' },
        { name: '甜品', icon: '🍰', bg: 'linear-gradient(135deg,#f5f0ff,#e6d6ff)' }
      ],
      activeCategory: '全部',
      shopList: [],
      favoriteShops: [],
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      noMore: false
    };
  },

  onLoad() {
    // F5: 加载收藏列表
    this.favoriteShops = uni.getStorageSync('favoriteShops') || [];
    // 先加载本地缓存数据（秒开），再请求云端刷新
    this.loadFromCache();
    this.loadShops(true);
  },

  onPullDownRefresh() {
    this.loadShops(true);
  },

  onReachBottom() {
    if (!this.noMore && !this.loading) {
      this.loadShops(false);
    }
  },

  methods: {
    async loadShops(reset = false) {
      if (this.loading) return;
      if (reset) {
        this.page = 1;
        this.noMore = false;
        this.shopList = [];
      }
      this.loading = true;

      try {
        const res = await callMerchant('getList', {
          page: this.page,
          pageSize: this.pageSize,
          category: this.activeCategory === '全部' ? '' : this.activeCategory
        });
        if (res.code === 0) {
          // F5: 收藏的商家排前面
          const sorted = [...res.data.list].sort((a, b) => {
            const aFav = this.favoriteShops.includes(a._id) ? 0 : 1;
            const bFav = this.favoriteShops.includes(b._id) ? 0 : 1;
            return aFav - bFav;
          });
          this.shopList = reset ? sorted : [...this.shopList, ...sorted];
          this.total = res.data.total;
          if (this.shopList.length >= this.total) this.noMore = true;
          else this.page++;

          // 缓存到本地
          if (reset && this.activeCategory === '全部') {
            uni.setStorageSync('cachedShops', res.data.list);
            uni.setStorageSync('cachedShopsTime', Date.now());
          }
        } else if (res.quotaExhausted) {
          // 额度耗尽，不做额外提示（api.js 已弹窗）
        }
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh();
      }
    },

    // 从本地缓存加载（秒开）
    loadFromCache() {
      const cached = uni.getStorageSync('cachedShops');
      if (cached && cached.length > 0) {
        this.shopList = cached;
        this.total = cached.length;
        this.noMore = true;
      }
    },

    filterCategory(name) {
      this.activeCategory = name;
      this.loadShops(true);
    },

    onCoverError(shop) {
      shop.cover = '';
    },

    placeholderBg(name) {
      const colors = [
        'linear-gradient(135deg,#FF8C42,#FF6B35)',
        'linear-gradient(135deg,#4ECDC4,#45B7D1)',
        'linear-gradient(135deg,#667eea,#764ba2)',
        'linear-gradient(135deg,#f093fb,#f5576c)'
      ];
      const idx = (name || '').charCodeAt(0) % colors.length;
      return colors[idx];
    },

    goShop(shop) {
      if (shop.status !== 1) {
        uni.showToast({ title: '商家暂未营业', icon: 'none' });
        return;
      }
      uni.navigateTo({ url: `/pages/user/shop/shop?merchantId=${shop._id}` });
    },

    goSearch() {
      uni.showToast({ title: '搜索功能开发中', icon: 'none' });
    },

    // F5: 商家收藏
    isFavorite(shopId) {
      return this.favoriteShops.includes(shopId);
    },

    toggleFavorite(shop) {
      const idx = this.favoriteShops.indexOf(shop._id);
      if (idx > -1) {
        this.favoriteShops.splice(idx, 1);
        uni.showToast({ title: '已取消收藏', icon: 'none' });
      } else {
        this.favoriteShops.push(shop._id);
        uni.showToast({ title: '已收藏', icon: 'success' });
      }
      uni.setStorageSync('favoriteShops', this.favoriteShops);

      // 重新排序
      this.shopList.sort((a, b) => {
        const aFav = this.favoriteShops.includes(a._id) ? 0 : 1;
        const bFav = this.favoriteShops.includes(b._id) ? 0 : 1;
        return aFav - bFav;
      });
    }
  }
};
</script>

<style lang="scss">
.home-page {
  background: #f5f6f8;
  min-height: 100vh;
  padding-bottom: 20rpx;
}

/* 顶部区域 */
.top-area {
  background: linear-gradient(180deg, #FF6B35 0%, #FF8C42 100%);
  padding: 20rpx 30rpx 30rpx;
}
.location-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
  .loc-emoji { font-size: 28rpx; }
  .loc-text { font-size: 28rpx; font-weight: 600; color: #fff; }
  .loc-arrow { font-size: 22rpx; color: rgba(255,255,255,0.8); }
}
.search-bar {
  .search-inner {
    background: rgba(255,255,255,0.95);
    border-radius: 44rpx;
    padding: 18rpx 28rpx;
    display: flex;
    align-items: center;
    gap: 14rpx;
    box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.08);
    .search-emoji { font-size: 28rpx; }
    .search-placeholder { color: #999; font-size: 28rpx; }
  }
}

/* Banner */
.banner-wrap {
  padding: 0 20rpx;
  margin-top: -10rpx;
}
.banner {
  height: 280rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1);
  .banner-item {
    height: 280rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 44rpx;
    position: relative;
    .banner-content {
      display: flex;
      flex-direction: column;
      gap: 10rpx;
      z-index: 2;
    }
    .banner-title { font-size: 40rpx; font-weight: bold; color: #fff; }
    .banner-sub { font-size: 26rpx; color: rgba(255,255,255,0.9); }
    .banner-tag {
      align-self: flex-start;
      background: rgba(255,255,255,0.25);
      backdrop-filter: blur(10rpx);
      padding: 6rpx 18rpx;
      border-radius: 20rpx;
      font-size: 22rpx;
      color: #fff;
      margin-top: 6rpx;
    }
    .banner-deco {
      font-size: 100rpx;
      z-index: 1;
    }
  }
}

/* 快捷入口 */
.quick-entry {
  display: flex;
  justify-content: space-around;
  background: #fff;
  margin: 20rpx 20rpx 0;
  border-radius: 20rpx;
  padding: 28rpx 10rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  .entry-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    .entry-icon-wrap {
      width: 88rpx;
      height: 88rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .entry-icon { font-size: 44rpx; }
    .entry-name { font-size: 22rpx; color: #555; }
    &:active .entry-icon-wrap { transform: scale(0.9); }
  }
}

/* 区块标题 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx 20rpx;
  .section-left {
    display: flex;
    align-items: center;
    gap: 12rpx;
    .section-bar {
      width: 8rpx;
      height: 32rpx;
      background: linear-gradient(180deg, #FF6B35, #FF8C42);
      border-radius: 4rpx;
    }
    .section-text { font-size: 32rpx; font-weight: bold; color: #333; }
  }
  .section-right {
    display: flex;
    align-items: center;
    gap: 20rpx;
    .section-count { font-size: 24rpx; color: #999; }
    .section-sort { font-size: 24rpx; color: #777; }
  }
}

/* 商家列表 */
.shop-list {
  padding: 0 20rpx 40rpx;
  .shop-card {
    background: #fff;
    border-radius: 20rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
    transition: transform 0.2s;
    &:active { transform: scale(0.98); }
  }
}

.shop-cover {
  position: relative;
  height: 260rpx;
  .cover-img { width: 100%; height: 100%; }
  .cover-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    .placeholder-emoji {
      font-size: 80rpx;
    }
  }
  .cover-gradient {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 60rpx;
    background: linear-gradient(180deg, transparent, rgba(0,0,0,0.15));
  }
  .shop-status-badge {
    position: absolute; top: 16rpx; right: 16rpx;
    display: flex; align-items: center; gap: 8rpx;
    padding: 8rpx 18rpx; border-radius: 24rpx;
    font-size: 22rpx; color: #fff;
    backdrop-filter: blur(8rpx);
    &.open { background: rgba(76,201,100,0.85); }
    &.close { background: rgba(0,0,0,0.55); }
    .status-dot {
      width: 10rpx; height: 10rpx; border-radius: 50%;
      background: #fff;
    }
  }
}

.shop-info {
  padding: 22rpx 24rpx;
  .shop-name-row {
    display: flex; align-items: center; justify-content: space-between;
    .shop-name { font-size: 32rpx; font-weight: bold; color: #1a1a1a; }
    .shop-name-right {
      display: flex; align-items: center; gap: 16rpx;
    }
    .fav-btn { font-size: 32rpx; padding: 4rpx; }
    .shop-rating {
      display: flex; align-items: center; gap: 6rpx;
      .star { color: #FFB800; font-size: 28rpx; }
      .rating-val { font-size: 26rpx; color: #FF8C00; font-weight: bold; }
    }
  }
  .shop-meta {
    display: flex; gap: 12rpx; margin-top: 14rpx;
    .tag {
      font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx;
      background: #f5f5f5; color: #666;
    }
    .delivery-fee { color: #FF6B35; background: #fff4f0; }
    .free { color: #4cd964; background: #f0fff3; }
  }
  .shop-bottom {
    display: flex; align-items: center; gap: 20rpx; margin-top: 14rpx;
    font-size: 24rpx; color: #999;
  }
  .shop-tags {
    display: flex; gap: 10rpx; margin-top: 14rpx; flex-wrap: wrap;
    .shop-tag {
      font-size: 20rpx; padding: 4rpx 14rpx;
      border: 1rpx solid #FFB38E; color: #FF6B35;
      border-radius: 6rpx;
    }
  }
}

/* 加载/空状态 */
.loading-more {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 30rpx 0; font-size: 26rpx; color: #ccc;
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
  display: flex; flex-direction: column; align-items: center;
  padding: 100rpx 0;
  .empty-icon { font-size: 100rpx; margin-bottom: 20rpx; }
  .empty-text { font-size: 28rpx; color: #999; }
}
</style>
