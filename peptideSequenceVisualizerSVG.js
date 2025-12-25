/**
 * 肽序列可视化插件（SVG版本）
 * 支持三种类型的数据可视化：
 * 1. 连续数值型数据 - 折线图展示
 * 2. 离散数值型数据 - 柱状图展示
 * 3. 位置型数据 - 按位置标记形状
 */
class PeptideSequenceVisualizerSVG {
    /**
     * 构造函数
     * @param {string} containerId - 容器元素的ID
     * @param {Object} options - 配置选项
     */
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`未找到ID为${containerId}的容器元素`);
        }
        
        this.options = {
            margin: options.margin || {
                top: 30,
                right: 80,
                bottom: 40,
                left: 100 // 增加左侧空间用于标题
            },
            // 默认颜色配置
            colors: {
                line: options.colors?.line || '#2196F3', // 蓝色
                barPositive: options.colors?.barPositive || '#FF9800', // 橙色
                barNegative: options.colors?.barNegative || '#FF6B6B', // 红色
                positions: options.colors?.positions || {
                    'helix': '#27AE60', // 绿色
                    'sheet': '#E74C3C', // 红色
                    'loop': '#3498DB'   // 蓝色
                }
            },
            defaultChartHeight: options.defaultChartHeight || 80, // 默认图表行高度
            titleWidth: options.titleWidth || 100, // 标题区域宽度
            chartSpacing: options.chartSpacing || 15, // 图表行之间的间距
            defaultWidth: options.defaultWidth || 800, // 默认宽度
            defaultHeight: options.defaultHeight || 400 // 默认高度
        };
        
        // 设置容器样式 - 优化CSS样式
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.minWidth = `${this.options.defaultWidth}px`; // 设置最小宽度
        this.container.style.minHeight = `${this.options.defaultHeight}px`; // 设置最小高度
        this.container.style.width = '100%'; // 确保占据可用空间
        this.container.style.height = 'auto'; // 高度自适应
        
        // 创建必要的DOM元素
        this._createDOM();
        
        // 存储数据
        this.sequence = '';
        this.features = []; // 存储动态添加的图表行
        
        // 创建ResizeObserver实例监听父容器尺寸变化
        this.resizeObserver = null;
        this._initResizeObserver();
        
        // 添加窗口大小变化事件监听作为备用方案
        window.addEventListener('resize', () => {
            this.render();
        });
    }
    
    /**
     * 创建DOM元素
     * @private
     */
    _createDOM() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建单个SVG容器
        this.svgContainer = document.createElement('div');
        this.svgContainer.style.width = '100%';
        this.svgContainer.style.height = 'auto';
        this.svgContainer.style.position = 'relative';
        this.container.appendChild(this.svgContainer);
        
        // 创建单个SVG元素
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'peptide-visualizer';
        this.svg.style.width = '100%';
        this.svg.style.height = 'auto';
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svgContainer.appendChild(this.svg);
    }
    
    /**
     * 初始化ResizeObserver监听
     * @private
     */
    _initResizeObserver() {
        // 检查浏览器是否支持ResizeObserver
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // 当容器尺寸变化时重新渲染
                    this.render();
                }
            });
            
            // 开始监听父容器尺寸变化
            this.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * 获取容器尺寸，实现多级降级机制
     * @private
     * @returns {Object} - 包含width和height的对象
     */
    _getContainerDimensions() {
        // 尝试直接获取SVG元素尺寸
        let { width, height } = this.svg.getBoundingClientRect();
        // 降级策略1：如果尺寸为0，尝试获取父容器的计算样式
        if (width === 0 || height === 0) {
            const parentStyle = window.getComputedStyle(this.container);
            width = parseInt(parentStyle.width) || 0;
            height = parseInt(parentStyle.height) || 0;
        }
        
        // 降级策略2：如果仍为0，尝试获取父容器的offset尺寸
        if (width === 0 || height === 0) {
            width = this.container.offsetWidth || 0;
            height = this.container.offsetHeight || 0;
        }
        
        // 降级策略3：如果所有方法都失败，使用默认值
        return {
            width: width || this.options.defaultWidth,
            height: height || this.options.defaultHeight
        };
    }
    
    /**
     * 销毁插件，清理资源
     */
    destroy() {
        // 取消ResizeObserver监听
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // 清空SVG内容
        if (this.svg) {
            this.svg.innerHTML = '';
        }
    }
    
    /**
     * 设置肽序列
     * @param {string} sequence - 肽序列
     * @returns {PeptideSequenceVisualizerSVG} - 返回this以支持链式调用
     */
    setSequence(sequence) {
        this.sequence = sequence;
        this.render();
        return this;
    }
    
    /**
     * 渲染序列到SVG
     * @param {number} chartWidth - 图表宽度
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    _renderSequence(chartWidth, sequenceLength) {
        if (!this.sequence) return;
        
        const margin = {left: this.options.titleWidth + 10, right: 10};
        // const xScale = (chartWidth - margin.left - margin.right) / (sequenceLength); // 使用sequenceLength，确保每个残基对应一个位置
        const xScale = chartWidth / (sequenceLength); 
        
        // 创建序列标题
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleElement.setAttribute('x', this.options.margin.left);
        titleElement.setAttribute('y', this.options.margin.top + 10);
        titleElement.setAttribute('font-size', '16');
        titleElement.setAttribute('font-family', 'Arial');
        titleElement.setAttribute('fill', '#333');
        titleElement.setAttribute('text-anchor', 'end');
        titleElement.setAttribute('dominant-baseline', 'middle');
        titleElement.textContent = '序列:';
        this.svg.appendChild(titleElement);
        
        // 创建序列组
        const sequenceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 渲染每个残基
        for (let i = 0; i < this.sequence.length; i++) {
            const residue = this.sequence[i];
            const x = margin.left + i * xScale + xScale / 2; // 居中显示，确保刚好位于数轴刻度正上方
            const y = this.options.margin.top + 10;
            
            const residueElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            residueElement.setAttribute('x', x);
            residueElement.setAttribute('y', y);
            residueElement.setAttribute('font-size', '16');
            residueElement.setAttribute('font-family', 'Arial');
            residueElement.setAttribute('fill', '#333');
            residueElement.setAttribute('text-anchor', 'middle');
            residueElement.setAttribute('dominant-baseline', 'middle');
            residueElement.textContent = residue;
            
            // 添加鼠标悬停效果
            residueElement.setAttribute('cursor', 'pointer');
            residueElement.setAttribute('data-position', i + 1); // 位置从1开始
            
            sequenceGroup.appendChild(residueElement);
        }
        
        this.svg.appendChild(sequenceGroup);
    }
    
    /**
     * 添加图表行（feature）
     * @param {Object} feature - 包含data和配置的对象
     * @param {string} feature.type - 图表类型：'line', 'bar', 'position'
     * @param {string} feature.title - 图表标题
     * @param {Object} feature.data - 图表数据
     * @param {number} [feature.height] - 图表高度（可选）
     * @returns {PeptideSequenceVisualizerSVG} - 返回this以支持链式调用
     */
    addFeature(feature) {
        if (!feature || !feature.type || !feature.title || !feature.data) {
            throw new Error('添加的feature必须包含type、title和data字段');
        }
        
        // 验证类型
        const validTypes = ['line', 'bar', 'position'];
        if (!validTypes.includes(feature.type)) {
            throw new Error(`不支持的图表类型: ${feature.type}，支持的类型有: ${validTypes.join(', ')}`);
        }
        
        // 设置默认高度
        if (!feature.height) {
            feature.height = this.options.defaultChartHeight;
        }
        
        // 添加到features数组
        this.features.push(feature);
        this.render();
        return this;
    }
    
    /**
     * 移除所有图表行
     * @returns {PeptideSequenceVisualizerSVG} - 返回this以支持链式调用
     */
    clearFeatures() {
        this.features = [];
        this.render();
        return this;
    }
    
    /**
     * 渲染所有图表
     */
    render() {
        // 清空SVG内容
        this.svg.innerHTML = '';
        
        // 获取容器尺寸，使用多级降级机制
        const { width, height } = this._getContainerDimensions();
        // 计算可用宽度（减去左侧标题区和右侧边距）
        const chartWidth = width - this.options.titleWidth - this.options.margin.right;

        // 计算序列长度（使用最长的数据长度或序列本身）
        let sequenceLength = this.sequence.length || 0;
        
        // 计算总图表区域高度
        let chartsTotalHeight = 0;
        if (this.features.length > 0) {
            chartsTotalHeight = this.features.reduce((sum, feature) => sum + feature.height, 0) + 
                               (this.features.length - 1) * this.options.chartSpacing;
        }
        
        // 计算Y轴偏移量（确保下区数轴有足够空间）
        const topOffset = this.options.margin.top;
        const xAxisYOffset = topOffset + chartsTotalHeight + 20;
        
        // 计算各个图表的Y偏移量
        let currentYOffset = topOffset;
        const featureOffsets = [];
        
        // 首先计算每个feature的Y偏移量并确定最大序列长度
        this.features.forEach(feature => {
            featureOffsets.push(currentYOffset);
            currentYOffset += feature.height + this.options.chartSpacing;
            
            // 更新最大序列长度
            if (feature.type === 'line' || feature.type === 'bar') {
                const dataLength = feature.data.values ? feature.data.values.length : 0;
                if (dataLength > sequenceLength) {
                    sequenceLength = dataLength;
                }
            } else if (feature.type === 'position' && feature.data.positions) {
                const maxPos = Math.max(...feature.data.positions.map(pos => pos.end || 0));
                if (maxPos > sequenceLength) {
                    sequenceLength = maxPos;
                }
            }
        });
        
        // 如果没有数据，设置默认长度
        sequenceLength = sequenceLength || 30;
        
        // 渲染序列到SVG中，实现与数轴的对齐
        this._renderSequence(chartWidth, sequenceLength);
        
        // 调整图表Y偏移量，为序列留出空间
        const sequenceHeight = 30; // 序列区域高度
        const adjustedFeatureOffsets = featureOffsets.map(offset => offset + sequenceHeight);
        // 增加X轴标签的底部空间，确保标签不被截断
        const labelHeight = 25; // X轴标签高度
        const adjustedXAxisYOffset = xAxisYOffset + sequenceHeight;
        
        // 设置SVG高度，确保包含所有内容
        const totalHeight = adjustedXAxisYOffset + labelHeight + this.options.margin.bottom;
        this.svg.setAttribute('height', totalHeight);
        
        // 渲染每个图表行
        this.features.forEach((feature, index) => {
            const yOffset = adjustedFeatureOffsets[index];
            
            // 渲染图表标题（左侧）
            this._renderFeatureTitle(feature.title, yOffset + feature.height / 2);
            
            // 根据类型渲染图表（右侧）
            switch (feature.type) {
                case 'line':
                    this._renderLineChart(chartWidth, feature.height, yOffset, sequenceLength, feature.data);
                    break;
                case 'bar':
                    this._renderBarChart(chartWidth, feature.height, yOffset, sequenceLength, feature.data);
                    break;
                case 'position':
                    this._renderPositionChart(chartWidth, feature.height, yOffset, sequenceLength, feature.data);
                    break;
            }
        });
        
        // 绘制共享的X轴（下区）
        this._renderSharedXAxis(chartWidth, adjustedXAxisYOffset, sequenceLength);
    }
    
    /**
     * 渲染图表标题
     * @param {string} title - 图表标题
     * @param {number} yPos - Y轴位置
     * @private
     */
    _renderFeatureTitle(title, yPos) {
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleElement.setAttribute('x', this.options.margin.left);
        titleElement.setAttribute('y', yPos);
        titleElement.setAttribute('font-size', '16');
        titleElement.setAttribute('font-family', 'Arial');
        titleElement.setAttribute('fill', '#333');
        titleElement.setAttribute('text-anchor', 'end');
        titleElement.setAttribute('dominant-baseline', 'middle');
        titleElement.textContent = title;
        this.svg.appendChild(titleElement);
    }
    
    /**
     * 渲染共享的X轴（位于最底部）
     * @param {number} width - 图表宽度
     * @param {number} yOffset - Y轴偏移量
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    _renderSharedXAxis(width, yOffset, sequenceLength) {
        const margin = {left: this.options.titleWidth + 10, right: 10};
        // 计算与二级结构相同的总宽度
        // const totalWidth = width - margin.left - margin.right;
        const totalWidth = width;

        // 创建坐标轴组
        const xAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 计算缩放因子 - 使用sequenceLength而不是sequenceLength-1，确保每个残基对应一个刻度位置
        const xScale = totalWidth / sequenceLength;
        
        // 绘制X轴（氨基酸位置）
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', margin.left);
        xAxis.setAttribute('y1', yOffset);
        xAxis.setAttribute('x2', margin.left + totalWidth);
        xAxis.setAttribute('y2', yOffset);
        xAxis.setAttribute('stroke', '#333');
        xAxis.setAttribute('stroke-width', '2');
        xAxisGroup.appendChild(xAxis);
        
        // 绘制X轴刻度和标签
        const step = 5; // 固定为5个单位间隔
        const xAxisRight = margin.left + totalWidth; // X轴右边界
        const labelWidth = 20; // 估算的标签宽度，用于边界检查
        
        // 从5开始，每隔5个单位显示一个标签
        for (let i = 5; i <= sequenceLength + 1; i += step) { 
            const x = margin.left + (i - 1) * xScale + xScale / 2; // 确保刻度位于残基中间位置
            
            // 检查标签是否超出X轴范围
            if (x - labelWidth / 2 < margin.left || x + labelWidth / 2 > xAxisRight) {
                continue; // 跳过超出范围的标签
            }
            
            // 刻度线
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', yOffset - 5);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', yOffset + 5);
            tick.setAttribute('stroke', '#333');
            tick.setAttribute('stroke-width', '1');
            xAxisGroup.appendChild(tick);
            
            // 标签
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', x);
            label.setAttribute('y', yOffset + 20);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '16');
            label.setAttribute('font-family', 'Arial');
            label.setAttribute('fill', '#333');
            label.setAttribute('dominant-baseline', 'hanging'); // 确保标签从底部基线开始绘制
            label.textContent = i;
            xAxisGroup.appendChild(label);
        }
        
        this.svg.appendChild(xAxisGroup);
    }
    
    /**
     * 渲染折线图（连续数值型数据）
     * @param {number} width - 图表宽度
     * @param {number} height - 图表高度
     * @param {number} yOffset - Y轴偏移量
     * @param {number} sequenceLength - 序列长度
     * @param {Object} data - 图表数据
     * @private
     */
    _renderLineChart(width, height, yOffset, sequenceLength, data) {
        if (!data || !data.values || data.values.length === 0) return;
        
        const margin = {left: this.options.titleWidth + 10, right: 10};
        
        // 确保values是一个数组
        const values = Array.isArray(data.values) ? data.values : [];
        if (values.length === 0) return;
        
        // 计算数据范围
        let minValue = values[0];
        let maxValue = values[0];
        for (let i = 1; i < values.length; i++) {
            if (values[i] < minValue) minValue = values[i];
            if (values[i] > maxValue) maxValue = values[i];
        }
        // 为了显示美观，稍微扩展数据范围
        const padding = (maxValue - minValue) * 0.1 || 1;
        minValue -= padding;
        maxValue += padding;
        const valueRange = maxValue - minValue;
        
        // 创建坐标轴组
        const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 绘制Y轴
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', margin.left);
        yAxis.setAttribute('y1', yOffset);
        yAxis.setAttribute('x2', margin.left);
        yAxis.setAttribute('y2', yOffset + height);
        yAxis.setAttribute('stroke', '#333');
        yAxis.setAttribute('stroke-width', '1');
        axesGroup.appendChild(yAxis);
        
        // 创建折线路径
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = '';
        
        values.forEach((value, index) => {
            // 确保数据点与残基位置一一对应，使用与序列和数轴相同的计算方式
            // const xScale = (width - margin.left - margin.right) / sequenceLength;
            const xScale = width / sequenceLength;
            const x = margin.left + index * xScale + xScale / 2;
            // 将值映射到Y坐标（反转，因为SVG的Y轴向下）
            const y = yOffset + height - ((value - minValue) / valueRange) * height;
            
            if (index === 0) {
                pathData = `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        });
        
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', data.color || this.options.colors.line);
        path.setAttribute('stroke-width', '2');
        
        this.svg.appendChild(axesGroup);
        this.svg.appendChild(path);
    }
    
    /**
     * 渲染柱状图（离散数值型数据）
     * @param {number} width - 图表宽度
     * @param {number} height - 图表高度
     * @param {number} yOffset - Y轴偏移量
     * @param {number} sequenceLength - 序列长度
     * @param {Object} data - 图表数据
     * @private
     */
    _renderBarChart(width, height, yOffset, sequenceLength, data) {
        if (!data || !data.values || data.values.length === 0) return;

        const margin = {left: this.options.titleWidth + 10, right: 10};
        // 计算与二级结构相同的总宽度
        // const totalWidth = width - margin.left - margin.right;
        const totalWidth = width;

        // 确保values是一个数组
        const values = Array.isArray(data.values) ? data.values : [];
        if (values.length === 0) return;

        // 计算数据范围
        let minValue = values[0];
        let maxValue = values[0];
        for (let i = 1; i < values.length; i++) {
            if (values[i] < minValue) minValue = values[i];
            if (values[i] > maxValue) maxValue = values[i];
        }
        // 为了显示美观，稍微扩展数据范围
        const maxAbsValue = Math.max(Math.abs(minValue), Math.abs(maxValue));
        const valueRange = maxAbsValue * 1.2 || 1; // 避免除以零

        // 计算每个柱子的宽度 - 使用与序列和数轴相同的计算方式
        const xScale = totalWidth / sequenceLength;
        const barWidth = xScale * 0.8;
        const barSpacing = xScale * 0.2;

        // 创建坐标轴组
        const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // 绘制Y轴
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', margin.left);
        yAxis.setAttribute('y1', yOffset);
        yAxis.setAttribute('x2', margin.left);
        yAxis.setAttribute('y2', yOffset + height);
        yAxis.setAttribute('stroke', '#333');
        yAxis.setAttribute('stroke-width', '1');
        axesGroup.appendChild(yAxis);

        // 绘制中间线（相当于0值线）- 与二级结构保持一致的宽度
        const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        zeroLine.setAttribute('x1', margin.left);
        zeroLine.setAttribute('y1', yOffset + height / 2); // 居中
        zeroLine.setAttribute('x2', margin.left + totalWidth); // 使用与二级结构中相同的宽度计算
        zeroLine.setAttribute('y2', yOffset + height / 2);
        zeroLine.setAttribute('stroke', '#333');
        zeroLine.setAttribute('stroke-width', '1');
        axesGroup.appendChild(zeroLine);
        
        // 创建柱子组
        const barsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 绘制柱子
        values.forEach((value, index) => {
            // 确保柱子位置与残基一一对应，使用与序列和数轴相同的计算方式
            const barX = margin.left + index * xScale + (xScale - barWidth) / 2;
            let barY, barHeight;
            let color = value < 0 ? 
                (data.negativeColor || this.options.colors.barNegative) : 
                (data.positiveColor || this.options.colors.barPositive);
            
            if (value < 0) {
                // 负值向下
                barHeight = (Math.abs(value) / valueRange) * (height / 2);
                barY = yOffset + height / 2;
            } else {
                // 正值向上
                barHeight = (value / valueRange) * (height / 2);
                barY = yOffset + height / 2 - barHeight;
            }
            
            const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bar.setAttribute('x', barX);
            bar.setAttribute('y', barY);
            bar.setAttribute('width', barWidth);
            bar.setAttribute('height', barHeight);
            bar.setAttribute('fill', color);
            bar.setAttribute('stroke', color);
            bar.setAttribute('stroke-width', '1');
            // 添加与CSS样式匹配的类名
            bar.setAttribute('class', value < 0 ? 'hydro_bar hydro_negative' : 'hydro_bar hydro_positive');
            barsGroup.appendChild(bar);
        });
        
        this.svg.appendChild(axesGroup);
        this.svg.appendChild(barsGroup);
    }
    
    /**
     * 渲染位置型数据（如二级结构）
     * @param {number} width - 图表宽度
     * @param {number} height - 图表高度
     * @param {number} yOffset - Y轴偏移量
     * @param {number} sequenceLength - 序列长度
     * @param {Object} data - 图表数据
     * @private
     */
    _renderPositionChart(width, height, yOffset, sequenceLength, data) {
        if (!data || !data.positions || data.positions.length === 0) return;
        
        const margin = {left: this.options.titleWidth + 10, right: 10};
        // const totalWidth = width - margin.left - margin.right;
        const totalWidth = width;
        
        // 创建坐标轴组
        const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 绘制Y轴
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', margin.left);
        yAxis.setAttribute('y1', yOffset);
        yAxis.setAttribute('x2', margin.left);
        yAxis.setAttribute('y2', yOffset + height);
        yAxis.setAttribute('stroke', '#333');
        yAxis.setAttribute('stroke-width', '1');
        axesGroup.appendChild(yAxis);
        
        // 创建背景线条组
        const backgroundGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 绘制一条贯穿整个显示区域的横线
        const centerY = yOffset + height * 0.5;
        const backgroundLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        backgroundLine.setAttribute('x1', margin.left);
        backgroundLine.setAttribute('y1', centerY);
        backgroundLine.setAttribute('x2', margin.left + totalWidth);
        backgroundLine.setAttribute('y2', centerY);
        backgroundLine.setAttribute('stroke', '#ccc'); // 使用浅灰色作为背景线
        backgroundLine.setAttribute('stroke-width', '1');
        backgroundGroup.appendChild(backgroundLine);
        
        // 创建形状组
        const shapesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 绘制位置型数据
        data.positions.forEach(pos => {
            const type = pos.type || 'loop';
            const start = pos.start || 0;
            const end = pos.end || 0;
            
            // 根据类型绘制不同形状
            switch (type) {
                case 'helix':
                    this._drawHelix(shapesGroup, margin.left, yOffset, width, height, start, end, sequenceLength);
                    break;
                case 'sheet':
                    this._drawArrow(shapesGroup, margin.left, yOffset, width, height, start, end, sequenceLength);
                    break;
                case 'loop':
                    this._drawWave(shapesGroup, margin.left, yOffset, width, height, start, end, sequenceLength);
                    break;
                default:
                    this._drawBlock(shapesGroup, margin.left, yOffset, width, height, start, end, sequenceLength);
            }
        });
        
        // 先添加背景线条组，确保它被其他元素覆盖
        this.svg.appendChild(backgroundGroup);
        this.svg.appendChild(axesGroup);
        this.svg.appendChild(shapesGroup);
    }
    
    /**
     * 绘制箭头形状（β折叠）
     * @param {SVGElement} parentGroup - 父SVG组元素
     * @param {number} xOffset - X偏移量
     * @param {number} yOffset - Y偏移量
     * @param {number} width - 可用宽度
     * @param {number} height - 可用高度
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    _drawArrow(parentGroup, xOffset, yOffset, width, height, start, end, sequenceLength) {
        // 使用与序列和数轴相同的计算方式，确保位置与残基一一对应
        const margin = {left: xOffset, right: 10};
        // const totalWidth = width - margin.left - margin.right;
        const totalWidth = width;
        const xScale = totalWidth / sequenceLength;
        
        // 调整起始位置，确保不超出数轴范围
        const adjustedStart = Math.max(0, Math.min(start, sequenceLength));
        const adjustedEnd = Math.max(adjustedStart + 1, Math.min(end, sequenceLength));
        
        // 加上xScale/2使元素居中对齐，修复向右偏移问题
        const x1 = xOffset + adjustedStart * xScale - xScale/2;
        const x2 = xOffset + adjustedEnd * xScale - xScale/2;
        const blockHeight = Math.min(height * 0.4, 20); // 控制箭头主体高度
        const arrowHeadLength = Math.min((x2 - x1) * 0.2, 20); // 箭头头部长度，不超过区域长度的20%
        
        const yTop = yOffset + height * 0.5 - blockHeight / 2;
        const yBottom = yOffset + height * 0.5 + blockHeight / 2;
        const xArrowStart = x2 - arrowHeadLength;
        
        // 创建箭头路径 - 改进的箭头形状，更自然的箭头头部
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = `M ${x1} ${yTop} L ${xArrowStart} ${yTop} L ${xArrowStart} ${yTop - blockHeight * 0.3} L ${x2} ${yOffset + height * 0.5} L ${xArrowStart} ${yBottom + blockHeight * 0.3} L ${xArrowStart} ${yBottom} L ${x1} ${yBottom} Z`;
        
        arrowPath.setAttribute('d', pathData);
        arrowPath.setAttribute('fill', this.options.colors.positions.sheet);
        arrowPath.setAttribute('stroke', '#C0392B');
        arrowPath.setAttribute('stroke-width', '1');
        
        parentGroup.appendChild(arrowPath);
    }
    
    /**
     * 绘制波浪形状（无规卷曲）
     * @param {SVGElement} parentGroup - 父SVG组元素
     * @param {number} xOffset - X偏移量
     * @param {number} yOffset - Y偏移量
     * @param {number} width - 可用宽度
     * @param {number} height - 可用高度
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    /**
     * 无规则卷曲区域的绘制方法（默认不显示任何图形）
     * 用户可以自定义此方法来实现自己的无规则卷曲可视化
     * @param {SVGElement} parentGroup - 父SVG组元素
     * @param {number} xOffset - X偏移量
     * @param {number} yOffset - Y偏移量
     * @param {number} width - 可用宽度
     * @param {number} height - 可用高度
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    _drawWave(parentGroup, xOffset, yOffset, width, height, start, end, sequenceLength) {
        // 空实现，因为我们已经在_renderPositionChart中添加了贯穿整个显示区域的横线
        // 这样当遇到loop类型时，不会绘制额外的线条，只显示背景的横线
    }
    
    /**
     * 绘制块状形状（默认）
     * @param {SVGElement} parentGroup - 父SVG组元素
     * @param {number} xOffset - X偏移量
     * @param {number} yOffset - Y偏移量
     * @param {number} width - 可用宽度
     * @param {number} height - 可用高度
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    _drawBlock(parentGroup, xOffset, yOffset, width, height, start, end, sequenceLength) {
        // 使用与序列和数轴相同的计算方式，确保位置与残基一一对应
        const margin = {left: xOffset, right: 10};
        // const totalWidth = width - margin.left - margin.right;
        const totalWidth = width;
        const xScale = totalWidth / sequenceLength;
        
        // 调整起始位置，确保不超出数轴范围
        const adjustedStart = Math.max(0, Math.min(start, sequenceLength));
        const adjustedEnd = Math.max(adjustedStart + 1, Math.min(end, sequenceLength));
        
        // 加上xScale/2使元素居中对齐，修复向右偏移问题
        const x = xOffset + adjustedStart * xScale + xScale/2;
        const blockWidth = (adjustedEnd - adjustedStart) * xScale;
        const blockHeight = 20;
        const y = yOffset + height * 0.5 - blockHeight / 2;
        
        const block = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        block.setAttribute('x', x);
        block.setAttribute('y', y);
        block.setAttribute('width', blockWidth);
        block.setAttribute('height', blockHeight);
        block.setAttribute('fill', '#95A5A6');
        block.setAttribute('stroke', '#7F8C8D');
        block.setAttribute('stroke-width', '1');
        
        parentGroup.appendChild(block);
    }
    
    /**
     * 绘制螺旋形状（α螺旋）
     * @param {SVGElement} parentGroup - 父SVG组元素
     * @param {number} xOffset - X偏移量
     * @param {number} yOffset - Y偏移量
     * @param {number} width - 可用宽度
     * @param {number} height - 可用高度
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     * @param {number} sequenceLength - 序列长度
     * @private
     */
    _drawHelix(parentGroup, xOffset, yOffset, width, height, start, end, sequenceLength) {
        // 使用与序列和数轴相同的计算方式，确保位置与残基一一对应
        const margin = {left: xOffset, right: 10};
        // const totalWidth = width - margin.left - margin.right;
        const totalWidth = width;
        const xScale = totalWidth / sequenceLength;

        // 调整起始位置，确保不超出数轴范围
        const adjustedStart = Math.max(0, Math.min(start, sequenceLength));
        const adjustedEnd = Math.max(adjustedStart + 1, Math.min(end, sequenceLength));
        
        // 加上xScale/2使元素居中对齐，修复向右偏移问题
        const x1 = xOffset + adjustedStart * xScale - xScale/2;
        const x2 = xOffset + adjustedEnd * xScale - xScale/2;
        const centerY = yOffset + height * 0.5;
        
        // 根据可用高度动态调整参数
        const amplitude = Math.min(height * 0.2, 10); // 波浪振幅
        const wavelength = Math.min(amplitude * 2, 20); // 波长
        
        const helixWidth = x2 - x1;
        const numWaves = Math.max(1, Math.ceil(helixWidth / wavelength));
        const adjustedWavelength = helixWidth / numWaves;

        // 添加白色背景矩形
        const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        backgroundRect.setAttribute('x', x1);
        backgroundRect.setAttribute('y', yOffset);
        backgroundRect.setAttribute('width', helixWidth);
        backgroundRect.setAttribute('height', height);
        backgroundRect.setAttribute('fill', 'white');
        parentGroup.appendChild(backgroundRect);

        // 创建一个弹簧线效果的路径
        const springPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // 构建侧面看的弹簧线路径（波浪线）
        let pathData = `M ${x1} ${centerY} `;
        
        // 使用更密集的点和优化的贝塞尔曲线创建更平滑的弹簧效果
        const pointsPerWave = 10; // 每个波形的点数，增加点数使曲线更平滑
        const totalPoints = numWaves * pointsPerWave;
        const step = adjustedWavelength / pointsPerWave;
        
        for (let i = 1; i <= totalPoints; i++) {
            // 确保最后一个点不超出x2范围
            const segmentX = Math.min(x1 + i * step, x2);
            // 使用正弦函数创建波浪，并添加相位偏移使其看起来像侧面弹簧
            const phase = (i / pointsPerWave) * 2 * Math.PI;
            const offsetY = Math.sin(phase) * amplitude;
            
            if (i === 1) {
                // 第二个点使用直线连接
                pathData += `L ${segmentX},${centerY + offsetY} `;
            } else {
                // 后续点使用三次贝塞尔曲线连接，实现平滑过渡
                // 计算前一个点的位置
                const prevX = Math.min(x1 + (i - 1) * step, x2);
                const prevPhase = ((i - 1) / pointsPerWave) * 2 * Math.PI;
                const prevOffsetY = Math.sin(prevPhase) * amplitude;
                
                // 计算下一个点的位置（用于确定控制点）
                const nextX = Math.min(x1 + (i + 1) * step, x2);
                const nextPhase = ((i + 1) / pointsPerWave) * 2 * Math.PI;
                const nextOffsetY = Math.sin(nextPhase) * amplitude;
                
                // 计算贝塞尔曲线的控制点
                // 第一个控制点位于当前点和前一个点之间
                const controlX1 = prevX + (segmentX - prevX) * 0.33;
                const controlY1 = centerY + prevOffsetY + (offsetY - prevOffsetY) * 0.33;
                
                // 第二个控制点位于当前点和下一个点之间
                const controlX2 = prevX + (segmentX - prevX) * 0.67;
                const controlY2 = centerY + prevOffsetY + (offsetY - prevOffsetY) * 0.67;
                
                pathData += `C ${controlX1},${controlY1} ${controlX2},${controlY2} ${segmentX},${centerY + offsetY} `;
            }
        }
        
        // 确保路径结束于x2位置
        if (pathData.includes('C') || pathData.includes('L')) {
            pathData += `L ${x2} ${centerY}`;
        }
        
        // 设置路径属性
        springPath.setAttribute('d', pathData);
        springPath.setAttribute('fill', 'none');
        springPath.setAttribute('stroke', this.options.colors.positions.helix);
        springPath.setAttribute('stroke-width', '4');
        springPath.setAttribute('stroke-linecap', 'round');
        
        // 添加路径到父元素
        parentGroup.appendChild(springPath);
    }
}

// 模块导出，支持CommonJS和浏览器全局变量
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PeptideSequenceVisualizerSVG;
} else {
    window.PeptideSequenceVisualizerSVG = PeptideSequenceVisualizerSVG;
}