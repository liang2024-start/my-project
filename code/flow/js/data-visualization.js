/**
 * 数据可视化模块
 * 处理热门书籍类别分布图和交易活跃度趋势图
 */

(function() {
    'use strict';

    // 模拟数据
    const chartData = {
        // 书籍类别分布数据
        categories: {
            labels: ['计算机与科技', '文学小说', '教材教辅', '外语学习', '艺术设计', '经济管理', '其他'],
            data: [180, 120, 250, 85, 65, 95, 55]
        },
        // 交易趋势数据
        trends: {
            // 近24小时数据（每小时）
            day: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                data: [3, 1, 8, 25, 18, 22, 12]
            },
            // 近7天数据（每天）
            week: {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                data: [45, 52, 38, 61, 55, 89, 72]
            }
        }
    };

    // 类别图表颜色配置
    const categoryColors = [
        '#3498db', // 蓝色 - 计算机与科技
        '#e74c3c', // 红色 - 文学小说
        '#2ecc71', // 绿色 - 教材教辅
        '#f39c12', // 橙色 - 外语学习
        '#9b59b6', // 紫色 - 艺术设计
        '#1abc9c', // 青色 - 经济管理
        '#95a5a6'  // 灰色 - 其他
    ];

    // 趋势图颜色配置
    const trendColor = '#3498db';
    const trendFillColor = 'rgba(52, 152, 219, 0.1)';

    // 图表实例
    let categoryChart = null;
    let trendChart = null;

    /**
     * 初始化类别分布图表
     */
    function initCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const total = chartData.categories.data.reduce((sum, val) => sum + val, 0);

        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.categories.labels,
                datasets: [{
                    data: chartData.categories.data,
                    backgroundColor: categoryColors,
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw}本 (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    /**
     * 初始化交易趋势图表
     * @param {string} range - 时间范围，'day' 或 'week'
     */
    function initTrendChart(range = 'week') {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        const data = chartData.trends[range];

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '交易数量',
                    data: data.data,
                    borderColor: trendColor,
                    backgroundColor: trendFillColor,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: trendColor,
                    pointBorderWidth: 2,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: trendColor,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `交易数量: ${context.raw}笔`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            color: '#6c757d'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            color: '#6c757d',
                            stepSize: 10
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    /**
     * 更新趋势图表数据
     * @param {string} range - 时间范围，'day' 或 'week'
     */
    function updateTrendChart(range) {
        if (!trendChart) return;

        const data = chartData.trends[range];

        trendChart.data.labels = data.labels;
        trendChart.data.datasets[0].data = data.data;
        trendChart.update('active');

        // 更新按钮状态
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            if (btn.dataset.range === range) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * 绑定时间筛选按钮事件
     */
    function bindFilterEvents() {
        const buttons = document.querySelectorAll('.filter-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                const range = this.dataset.range;
                updateTrendChart(range);
            });
        });
    }

    /**
     * 页面滚动时触发动画
     */
    function handleScrollAnimation() {
        const section = document.getElementById('data-visualization');
        if (!section) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1
        });

        observer.observe(section);
    }

    /**
     * 初始化数据可视化模块
     */
    function init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                initCategoryChart();
                initTrendChart('week');
                bindFilterEvents();
            });
        } else {
            initCategoryChart();
            initTrendChart('week');
            bindFilterEvents();
        }
    }

    // 启动初始化
    init();
})();
