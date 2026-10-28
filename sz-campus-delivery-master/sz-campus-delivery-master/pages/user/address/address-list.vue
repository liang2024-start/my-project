<template>
  <view class="addr-list-page">
    <view v-if="addresses.length === 0" class="empty">
      <text class="empty-icon">📍</text>
      <text class="empty-text">还没有收货地址</text>
      <view class="add-btn" @tap="goAdd">新增地址</view>
    </view>

    <view v-else>
      <view v-for="(addr, i) in addresses" :key="i" class="addr-card" @tap="selectAddr(i)">
        <view class="addr-info">
          <view class="addr-name-row">
            <text class="addr-name">{{ addr.name }}</text>
            <text class="addr-phone">{{ addr.phone }}</text>
            <text v-if="addr.isDefault" class="default-tag">默认</text>
          </view>
          <text class="addr-detail">{{ addr.building }} {{ addr.room }}</text>
        </view>
        <view class="addr-actions">
          <text class="action-edit" @tap.stop="goEdit(i)">编辑</text>
          <text class="action-del" @tap.stop="deleteAddr(i)">删除</text>
        </view>
      </view>

      <view class="bottom-add" @tap="goAdd">+ 新增收货地址</view>
    </view>
  </view>
</template>

<script>
import { showToast, showConfirm } from '../../../utils/api.js';

export default {
  data() {
    return {
      addresses: [],
      fromCart: false
    };
  },

  onLoad(options) {
    this.fromCart = options.from === 'cart';
  },

  onShow() {
    this.addresses = uni.getStorageSync('addresses') || [];
  },

  methods: {
    goAdd() {
      uni.navigateTo({ url: '/pages/user/address/address-edit' });
    },

    goEdit(index) {
      uni.navigateTo({ url: `/pages/user/address/address-edit?index=${index}` });
    },

    async deleteAddr(index) {
      const confirmed = await showConfirm('确认删除该地址？');
      if (!confirmed) return;
      this.addresses.splice(index, 1);
      uni.setStorageSync('addresses', this.addresses);
      showToast('已删除', 'success');
    },

    selectAddr(index) {
      if (!this.fromCart) return;
      const addr = this.addresses[index];
      uni.setStorageSync('selectedAddress', addr);
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss">
.addr-list-page { background: #f5f5f5; min-height: 100vh; padding: 20rpx; }

.empty {
  display: flex; flex-direction: column; align-items: center; padding: 200rpx 0;
  .empty-icon { font-size: 100rpx; }
  .empty-text { font-size: 28rpx; color: #999; margin: 20rpx 0 40rpx; }
  .add-btn {
    background: #FF6B35; color: #fff; padding: 20rpx 60rpx;
    border-radius: 50rpx; font-size: 28rpx;
  }
}

.addr-card {
  background: #fff; border-radius: 16rpx; padding: 28rpx 24rpx;
  margin-bottom: 16rpx; display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  .addr-info {
    flex: 1;
    .addr-name-row {
      display: flex; align-items: center; gap: 16rpx;
      .addr-name { font-size: 30rpx; font-weight: bold; color: #333; }
      .addr-phone { font-size: 26rpx; color: #666; }
      .default-tag {
        font-size: 20rpx; color: #FF6B35; border: 1rpx solid #FF6B35;
        padding: 2rpx 10rpx; border-radius: 6rpx;
      }
    }
    .addr-detail { font-size: 26rpx; color: #666; margin-top: 10rpx; display: block; }
  }
  .addr-actions {
    display: flex; gap: 16rpx; flex-shrink: 0;
    .action-edit, .action-del {
      font-size: 24rpx; padding: 10rpx 20rpx; border-radius: 8rpx;
    }
    .action-edit { color: #FF6B35; background: #fff4f0; }
    .action-del { color: #dd524d; background: #fff0f0; }
  }
}

.bottom-add {
  text-align: center; padding: 30rpx; margin: 20rpx;
  background: #fff; border-radius: 16rpx; font-size: 28rpx;
  color: #FF6B35; font-weight: bold; border: 2rpx dashed #FF6B35;
}
</style>
