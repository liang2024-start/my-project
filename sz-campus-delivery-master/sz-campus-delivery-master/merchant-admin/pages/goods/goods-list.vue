<template>
  <view class="goods-list-page">
    <!-- 分类选项卡 -->
    <scroll-view class="cat-tabs" scroll-x>
      <view
        v-for="cat in [{ _id: '', name: '全部' }, ...categories]"
        :key="cat._id"
        class="cat-tab"
        :class="{ active: activeCat === cat._id }"
        @tap="activeCat = cat._id; loadGoods(true)"
      >{{ cat.name }}</view>
    </scroll-view>

    <!-- 添加商品按钮 -->
    <view class="add-goods-btn" @tap="goAddGoods">
      <text>+ 添加商品</text>
    </view>

    <!-- 商品列表 -->
    <view class="goods-items">
      <view v-for="goods in goodsList" :key="goods._id" class="goods-card">
        <image :src="goods.image || '/static/logo.png'" mode="aspectFill" class="goods-img" />
        <view class="goods-detail">
          <view class="goods-name-row">
            <text class="goods-name">{{ goods.name }}</text>
            <view class="status-badge" :class="goods.status === 1 ? 'on' : 'off'">
              {{ goods.status === 1 ? '上架' : '下架' }}
            </view>
          </view>
          <text class="goods-desc" v-if="goods.description">{{ goods.description }}</text>
          <view class="goods-bottom">
            <text class="goods-price">¥{{ goods.price.toFixed(2) }}</text>
            <text class="goods-sales">销量 {{ goods.sales }}</text>
          </view>
          <view class="goods-actions">
            <view class="action-btn edit" @tap="editGoods(goods)">编辑</view>
            <view class="action-btn toggle" @tap="toggleStatus(goods)">
              {{ goods.status === 1 ? '下架' : '上架' }}
            </view>
            <view class="action-btn delete" @tap="deleteGoods(goods)">删除</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!loading && goodsList.length === 0" class="empty">
      <text class="empty-icon">🍽️</text>
      <text>还没有商品，快去添加吧！</text>
    </view>

    <!-- 管理分类按钮 -->
    <view class="manage-cat-btn" @tap="showCatModal = true">管理分类</view>

    <!-- 分类管理弹窗 -->
    <view class="modal-mask" v-if="showCatModal" @tap="showCatModal = false">
      <view class="cat-modal" @tap.stop>
        <view class="modal-title">商品分类管理</view>
        <view class="cat-list">
          <view v-for="cat in categories" :key="cat._id" class="cat-item">
            <text>{{ cat.name }}</text>
            <view class="cat-del-btn" @tap="deleteCategory(cat._id)">删除</view>
          </view>
        </view>
        <view class="add-cat-row">
          <input class="cat-input" v-model="newCatName" placeholder="新分类名称" />
          <view class="add-cat-btn" @tap="addCategory">添加</view>
        </view>
        <view class="modal-close" @tap="showCatModal = false">关闭</view>
      </view>
    </view>
  </view>
</template>

<script>
import { callGoods, showToast, showConfirm } from '../../utils/api.js';

export default {
  data() {
    return {
      goodsList: [],
      categories: [],
      activeCat: '',
      loading: false,
      showCatModal: false,
      newCatName: ''
    };
  },

  onShow() {
    this.loadCategories();
    this.loadGoods(true);
  },

  methods: {
    async loadCategories() {
      const info = uni.getStorageSync('merchantInfo');
      const res = await callGoods('getCategories', { merchantId: info.merchantId });
      if (res.code === 0) this.categories = res.data;
    },

    async loadGoods(reset = false) {
      if (this.loading) return;
      this.loading = true;
      const info = uni.getStorageSync('merchantInfo');
      try {
        const res = await callGoods('getList', {
          merchantId: info.merchantId,
          categoryId: this.activeCat,
          page: 1, pageSize: 100
        });
        if (res.code === 0) this.goodsList = res.data.list;
      } finally {
        this.loading = false;
      }
    },

    goAddGoods() {
      uni.navigateTo({ url: '/pages/goods/goods-edit' });
    },

    editGoods(goods) {
      uni.navigateTo({ url: `/pages/goods/goods-edit?goodsId=${goods._id}` });
    },

    async toggleStatus(goods) {
      const res = await callGoods('toggleStatus', { goodsId: goods._id });
      if (res.code === 0) {
        showToast(res.msg, 'success');
        this.loadGoods(true);
      } else showToast(res.msg);
    },

    async deleteGoods(goods) {
      const confirmed = await showConfirm(`确认删除"${goods.name}"吗？`);
      if (!confirmed) return;
      const res = await callGoods('delete', { goodsId: goods._id });
      if (res.code === 0) {
        showToast('已删除', 'success');
        this.loadGoods(true);
      } else showToast(res.msg);
    },

    async addCategory() {
      if (!this.newCatName.trim()) { showToast('请输入分类名称'); return; }
      const res = await callGoods('addCategory', { name: this.newCatName });
      if (res.code === 0) {
        showToast('添加成功', 'success');
        this.newCatName = '';
        this.loadCategories();
      } else showToast(res.msg);
    },

    async deleteCategory(id) {
      const confirmed = await showConfirm('确认删除该分类？商品不会被删除');
      if (!confirmed) return;
      const res = await callGoods('deleteCategory', { categoryId: id });
      if (res.code === 0) {
        showToast('已删除', 'success');
        this.loadCategories();
      }
    }
  }
};
</script>

<style lang="scss">
.goods-list-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 100rpx; }

.cat-tabs {
  background: #fff; white-space: nowrap; padding: 0 10rpx;
  border-bottom: 1rpx solid #f0f0f0;
  .cat-tab {
    display: inline-block; padding: 24rpx 28rpx; font-size: 26rpx; color: #666;
    &.active { color: #FF6B35; border-bottom: 4rpx solid #FF6B35; font-weight: bold; }
  }
}

.add-goods-btn {
  background: #FF6B35; color: #fff; margin: 20rpx 20rpx 10rpx;
  padding: 24rpx; border-radius: 12rpx; text-align: center;
  font-size: 28rpx; font-weight: bold;
}

.goods-items {
  padding: 10rpx 20rpx;
  .goods-card {
    background: #fff; border-radius: 16rpx; margin-bottom: 16rpx;
    display: flex; padding: 20rpx; gap: 20rpx;
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
    .goods-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
    .goods-detail {
      flex: 1;
      .goods-name-row {
        display: flex; align-items: center; justify-content: space-between;
        .goods-name { font-size: 28rpx; font-weight: bold; color: #333; }
        .status-badge {
          font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 20rpx;
          &.on { background: #e6fff0; color: #4cd964; }
          &.off { background: #f5f5f5; color: #999; }
        }
      }
      .goods-desc { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
      .goods-bottom {
        display: flex; align-items: center; gap: 20rpx; margin-top: 10rpx;
        .goods-price { font-size: 30rpx; color: #FF6B35; font-weight: bold; }
        .goods-sales { font-size: 22rpx; color: #ccc; }
      }
      .goods-actions {
        display: flex; gap: 12rpx; margin-top: 16rpx;
        .action-btn {
          padding: 10rpx 24rpx; border-radius: 30rpx; font-size: 22rpx;
        }
        .edit { border: 2rpx solid #4ECDC4; color: #4ECDC4; }
        .toggle { border: 2rpx solid #FF6B35; color: #FF6B35; }
        .delete { border: 2rpx solid #dd524d; color: #dd524d; }
      }
    }
  }
}

.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 100rpx 0; gap: 20rpx;
  .empty-icon { font-size: 80rpx; }
  font-size: 28rpx; color: #999;
}

.manage-cat-btn {
  position: fixed; bottom: 30rpx; right: 30rpx;
  background: #333; color: #fff; padding: 20rpx 30rpx;
  border-radius: 50rpx; font-size: 26rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.2);
}

.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200;
  display: flex; align-items: flex-end;
  .cat-modal {
    background: #fff; width: 100%; border-radius: 24rpx 24rpx 0 0;
    padding: 30rpx;
    .modal-title { font-size: 32rpx; font-weight: bold; color: #333; text-align: center; margin-bottom: 24rpx; }
    .cat-list {
      max-height: 400rpx; overflow-y: auto;
      .cat-item {
        display: flex; justify-content: space-between; align-items: center;
        padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5;
        font-size: 28rpx;
        .cat-del-btn { color: #dd524d; font-size: 24rpx; }
      }
    }
    .add-cat-row {
      display: flex; gap: 16rpx; margin: 24rpx 0;
      .cat-input { flex: 1; border: 2rpx solid #eee; padding: 16rpx 20rpx; border-radius: 10rpx; font-size: 26rpx; }
      .add-cat-btn { background: #FF6B35; color: #fff; padding: 16rpx 30rpx; border-radius: 10rpx; font-size: 26rpx; }
    }
    .modal-close {
      text-align: center; padding: 20rpx; color: #999; font-size: 28rpx;
    }
  }
}
</style>
