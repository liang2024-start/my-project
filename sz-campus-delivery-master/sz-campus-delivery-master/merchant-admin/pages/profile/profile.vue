<template>
  <view class="profile-page">
    <!-- 店铺封面 -->
    <view class="cover-wrap" @tap="chooseCover">
      <image v-if="form.cover" :src="form.cover" mode="aspectFill" class="cover-img" />
      <view v-else class="cover-placeholder">
        <text>点击上传店铺封面图</text>
      </view>
      <view class="cover-edit-tip">✏️ 修改封面</view>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="label">店铺名称</text>
        <input class="input" v-model="form.name" placeholder="店铺名称" maxlength="20" />
      </view>
      <view class="form-item">
        <text class="label">店铺简介</text>
        <input class="input" v-model="form.description" placeholder="一句话介绍你的店铺" maxlength="50" />
      </view>
      <view class="form-item">
        <text class="label">店铺分类</text>
        <picker mode="selector" :range="categories" @change="e => form.category = categories[e.detail.value]">
          <view class="picker-val">{{ form.category || '选择分类' }} ›</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">取餐地址</text>
        <input class="input" v-model="form.address" placeholder="顾客自取的位置" maxlength="50" />
      </view>
      <view class="form-item">
        <text class="label">营业时间</text>
        <input class="input" v-model="form.openTime" placeholder="如：08:00-22:00" maxlength="20" />
      </view>
      <view class="form-item">
        <text class="label">配送费(元)</text>
        <input class="input" v-model="form.deliveryFee" type="digit" placeholder="0为免费配送" />
      </view>
      <view class="form-item">
        <text class="label">起送金额(元)</text>
        <input class="input" v-model="form.minOrderAmount" type="digit" placeholder="0为无门槛" />
      </view>
      <view class="form-item">
        <text class="label">店铺标签</text>
        <view class="tags-wrap">
          <view v-for="(tag, i) in form.tags" :key="i" class="tag-item">
            <text>{{ tag }}</text>
            <text class="tag-del" @tap="removeTag(i)">×</text>
          </view>
          <input
            v-if="form.tags.length < 5"
            class="tag-input"
            v-model="newTag"
            placeholder="输入标签回车"
            maxlength="6"
            @confirm="addTag"
          />
        </view>
      </view>
    </view>

    <view class="save-btn" @tap="save" :class="{ loading: saving }">
      {{ saving ? '保存中...' : '保存设置' }}
    </view>

    <!-- 账号信息 -->
    <view class="account-info">
      <text class="account-text">手机号：{{ merchantInfo.phone }}</text>
      <text class="account-text">商家ID：{{ merchantInfo.merchantId }}</text>
    </view>
  </view>
</template>

<script>
import { callMerchant, showToast } from '../../utils/api.js';

export default {
  data() {
    return {
      merchantInfo: {},
      form: {
        name: '', description: '', category: '', address: '',
        openTime: '', deliveryFee: '', minOrderAmount: '', cover: '', tags: []
      },
      categories: ['快餐', '中餐', '小吃', '饮品', '水果', '甜品', '其他'],
      saving: false,
      newTag: ''
    };
  },

  onLoad() {
    this.merchantInfo = uni.getStorageSync('merchantInfo') || {};
    this.loadInfo();
  },

  methods: {
    async loadInfo() {
      const res = await callMerchant('getInfo', {});
      if (res.code === 0) {
        const d = res.data;
        this.form = {
          name: d.name || '', description: d.description || '',
          category: d.category || '', address: d.address || '',
          openTime: d.openTime || '', deliveryFee: String(d.deliveryFee || 0),
          minOrderAmount: String(d.minOrderAmount || 0),
          cover: d.cover || '', tags: d.tags || []
        };
      }
    },

    chooseCover() {
      uni.chooseImage({
        count: 1, sizeType: ['compressed'],
        success: async (res) => {
          uni.showLoading({ title: '上传中' });
          try {
            const up = await uniCloud.uploadFile({
              filePath: res.tempFilePaths[0],
              cloudPath: `covers/${Date.now()}.jpg`
            });
            this.form.cover = up.fileID;
          } catch(e) {
            this.form.cover = res.tempFilePaths[0];
          } finally {
            uni.hideLoading();
          }
        }
      });
    },

    addTag() {
      const tag = this.newTag.trim();
      if (tag && !this.form.tags.includes(tag)) {
        this.form.tags.push(tag);
      }
      this.newTag = '';
    },

    removeTag(i) {
      this.form.tags.splice(i, 1);
    },

    async save() {
      if (this.saving) return;
      if (!this.form.name.trim()) { showToast('店铺名称不能为空'); return; }
      this.saving = true;
      try {
        const res = await callMerchant('updateInfo', {
          ...this.form,
          deliveryFee: Number(this.form.deliveryFee || 0),
          minOrderAmount: Number(this.form.minOrderAmount || 0)
        });
        if (res.code === 0) {
          showToast('保存成功', 'success');
          const info = uni.getStorageSync('merchantInfo');
          info.name = this.form.name;
          uni.setStorageSync('merchantInfo', info);
        } else showToast(res.msg);
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style lang="scss">
.profile-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 160rpx; }

.cover-wrap {
  position: relative; height: 300rpx; background: #eee; overflow: hidden;
  .cover-img { width: 100%; height: 100%; }
  .cover-placeholder {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    font-size: 28rpx; color: #999;
    background: linear-gradient(135deg, #ffe0cc, #ffd0b5);
  }
  .cover-edit-tip {
    position: absolute; bottom: 16rpx; right: 16rpx;
    background: rgba(0,0,0,0.5); color: #fff; padding: 10rpx 20rpx;
    border-radius: 20rpx; font-size: 24rpx;
  }
}

.form-card {
  background: #fff; margin: 20rpx; border-radius: 16rpx; overflow: hidden;
  .form-item {
    display: flex; align-items: flex-start; padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5; gap: 20rpx;
    &:last-child { border-bottom: none; }
    .label { font-size: 28rpx; color: #333; width: 160rpx; flex-shrink: 0; padding-top: 4rpx; }
    .input { flex: 1; font-size: 28rpx; color: #333; text-align: right; }
    .picker-val { flex: 1; font-size: 28rpx; color: #333; text-align: right; }
    .tags-wrap {
      flex: 1; display: flex; flex-wrap: wrap; gap: 10rpx; justify-content: flex-end;
      .tag-item {
        display: flex; align-items: center; gap: 6rpx;
        background: #fff4f0; border: 1rpx solid #FFB38E;
        color: #FF6B35; padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 22rpx;
        .tag-del { font-size: 28rpx; color: #FF6B35; }
      }
      .tag-input { font-size: 26rpx; width: 160rpx; border-bottom: 1rpx solid #eee; padding: 4rpx 0; }
    }
  }
}

.save-btn {
  position: fixed; bottom: 30rpx; left: 30rpx; right: 30rpx;
  background: #FF6B35; color: #fff; text-align: center;
  padding: 28rpx; border-radius: 50rpx; font-size: 32rpx; font-weight: bold;
  box-shadow: 0 6rpx 20rpx rgba(255,107,53,0.4);
  &.loading { opacity: 0.7; }
}

.account-info {
  padding: 30rpx; text-align: center;
  .account-text { display: block; font-size: 24rpx; color: #ccc; margin-bottom: 8rpx; }
}
</style>
