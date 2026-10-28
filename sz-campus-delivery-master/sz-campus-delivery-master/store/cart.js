import { reactive, watch } from 'vue';

// 购物车 Store（简单响应式状态管理）
const cartState = reactive({
  merchantId: '',
  merchantName: '',
  items: [] // { goodsId, goodsName, goodsImage, price, quantity, spec }
});

// ============ F1: 购物车本地持久化 ============
const CART_STORAGE_KEY = 'campus_cart';

// 从本地恢复购物车
function restoreCart() {
  try {
    const saved = uni.getStorageSync(CART_STORAGE_KEY);
    if (saved && saved.items && saved.items.length > 0) {
      cartState.merchantId = saved.merchantId || '';
      cartState.merchantName = saved.merchantName || '';
      cartState.items = saved.items || [];
    }
  } catch (e) {
    console.log('恢复购物车失败:', e.message);
  }
}

// 保存购物车到本地
function saveCart() {
  try {
    uni.setStorageSync(CART_STORAGE_KEY, {
      merchantId: cartState.merchantId,
      merchantName: cartState.merchantName,
      items: cartState.items
    });
  } catch (e) {
    console.log('保存购物车失败:', e.message);
  }
}

// 启动时恢复
restoreCart();

// 监听变化自动保存
watch(
  () => cartState,
  () => saveCart(),
  { deep: true }
);

// 添加到购物车
export const addToCart = (merchantId, merchantName, goods, spec = '') => {
  // 切换商家时清空购物车
  if (cartState.merchantId && cartState.merchantId !== merchantId) {
    uni.showModal({
      title: '更换商家',
      content: '切换商家将清空购物车，是否继续？',
      success: (res) => {
        if (res.confirm) {
          clearCart();
          doAdd(merchantId, merchantName, goods, spec);
        }
      }
    });
    return;
  }
  doAdd(merchantId, merchantName, goods, spec);
};

const doAdd = (merchantId, merchantName, goods, spec) => {
  cartState.merchantId = merchantId;
  cartState.merchantName = merchantName;

  const key = `${goods._id}_${spec}`;
  const exist = cartState.items.find(i => `${i.goodsId}_${i.spec}` === key);
  if (exist) {
    exist.quantity += 1;
  } else {
    cartState.items.push({
      goodsId: goods._id,
      goodsName: goods.name,
      goodsImage: goods.image,
      price: goods.price,
      quantity: 1,
      spec
    });
  }
};

// F3: 批量添加（再来一单用）
export const batchAddToCart = (merchantId, merchantName, items) => {
  // 如果不同商家，先清空
  if (cartState.merchantId && cartState.merchantId !== merchantId) {
    clearCart();
  }
  cartState.merchantId = merchantId;
  cartState.merchantName = merchantName;

  items.forEach(item => {
    const key = `${item.goodsId}_${item.spec || ''}`;
    const exist = cartState.items.find(i => `${i.goodsId}_${i.spec}` === key);
    if (exist) {
      exist.quantity += item.quantity;
    } else {
      cartState.items.push({
        goodsId: item.goodsId,
        goodsName: item.goodsName,
        goodsImage: item.goodsImage,
        price: item.price,
        quantity: item.quantity,
        spec: item.spec || ''
      });
    }
  });
};

// 从购物车减少
export const removeFromCart = (goodsId, spec = '') => {
  const key = `${goodsId}_${spec}`;
  const idx = cartState.items.findIndex(i => `${i.goodsId}_${i.spec}` === key);
  if (idx === -1) return;
  if (cartState.items[idx].quantity <= 1) {
    cartState.items.splice(idx, 1);
  } else {
    cartState.items[idx].quantity -= 1;
  }
  if (cartState.items.length === 0) {
    cartState.merchantId = '';
    cartState.merchantName = '';
  }
};

// 清空购物车
export const clearCart = () => {
  cartState.merchantId = '';
  cartState.merchantName = '';
  cartState.items = [];
};

// 获取某商品数量
export const getCartCount = (goodsId, spec = '') => {
  const key = `${goodsId}_${spec}`;
  const item = cartState.items.find(i => `${i.goodsId}_${i.spec}` === key);
  return item ? item.quantity : 0;
};

// 总数量
export const totalCount = () => cartState.items.reduce((sum, i) => sum + i.quantity, 0);

// 总金额
export const totalAmount = () => cartState.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export default cartState;
