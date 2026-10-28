'use strict';

function generateOrderNo() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `XYS${date}${time}${random}`;
}

function success(data, msg = '成功') {
  return { code: 0, msg, data };
}

function fail(msg = '操作失败', code = -1) {
  return { code, msg, data: null };
}

// 检查商家是否在营业时间
function isMerchantOpen(openTime) {
  if (!openTime || !openTime.includes('-')) return true;
  const [start, end] = openTime.split('-').map(t => t.trim());
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return nowStr >= start && nowStr <= end;
}

const db = uniCloud.database();
const ordersCol = db.collection('orders');
const goodsCol = db.collection('goods');
const merchantsCol = db.collection('merchants');
const ridersCol = db.collection('riders');
const dbCmd = db.command;

exports.main = async (event, context) => {
  try {
    const { action, data } = event;

    switch (action) {
      case 'createOrder': return await createOrder(event, data);
      case 'getUserOrders': return await getUserOrders(event, data);
      case 'getMerchantOrders': return await getMerchantOrders(event, data);
      case 'getOrderDetail': return await getOrderDetail(event, data);
      case 'acceptOrder': return await acceptOrder(event, data);
      case 'cookFinish': return await cookFinish(event, data);
      case 'finishOrder': return await finishOrder(event, data);
      case 'cancelOrder': return await cancelOrder(event, data);
      case 'userCancelOrder': return await userCancelOrder(event, data);
      // F9: 商家数据统计
      case 'getStats': return await getStats(event, data);
      // F13: 配送员相关
      case 'riderRegister': return await riderRegister(data);
      case 'riderLogin': return await riderLogin(data);
      case 'getPendingDeliveries': return await getPendingDeliveries(event, data);
      case 'getRiderOrders': return await getRiderOrders(event, data);
      case 'riderAcceptDelivery': return await riderAcceptDelivery(event, data);
      case 'riderCompleteDelivery': return await riderCompleteDelivery(event, data);
      default: return fail('未知操作');
    }
  } catch (err) {
    console.error('order云函数执行错误:', err);
    return { code: -500, msg: err.message || '云函数执行错误', data: err.stack };
  }
};

// 用户下单
async function createOrder(event, data) {
  const { userId, userNickName, userPhone } = event;
  if (!userId) return fail('请先登录');

  const { merchantId, items, deliveryType, address, remark, expectedTime } = data;
  if (!merchantId || !items || !items.length) return fail('参数不完整');
  if (!deliveryType) return fail('请选择配送方式');
  if (deliveryType === 1 && !address) return fail('送餐地址不能为空');

  // 验证商家是否营业
  const merchantRes = await merchantsCol.doc(merchantId).get();
  if (!merchantRes.data.length) return fail('商家不存在');
  const merchant = merchantRes.data[0];
  if (merchant.status !== 1) return fail('该商家暂未营业');

  // F12: 营业时间校验
  if (!isMerchantOpen(merchant.openTime)) {
    return fail(`商家营业时间为 ${merchant.openTime}，当前不在营业时间`);
  }

  // 验证商品并计算金额
  let totalAmount = 0;
  const orderItems = [];
  for (const item of items) {
    const goodsRes = await goodsCol.doc(item.goodsId).get();
    if (!goodsRes.data.length || goodsRes.data[0].status !== 1) {
      return fail(`商品"${item.goodsId}"已下架`);
    }
    const goods = goodsRes.data[0];
    const itemTotal = goods.price * item.quantity;
    totalAmount += itemTotal;
    orderItems.push({
      goodsId: item.goodsId,
      goodsName: goods.name,
      goodsImage: goods.image,
      price: goods.price,
      quantity: item.quantity,
      spec: item.spec || ''
    });
  }

  // 检查起送金额
  if (totalAmount < merchant.minOrderAmount) {
    return fail(`最低起送金额为 ¥${merchant.minOrderAmount}`);
  }

  const deliveryFee = deliveryType === 1 ? (merchant.deliveryFee || 0) : 0;
  const actualAmount = totalAmount + deliveryFee;
  const now = Date.now();
  const orderNo = generateOrderNo();

  const res = await ordersCol.add({
    orderNo,
    userId,
    userNickName: userNickName || '微信用户',
    userPhone: userPhone || '',
    merchantId,
    merchantName: merchant.name,
    items: orderItems,
    totalAmount,
    deliveryFee,
    actualAmount,
    deliveryType,
    address: address || '',
    remark: remark || '',
    // F15: 预约取餐时间
    expectedTime: expectedTime || '',
    status: 1, // 直接待接单（模拟已支付）
    payType: 1,
    payTime: now,
    createTime: now
  });

  // 更新商家销量
  await merchantsCol.doc(merchantId).update({
    salesCount: dbCmd.inc(1)
  });

  // 更新商品销量
  for (const item of orderItems) {
    await goodsCol.doc(item.goodsId).update({ sales: dbCmd.inc(item.quantity) });
  }

  return success({ orderId: res.id, orderNo, actualAmount }, '下单成功');
}

// 获取用户订单列表
async function getUserOrders(event, data) {
  const { userId } = event;
  if (!userId) return fail('请先登录');

  const { page = 1, pageSize = 10, status } = data || {};
  let where = { userId };
  if (status !== undefined && status !== '') where.status = Number(status);

  const [list, count] = await Promise.all([
    ordersCol.where(where).orderBy('createTime', 'desc').skip((page-1)*pageSize).limit(pageSize).get(),
    ordersCol.where(where).count()
  ]);
  return success({ list: list.data, total: count.total });
}

// 获取商家订单列表
async function getMerchantOrders(event, data) {
  const { merchantId } = event;
  if (!merchantId) return fail('未登录');

  const { page = 1, pageSize = 20, status } = data || {};
  let where = { merchantId };
  if (status !== undefined && status !== '') where.status = Number(status);

  const [list, count] = await Promise.all([
    ordersCol.where(where).orderBy('createTime', 'desc').skip((page-1)*pageSize).limit(pageSize).get(),
    ordersCol.where(where).count()
  ]);
  return success({ list: list.data, total: count.total });
}

// 获取订单详情
async function getOrderDetail(event, data) {
  const { orderId } = data;
  if (!orderId) return fail('参数缺失');

  const res = await ordersCol.doc(orderId).get();
  if (!res.data.length) return fail('订单不存在');
  return success(res.data[0]);
}

// 商家接单
async function acceptOrder(event, data) {
  const { merchantId } = event;
  const { orderId } = data;
  if (!merchantId || !orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  if (order.data[0].merchantId !== merchantId) return fail('无权操作');
  if (order.data[0].status !== 1) return fail('订单状态不正确');

  await ordersCol.doc(orderId).update({ status: 2, acceptTime: Date.now() });
  return success(null, '已接单，开始制作');
}

// 商家出餐
async function cookFinish(event, data) {
  const { merchantId } = event;
  const { orderId } = data;
  if (!merchantId || !orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  if (order.data[0].merchantId !== merchantId) return fail('无权操作');
  if (order.data[0].status !== 2) return fail('订单状态不正确');

  await ordersCol.doc(orderId).update({ status: 3, cookFinishTime: Date.now() });
  return success(null, '已出餐，等待取餐/配送');
}

// 完成订单（商家确认送达/用户确认取餐/骑手确认送达）
async function finishOrder(event, data) {
  const { orderId } = data;
  if (!orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  // 允许 status 3（待取餐）或 6（配送中）完成
  if (![3, 6].includes(order.data[0].status)) return fail('订单状态不正确');

  await ordersCol.doc(orderId).update({ status: 4, finishTime: Date.now() });
  return success(null, '订单已完成');
}

// 商家拒单/取消
async function cancelOrder(event, data) {
  const { merchantId } = event;
  const { orderId, reason } = data;
  if (!merchantId || !orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  if (order.data[0].merchantId !== merchantId) return fail('无权操作');
  if (![1, 2].includes(order.data[0].status)) return fail('当前状态不可取消');

  await ordersCol.doc(orderId).update({
    status: 5,
    cancelTime: Date.now(),
    cancelReason: reason || '商家取消'
  });
  return success(null, '已取消订单');
}

// 用户取消订单
async function userCancelOrder(event, data) {
  const { userId } = event;
  const { orderId } = data;
  if (!userId || !orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  if (order.data[0].userId !== userId) return fail('无权操作');
  if (order.data[0].status !== 1) return fail('订单已被接受，无法取消');

  await ordersCol.doc(orderId).update({
    status: 5,
    cancelTime: Date.now(),
    cancelReason: '用户取消'
  });
  return success(null, '已取消订单');
}

// ============ F9: 商家数据统计 ============
async function getStats(event, data) {
  const { merchantId } = event;
  if (!merchantId) return fail('未登录');

  const { range = 'today' } = data || {};
  const now = new Date();
  let startTime;

  if (range === 'today') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (range === 'week') {
    const day = now.getDay() || 7;
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
  } else if (range === 'month') {
    startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  } else {
    startTime = 0;
  }

  // 查询该时间段内非取消的订单
  const ordersRes = await ordersCol.where({
    merchantId,
    createTime: dbCmd.gte(startTime),
    status: dbCmd.neq(5)
  }).get();

  const orders = ordersRes.data;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.actualAmount || 0), 0);
  const avgAmount = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // 状态分布
  const statusDist = { pending: 0, cooking: 0, waiting: 0, delivering: 0, finished: 0 };
  orders.forEach(o => {
    if (o.status === 1) statusDist.pending++;
    else if (o.status === 2) statusDist.cooking++;
    else if (o.status === 3) statusDist.waiting++;
    else if (o.status === 6) statusDist.delivering++;
    else if (o.status === 4) statusDist.finished++;
  });

  // 热销商品 Top5
  const goodsMap = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.goodsId;
      if (!goodsMap[key]) {
        goodsMap[key] = { name: item.goodsName, sales: 0, revenue: 0 };
      }
      goodsMap[key].sales += item.quantity;
      goodsMap[key].revenue += item.price * item.quantity;
    });
  });
  const topGoods = Object.values(goodsMap).sort((a, b) => b.sales - a.sales).slice(0, 5);

  // 按天统计（最近7天）
  const dailyStats = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).getTime();
    const dayEnd = dayStart + 24 * 3600 * 1000;
    const dayOrders = orders.filter(o => o.createTime >= dayStart && o.createTime < dayEnd);
    const date = new Date(dayStart);
    const pad = n => String(n).padStart(2, '0');
    dailyStats.push({
      date: `${pad(date.getMonth()+1)}-${pad(date.getDate())}`,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + (o.actualAmount || 0), 0)
    });
  }

  return success({
    totalOrders,
    totalRevenue,
    avgAmount: Math.round(avgAmount * 100) / 100,
    statusDist,
    topGoods,
    dailyStats
  });
}

// ============ F13: 配送员端 ============

// 配送员注册
async function riderRegister(data) {
  const { name, phone, password } = data;
  if (!name || !phone || !password) return fail('参数不完整');

  const exist = await ridersCol.where({ phone }).count();
  if (exist.total > 0) return fail('该手机号已注册');

  const crypto = require('crypto');
  const now = Date.now();
  const res = await ridersCol.add({
    name,
    phone,
    password: crypto.createHash('md5').update(password).digest('hex'),
    status: 1, // 1=空闲 2=配送中
    totalDeliveries: 0,
    createTime: now
  });

  return success({ riderId: res.id }, '注册成功');
}

// 配送员登录
async function riderLogin(data) {
  const { phone, password } = data;
  if (!phone || !password) return fail('参数不完整');

  const crypto = require('crypto');
  const res = await ridersCol.where({
    phone,
    password: crypto.createHash('md5').update(password).digest('hex')
  }).get();

  if (res.data.length === 0) return fail('手机号或密码错误');

  const rider = res.data[0];
  if (rider.status === 3) return fail('账号已被禁用');

  const token = crypto.createHash('md5').update(`${rider._id}${Date.now()}`).digest('hex');
  await ridersCol.doc(rider._id).update({ token, tokenExpire: Date.now() + 7*24*3600*1000 });

  return success({
    riderId: rider._id,
    name: rider.name,
    phone: rider.phone,
    status: rider.status,
    totalDeliveries: rider.totalDeliveries || 0,
    token
  }, '登录成功');
}

// 获取待配送订单（status=3 且 deliveryType=1 且无骑手分配）
async function getPendingDeliveries(event, data) {
  const { riderId } = event;
  if (!riderId) return fail('未登录');

  const { page = 1, pageSize = 20 } = data || {};
  const where = {
    status: 3,
    deliveryType: 1,
    riderId: dbCmd.exists(false)
  };

  const [list, count] = await Promise.all([
    ordersCol.where(where).orderBy('cookFinishTime', 'asc').skip((page-1)*pageSize).limit(pageSize).get(),
    ordersCol.where(where).count()
  ]);

  return success({ list: list.data, total: count.total });
}

// 获取骑手已接的订单
async function getRiderOrders(event, data) {
  const { riderId } = event;
  if (!riderId) return fail('未登录');

  const { page = 1, pageSize = 20, status } = data || {};
  let where = { riderId };
  if (status !== undefined && status !== '') where.status = Number(status);

  const [list, count] = await Promise.all([
    ordersCol.where(where).orderBy('createTime', 'desc').skip((page-1)*pageSize).limit(pageSize).get(),
    ordersCol.where(where).count()
  ]);

  return success({ list: list.data, total: count.total });
}

// 骑手接单（接配送任务）
async function riderAcceptDelivery(event, data) {
  const { riderId } = event;
  const { orderId } = data;
  if (!riderId || !orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  if (order.data[0].status !== 3) return fail('订单状态不正确');
  if (order.data[0].deliveryType !== 1) return fail('该订单非配送订单');
  if (order.data[0].riderId) return fail('该订单已被其他骑手接单');

  await ordersCol.doc(orderId).update({
    riderId,
    riderName: (await ridersCol.doc(riderId).get()).data[0]?.name || '骑手',
    status: 6, // 配送中
    deliverStartTime: Date.now()
  });

  // 更新骑手状态为配送中
  await ridersCol.doc(riderId).update({ status: 2 });

  return success(null, '接单成功，开始配送');
}

// 骑手确认送达
async function riderCompleteDelivery(event, data) {
  const { riderId } = event;
  const { orderId } = data;
  if (!riderId || !orderId) return fail('参数缺失');

  const order = await ordersCol.doc(orderId).get();
  if (!order.data.length) return fail('订单不存在');
  if (order.data[0].riderId !== riderId) return fail('无权操作');
  if (order.data[0].status !== 6) return fail('订单状态不正确');

  await ordersCol.doc(orderId).update({
    status: 4,
    finishTime: Date.now(),
    deliverEndTime: Date.now()
  });

  // 更新骑手状态为空闲，增加配送次数
  await ridersCol.doc(riderId).update({
    status: 1,
    totalDeliveries: dbCmd.inc(1)
  });

  return success(null, '配送完成');
}
