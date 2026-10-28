<template>
  <view class="auth-page">
    <view class="auth-header">
      <text class="logo-icon">🏪</text>
      <text class="auth-title">{{ isLogin ? '商家登录' : '商家注册' }}</text>
      <text class="auth-sub">校园送商家管理平台</text>
    </view>

    <view class="auth-form">
      <!-- 注册额外字段 -->
      <template v-if="!isLogin">
        <view class="form-item">
          <text class="label">店铺名称</text>
          <input class="input" v-model="form.name" placeholder="请输入店铺名称" maxlength="20" />
        </view>
        <view class="form-item">
          <text class="label">店铺分类</text>
          <picker mode="selector" :range="categories" @change="onCatChange">
            <view class="picker-val">{{ form.category || '选择分类' }} ›</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">取餐地址</text>
          <input class="input" v-model="form.address" placeholder="如：A栋一楼西侧" maxlength="50" />
        </view>
      </template>

      <view class="form-item">
        <text class="label">手机号</text>
        <input class="input" v-model="form.phone" placeholder="请输入手机号" type="number" maxlength="11" />
      </view>
      <view class="form-item">
        <text class="label">密码</text>
        <input class="input" v-model="form.password" placeholder="请输入密码（6位以上）" password maxlength="20" />
      </view>

      <view class="submit-btn" @tap="submit" :class="{ loading: submitting }">
        {{ submitting ? '处理中...' : (isLogin ? '登录' : '注册') }}
      </view>

      <view class="toggle-row" @tap="isLogin = !isLogin">
        {{ isLogin ? '还没有账号？立即注册' : '已有账号？去登录' }}
      </view>
    </view>
  </view>
</template>

<script>
import { callMerchant, showToast } from '../../utils/api.js';

export default {
  data() {
    return {
      isLogin: true,
      submitting: false,
      categories: ['快餐', '中餐', '小吃', '饮品', '水果', '甜品', '其他'],
      form: {
        name: '', phone: '', password: '', category: '', address: ''
      }
    };
  },

  onLoad() {
    // 如果已登录，直接跳转
    const info = uni.getStorageSync('merchantInfo');
    if (info?.merchantId) {
      uni.reLaunch({ url: '/pages/dashboard/dashboard' });
    }
  },

  methods: {
    onCatChange(e) {
      this.form.category = this.categories[e.detail.value];
    },

    async submit() {
      if (this.submitting) return;
      const { name, phone, password, category, address } = this.form;

      if (!phone || phone.length !== 11) { showToast('请输入正确的手机号'); return; }
      if (!password || password.length < 6) { showToast('密码不能少于6位'); return; }
      if (!this.isLogin) {
        if (!name.trim()) { showToast('请输入店铺名称'); return; }
      }

      this.submitting = true;
      try {
        let res;
        if (this.isLogin) {
          res = await callMerchant('login', { phone, password });
        } else {
          res = await callMerchant('register', { name, phone, password, category, address });
        }

        if (res.code === 0) {
          if (this.isLogin) {
            uni.setStorageSync('merchantInfo', res.data);
            showToast('登录成功', 'success');
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/dashboard/dashboard' });
            }, 800);
          } else {
            showToast('注册成功，请登录', 'success');
            this.isLogin = true;
          }
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
.auth-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #FF6B35 0%, #FF8C42 40%, #f5f5f5 40%);
  padding: 0 0 40rpx;
}

.auth-header {
  padding: 80rpx 40rpx 60rpx;
  display: flex; flex-direction: column; align-items: center;
  .logo-icon { font-size: 100rpx; }
  .auth-title { font-size: 44rpx; font-weight: bold; color: #fff; margin: 16rpx 0 8rpx; }
  .auth-sub { font-size: 26rpx; color: rgba(255,255,255,0.8); }
}

.auth-form {
  background: #fff; margin: 0 30rpx; border-radius: 24rpx;
  padding: 40rpx 30rpx; box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.1);

  .form-item {
    display: flex; align-items: center; padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    &:last-of-type { border-bottom: none; }
    .label { font-size: 28rpx; color: #333; width: 160rpx; flex-shrink: 0; }
    .input { flex: 1; font-size: 28rpx; color: #333; }
    .picker-val { flex: 1; font-size: 28rpx; color: #333; text-align: right; }
  }

  .submit-btn {
    background: #FF6B35; color: #fff; text-align: center;
    padding: 28rpx; border-radius: 50rpx; font-size: 32rpx; font-weight: bold;
    margin: 40rpx 0 20rpx;
    &.loading { opacity: 0.7; }
  }

  .toggle-row {
    text-align: center; font-size: 26rpx; color: #FF6B35; padding: 10rpx;
  }
}
</style>
