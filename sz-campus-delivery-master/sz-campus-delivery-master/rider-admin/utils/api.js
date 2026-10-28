// 配送员端 API 工具函数
const callCloud = async (name, action, data = {}, extra = {}) => {
  try {
    const res = await uniCloud.callFunction({
      name,
      data: { action, data, ...extra }
    });
    return res.result;
  } catch (e) {
    console.error(`云函数调用失败 [${name}/${action}]:`, JSON.stringify(e));
    return { code: -1, msg: e.message || e.errMsg || '网络错误', data: e };
  }
};

// 配送员端调用（携带 riderId）
export const callOrder = (action, data) => {
  const riderInfo = uni.getStorageSync('riderInfo') || {};
  return callCloud('order', action, data, { riderId: riderInfo.riderId || '' });
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
  callOrder, formatTime, orderStatusText, showToast, showConfirm
};
