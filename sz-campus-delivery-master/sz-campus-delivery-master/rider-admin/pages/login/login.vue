<template>
  <view class="login-page">
    <view class="logo-area">
      <text class="logo-icon">🛵</text>
      <text class="logo-title">校园送配送员</text>
      <text class="logo-sub">接单配送，轻松赚钱</text>
    </view>

    <view class="form-card">
      <view v-if="isRegister" class="form-row">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="请输入真实姓名" maxlength="20" />
      </view>
      <view class="form-row">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.phone" placeholder="请输入手机号" type="number" maxlength="11" />
      </view>
      <view class="form-row">
        <text class="form-label">密码</text>
        <input class="form-input" v-model="form.password" placeholder="请输入密码" password maxlength="20" />
      </view>

      <view class="submit-btn" @tap="submit">{{ isRegister ? '注册' : '登录' }}</view>

      <view class="switch-mode" @tap="isRegister = !isRegister">
        {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
      </view>
    </view>
  </view>
</template>

<script>
import { callOrder, showToast } from '../../utils/api.js';

export default {
  data() {
    return {
      isRegister: false,
      form: { name: '', phone: '', password: '' }
    };
  },

  methods: {
    async submit() {
      if (!this.form.phone || !this.form.password) {
        showToast('请填写完整');
        return;
      }
      if (this.isRegister && !this.form.name) {
        showToast('请输入姓名');
        return;
      }
      if (this.form.phone.length !== 11) {
        showToast('请输入正确手机号');
        return;
      }

      const action = this.isRegister ? 'riderRegister' : 'riderLogin';
      const res = await callOrder(action, this.form);

      if (res.code === 0) {
        if (this.isRegister) {
          showToast('注册成功，请登录', 'success');
          this.isRegister = false;
        } else {
          uni.setStorageSync('riderInfo', res.data);
          showToast('登录成功', 'success');
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/dashboard/dashboard' });
          }, 800);
        }
      } else {
        showToast(res.msg);
      }
    }
  }
};
</script>

<style lang="scss">
.login-page {
  background: linear-gradient(180deg, #4ECDC4 0%, #45B7D1 40%, #f5f5f5 100%);
  min-height: 100vh; padding: 80rpx 40rpx;
}

.logo-area {
  text-align: center; margin-bottom: 60rpx;
  .logo-icon { font-size: 100rpx; display: block; }
  .logo-title { font-size: 40rpx; font-weight: bold; color: #fff; display: block; margin-top: 16rpx; }
  .logo-sub { font-size: 24rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 8rpx; }
}

.form-card {
  background: #fff; border-radius: 20rpx; padding: 40rpx 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
  .form-row {
    display: flex; align-items: center; padding: 20rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    .form-label { font-size: 28rpx; color: #333; width: 120rpx; flex-shrink: 0; }
    .form-input { flex: 1; font-size: 28rpx; color: #333; }
  }
}

.submit-btn {
  margin-top: 40rpx; background: #4ECDC4; color: #fff;
  text-align: center; padding: 28rpx; border-radius: 50rpx;
  font-size: 30rpx; font-weight: bold;
}

.switch-mode {
  text-align: center; margin-top: 24rpx; font-size: 26rpx; color: #4ECDC4;
}
</style>
