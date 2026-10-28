'use strict';

function success(data, msg = '成功') {
  return { code: 0, msg, data };
}

function fail(msg = '操作失败', code = -1) {
  return { code, msg, data: null };
}

const db = uniCloud.database();
const goodsCol = db.collection('goods');
const categoryCol = db.collection('goods_categories');

exports.main = async (event, context) => {
  try {
    const { action, data } = event;

    switch (action) {
      case 'add': return await addGoods(event, data);
      case 'update': return await updateGoods(event, data);
      case 'delete': return await deleteGoods(event, data);
      case 'toggleStatus': return await toggleStatus(event, data);
      case 'getList': return await getList(data);
      case 'getMerchantGoods': return await getMerchantGoods(data);
      case 'addCategory': return await addCategory(event, data);
      case 'getCategories': return await getCategories(data);
      case 'deleteCategory': return await deleteCategory(event, data);
      default: return fail('未知操作');
    }
  } catch (err) {
    console.error('goods云函数执行错误:', err);
    return { code: -500, msg: err.message || '云函数执行错误', data: err.stack };
  }
};

// 添加商品
async function addGoods(event, data) {
  const { merchantId } = event;
  if (!merchantId) return fail('未登录');
  const { name, price, image, categoryId, description, stock, isRecommend } = data;
  if (!name || price === undefined) return fail('商品名称和价格必填');

  const now = Date.now();
  const res = await goodsCol.add({
    merchantId,
    name,
    price: Number(price),
    originalPrice: Number(data.originalPrice || price),
    image: image || '',
    categoryId: categoryId || '',
    description: description || '',
    stock: Number(stock || 999),
    sales: 0,
    status: 1,
    isRecommend: isRecommend || false,
    specs: data.specs || [],
    createTime: now,
    updateTime: now
  });
  return success({ goodsId: res.id }, '添加成功');
}

// 更新商品
async function updateGoods(event, data) {
  const { merchantId } = event;
  if (!merchantId) return fail('未登录');
  const { goodsId, ...updateData } = data;
  if (!goodsId) return fail('参数缺失');

  // 验证商品属于该商家
  const goods = await goodsCol.doc(goodsId).get();
  if (!goods.data.length || goods.data[0].merchantId !== merchantId) return fail('无权操作');

  updateData.updateTime = Date.now();
  if (updateData.price !== undefined) updateData.price = Number(updateData.price);
  await goodsCol.doc(goodsId).update(updateData);
  return success(null, '更新成功');
}

// 删除商品
async function deleteGoods(event, data) {
  const { merchantId } = event;
  const { goodsId } = data;
  if (!merchantId || !goodsId) return fail('参数缺失');

  const goods = await goodsCol.doc(goodsId).get();
  if (!goods.data.length || goods.data[0].merchantId !== merchantId) return fail('无权操作');

  await goodsCol.doc(goodsId).remove();
  return success(null, '删除成功');
}

// 切换上下架
async function toggleStatus(event, data) {
  const { merchantId } = event;
  const { goodsId } = data;
  if (!merchantId || !goodsId) return fail('参数缺失');

  const goods = await goodsCol.doc(goodsId).get();
  if (!goods.data.length || goods.data[0].merchantId !== merchantId) return fail('无权操作');

  const newStatus = goods.data[0].status === 1 ? 0 : 1;
  await goodsCol.doc(goodsId).update({ status: newStatus, updateTime: Date.now() });
  return success({ status: newStatus }, newStatus === 1 ? '已上架' : '已下架');
}

// 用户端获取商家商品列表（按分类分组）
async function getMerchantGoods(data) {
  const { merchantId } = data;
  if (!merchantId) return fail('参数缺失');

  const [goodsRes, catRes] = await Promise.all([
    goodsCol.where({ merchantId, status: 1 }).orderBy('isRecommend', 'desc').orderBy('sales', 'desc').get(),
    categoryCol.where({ merchantId }).orderBy('sort', 'asc').get()
  ]);

  const goods = goodsRes.data;
  const categories = catRes.data;

  // 整理分类+商品结构
  const result = [];
  
  // 推荐
  const recommended = goods.filter(g => g.isRecommend);
  if (recommended.length) {
    result.push({ _id: 'recommend', name: '推荐', goods: recommended });
  }

  // 各分类
  categories.forEach(cat => {
    const catGoods = goods.filter(g => g.categoryId === cat._id);
    if (catGoods.length) {
      result.push({ _id: cat._id, name: cat.name, goods: catGoods });
    }
  });

  // 未分类
  const categorizedIds = new Set(categories.map(c => c._id));
  const uncategorized = goods.filter(g => !g.categoryId || !categorizedIds.has(g.categoryId));
  if (uncategorized.length) {
    result.push({ _id: 'other', name: '其他', goods: uncategorized });
  }

  return success(result);
}

// 商家端获取自己的商品列表
async function getList(data) {
  const { merchantId, page = 1, pageSize = 20, categoryId, status } = data;
  if (!merchantId) return fail('参数缺失');

  let where = { merchantId };
  if (categoryId) where.categoryId = categoryId;
  if (status !== undefined) where.status = Number(status);

  const [list, count] = await Promise.all([
    goodsCol.where(where).orderBy('createTime', 'desc').skip((page-1)*pageSize).limit(pageSize).get(),
    goodsCol.where(where).count()
  ]);
  return success({ list: list.data, total: count.total });
}

// 添加分类
async function addCategory(event, data) {
  const { merchantId } = event;
  if (!merchantId) return fail('未登录');
  const { name, sort } = data;
  if (!name) return fail('分类名称必填');

  const res = await categoryCol.add({
    merchantId,
    name,
    sort: sort || 0,
    createTime: Date.now()
  });
  return success({ categoryId: res.id }, '添加成功');
}

// 获取分类列表
async function getCategories(data) {
  const { merchantId } = data;
  if (!merchantId) return fail('参数缺失');
  const res = await categoryCol.where({ merchantId }).orderBy('sort', 'asc').get();
  return success(res.data);
}

// 删除分类
async function deleteCategory(event, data) {
  const { merchantId } = event;
  const { categoryId } = data;
  if (!merchantId || !categoryId) return fail('参数缺失');
  await categoryCol.doc(categoryId).remove();
  return success(null, '删除成功');
}
