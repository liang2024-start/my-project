校园送 🍔
校园外卖点餐小程序，包含用户端（微信小程序）和商家管理后台（H5）。

技术栈
框架：uni-app (Vue3)
云服务：uniCloud（阿里云）
目标平台：微信小程序（用户端） / H5（商家后台）
状态管理：Vue3 reactive 全局状态
设计风格：简洁扁平，参考美团
主色：#FF6B35（活力橙）
辅色：#4ECDC4（清新青）
功能模块
用户端（微信小程序）
页面	路径	说明
登录	pages/auth/user-login	微信授权登录
首页	pages/user/home/home	商家列表、分类浏览
点餐	pages/user/shop/shop	商品列表、加入购物车
购物车	pages/user/cart/cart	结算下单
订单列表	pages/user/order/order-list	历史订单查看
订单详情	pages/user/order/order-detail	订单状态追踪
我的	pages/user/mine/mine	个人中心
商家后台（独立 H5 项目）
目录：merchant-admin/，需在 HBuilderX 中单独打开并关联同一 uniCloud 服务空间。

页面	路径	说明
登录	pages/login/login	商家账号登录
工作台	pages/dashboard/dashboard	数据概览
接单	pages/order/order-list	订单处理
商品管理	pages/goods/goods-list	商品列表
商品编辑	pages/goods/goods-edit	新增/编辑商品
店铺设置	pages/profile/profile	店铺信息配置
云函数
采用 action 路由模式，一个云函数处理多个业务操作。

云函数	说明
user	用户登录、信息管理
merchant	商家信息、店铺管理
goods	商品 CRUD、分类管理
order	订单创建、状态流转
数据库集合
集合	Schema 文件	说明
users	users.schema.json	用户信息
merchants	merchants.schema.json	商家信息
goods	goods.schema.json	商品信息
goods_categories	goods_categories.schema.json	商品分类
orders	orders.schema.json	订单数据
订单状态流转
0-待支付 → 1-待接单 → 2-制作中 → 3-待取餐 → 4-已完成
    └──────────────────────────────────→ 5-已取消
状态码	状态	说明
0	待支付	用户下单未支付
1	待接单	已支付，等待商家接单
2	制作中	商家已接单，制作中
3	待取餐	制作完成，等待用户取餐
4	已完成	用户已取餐，订单完成
5	已取消	订单已取消
项目结构
校园送/
├── pages/                      # 用户端页面
│   ├── auth/                   # 登录
│   ├── user/                   # 用户相关
│   │   ├── home/               # 首页
│   │   ├── shop/               # 点餐
│   │   ├── cart/               # 购物车
│   │   ├── order/              # 订单
│   │   └── mine/               # 我的
│   └── index/
├── components/                 # 公共组件
├── store/
│   └── cart.js                 # 购物车全局状态
├── utils/
│   └── api.js                  # 云函数调用封装
├── static/                     # 静态资源
├── uniCloud-aliyun/            # uniCloud 云开发
│   ├── cloudfunctions/         # 云函数
│   │   ├── user/
│   │   ├── merchant/
│   │   ├── goods/
│   │   └── order/
│   └── database/               # 数据库 Schema
├── merchant-admin/             # 商家后台（独立项目）
├── App.vue
├── main.js
├── pages.json
├── manifest.json
└── uni.scss
快速开始
环境要求
HBuilderX（最新版）
微信开发者工具
uniCloud 阿里云服务空间
用户端运行
用 HBuilderX 打开项目根目录
关联 uniCloud 阿里云服务空间
上传所有云函数和数据库 Schema
点击「运行 → 运行到微信开发者工具」
商家后台运行
用 HBuilderX 打开 merchant-admin/ 目录
关联同一 uniCloud 服务空间
点击「运行 → 运行到浏览器」
