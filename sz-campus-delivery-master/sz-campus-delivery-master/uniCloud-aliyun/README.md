# uniCloud 配置说明

## 支付宝云开发初始化

1. 在 HBuilderX 中，右键 `uniCloud-alipay` 目录 → 关联云服务空间（支付宝小程序云）
2. 上传所有云函数到云端
3. 在云数据库中初始化 Schema（上传 database 目录下所有 .schema.json 文件）

## 云函数列表

| 云函数名 | 功能 |
|---------|------|
| merchant | 商家注册/登录/信息管理/列表 |
| goods | 商品增删改查/分类管理 |
| order | 订单创建/接单/出餐/完成/取消 |
| user | 用户微信登录 |

## 数据库集合

| 集合名 | 说明 |
|-------|------|
| merchants | 商家信息 |
| goods | 商品信息 |
| goods_categories | 商品分类 |
| orders | 订单信息 |

## Tab 图标

pages.json 中配置了 tab 图标路径，请添加以下图片到 static/ 目录：
- tab_home.png / tab_home_active.png（首页）
- tab_order.png / tab_order_active.png（订单）
- tab_mine.png / tab_mine_active.png（我的）

也可以临时将所有图标路径改为 `static/logo.png` 进行开发调试。

## 微信小程序配置

在 manifest.json 的 mp-weixin.appid 填入你的微信小程序 AppID。

## 支付宝云 vs 微信云

本项目使用支付宝云（uniCloud-alipay），如需切换微信云：
- 将 uniCloud-alipay 改为 uniCloud
- 云函数逻辑无需改动（uniCloud API 一致）
