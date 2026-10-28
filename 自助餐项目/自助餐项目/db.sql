/*
SQLyog Ultimate v11.3 (64 bit)
MySQL - 5.7.32-log : Database - zizhuchanting
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`zizhuchanting` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `zizhuchanting`;

/*Table structure for table `canzhuo` */

DROP TABLE IF EXISTS `canzhuo`;

CREATE TABLE `canzhuo` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(200) DEFAULT NULL COMMENT '餐桌名称 Search',
  `tableLocation` varchar(200) DEFAULT NULL COMMENT '餐桌位置',
  `sf_types` tinyint(4) DEFAULT NULL COMMENT '是否预定 Search',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COMMENT='餐桌表';

/*Data for the table `canzhuo` */

insert  into `canzhuo`(`id`,`name`,`tableLocation`,`sf_types`) values (1,'1号餐桌','餐桌位置1',2),(2,'2号餐桌','餐桌位置2',2),(3,'3号餐桌','餐桌位置3',2),(4,'4号餐桌','餐桌位置4',1);

/*Table structure for table `config` */

DROP TABLE IF EXISTS `config`;

CREATE TABLE `config` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(100) NOT NULL COMMENT '配置参数名称',
  `value` varchar(100) DEFAULT NULL COMMENT '配置参数值',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COMMENT='配置文件';

/*Data for the table `config` */

insert  into `config`(`id`,`name`,`value`) values (1,'picture1','http://localhost:8080/fd-ssmj/upload/1613705295135.jpg'),(2,'picture2','http://localhost:8080/fd-ssmj/upload/1613705301525.jpg'),(3,'picture3','http://localhost:8080/fd-ssmj/upload/1613799912302.JPG'),(4,'picture4','http://localhost:8080/fd-ssmj/upload/1613705325348.jpg'),(5,'picture5','http://localhost:8080/fd-ssmj/upload/1613705332544.jpg'),(6,'homepage','http://localhost:8080/fd-ssmj/upload/1613705342094.jpg');

/*Table structure for table `dictionary` */

DROP TABLE IF EXISTS `dictionary`;

CREATE TABLE `dictionary` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `dic_code` varchar(200) DEFAULT NULL COMMENT '字段',
  `dic_name` varchar(200) DEFAULT NULL COMMENT '字段名',
  `code_index` tinyint(4) DEFAULT NULL COMMENT '编码',
  `index_name` varchar(200) DEFAULT NULL COMMENT '编码名字',
  `super_id` int(11) DEFAULT NULL COMMENT '父字段id',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COMMENT='字典表';

/*Data for the table `dictionary` */

insert  into `dictionary`(`id`,`dic_code`,`dic_name`,`code_index`,`index_name`,`super_id`,`create_time`) values (1,'sex_types','性别',1,'男',NULL,'2021-02-25 11:41:54'),(2,'sex_types','性别',2,'女',NULL,'2021-02-25 11:41:54'),(3,'sf_types','是否',1,'是',NULL,'2021-02-25 11:41:54'),(4,'sf_types','是否',2,'否',NULL,'2021-02-25 11:41:54');

/*Table structure for table `dingdanxiangqing` */

DROP TABLE IF EXISTS `dingdanxiangqing`;

CREATE TABLE `dingdanxiangqing` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `odd` varchar(200) DEFAULT NULL COMMENT '订单号 Search',
  `hx_types` tinyint(4) DEFAULT NULL COMMENT '海鲜名称',
  `number` int(4) DEFAULT NULL COMMENT '数量 Search',
  `money` decimal(10,2) DEFAULT NULL COMMENT '单价',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8 COMMENT='订单详情';

/*Data for the table `dingdanxiangqing` */

insert  into `dingdanxiangqing`(`id`,`odd`,`hx_types`,`number`,`money`) values (1,'1615207060567',1,7,'30.00'),(2,'1615207060567',2,18,'20.00'),(3,'1615207060567',3,29,'10.00'),(11,'1615258272174',1,3,'30.00'),(12,'1615258272174',2,2,'20.00'),(13,'1615258272174',3,23,'10.00'),(14,'1615260728415',1,30,'30.00');

/*Table structure for table `haixian` */

DROP TABLE IF EXISTS `haixian`;

CREATE TABLE `haixian` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `hx_types` tinyint(4) DEFAULT NULL COMMENT '海鲜名称',
  `money` decimal(10,2) DEFAULT NULL COMMENT '海鲜单价 Search',
  `img_photo` varchar(200) DEFAULT NULL COMMENT '海鲜图片',
  `haixian_content` varchar(200) DEFAULT NULL COMMENT '海鲜描述',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COMMENT='海鲜表';

/*Data for the table `haixian` */

insert  into `haixian`(`id`,`hx_types`,`money`,`img_photo`,`haixian_content`) values (1,3,'30.00','http://localhost:8080/zizhuchanting/upload/1615190737663.jpg','<p>11111老好吃了</p>'),(2,2,'20.00','http://localhost:8080/zizhuchanting/upload/1615190769052.jpg','<p>也挺好吃</p>'),(5,1,'10.00','http://localhost:8080/zizhuchanting/upload/1615266843278.jpg','<p>非常好吃</p>'),(7,5,'100.00','http://localhost:8080/zizhuchanting/upload/1615268627446.jpg','<p>1232132</p>');

/*Table structure for table `kuchuen` */

DROP TABLE IF EXISTS `kuchuen`;

CREATE TABLE `kuchuen` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(200) DEFAULT NULL COMMENT '海鲜名称 Search',
  `number` int(4) DEFAULT NULL COMMENT '库存数量',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COMMENT='库存表';

/*Data for the table `kuchuen` */

insert  into `kuchuen`(`id`,`name`,`number`) values (1,'海鲜1',0),(2,'海鲜2',0),(3,'海鲜3',27),(5,'海鲜4',80);

/*Table structure for table `liushui` */

DROP TABLE IF EXISTS `liushui`;

CREATE TABLE `liushui` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `odd` varchar(200) DEFAULT NULL COMMENT '订单号',
  `cz_types` tinyint(4) DEFAULT NULL COMMENT '餐桌名称',
  `yh_types` tinyint(4) DEFAULT NULL COMMENT '预定用户',
  `sf_types` tinyint(4) DEFAULT NULL COMMENT '是否支付 Search',
  `maxMoney` decimal(10,2) DEFAULT NULL COMMENT '总价',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '支付时间 Search',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8 COMMENT='流水表';

/*Data for the table `liushui` */

insert  into `liushui`(`id`,`odd`,`cz_types`,`yh_types`,`sf_types`,`maxMoney`,`create_time`) values (2,'1615207060567',4,1,1,'860.00','2021-03-08 20:37:49'),(6,'1615258272174',4,1,1,'360.00','2021-03-09 10:51:12'),(13,'1615272019564',4,11,1,'500.00','2021-03-09 14:40:22'),(14,'1615274176906',4,1,2,'500.00','2021-03-09 15:16:17'),(15,'1615274191043',4,1,2,'500.00','2021-03-09 15:16:56'),(16,'1615274306554',4,1,2,'40.00','2021-03-09 15:18:27'),(17,'1615274316433',4,1,2,'40.00','2021-03-09 15:19:58');

/*Table structure for table `token` */

DROP TABLE IF EXISTS `token`;

CREATE TABLE `token` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `userid` int(20) NOT NULL COMMENT '用户id',
  `username` varchar(100) NOT NULL COMMENT '用户名',
  `tablename` varchar(100) DEFAULT NULL COMMENT '表名',
  `role` varchar(100) DEFAULT NULL COMMENT '角色',
  `token` varchar(200) NOT NULL COMMENT '密码',
  `addtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '新增时间',
  `expiratedtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '过期时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='token表';

/*Data for the table `token` */

insert  into `token`(`id`,`userid`,`username`,`tablename`,`role`,`token`,`addtime`,`expiratedtime`) values (5,1,'admin','users','管理员','vder43itfpufprjl8d721g8sbio2sp6y','2021-03-04 11:02:31','2021-03-09 16:15:45');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` varchar(100) NOT NULL COMMENT '用户名',
  `password` varchar(100) NOT NULL COMMENT '密码',
  `role` varchar(100) NOT NULL DEFAULT '管理员' COMMENT '角色',
  `addtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '新增时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='用户表';

/*Data for the table `users` */

insert  into `users`(`id`,`username`,`password`,`role`,`addtime`) values (1,'admin','admin','管理员','2021-03-01 00:00:00');

/*Table structure for table `yonghu` */

DROP TABLE IF EXISTS `yonghu`;

CREATE TABLE `yonghu` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(200) DEFAULT NULL COMMENT '名称  Search111',
  `username` varchar(255) DEFAULT NULL COMMENT '账号',
  `password` varchar(255) DEFAULT NULL COMMENT '密码',
  `img_photo` varchar(255) DEFAULT NULL COMMENT '头像',
  `sex_types` tinyint(4) DEFAULT NULL COMMENT '性别  Search111',
  `phone` varchar(200) DEFAULT NULL COMMENT '手机号',
  `role` varchar(255) DEFAULT NULL COMMENT '身份',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COMMENT='用户表';

/*Data for the table `yonghu` */

insert  into `yonghu`(`id`,`name`,`username`,`password`,`img_photo`,`sex_types`,`phone`,`role`) values (1,'小金','111','111','http://localhost:8080/zizhuchanting/upload/1615259583314.jpg',1,'17796312333','用户'),(2,'小札','222','222','http://localhost:8080/zizhuchanting/upload/1615259866641.jpg',2,'12312312333','用户'),(11,'123','123','123','http://localhost:8080/zizhuchanting/upload/1615271337741.jpg',1,'12312312333','用户');

/*Table structure for table `yudingcanzhuo` */

DROP TABLE IF EXISTS `yudingcanzhuo`;

CREATE TABLE `yudingcanzhuo` (
  `id` int(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `cz_types` tinyint(4) DEFAULT NULL COMMENT '餐桌名称',
  `yh_types` tinyint(4) DEFAULT NULL COMMENT '预定用户',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '预定时间 Search',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COMMENT='预定餐桌表';

/*Data for the table `yudingcanzhuo` */

insert  into `yudingcanzhuo`(`id`,`cz_types`,`yh_types`,`create_time`) values (7,4,1,'2021-03-09 15:16:09');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
