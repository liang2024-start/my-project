'use strict';

const crypto = require('crypto');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function success(data, msg = '成功') {
  return { code: 0, msg, data };
}

function fail(msg = '操作失败', code = -1) {
  return { code, msg, data: null };
}

const db = uniCloud.database();
const merchantsCol = db.collection('merchants');

exports.main = async (event, context) => {
  try {
    const { action, data } = event;

    switch (action) {
      case 'register': return await register(data);
      case 'login': return await login(data);
      case 'getInfo': return await getInfo(event);
      case 'updateInfo': return await updateInfo(event, data);
      case 'updateStatus': return await updateStatus(event, data);
      case 'getList': return await getList(data);
      default: return fail('未知操作');
    }
  } catch (err) {
    console.error('merchant云函数执行错误:', err);
    return { code: -500, msg: err.message || '云函数执行错误', data: err.stack };
  }
};

// 商家注册
async function register(data) {
  const { name, phone, password, category, address } = data;
  if (!name || !phone || !password) return fail('参数不完整');

  const exist = await merchantsCol.where({ phone }).count();
  if (exist.total > 0) return fail('该手机号已注册');

  const now = Date.now();
  const res = await merchantsCol.add({
    name,
    phone,
    password: md5(password),
    category: category || '其他',
    address: address || '',
    status: 1, // 直接营业，实际可改为0待审核
    rating: 5.0,
    salesCount: 0,
    deliveryFee: 2,
    minOrderAmount: 0,
    cover: '',
    description: '',
    tags: [],
    openTime: '08:00-22:00',
    createTime: now,
    updateTime: now
  });

  return success({ merchantId: res.id }, '注册成功');
}

// 商家登录
async function login(data) {
  const { phone, password } = data;
  if (!phone || !password) return fail('参数不完整');

  const res = await merchantsCol.where({ phone, password: md5(password) }).get();
  if (res.data.length === 0) return fail('手机号或密码错误');

  const merchant = res.data[0];
  if (merchant.status === 3) return fail('账号已被禁用');

  // 生成token（实际项目建议用uni-id）
  const token = md5(`${merchant._id}${Date.now()}`);
  
  // 存储token到缓存（简化版，实际建议用uni-id-token表）
  await merchantsCol.doc(merchant._id).update({ token, tokenExpire: Date.now() + 7*24*3600*1000 });

  return success({
    merchantId: merchant._id,
    name: merchant.name,
    phone: merchant.phone,
    avatar: merchant.avatar,
    cover: merchant.cover,
    status: merchant.status,
    token
  }, '登录成功');
}

// 获取商家信息
async function getInfo(event) {
  const { merchantId } = event;
  if (!merchantId) return fail('参数缺失');

  const res = await merchantsCol.doc(merchantId).field({
    password: false, token: false, tokenExpire: false
  }).get();
  
  if (res.data.length === 0) return fail('商家不存在');
  return success(res.data[0]);
}

// 更新商家信息
async function updateInfo(event, data) {
  const { merchantId } = event;
  if (!merchantId) return fail('未登录');

  const allowed = ['name','description','cover','avatar','address','deliveryFee','minOrderAmount','tags','openTime','category'];
  const updateData = {};
  allowed.forEach(k => { if (data[k] !== undefined) updateData[k] = data[k]; });
  updateData.updateTime = Date.now();

  await merchantsCol.doc(merchantId).update(updateData);
  return success(null, '更新成功');
}

// 更新营业状态
async function updateStatus(event, data) {
  const { merchantId } = event;
  const { status } = data;
  if (!merchantId) return fail('未登录');
  if (![1, 2].includes(status)) return fail('状态值无效');

  await merchantsCol.doc(merchantId).update({ status, updateTime: Date.now() });
  return success(null, status === 1 ? '已开启营业' : '已暂停营业');
}

// 获取商家列表（用户端）— F12: 加营业时间标记
async function getList(data) {
  const { page = 1, pageSize = 10, keyword = '', category = '' } = data || {};

  const [list, count] = await Promise.all([
    merchantsCol.where({ status: 1 })
      .field({ password: false, token: false, tokenExpire: false })
      .orderBy('salesCount', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get(),
    merchantsCol.where({ status: 1 }).count()
  ]);

  // F12: 标记商家是否在营业时间内
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const shops = list.data.map(shop => {
    let isOpenNow = true;
    if (shop.openTime && shop.openTime.includes('-')) {
      const [start, end] = shop.openTime.split('-').map(t => t.trim());
      isOpenNow = nowStr >= start && nowStr <= end;
    }
    return { ...shop, isOpenNow };
  });

  return success({ list: shops, total: count.total, page, pageSize });
}
