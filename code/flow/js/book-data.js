// 大学生书目数据
const bookData = [
    {
        id: 1001,
        title: "高等数学（上册）",
        authors: ["同济大学数学系"],
        isbn: "9787040396638",
        publisher: "高等教育出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 25.50,
        transactionMethods: ["当面交易", "校内配送"],
        description: "高等数学经典教材，内容全面，适合大一学生使用。书内有少量笔记，不影响阅读。",
        contact: "",
        sellerId: 1,
        sellerName: "张同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-01T10:00:00Z",
        updatedAt: "2023-10-01T10:00:00Z",
        views: 120,
        favorites: 25,
        images: [{name: "高等数学.jpg", url: "https://via.placeholder.com/300x400?text=高等数学", file: null}]
    },
    {
        id: 1002,
        title: "大学英语精读（第一册）",
        authors: ["翟象俊", "张增健"],
        isbn: "9787544645782",
        publisher: "上海外语教育出版社",
        category: "外语",
        condition: "几乎全新",
        price: 30.00,
        transactionMethods: ["当面交易"],
        description: "大学英语经典教材，几乎全新，无笔记。",
        contact: "",
        sellerId: 2,
        sellerName: "李同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-02T14:30:00Z",
        updatedAt: "2023-10-02T14:30:00Z",
        views: 95,
        favorites: 18,
        images: [{name: "大学英语.jpg", url: "https://via.placeholder.com/300x400?text=大学英语", file: null}]
    },
    {
        id: 1003,
        title: "计算机科学导论",
        authors: ["贝赫鲁兹·福罗赞"],
        isbn: "9787111474120",
        publisher: "机械工业出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 45.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "计算机科学入门经典教材，内容涵盖计算机科学基础知识。有少量重点标记。",
        contact: "",
        sellerId: 3,
        sellerName: "王同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-03T09:15:00Z",
        updatedAt: "2023-10-03T09:15:00Z",
        views: 210,
        favorites: 42,
        images: [{name: "计算机导论.jpg", url: "https://via.placeholder.com/300x400?text=计算机导论", file: null}]
    },
    {
        id: 1004,
        title: "微观经济学",
        authors: ["罗伯特·S·平狄克", "丹尼尔·L·鲁宾费尔德"],
        isbn: "9787300135228",
        publisher: "中国人民大学出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 55.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "经济学经典教材，微观经济学理论与实践结合。有部分习题解答。",
        contact: "",
        sellerId: 4,
        sellerName: "陈同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-04T16:20:00Z",
        updatedAt: "2023-10-04T16:20:00Z",
        views: 180,
        favorites: 35,
        images: [{name: "微观经济学.jpg", url: "https://via.placeholder.com/300x400?text=微观经济学", file: null}]
    },
    {
        id: 1005,
        title: "现代汉语",
        authors: ["黄伯荣", "廖序东"],
        isbn: "9787040284218",
        publisher: "高等教育出版社",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 35.00,
        transactionMethods: ["当面交易"],
        description: "中文专业必修教材，现代汉语语法、词汇、修辞等知识。有课堂笔记。",
        contact: "",
        sellerId: 5,
        sellerName: "刘同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-05T11:45:00Z",
        updatedAt: "2023-10-05T11:45:00Z",
        views: 145,
        favorites: 28,
        images: [{name: "现代汉语.jpg", url: "https://via.placeholder.com/300x400?text=现代汉语", file: null}]
    },
    {
        id: 1006,
        title: "有机化学",
        authors: ["胡宏纹"],
        isbn: "9787040447045",
        publisher: "高等教育出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 48.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "化学专业核心教材，有机化合物结构与反应机理。有实验笔记。",
        contact: "",
        sellerId: 6,
        sellerName: "赵同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-06T13:30:00Z",
        updatedAt: "2023-10-06T13:30:00Z",
        views: 165,
        favorites: 30,
        images: [{name: "有机化学.jpg", url: "https://via.placeholder.com/300x400?text=有机化学", file: null}]
    },
    {
        id: 1007,
        title: "线性代数",
        authors: ["同济大学数学系"],
        isbn: "9787040396645",
        publisher: "高等教育出版社",
        category: "教材",
        condition: "几乎全新",
        price: 28.00,
        transactionMethods: ["当面交易"],
        description: "线性代数经典教材，内容清晰，例题丰富。几乎全新，无笔记。",
        contact: "",
        sellerId: 7,
        sellerName: "孙同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-07T08:20:00Z",
        updatedAt: "2023-10-07T08:20:00Z",
        views: 190,
        favorites: 38,
        images: [{name: "线性代数.jpg", url: "https://via.placeholder.com/300x400?text=线性代数", file: null}]
    },
    {
        id: 1008,
        title: "大学物理（力学）",
        authors: ["张三慧"],
        isbn: "9787302209916",
        publisher: "清华大学出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 32.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "大学物理经典教材，力学部分。有重点标记和习题解答。",
        contact: "",
        sellerId: 8,
        sellerName: "周同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-08T15:10:00Z",
        updatedAt: "2023-10-08T15:10:00Z",
        views: 175,
        favorites: 32,
        images: [{name: "大学物理.jpg", url: "https://via.placeholder.com/300x400?text=大学物理", file: null}]
    },
    {
        id: 1009,
        title: "计算机网络",
        authors: ["谢希仁"],
        isbn: "9787121255839",
        publisher: "电子工业出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 42.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "计算机网络经典教材，网络协议、体系结构等核心知识。有重点笔记。",
        contact: "",
        sellerId: 9,
        sellerName: "吴同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-09T12:45:00Z",
        updatedAt: "2023-10-09T12:45:00Z",
        views: 220,
        favorites: 45,
        images: [{name: "计算机网络.jpg", url: "https://via.placeholder.com/300x400?text=计算机网络", file: null}]
    },
    {
        id: 1010,
        title: "概率论与数理统计",
        authors: ["浙江大学"],
        isbn: "9787040238982",
        publisher: "高等教育出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 30.00,
        transactionMethods: ["当面交易"],
        description: "概率论与数理统计经典教材，理论与应用并重。有习题解答。",
        contact: "",
        sellerId: 10,
        sellerName: "徐同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-10T10:30:00Z",
        updatedAt: "2023-10-10T10:30:00Z",
        views: 200,
        favorites: 40,
        images: [{name: "概率统计.jpg", url: "https://via.placeholder.com/300x400?text=概率统计", file: null}]
    },
    {
        id: 1011,
        title: "大学英语精读（第二册）",
        authors: ["翟象俊", "张增健"],
        isbn: "9787544645799",
        publisher: "上海外语教育出版社",
        category: "外语",
        condition: "轻微使用痕迹",
        price: 28.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "大学英语精读系列第二册，课文难度适中，有词汇注释。",
        contact: "",
        sellerId: 11,
        sellerName: "马同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-11T14:15:00Z",
        updatedAt: "2023-10-11T14:15:00Z",
        views: 110,
        favorites: 22,
        images: [{name: "大学英语2.jpg", url: "https://via.placeholder.com/300x400?text=大学英语2", file: null}]
    },
    {
        id: 1012,
        title: "数据结构与算法分析",
        authors: ["Mark Allen Weiss"],
        isbn: "9787115261219",
        publisher: "人民邮电出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 50.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "数据结构经典教材，C++语言描述。有算法实现示例。",
        contact: "",
        sellerId: 12,
        sellerName: "朱同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-12T09:50:00Z",
        updatedAt: "2023-10-12T09:50:00Z",
        views: 250,
        favorites: 50,
        images: [{name: "数据结构.jpg", url: "https://via.placeholder.com/300x400?text=数据结构", file: null}]
    },
    {
        id: 1013,
        title: "宏观经济学",
        authors: ["多恩布什", "费希尔"],
        isbn: "9787040193930",
        publisher: "高等教育出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 52.00,
        transactionMethods: ["当面交易"],
        description: "宏观经济学经典教材，理论与实践结合。有课堂笔记。",
        contact: "",
        sellerId: 13,
        sellerName: "胡同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-13T16:40:00Z",
        updatedAt: "2023-10-13T16:40:00Z",
        views: 170,
        favorites: 33,
        images: [{name: "宏观经济学.jpg", url: "https://via.placeholder.com/300x400?text=宏观经济学", file: null}]
    },
    {
        id: 1014,
        title: "中国古代文学史（上）",
        authors: ["袁行霈"],
        isbn: "9787040255491",
        publisher: "高等教育出版社",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 45.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "中国古代文学史经典教材，内容详实，有重点标记。",
        contact: "",
        sellerId: 14,
        sellerName: "郭同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-14T11:25:00Z",
        updatedAt: "2023-10-14T11:25:00Z",
        views: 135,
        favorites: 27,
        images: [{name: "古代文学史.jpg", url: "https://via.placeholder.com/300x400?text=古代文学史", file: null}]
    },
    {
        id: 1015,
        title: "无机化学",
        authors: ["宋天佑"],
        isbn: "9787040265841",
        publisher: "高等教育出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 40.00,
        transactionMethods: ["当面交易"],
        description: "无机化学经典教材，理论与实验结合。有实验数据记录。",
        contact: "",
        sellerId: 15,
        sellerName: "何同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-15T13:55:00Z",
        updatedAt: "2023-10-15T13:55:00Z",
        views: 155,
        favorites: 31,
        images: [{name: "无机化学.jpg", url: "https://via.placeholder.com/300x400?text=无机化学", file: null}]
    },
    {
        id: 1016,
        title: "离散数学",
        authors: ["左孝凌"],
        isbn: "9787560615613",
        publisher: "西安电子科技大学出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 35.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "计算机专业必修课程，数理逻辑、集合论、图论等。有习题解答。",
        contact: "",
        sellerId: 16,
        sellerName: "林同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-16T08:40:00Z",
        updatedAt: "2023-10-16T08:40:00Z",
        views: 185,
        favorites: 37,
        images: [{name: "离散数学.jpg", url: "https://via.placeholder.com/300x400?text=离散数学", file: null}]
    },
    {
        id: 1017,
        title: "大学物理（电磁学）",
        authors: ["张三慧"],
        isbn: "9787302209923",
        publisher: "清华大学出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 33.00,
        transactionMethods: ["当面交易"],
        description: "大学物理电磁学部分，理论与应用并重。有重点标记。",
        contact: "",
        sellerId: 17,
        sellerName: "郑同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-17T15:20:00Z",
        updatedAt: "2023-10-17T15:20:00Z",
        views: 160,
        favorites: 32,
        images: [{name: "大学物理2.jpg", url: "https://via.placeholder.com/300x400?text=大学物理2", file: null}]
    },
    {
        id: 1018,
        title: "操作系统概念",
        authors: ["Silberschatz", "Galvin", "Gagne"],
        isbn: "9787111425122",
        publisher: "机械工业出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 58.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "操作系统经典教材，进程、内存、文件系统等核心概念。有课堂笔记。",
        contact: "",
        sellerId: 18,
        sellerName: "谢同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-18T12:35:00Z",
        updatedAt: "2023-10-18T12:35:00Z",
        views: 240,
        favorites: 48,
        images: [{name: "操作系统.jpg", url: "https://via.placeholder.com/300x400?text=操作系统", file: null}]
    },
    {
        id: 1019,
        title: "统计学",
        authors: ["贾俊平"],
        isbn: "9787300186978",
        publisher: "中国人民大学出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 38.00,
        transactionMethods: ["当面交易"],
        description: "统计学经典教材，描述统计、推断统计等。有案例分析。",
        contact: "",
        sellerId: 19,
        sellerName: "唐同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-19T10:15:00Z",
        updatedAt: "2023-10-19T10:15:00Z",
        views: 195,
        favorites: 39,
        images: [{name: "统计学.jpg", url: "https://via.placeholder.com/300x400?text=统计学", file: null}]
    },
    {
        id: 1020,
        title: "大学英语精读（第三册）",
        authors: ["翟象俊", "张增健"],
        isbn: "9787544645805",
        publisher: "上海外语教育出版社",
        category: "外语",
        condition: "轻微使用痕迹",
        price: 29.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "大学英语精读系列第三册，课文难度提升。有词汇和语法笔记。",
        contact: "",
        sellerId: 20,
        sellerName: "冯同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-20T14:50:00Z",
        updatedAt: "2023-10-20T14:50:00Z",
        views: 125,
        favorites: 25,
        images: [{name: "大学英语3.jpg", url: "https://via.placeholder.com/300x400?text=大学英语3", file: null}]
    },
    {
        id: 1021,
        title: "Java程序设计基础",
        authors: ["陈国君"],
        isbn: "9787302385214",
        publisher: "清华大学出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 45.00,
        transactionMethods: ["当面交易"],
        description: "Java编程入门教材，语法、面向对象等基础概念。有代码示例。",
        contact: "",
        sellerId: 21,
        sellerName: "钟同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-21T09:30:00Z",
        updatedAt: "2023-10-21T09:30:00Z",
        views: 210,
        favorites: 42,
        images: [{name: "Java基础.jpg", url: "https://via.placeholder.com/300x400?text=Java基础", file: null}]
    },
    {
        id: 1022,
        title: "货币金融学",
        authors: ["弗雷德里克·S·米什金"],
        isbn: "9787111464923",
        publisher: "机械工业出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 60.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "金融学经典教材，货币银行学理论与实践。有案例分析笔记。",
        contact: "",
        sellerId: 22,
        sellerName: "卢同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-22T16:10:00Z",
        updatedAt: "2023-10-22T16:10:00Z",
        views: 175,
        favorites: 35,
        images: [{name: "货币金融学.jpg", url: "https://via.placeholder.com/300x400?text=货币金融学", file: null}]
    },
    {
        id: 1023,
        title: "中国现代文学史",
        authors: ["朱栋霖"],
        isbn: "9787040452087",
        publisher: "高等教育出版社",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 42.00,
        transactionMethods: ["当面交易"],
        description: "现代文学史教材，鲁迅、茅盾等作家作品分析。有课堂笔记。",
        contact: "",
        sellerId: 23,
        sellerName: "蒋同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-23T11:55:00Z",
        updatedAt: "2023-10-23T11:55:00Z",
        views: 140,
        favorites: 28,
        images: [{name: "现代文学史.jpg", url: "https://via.placeholder.com/300x400?text=现代文学史", file: null}]
    },
    {
        id: 1024,
        title: "分析化学",
        authors: ["华东理工大学"],
        isbn: "9787562828893",
        publisher: "华东理工大学出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 38.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "分析化学理论与实验教材，定量分析方法。有实验报告。",
        contact: "",
        sellerId: 24,
        sellerName: "蔡同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-24T13:40:00Z",
        updatedAt: "2023-10-24T13:40:00Z",
        views: 150,
        favorites: 30,
        images: [{name: "分析化学.jpg", url: "https://via.placeholder.com/300x400?text=分析化学", file: null}]
    },
    {
        id: 1025,
        title: "复变函数与积分变换",
        authors: ["西安交大"],
        isbn: "9787040214385",
        publisher: "高等教育出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 32.00,
        transactionMethods: ["当面交易"],
        description: "工程数学必修课程，复变函数理论与应用。有习题解答。",
        contact: "",
        sellerId: 25,
        sellerName: "潘同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-25T08:25:00Z",
        updatedAt: "2023-10-25T08:25:00Z",
        views: 165,
        favorites: 33,
        images: [{name: "复变函数.jpg", url: "https://via.placeholder.com/300x400?text=复变函数", file: null}]
    },
    {
        id: 1026,
        title: "大学物理（光学）",
        authors: ["张三慧"],
        isbn: "9787302209930",
        publisher: "清华大学出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 31.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "大学物理光学部分，几何光学、波动光学等。有实验笔记。",
        contact: "",
        sellerId: 26,
        sellerName: "田同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-26T15:05:00Z",
        updatedAt: "2023-10-26T15:05:00Z",
        views: 145,
        favorites: 29,
        images: [{name: "大学物理3.jpg", url: "https://via.placeholder.com/300x400?text=大学物理3", file: null}]
    },
    {
        id: 1027,
        title: "数据库系统概论",
        authors: ["王珊", "萨师煊"],
        isbn: "9787040406646",
        publisher: "高等教育出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 48.00,
        transactionMethods: ["当面交易"],
        description: "数据库经典教材，关系数据库、SQL语言等。有实验代码。",
        contact: "",
        sellerId: 27,
        sellerName: "董同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-27T12:50:00Z",
        updatedAt: "2023-10-27T12:50:00Z",
        views: 230,
        favorites: 46,
        images: [{name: "数据库.jpg", url: "https://via.placeholder.com/300x400?text=数据库", file: null}]
    },
    {
        id: 1028,
        title: "计量经济学",
        authors: ["李子奈", "潘文卿"],
        isbn: "9787040321715",
        publisher: "高等教育出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 45.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "计量经济学理论与应用，回归分析方法。有案例分析。",
        contact: "",
        sellerId: 28,
        sellerName: "袁同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-28T10:35:00Z",
        updatedAt: "2023-10-28T10:35:00Z",
        views: 185,
        favorites: 37,
        images: [{name: "计量经济学.jpg", url: "https://via.placeholder.com/300x400?text=计量经济学", file: null}]
    },
    {
        id: 1029,
        title: "大学英语精读（第四册）",
        authors: ["翟象俊", "张增健"],
        isbn: "9787544645812",
        publisher: "上海外语教育出版社",
        category: "外语",
        condition: "轻微使用痕迹",
        price: 30.00,
        transactionMethods: ["当面交易"],
        description: "大学英语精读系列第四册，难度进一步提升。有翻译笔记。",
        contact: "",
        sellerId: 29,
        sellerName: "于同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-29T14:20:00Z",
        updatedAt: "2023-10-29T14:20:00Z",
        views: 130,
        favorites: 26,
        images: [{name: "大学英语4.jpg", url: "https://via.placeholder.com/300x400?text=大学英语4", file: null}]
    },
    {
        id: 1030,
        title: "Python程序设计",
        authors: ["郑莉"],
        isbn: "9787302481424",
        publisher: "清华大学出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 42.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "Python编程入门教材，语法、数据结构、面向对象等。有编程示例。",
        contact: "",
        sellerId: 30,
        sellerName: "蒋同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-10-30T09:10:00Z",
        updatedAt: "2023-10-30T09:10:00Z",
        views: 260,
        favorites: 52,
        images: [{name: "Python编程.jpg", url: "https://via.placeholder.com/300x400?text=Python编程", file: null}]
    },
    {
        id: 1031,
        title: "国际贸易实务",
        authors: ["黎孝先", "王健"],
        isbn: "9787300188644",
        publisher: "中国人民大学出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 40.00,
        transactionMethods: ["当面交易"],
        description: "国际贸易理论与实务，进出口业务流程。有案例分析。",
        contact: "",
        sellerId: 31,
        sellerName: "邓同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-10-31T16:35:00Z",
        updatedAt: "2023-10-31T16:35:00Z",
        views: 160,
        favorites: 32,
        images: [{name: "国际贸易实务.jpg", url: "https://via.placeholder.com/300x400?text=国际贸易实务", file: null}]
    },
    {
        id: 1032,
        title: "外国文学史",
        authors: ["郑克鲁"],
        isbn: "9787040265858",
        publisher: "高等教育出版社",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 48.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "外国文学史教材，欧美文学发展脉络。有作家作品分析笔记。",
        contact: "",
        sellerId: 32,
        sellerName: "夏同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-01T11:40:00Z",
        updatedAt: "2023-11-01T11:40:00Z",
        views: 145,
        favorites: 29,
        images: [{name: "外国文学史.jpg", url: "https://via.placeholder.com/300x400?text=外国文学史", file: null}]
    },
    {
        id: 1033,
        title: "物理化学",
        authors: ["天津大学"],
        isbn: "9787040265865",
        publisher: "高等教育出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 52.00,
        transactionMethods: ["当面交易"],
        description: "物理化学理论与应用，热力学、动力学等。有实验数据记录。",
        contact: "",
        sellerId: 33,
        sellerName: "钟同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-02T13:25:00Z",
        updatedAt: "2023-11-02T13:25:00Z",
        views: 170,
        favorites: 34,
        images: [{name: "物理化学.jpg", url: "https://via.placeholder.com/300x400?text=物理化学", file: null}]
    },
    {
        id: 1034,
        title: "数值分析",
        authors: ["李庆扬"],
        isbn: "9787302186181",
        publisher: "清华大学出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 35.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "数值计算方法教材，插值、数值积分等。有算法实现。",
        contact: "",
        sellerId: 34,
        sellerName: "汪同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-03T08:50:00Z",
        updatedAt: "2023-11-03T08:50:00Z",
        views: 190,
        favorites: 38,
        images: [{name: "数值分析.jpg", url: "https://via.placeholder.com/300x400?text=数值分析", file: null}]
    },
    {
        id: 1035,
        title: "大学物理（热学）",
        authors: ["张三慧"],
        isbn: "9787302209947",
        publisher: "清华大学出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 30.00,
        transactionMethods: ["当面交易"],
        description: "大学物理热学部分，热力学定律等。有重点标记。",
        contact: "",
        sellerId: 35,
        sellerName: "范同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-04T15:15:00Z",
        updatedAt: "2023-11-04T15:15:00Z",
        views: 150,
        favorites: 30,
        images: [{name: "大学物理4.jpg", url: "https://via.placeholder.com/300x400?text=大学物理4", file: null}]
    },
    {
        id: 1036,
        title: "计算机图形学",
        authors: ["Donald Hearn"],
        isbn: "9787302143467",
        publisher: "清华大学出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 55.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "计算机图形学经典教材，图形生成、变换等。有代码示例。",
        contact: "",
        sellerId: 36,
        sellerName: "彭同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-05T12:40:00Z",
        updatedAt: "2023-11-05T12:40:00Z",
        views: 200,
        favorites: 40,
        images: [{name: "计算机图形学.jpg", url: "https://via.placeholder.com/300x400?text=计算机图形学", file: null}]
    },
    {
        id: 1037,
        title: "市场营销学",
        authors: ["吴健安"],
        isbn: "9787040285055",
        publisher: "高等教育出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 38.00,
        transactionMethods: ["当面交易"],
        description: "市场营销理论与实践，市场调研、营销策略等。有案例分析。",
        contact: "",
        sellerId: 37,
        sellerName: "鲁同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-06T10:25:00Z",
        updatedAt: "2023-11-06T10:25:00Z",
        views: 175,
        favorites: 35,
        images: [{name: "市场营销学.jpg", url: "https://via.placeholder.com/300x400?text=市场营销学", file: null}]
    },
    {
        id: 1038,
        title: "古代汉语",
        authors: ["王力"],
        isbn: "9787040266107",
        publisher: "中华书局",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 45.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "古代汉语经典教材，文选、常用词、古汉语通论。有注释笔记。",
        contact: "",
        sellerId: 38,
        sellerName: "韦同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-07T14:55:00Z",
        updatedAt: "2023-11-07T14:55:00Z",
        views: 155,
        favorites: 31,
        images: [{name: "古代汉语.jpg", url: "https://via.placeholder.com/300x400?text=古代汉语", file: null}]
    },
    {
        id: 1039,
        title: "生物化学",
        authors: ["王镜岩"],
        isbn: "9787040212626",
        publisher: "高等教育出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 65.00,
        transactionMethods: ["当面交易"],
        description: "生物化学经典教材，蛋白质、核酸、酶等。有重点标记。",
        contact: "",
        sellerId: 39,
        sellerName: "昌同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-08T09:40:00Z",
        updatedAt: "2023-11-08T09:40:00Z",
        views: 180,
        favorites: 36,
        images: [{name: "生物化学.jpg", url: "https://via.placeholder.com/300x400?text=生物化学", file: null}]
    },
    {
        id: 1040,
        title: "理论力学",
        authors: ["周衍柏"],
        isbn: "9787040098221",
        publisher: "高等教育出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 38.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "理论力学经典教材，拉格朗日力学、哈密顿力学等。有习题解答。",
        contact: "",
        sellerId: 40,
        sellerName: "苗同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-09T16:20:00Z",
        updatedAt: "2023-11-09T16:20:00Z",
        views: 165,
        favorites: 33,
        images: [{name: "理论力学.jpg", url: "https://via.placeholder.com/300x400?text=理论力学", file: null}]
    },
    {
        id: 1041,
        title: "大学英语精读（第五册）",
        authors: ["翟象俊", "张增健"],
        isbn: "9787544645829",
        publisher: "上海外语教育出版社",
        category: "外语",
        condition: "轻微使用痕迹",
        price: 32.00,
        transactionMethods: ["当面交易"],
        description: "大学英语精读系列第五册，高级英语阅读。有词汇注释。",
        contact: "",
        sellerId: 41,
        sellerName: "凤同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-10T11:05:00Z",
        updatedAt: "2023-11-10T11:05:00Z",
        views: 135,
        favorites: 27,
        images: [{name: "大学英语5.jpg", url: "https://via.placeholder.com/300x400?text=大学英语5", file: null}]
    },
    {
        id: 1042,
        title: "软件工程",
        authors: ["张海藩"],
        isbn: "9787302144518",
        publisher: "清华大学出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 50.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "软件工程经典教材，需求分析、设计、测试等。有项目案例。",
        contact: "",
        sellerId: 42,
        sellerName: "花同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-11T13:50:00Z",
        updatedAt: "2023-11-11T13:50:00Z",
        views: 220,
        favorites: 44,
        images: [{name: "软件工程.jpg", url: "https://via.placeholder.com/300x400?text=软件工程", file: null}]
    },
    {
        id: 1043,
        title: "财政学",
        authors: ["陈共"],
        isbn: "9787300188651",
        publisher: "中国人民大学出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 42.00,
        transactionMethods: ["当面交易"],
        description: "财政学理论与实践，公共财政、税收等。有课堂笔记。",
        contact: "",
        sellerId: 43,
        sellerName: "方同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-12T08:35:00Z",
        updatedAt: "2023-11-12T08:35:00Z",
        views: 160,
        favorites: 32,
        images: [{name: "财政学.jpg", url: "https://via.placeholder.com/300x400?text=财政学", file: null}]
    },
    {
        id: 1044,
        title: "比较文学概论",
        authors: ["陈惇", "刘象愚"],
        isbn: "9787040193947",
        publisher: "高等教育出版社",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 35.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "比较文学理论与方法，中西文学比较。有案例分析。",
        contact: "",
        sellerId: 44,
        sellerName: "石同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-13T15:25:00Z",
        updatedAt: "2023-11-13T15:25:00Z",
        views: 140,
        favorites: 28,
        images: [{name: "比较文学.jpg", url: "https://via.placeholder.com/300x400?text=比较文学", file: null}]
    },
    {
        id: 1045,
        title: "环境化学",
        authors: ["戴树桂"],
        isbn: "9787040214392",
        publisher: "高等教育出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 48.00,
        transactionMethods: ["当面交易"],
        description: "环境化学理论与应用，污染控制化学等。有实验数据。",
        contact: "",
        sellerId: 45,
        sellerName: "姚同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-14T12:10:00Z",
        updatedAt: "2023-11-14T12:10:00Z",
        views: 155,
        favorites: 31,
        images: [{name: "环境化学.jpg", url: "https://via.placeholder.com/300x400?text=环境化学", file: null}]
    },
    {
        id: 1046,
        title: "数学物理方法",
        authors: ["梁昆淼"],
        isbn: "9787040239224",
        publisher: "高等教育出版社",
        category: "教材",
        condition: "轻微使用痕迹",
        price: 42.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "数学物理方法经典教材，复变函数、积分变换等。有习题解答。",
        contact: "",
        sellerId: 46,
        sellerName: "谭同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-15T10:45:00Z",
        updatedAt: "2023-11-15T10:45:00Z",
        views: 175,
        favorites: 35,
        images: [{name: "数学物理方法.jpg", url: "https://via.placeholder.com/300x400?text=数学物理方法", file: null}]
    },
    {
        id: 1047,
        title: "大学物理（原子物理学）",
        authors: ["张三慧"],
        isbn: "9787302209954",
        publisher: "清华大学出版社",
        category: "科学",
        condition: "轻微使用痕迹",
        price: 33.00,
        transactionMethods: ["当面交易"],
        description: "原子物理学理论，原子结构、光谱等。有重点标记。",
        contact: "",
        sellerId: 47,
        sellerName: "邹同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-16T14:30:00Z",
        updatedAt: "2023-11-16T14:30:00Z",
        views: 145,
        favorites: 29,
        images: [{name: "大学物理5.jpg", url: "https://via.placeholder.com/300x400?text=大学物理5", file: null}]
    },
    {
        id: 1048,
        title: "人工智能导论",
        authors: ["史忠植"],
        isbn: "9787030245261",
        publisher: "科学出版社",
        category: "计算机",
        condition: "轻微使用痕迹",
        price: 58.00,
        transactionMethods: ["当面交易", "邮寄"],
        description: "人工智能基础理论，机器学习、神经网络等。有算法实现。",
        contact: "",
        sellerId: 48,
        sellerName: "熊同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-17T09:15:00Z",
        updatedAt: "2023-11-17T09:15:00Z",
        views: 280,
        favorites: 56,
        images: [{name: "人工智能.jpg", url: "https://via.placeholder.com/300x400?text=人工智能", file: null}]
    },
    {
        id: 1049,
        title: "国际金融",
        authors: ["姜波克"],
        isbn: "9787040285062",
        publisher: "高等教育出版社",
        category: "经济",
        condition: "轻微使用痕迹",
        price: 45.00,
        transactionMethods: ["当面交易"],
        description: "国际金融理论与实务，汇率、国际收支等。有案例分析。",
        contact: "",
        sellerId: 49,
        sellerName: "金同学",
        sellerVerified: true,
        status: "active",
        createdAt: "2023-11-18T16:00:00Z",
        updatedAt: "2023-11-18T16:00:00Z",
        views: 190,
        favorites: 38,
        images: [{name: "国际金融.jpg", url: "https://via.placeholder.com/300x400?text=国际金融", file: null}]
    },
    {
        id: 1050,
        title: "新闻学概论",
        authors: ["李良荣"],
        isbn: "9787309098461",
        publisher: "复旦大学出版社",
        category: "文学",
        condition: "轻微使用痕迹",
        price: 36.00,
        transactionMethods: ["当面交易", "校内配送"],
        description: "新闻学基础理论，新闻传播、新闻写作等。有课堂笔记。",
        contact: "",
        sellerId: 50,
        sellerName: "陆同学",
        sellerVerified: false,
        status: "active",
        createdAt: "2023-11-19T11:50:00Z",
        updatedAt: "2023-11-19T11:50:00Z",
        views: 165,
        favorites: 33,
        images: [{name: "新闻学概论.jpg", url: "https://via.placeholder.com/300x400?text=新闻学概论", file: null}]
    }
];

// 将书目数据保存到localStorage
function initializeBookData() {
    // 尝试从book-data.js获取数据
    let dataToSave = [];
    
    // 检查是否已有bookData变量
    if (typeof bookData !== 'undefined') {
        dataToSave = bookData;
    }
    
    // 检查是否已有数据，避免重复添加
    const existingBooks = JSON.parse(localStorage.getItem('books') || '[]');
    
    if (existingBooks.length === 0 && dataToSave.length > 0) {
        // 添加书目数据
        localStorage.setItem('books', JSON.stringify(dataToSave));
        console.log('已成功添加' + dataToSave.length + '本大学生书目数据');
        
        // 触发自定义事件，通知数据已初始化
        const event = new CustomEvent('bookDataInitialized', { 
            detail: { 
                count: dataToSave.length,
                books: dataToSave 
            } 
        });
        document.dispatchEvent(event);
    } else if (existingBooks.length > 0) {
        console.log('已有书籍数据，跳过初始化 (现有 ' + existingBooks.length + ' 本)');
    } else {
        console.warn('没有找到书籍数据可初始化');
    }
}

// 提供一个全局函数来获取书籍数据
function getBooks() {
    const books = localStorage.getItem('books');
    if (books) {
        return JSON.parse(books);
    }
    
    // 如果localStorage中没有数据，尝试使用bookData变量
    if (typeof bookData !== 'undefined') {
        return bookData;
    }
    
    return [];
}

// 初始化数据 - 立即执行，不要等待DOMContentLoaded
// 这样可以确保数据在其他脚本读取之前就已经准备好
initializeBookData();

// 同时监听DOMContentLoaded事件，确保在所有情况下都初始化数据
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBookData);
}

// ============================================
// 书籍统计模块
// ============================================

// 统计管理器
const BookStatsManager = {
    // 获取今天的日期字符串 (YYYY-MM-DD)
    getTodayStr() {
        return new Date().toISOString().split('T')[0];
    },

    // 获取过去N天的日期字符串数组
    getPastDaysArray(days = 7) {
        const dates = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    },

    // 记录书籍浏览量
    recordView(bookId) {
        if (!bookId) return;
        
        const today = this.getTodayStr();
        let stats = this.getBookStats(bookId);
        
        // 更新总浏览量
        stats.totalViews = (stats.totalViews || 0) + 1;
        
        // 更新每日浏览记录
        if (!stats.dailyViews) {
            stats.dailyViews = {};
        }
        stats.dailyViews[today] = (stats.dailyViews[today] || 0) + 1;
        
        // 保存统计
        this.saveBookStats(bookId, stats);
        
        // 更新书籍总浏览量
        this.updateBookTotalViews(bookId);
        
        return stats;
    },

    // 记录书籍成交量
    recordSale(bookId) {
        if (!bookId) return;
        
        const today = this.getTodayStr();
        let stats = this.getBookStats(bookId);
        
        // 更新总成交量
        stats.totalSales = (stats.totalSales || 0) + 1;
        
        // 更新每日成交记录
        if (!stats.dailySales) {
            stats.dailySales = {};
        }
        stats.dailySales[today] = (stats.dailySales[today] || 0) + 1;
        
        // 保存统计
        this.saveBookStats(bookId, stats);
        
        // 更新书籍总成交量
        this.updateBookTotalSales(bookId);
        
        return stats;
    },

    // 获取书籍统计
    getBookStats(bookId) {
        const statsKey = `book_stats_${bookId}`;
        const stored = localStorage.getItem(statsKey);
        if (stored) {
            return JSON.parse(stored);
        }
        // 返回初始结构
        return {
            bookId: bookId,
            totalViews: 0,
            totalSales: 0,
            dailyViews: {},
            dailySales: {},
            lastUpdated: this.getTodayStr()
        };
    },

    // 保存书籍统计
    saveBookStats(bookId, stats) {
        const statsKey = `book_stats_${bookId}`;
        stats.lastUpdated = this.getTodayStr();
        localStorage.setItem(statsKey, JSON.stringify(stats));
    },

    // 更新书籍的总浏览量字段
    updateBookTotalViews(bookId) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            books[bookIndex].views = (books[bookIndex].views || 0) + 1;
            localStorage.setItem('books', JSON.stringify(books));
        }
    },

    // 更新书籍的总成交量字段
    updateBookTotalSales(bookId) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            if (!books[bookIndex].sales) {
                books[bookIndex].sales = 0;
            }
            books[bookIndex].sales = (books[bookIndex].sales || 0) + 1;
            localStorage.setItem('books', JSON.stringify(books));
        }
    },

    // 获取最近N天的浏览量
    getRecentViews(bookId, days = 7) {
        const stats = this.getBookStats(bookId);
        const dates = this.getPastDaysArray(days);
        
        let total = 0;
        dates.forEach(date => {
            total += (stats.dailyViews && stats.dailyViews[date]) || 0;
        });
        
        return total;
    },

    // 获取最近N天的成交量
    getRecentSales(bookId, days = 7) {
        const stats = this.getBookStats(bookId);
        const dates = this.getPastDaysArray(days);
        
        let total = 0;
        dates.forEach(date => {
            total += (stats.dailySales && stats.dailySales[date]) || 0;
        });
        
        return total;
    },

    // 获取所有书籍的统计信息
    getAllBooksStats() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        return books.map(book => {
            const stats = this.getBookStats(book.id);
            return {
                ...book,
                recentViews: this.getRecentViews(book.id),
                recentSales: this.getRecentSales(book.id),
                totalViews: stats.totalViews || 0,
                totalSales: stats.totalSales || 0
            };
        });
    },

    // 获取热门书籍列表（按浏览量）
    getHotBooks(limit = 6, days = 7) {
        const allBooks = this.getAllBooksStats();
        
        return allBooks
            .filter(book => book.status === 'active')
            .sort((a, b) => b.recentViews - a.recentViews)
            .slice(0, limit);
    },

    // 获取畅销书籍列表（按成交量）
    getBestSellerBooks(limit = 6, days = 7) {
        const allBooks = this.getAllBooksStats();
        
        return allBooks
            .filter(book => book.status === 'active')
            .sort((a, b) => b.recentSales - a.recentSales)
            .slice(0, limit);
    },

    // 初始化模拟数据（用于演示）
    initMockData() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const today = this.getTodayStr();
        
        // 为每本书生成过去7天的随机浏览和成交数据
        books.forEach(book => {
            const stats = this.getBookStats(book.id);
            
            // 生成过去7天的数据
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                // 随机浏览量 1-15
                const views = Math.floor(Math.random() * 15) + 1;
                stats.dailyViews[dateStr] = (stats.dailyViews[dateStr] || 0) + views;
                stats.totalViews = (stats.totalViews || 0) + views;
                
                // 随机成交量 0-3
                const sales = Math.floor(Math.random() * 4);
                stats.dailySales[dateStr] = (stats.dailySales[dateStr] || 0) + sales;
                stats.totalSales = (stats.totalSales || 0) + sales;
            }
            
            this.saveBookStats(book.id, stats);
            
            // 更新书籍的views字段
            book.views = stats.totalViews;
            if (!book.sales) book.sales = 0;
            book.sales = stats.totalSales;
        });
        
        localStorage.setItem('books', JSON.stringify(books));
        console.log('已初始化模拟统计数据，共处理 ' + books.length + ' 本书籍');
    }
};

// 全局函数：记录浏览
function recordBookView(bookId) {
    return BookStatsManager.recordView(bookId);
}

// 全局函数：记录成交
function recordBookSale(bookId) {
    return BookStatsManager.recordSale(bookId);
}

// 全局函数：获取热门书籍
function getHotBooks(limit = 6, days = 7) {
    return BookStatsManager.getHotBooks(limit, days);
}

// 全局函数：获取畅销书籍
function getBestSellerBooks(limit = 6, days = 7) {
    return BookStatsManager.getBestSellerBooks(limit, days);
}

// 初始化模拟数据（可选，在控制台执行bookStatsManager.initMockData()可重新生成）
// BookStatsManager.initMockData();
