<script>
export default {
  onLaunch() {
    const riderInfo = uni.getStorageSync('riderInfo');
    if (riderInfo && riderInfo.riderId) {
      // 已登录，跳转工作台
      uni.reLaunch({ url: '/pages/dashboard/dashboard' });
    }
    // 未登录时默认就在 login 页（pages.json 第一个页面），不需要 reLaunch
  }
};
</script>

<style>
/* 全局样式 */
</style>
