<script>
export default {
  onLaunch: function() {
    console.log('🏬 校园送商家后台 Launch');
  },
  onShow: function() {
    console.log('App Show');
  },
  onHide: function() {
    console.log('App Hide');
  }
}
</script>

<style lang="scss">
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  background: #f5f5f5;
  color: #333;
  box-sizing: border-box;
}

$primary: #FF6B35;
$primary-light: #fff4f0;
$success: #4cd964;
$warning: #f0ad4e;
$danger: #dd524d;
$bg: #f5f5f5;
$card-bg: #fff;
$text-main: #333;
$text-sub: #666;
$text-light: #999;
$border: #f0f0f0;

.card {
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  overflow: hidden;
}

.btn-primary {
  background: $primary;
  color: #fff;
  border-radius: 50rpx;
  font-size: 28rpx;
  font-weight: bold;
  text-align: center;
  padding: 20rpx 40rpx;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
