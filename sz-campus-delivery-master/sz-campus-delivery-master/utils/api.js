// 调用云函数的工具函数
let _quotaWarned = false; // 额度耗尽提示只弹一次

const callCloud = async (name, action, data = {}, extra = {}) => {
  try {
    const res = await uniCloud.callFunction({
      name,
      data: { action, data, ...extra }
    });
    return res.result;
  } catch (e) {
    console.error(`云函数调用失败 [${name}/${action}]:`, JSON.stringify(e));

    // 额度耗尽友好提示
    const errStr = JSON.stringify(e);
    if (errStr.includes('PrePayResourceExhausted') || errStr.includes('resource exhausted')) {
      if (!_quotaWarned) {
        _quotaWarned = true;
        uni.showModal({
          title: '云服务额度已用完',
          content: '当前阿里云 uniCloud 免费额度已耗尽，请明天再试或新建服务空间。已展示本地缓存数据。',
          showCancel: false
        });
      }
      return { code: -503, msg: '云服务额度已用完', data: e, quotaExhausted: true };
    }

    // 域名白名单问题
    if (errStr.includes('url not in domain list')) {
      return { code: -403, msg: '请在微信开发者工具中勾选"不校验合法域名"', data: e };
    }

    return { code: -1, msg: e.message || e.errMsg || '网络错误', data: e };
  }
};

// 用户端调用
export const callUser = (action, data) => {
  const userInfo = uni.getStorageSync('userInfo') || {};
  return callCloud('user', action, data, { userId: userInfo.uid || '' });
};

// 商家端调用
export const callMerchant = (action, data) => {
  const merchantInfo = uni.getStorageSync('merchantInfo') || {};
  return callCloud('merchant', action, data, { merchantId: merchantInfo.merchantId || '' });
};

// 商品端调用（商家身份）
export const callGoods = (action, data) => {
  const merchantInfo = uni.getStorageSync('merchantInfo') || {};
  return callCloud('goods', action, data, { merchantId: merchantInfo.merchantId || '' });
};

// 订单端调用（根据身份携带不同参数）
export const callOrder = (action, data, isMerchant = false) => {
  if (isMerchant) {
    const merchantInfo = uni.getStorageSync('merchantInfo') || {};
    return callCloud('order', action, data, { merchantId: merchantInfo.merchantId || '' });
  } else {
    const userInfo = uni.getStorageSync('userInfo') || {};
    return callCloud('order', action, data, { userId: userInfo.uid || '', userNickName: userInfo.nickName || '' });
  }
};

// 格式化时间
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// 订单状态文字
export const orderStatusText = (status) => {
  const map = {
    0: '待支付', 1: '待接单', 2: '制作中', 3: '待取餐', 4: '已完成', 5: '已取消', 6: '配送中'
  };
  return map[status] || '未知';
};

// 订单状态颜色
export const orderStatusColor = (status) => {
  const map = {
    0: '#f0ad4e', 1: '#FF6B35', 2: '#FF6B35', 3: '#4cd964', 4: '#999', 5: '#999', 6: '#FF8C42'
  };
  return map[status] || '#333';
};

// 配送方式文字
export const deliveryTypeText = (type) => type === 1 ? '送到宿舍' : '自取';

// 显示toast
export const showToast = (title, icon = 'none') => {
  uni.showToast({ title, icon, duration: 2000 });
};

// 显示确认弹窗
export const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: res => resolve(res.confirm)
    });
  });
};

export default {
  callUser, callMerchant, callGoods, callOrder,
  formatTime, orderStatusText, orderStatusColor, deliveryTypeText,
  showToast, showConfirm
};
