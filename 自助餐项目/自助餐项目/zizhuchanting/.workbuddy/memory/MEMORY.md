# 项目长期备忘（zizhuchanting 海鲜自助餐厅系统）

- 运行环境：JDK1.8（C:\Jemeter\JDK1.8）、Maven（D:\apache-maven-3.8.8）、Tomcat 9.0.29（D:\apache-tomcat-9.0.29）、MySQL 8.0.26（root，密码见 src/main/resources/config.properties）
- 构建：`mvn -DskipTests clean package` → target/zizhuchanting.war → 拷到 Tomcat webapps 启动
- 已修复：MySQL 8 驱动兼容问题（connector 升 8.0.28 + jdbc_url 加 useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai）
- 前端为预构建 Vue2 dist（src/main/webapp/admin/dist），接口 baseUrl 硬编码 http://localhost:8080/zizhuchanting/
- 管理端入口：http://localhost:8080/zizhuchanting/admin/dist/ ，账号 admin/admin（角色：管理员）
- 项目来源：D:\ssm038海鲜自助餐厅系统+vue.zip（别人给的项目）
