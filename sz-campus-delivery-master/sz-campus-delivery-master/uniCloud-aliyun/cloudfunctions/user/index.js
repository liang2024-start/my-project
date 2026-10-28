'use strict';

function success(data, msg = '成功') {
  return { code: 0, msg, data };
}

function fail(msg = '操作失败', code = -1) {
  return { code, msg, data: null };
}

// 用户云函数（微信小程序登录 / H5测试登录）
exports.main = async (event, context) => {
  try {
    const { action, data } = event;

    switch (action) {
      case 'login': return await wxLogin(event, context);
      default: return fail('未知操作');
    }
  } catch (err) {
    console.error('user云函数执行错误:', err);
    return { code: -500, msg: err.message || '云函数执行错误', data: err.stack };
  }
};

async function wxLogin(event, context) {
  const { code, nickName, avatarUrl, mock } = event.data || {};

  // 1. 优先尝试获取微信小程序上下文 openid
  const wxContext = uniCloud.getWXContext ? uniCloud.getWXContext() : {};
  let openid = wxContext.OPENID || wxContext.openid;

  // 2. 如果拿不到 openid（比如 H5 环境），且显式声明 mock，则生成测试用户
  if (!openid && mock) {
    openid = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // 3. 如果都没有，返回错误（实际微信小程序环境不会走到这里）
  if (!openid) {
    // 兼容开发调试：返回一个 mock 用户，避免阻塞开发
    return success({
      uid: `dev_user_${Date.now()}`,
      token: `dev_token_${Date.now()}`,
      openid: '',
      nickName: nickName || '校园用户',
      avatarUrl: avatarUrl || ''
    }, '登录成功(开发模式)');
  }

  // 4. 可以在这里把用户信息写入 users 集合（如果后续需要保存用户资料）
  try {
    const db = uniCloud.database();
    const users = db.collection('users');
    const exist = await users.where({ openid }).limit(1).get();

    const userData = {
      openid,
      nickName: nickName || '校园用户',
      avatarUrl: avatarUrl || '',
      updateTime: Date.now(),
      lastLoginTime: Date.now()
    };

    if (!exist.data || exist.data.length === 0) {
      await users.add({
        ...userData,
        createTime: Date.now()
      });
    } else {
      await users.doc(exist.data[0]._id).update({
        nickName: userData.nickName,
        avatarUrl: userData.avatarUrl,
        updateTime: userData.updateTime,
        lastLoginTime: userData.lastLoginTime
      });
    }
  } catch (e) {
    console.log('users 集合写入失败（不影响登录）:', e.message);
  }

  return success({
    uid: openid,
    token: `token_${openid}_${Date.now()}`,
    openid,
    nickName: nickName || '校园用户',
    avatarUrl: avatarUrl || ''
  }, '登录成功');
}
