# 校园送 · 商家后台

这是 **校园送** 项目的独立商家管理后台（H5 网站）。

与客户端小程序完全分离，商家通过浏览器即可管理店铺、订单、商品。

---

## 目录结构

```
merchant-admin/
  ├── manifest.json          # uni-app 应用配置
  ├── pages.json             # 页面路由
  ├── main.js                # 入口
  ├── App.vue                # 全局
  ├── uni.scss               # 全局 SCSS 变量
  ├── utils/api.js           # 云函数调用封装
  ├── static/logo.png        # 默认 logo
  └── pages/
        ├── login/login.vue        # 商家登录/注册
        ├── dashboard/dashboard.vue # 工作台
        ├── order/order-list.vue    # 订单管理
        ├── goods/goods-list.vue    # 商品列表
        ├── goods/goods-edit.vue    # 添加/编辑商品
        └── profile/profile.vue     # 店铺设置
```

---

## 如何使用

### 1. 在 HBuilderX 中打开

把 `merchant-admin` 作为**独立项目**在 HBuilderX 中打开：

- 文件 → 打开目录 → 选择 `D:\DoXiaZai\校园送\merchant-admin`

### 2. 关联同一个阿里云服务空间

右键 `uniCloud-aliyun` → 关联云服务空间 → 选择校园送项目使用的同一个阿里云空间。

这样商家后台才能调用同一套云函数和数据库。

### 3. 运行到浏览器

- 运行 → 运行到浏览器 → Chrome

浏览器中会打开商家登录页，用商家手机号/密码登录即可。

---

## 注意事项

- 商家后台和客户端小程序共用一套 `uniCloud-aliyun` 云函数
- 商家登录信息保存在 `merchantInfo` 中
- 商家注册成功后，客户端小程序首页才能看到该店铺

---

## 技术栈

- uni-app Vue3
- uniCloud 阿里云
- H5 / 浏览器访问
