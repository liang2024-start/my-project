<template>
  <view class="goods-edit-page">
    <view class="form-card">
      <!-- 商品图片 -->
      <view class="form-item center">
        <view class="img-upload" @tap="chooseImage">
          <image v-if="form.image" :src="form.image" mode="aspectFill" class="preview-img" />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">📷</text>
            <text class="upload-text">上传商品图片</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">商品名称 *</text>
        <input class="input" v-model="form.name" placeholder="请输入商品名称" maxlength="30" />
      </view>

      <view class="form-item">
        <text class="label">商品描述</text>
        <input class="input" v-model="form.description" placeholder="简单描述一下（选填）" maxlength="100" />
      </view>

      <view class="form-item">
        <text class="label">售价(元) *</text>
        <input class="input" v-model="form.price" placeholder="0.00" type="digit" />
      </view>

      <view class="form-item">
        <text class="label">原价(元)</text>
        <input class="input" v-model="form.originalPrice" placeholder="划线价（选填）" type="digit" />
      </view>

      <view class="form-item">
        <text class="label">库存</text>
        <input class="input" v-model="form.stock" placeholder="默认999" type="number" />
      </view>

      <view class="form-item">
        <text class="label">商品分类</text>
        <picker mode="selector" :range="catNames" :range-key="'name'" @change="onCatChange">
          <view class="picker-val">{{ selectedCatName || '不分类' }} ›</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">是否推荐</text>
        <switch :checked="form.isRecommend" @change="form.isRecommend = $event.detail.value" color="#FF6B35" />
      </view>

      <view class="form-item">
        <text class="label">上架状态</text>
        <switch :checked="form.status === 1" @change="form.status = $event.detail.value ? 1 : 0" color="#FF6B35" />
      </view>
    </view>

    <view class="submit-btn" @tap="submit" :class="{ loading: submitting }">
      {{ submitting ? '保存中...' : (goodsId ? '保存修改' : '添加商品') }}
    </view>
  </view>
</template>

<script>
import { callGoods, showToast } from '../../utils/api.js';

export default {
  data() {
    return {
      goodsId: '',
      categories: [],
      form: {
        name: '', description: '', price: '', originalPrice: '',
        stock: '999', image: '', categoryId: '', isRecommend: false, status: 1
      },
      submitting: false
    };
  },

  computed: {
    catNames() { return [{ _id: '', name: '不分类' }, ...this.categories]; },
    selectedCatName() {
      const cat = this.categories.find(c => c._id === this.form.categoryId);
      return cat ? cat.name : '';
    }
  },

  onLoad(options) {
    this.goodsId = options.goodsId || '';
    uni.setNavigationBarTitle({ title: this.goodsId ? '编辑商品' : '添加商品' });
    this.loadCategories();
    if (this.goodsId) this.loadGoodsDetail();
  },

  methods: {
    async loadCategories() {
      const info = uni.getStorageSync('merchantInfo');
      const res = await callGoods('getCategories', { merchantId: info.merchantId });
      if (res.code === 0) this.categories = res.data;
    },

    async loadGoodsDetail() {
      const info = uni.getStorageSync('merchantInfo');
      const res = await callGoods('getList', { merchantId: info.merchantId, page: 1, pageSize: 200 });
      if (res.code === 0) {
        const goods = res.data.list.find(g => g._id === this.goodsId);
        if (goods) {
          this.form = {
            name: goods.name, description: goods.description || '',
            price: String(goods.price), originalPrice: String(goods.originalPrice || ''),
            stock: String(goods.stock), image: goods.image || '',
            categoryId: goods.categoryId || '', isRecommend: goods.isRecommend || false, status: goods.status
          };
        }
      }
    },

    onCatChange(e) {
      this.form.categoryId = this.catNames[e.detail.value]?._id || '';
    },

    chooseImage() {
      uni.chooseImage({
        count: 1, sizeType: ['compressed'],
        success: async (res) => {
          const tempPath = res.tempFilePaths[0];
          uni.showLoading({ title: '上传中' });
          try {
            const uploadRes = await uniCloud.uploadFile({
              filePath: tempPath,
              cloudPath: `goods/${Date.now()}.jpg`
            });
            this.form.image = uploadRes.fileID;
          } catch(e) {
            this.form.image = tempPath;
          } finally {
            uni.hideLoading();
          }
        }
      });
    },

    async submit() {
      if (this.submitting) return;
      if (!this.form.name.trim()) { showToast('请输入商品名称'); return; }
      if (!this.form.price || isNaN(Number(this.form.price))) { showToast('请输入正确的价格'); return; }

      this.submitting = true;
      try {
        const data = {
          ...this.form,
          price: Number(this.form.price),
          originalPrice: Number(this.form.originalPrice || this.form.price),
          stock: Number(this.form.stock || 999)
        };

        let res;
        if (this.goodsId) {
          res = await callGoods('update', { goodsId: this.goodsId, ...data });
        } else {
          res = await callGoods('add', data);
        }

        if (res.code === 0) {
          showToast(this.goodsId ? '修改成功' : '添加成功', 'success');
          setTimeout(() => uni.navigateBack(), 800);
        } else {
          showToast(res.msg || '操作失败');
        }
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss">
.goods-edit-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 160rpx; }

.form-card {
  background: #fff; margin: 20rpx; border-radius: 16rpx; overflow: hidden;
  .form-item {
    display: flex; align-items: center; padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5; gap: 20rpx;
    &.center { justify-content: center; }
    .label { font-size: 28rpx; color: #333; width: 160rpx; flex-shrink: 0; }
    .input { flex: 1; font-size: 28rpx; color: #333; text-align: right; }
    .picker-val { flex: 1; font-size: 28rpx; color: #333; text-align: right; }
  }
}

.img-upload {
  width: 240rpx; height: 240rpx; border-radius: 16rpx;
  border: 2rpx dashed #ddd; overflow: hidden;
  .preview-img { width: 100%; height: 100%; }
  .upload-placeholder {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12rpx;
    .upload-icon { font-size: 60rpx; }
    .upload-text { font-size: 26rpx; color: #999; }
  }
}

.submit-btn {
  position: fixed; bottom: 30rpx; left: 30rpx; right: 30rpx;
  background: #FF6B35; color: #fff; text-align: center;
  padding: 28rpx; border-radius: 50rpx; font-size: 32rpx; font-weight: bold;
  box-shadow: 0 6rpx 20rpx rgba(255,107,53,0.4);
  &.loading { opacity: 0.7; }
}
</style>
