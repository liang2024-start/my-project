<template>
  <view class="addr-edit-page">
    <view class="form-card">
      <view class="form-row">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="收货人姓名" maxlength="20" />
      </view>
      <view class="form-row">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.phone" placeholder="手机号码" type="number" maxlength="11" />
      </view>
      <view class="form-row">
        <text class="form-label">楼栋</text>
        <input class="form-input" v-model="form.building" placeholder="如：3栋 / 西区A栋" maxlength="30" />
      </view>
      <view class="form-row">
        <text class="form-label">房号</text>
        <input class="form-input" v-model="form.room" placeholder="如：405室" maxlength="20" />
      </view>
      <view class="form-row default-row">
        <text class="form-label">设为默认</text>
        <switch :checked="form.isDefault" @change="form.isDefault = $event.detail.value" color="#FF6B35" />
      </view>
    </view>

    <view class="save-btn" @tap="save">保存地址</view>
    <view v-if="editIndex !== -1" class="delete-btn" @tap="remove">删除该地址</view>
  </view>
</template>

<script>
import { showToast } from '../../../utils/api.js';

export default {
  data() {
    return {
      editIndex: -1,
      form: { name: '', phone: '', building: '', room: '', isDefault: false }
    };
  },

  onLoad(options) {
    if (options.index !== undefined) {
      this.editIndex = Number(options.index);
      const addresses = uni.getStorageSync('addresses') || [];
      if (addresses[this.editIndex]) {
        this.form = { ...addresses[this.editIndex] };
      }
    }
  },

  methods: {
    save() {
      if (!this.form.name.trim()) { showToast('请输入姓名'); return; }
      if (!this.form.phone.trim() || this.form.phone.length !== 11) { showToast('请输入正确手机号'); return; }
      if (!this.form.building.trim()) { showToast('请输入楼栋'); return; }
      if (!this.form.room.trim()) { showToast('请输入房号'); return; }

      const addresses = uni.getStorageSync('addresses') || [];

      // 如果设为默认，取消其他默认
      if (this.form.isDefault) {
        addresses.forEach(a => a.isDefault = false);
      }

      if (this.editIndex !== -1) {
        addresses[this.editIndex] = { ...this.form };
      } else {
        // 第一个地址自动设为默认
        if (addresses.length === 0) this.form.isDefault = true;
        addresses.push({ ...this.form });
      }

      uni.setStorageSync('addresses', addresses);
      showToast('保存成功', 'success');
      setTimeout(() => uni.navigateBack(), 800);
    },

    remove() {
      uni.showModal({
        title: '提示',
        content: '确认删除该地址？',
        success: res => {
          if (res.confirm) {
            const addresses = uni.getStorageSync('addresses') || [];
            addresses.splice(this.editIndex, 1);
            uni.setStorageSync('addresses', addresses);
            showToast('已删除', 'success');
            setTimeout(() => uni.navigateBack(), 800);
          }
        }
      });
    }
  }
};
</script>

<style lang="scss">
.addr-edit-page { background: #f5f5f5; min-height: 100vh; padding: 20rpx; }

.form-card {
  background: #fff; border-radius: 16rpx; overflow: hidden;
  .form-row {
    display: flex; align-items: center; padding: 28rpx 24rpx;
    border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .form-label { font-size: 28rpx; color: #333; width: 140rpx; flex-shrink: 0; }
    .form-input { flex: 1; font-size: 28rpx; color: #333; }
  }
  .default-row { justify-content: space-between; }
}

.save-btn {
  margin: 40rpx 20rpx 0; background: #FF6B35; color: #fff;
  text-align: center; padding: 28rpx; border-radius: 50rpx;
  font-size: 30rpx; font-weight: bold;
}

.delete-btn {
  margin: 20rpx 20rpx; text-align: center; padding: 24rpx;
  color: #dd524d; font-size: 28rpx;
}
</style>
