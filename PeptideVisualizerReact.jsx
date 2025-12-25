import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 核心绘图逻辑类（由原版改造适配React）
 * 不直接操作DOM ID，而是接收DOM引用
 */
class SVGVisualizerEngine {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: options.margin || {
                top: 40,
                right: 80,
                bottom: 40,
                left: 100
            },
            colors: {
                line: options.colors?.line || '#3B82F6', // Modern Blue
                barPositive: options.colors?.barPositive || '#F59E0B', // Amber
                barNegative: options.colors?.barNegative || '#EF4444', // Red
                positions: options.colors?.positions || {
                    'helix': '#10B981', // Emerald
                    'sheet': '#F43F5E', // Rose
                    'loop': '#6366F1'   // Indigo
                },
                text: '#374151', // Gray-700
                axis: '#9CA3AF', // Gray-400
                grid: '#F3F4F6'  // Gray-100
            },
            defaultChartHeight: options.defaultChartHeight || 80,
            titleWidth: options.titleWidth || 100,
            chartSpacing: options.chartSpacing || 24,
            minPixelPerResidue: options.minPixelPerResidue || 20, // 每个残基的最小像素宽度
            fontFamily: options.fontFamily || '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        };

        this.sequence = '';
        this.features = [];
        this._createDOM();
    }

    _createDOM() {
        this.container.innerHTML = '';
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.width = '100%';
        this.svg.style.height = 'auto';
        this.svg.style.display = 'block';
        this.container.appendChild(this.svg);
    }

    setSequence(sequence) {
        this.sequence = sequence;
        return this;
    }

    setFeatures(features) {
        this.features = features || [];
        return this;
    }

    render() {
        this.svg.innerHTML = '';
        
        // 1. 先计算最大序列长度
        let sequenceLength = this.sequence.length || 0;
        let chartsTotalHeight = 0;
        let currentYOffset = this.options.margin.top;
        const featureOffsets = [];

        this.features.forEach(feature => {
            featureOffsets.push(currentYOffset);
            const height = feature.height || this.options.defaultChartHeight;
            currentYOffset += height + this.options.chartSpacing;
            
            // 更新最大序列长度逻辑...
            if (feature.type === 'line' || feature.type === 'bar') {
                const dataLength = feature.data.values ? feature.data.values.length : 0;
                if (dataLength > sequenceLength) sequenceLength = dataLength;
            } else if (feature.type === 'position' && feature.data.positions) {
                const maxPos = Math.max(...feature.data.positions.map(pos => pos.end || 0));
                if (maxPos > sequenceLength) sequenceLength = maxPos;
            }
        });

        sequenceLength = sequenceLength || 30;

        // 2. 计算宽度
        const { width } = this.container.getBoundingClientRect();
        // 计算基于序列长度的最小内容宽度
        const minContentWidth = sequenceLength * this.options.minPixelPerResidue + this.options.titleWidth + this.options.margin.right;
        
        // 如果容器宽度大于最小内容宽度，则占满容器；否则使用最小内容宽度（这将触发横向滚动）
        const effectiveWidth = Math.max(width || 800, minContentWidth);
        
        const chartWidth = effectiveWidth - this.options.titleWidth - this.options.margin.right;

        // 设置容器样式以支持横向滚动
        this.container.style.overflowX = 'auto';
        this.svg.style.minWidth = `${effectiveWidth}px`; // 确保SVG至少有这么宽

        // 渲染序列
        this._renderSequence(chartWidth, sequenceLength);

        const sequenceHeight = 30;
        const adjustedFeatureOffsets = featureOffsets.map(offset => offset + sequenceHeight);
        const labelHeight = 30;
        const xAxisYOffset = currentYOffset + sequenceHeight;
        
        const totalHeight = xAxisYOffset + labelHeight + this.options.margin.bottom;
        this.svg.setAttribute('height', totalHeight);
        this.svg.setAttribute('viewBox', `0 0 ${effectiveWidth} ${totalHeight}`);

        // 渲染图表
        this.features.forEach((feature, index) => {
            const yOffset = adjustedFeatureOffsets[index];
            const height = feature.height || this.options.defaultChartHeight;
            
            this._renderFeatureTitle(feature.title, yOffset + height / 2);

            // 绘制背景网格带
            this._renderGridBackground(
                this.options.titleWidth, 
                yOffset, 
                chartWidth + 10, 
                height,
                feature.backgroundColor, // 支持自定义背景色
                feature.backgroundOpacity // 支持自定义背景透明度
            );

            switch (feature.type) {
                case 'line':
                    this._renderLineChart(chartWidth, height, yOffset, sequenceLength, feature.data, feature);
                    break;
                case 'bar':
                    this._renderBarChart(chartWidth, height, yOffset, sequenceLength, feature.data, feature);
                    break;
                case 'position':
                    this._renderPositionChart(chartWidth, height, yOffset, sequenceLength, feature.data);
                    break;
            }
        });

        this._renderSharedXAxis(chartWidth, xAxisYOffset, sequenceLength);
    }

    _renderGridBackground(x, y, width, height, customColor = null, customOpacity = null) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', customColor || this.options.colors.grid);
        if (customOpacity !== null && customOpacity !== undefined) {
            rect.setAttribute('fill-opacity', customOpacity);
        }
        rect.setAttribute('rx', 4); // 圆角
        this.svg.appendChild(rect);
    }

    _renderSequence(chartWidth, sequenceLength) {
        if (!this.sequence) return;
        const margin = { left: this.options.titleWidth + 10 };
        const xScale = chartWidth / sequenceLength;

        const title = this._createText(this.options.margin.left, this.options.margin.top + 10, 'Sequence', {
            anchor: 'end',
            weight: 'bold'
        });
        this.svg.appendChild(title);

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        for (let i = 0; i < this.sequence.length; i++) {
            const x = margin.left + i * xScale + xScale / 2;
            const y = this.options.margin.top + 10;
            
            // 隐形的可交互矩形
            const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            hitRect.setAttribute('x', margin.left + i * xScale);
            hitRect.setAttribute('y', y - 15);
            hitRect.setAttribute('width', xScale);
            hitRect.setAttribute('height', 30);
            hitRect.setAttribute('fill', 'transparent');
            hitRect.setAttribute('data-index', i);
            hitRect.setAttribute('class', 'residue-hit-area');
            hitRect.style.cursor = 'pointer';
            group.appendChild(hitRect);

            const text = this._createText(x, y, this.sequence[i], { anchor: 'middle' });
            text.style.pointerEvents = 'none'; // 让鼠标事件穿透到下方的矩形
            group.appendChild(text);
        }
        this.svg.appendChild(group);
    }

    _createText(x, y, content, { anchor = 'start', size = 14, color = null, weight = 'normal' } = {}) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('font-size', size);
        text.setAttribute('font-family', this.options.fontFamily);
        text.setAttribute('font-weight', weight);
        text.setAttribute('fill', color || this.options.colors.text);
        text.setAttribute('text-anchor', anchor);
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = content;
        return text;
    }

    _renderFeatureTitle(title, yPos) {
        const text = this._createText(this.options.margin.left, yPos, title, {
            anchor: 'end',
            size: 13,
            weight: '500'
        });
        this.svg.appendChild(text);
    }

    _renderYAxis(x, yOffset, height, min, max, color = null) {
        const axisColor = color || this.options.colors.axis;

        // 轴线
        const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axis.setAttribute('x1', x);
        axis.setAttribute('y1', yOffset);
        axis.setAttribute('x2', x);
        axis.setAttribute('y2', yOffset + height);
        axis.setAttribute('stroke', axisColor);
        axis.setAttribute('stroke-width', 1);
        this.svg.appendChild(axis);

        // 刻度: min, mid, max
        const ticks = [
            { val: min, y: yOffset + height },
            { val: (min + max) / 2, y: yOffset + height / 2 },
            { val: max, y: yOffset }
        ];

        ticks.forEach(tick => {
            const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tickLine.setAttribute('x1', x);
            tickLine.setAttribute('y1', tick.y);
            tickLine.setAttribute('x2', x - 4);
            tickLine.setAttribute('y2', tick.y);
            tickLine.setAttribute('stroke', axisColor);
            this.svg.appendChild(tickLine);

            const label = this._createText(x - 6, tick.y, tick.val.toFixed(1).replace(/\.0$/, ''), {
                anchor: 'end',
                size: 10,
                color: axisColor
            });
            this.svg.appendChild(label);
        });
    }

    _renderLineChart(width, height, yOffset, sequenceLength, data, featureOptions = {}) {
        if (!data?.values?.length) return;
        const margin = { left: this.options.titleWidth + 10 };
        const values = data.values;
        
        // 确定Y轴范围
        let min, max;
        if (featureOptions.yAxis?.range && Array.isArray(featureOptions.yAxis.range) && featureOptions.yAxis.range.length === 2) {
            [min, max] = featureOptions.yAxis.range;
        } else {
            min = Math.min(...values);
            max = Math.max(...values);
            const padding = (max - min) * 0.1 || 1;
            min -= padding;
            max += padding;
        }
        const range = max - min;

        // 绘制Y轴 (除非显式禁用)
        if (featureOptions.yAxis?.visible !== false) {
             this._renderYAxis(
                this.options.titleWidth, 
                yOffset, 
                height, 
                min, 
                max,
                featureOptions.yAxis?.color // 自定义Y轴颜色
            );
        }

        const xScale = width / sequenceLength;
        
        let pathData = '';
        values.forEach((value, i) => {
            // 简单的裁剪/限制，防止画出界
            let renderValue = value;
            if (renderValue > max) renderValue = max;
            if (renderValue < min) renderValue = min;

            const x = margin.left + i * xScale + xScale / 2;
            const y = yOffset + height - ((renderValue - min) / range) * height;
            pathData += `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        });

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', data.color || this.options.colors.line);
        path.setAttribute('stroke-width', 2);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        
        // 增加阴影效果（复制路径并虚化）
        const shadowPath = path.cloneNode();
        shadowPath.setAttribute('stroke', data.color || this.options.colors.line);
        shadowPath.setAttribute('stroke-opacity', 0.2);
        shadowPath.setAttribute('stroke-width', 6);
        
        this.svg.appendChild(shadowPath);
        this.svg.appendChild(path);
    }

    _renderBarChart(width, height, yOffset, sequenceLength, data, featureOptions = {}) {
        if (!data?.values?.length) return;
        const margin = { left: this.options.titleWidth + 10 };
        const values = data.values;
        
        // 确定Y轴范围
        let range;
        let isCustomRange = false;
        
        if (featureOptions.yAxis?.range && Array.isArray(featureOptions.yAxis.range) && featureOptions.yAxis.range.length === 2) {
             // 如果用户指定了范围，我们假设范围是对称的或者足以覆盖数据
             // 这里为了简化BarChart逻辑（通常是基于0点的），我们取用户范围中绝对值最大的作为 range
             // 或者如果用户给的是 [-5, 5]，那 range就是5。
             // 严谨一点：
             const [min, max] = featureOptions.yAxis.range;
             range = Math.max(Math.abs(min), Math.abs(max));
             isCustomRange = true;
        } else {
            const absMax = Math.max(...values.map(Math.abs));
            range = absMax * 1.2 || 1;
        }
        
        // 绘制Y轴 (Bar chart通常是对称或者从0开始，这里简单处理为 range 到 -range 或者 0 到 range)
        if (featureOptions.yAxis?.visible !== false) {
             this._renderYAxis(
                this.options.titleWidth, 
                yOffset, 
                height, 
                -range, 
                range,
                featureOptions.yAxis?.color
            );
        }

        const xScale = width / sequenceLength;
        const barWidth = xScale * 0.6; // 稍微变细一点，更精致

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // Zero line
        const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        zeroLine.setAttribute('x1', margin.left);
        zeroLine.setAttribute('y1', yOffset + height / 2);
        zeroLine.setAttribute('x2', margin.left + width);
        zeroLine.setAttribute('y2', yOffset + height / 2);
        zeroLine.setAttribute('stroke', this.options.colors.axis);
        zeroLine.setAttribute('stroke-dasharray', '4 4');
        group.appendChild(zeroLine);

        values.forEach((value, i) => {
            // 裁剪值
            let renderValue = value;
            if (isCustomRange) {
                 if (renderValue > range) renderValue = range;
                 if (renderValue < -range) renderValue = -range;
            }

            const x = margin.left + i * xScale + (xScale - barWidth) / 2;
            let y, h;
            const isNegative = renderValue < 0;
            const color = isNegative ? 
                (data.negativeColor || this.options.colors.barNegative) : 
                (data.positiveColor || this.options.colors.barPositive);

            if (isNegative) {
                h = (Math.abs(renderValue) / range) * (height / 2);
                y = yOffset + height / 2;
            } else {
                h = (renderValue / range) * (height / 2);
                y = yOffset + height / 2 - h;
            }

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', Math.max(h, 1)); // 至少1px高度
            rect.setAttribute('fill', color);
            rect.setAttribute('rx', 2); // 圆角柱子
            group.appendChild(rect);
        });
        this.svg.appendChild(group);
    }

    _renderPositionChart(width, height, yOffset, sequenceLength, data) {
        if (!data?.positions) return;
        const margin = { left: this.options.titleWidth + 10 };
        
        // Background line
        const bgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bgLine.setAttribute('x1', margin.left);
        bgLine.setAttribute('y1', yOffset + height / 2);
        bgLine.setAttribute('x2', margin.left + width);
        bgLine.setAttribute('y2', yOffset + height / 2);
        bgLine.setAttribute('stroke', this.options.colors.axis);
        bgLine.setAttribute('stroke-width', 2);
        this.svg.appendChild(bgLine);

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        data.positions.forEach(pos => {
            const type = pos.type || 'loop';
            // 复用原有的绘制逻辑，但加上一些美化
            switch(type) {
                case 'helix': this._drawHelix(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength); break;
                case 'sheet': this._drawArrow(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength); break;
                case 'loop': break; // Just line
                default: this._drawBlock(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength);
            }
        });
        this.svg.appendChild(group);
    }

    _drawHelix(group, xOffset, yOffset, width, height, start, end, seqLen) {
        const xScale = width / seqLen;
        const x1 = xOffset + start * xScale - xScale/2;
        const x2 = xOffset + end * xScale - xScale/2;
        const centerY = yOffset + height / 2;
        
        const amplitude = Math.min(height * 0.3, 8);
        const wavelength = 10;
        const helixWidth = x2 - x1;
        const numWaves = helixWidth / wavelength;
        
        let pathData = `M ${x1} ${centerY} `;
        for(let i=0; i<=numWaves * 10; i++) {
            const progress = i / (numWaves * 10);
            const x = x1 + progress * helixWidth;
            const y = centerY + Math.sin(progress * numWaves * Math.PI * 2) * amplitude;
            pathData += `L ${x} ${y} `;
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', this.options.colors.positions.helix);
        path.setAttribute('stroke-width', 3);
        path.setAttribute('stroke-linecap', 'round');
        
        // Helix 装饰：添加高光效果
        const highlight = path.cloneNode();
        highlight.setAttribute('stroke', 'rgba(255,255,255,0.4)');
        highlight.setAttribute('stroke-width', 1);
        highlight.setAttribute('transform', 'translate(0, -1)');

        group.appendChild(path);
        group.appendChild(highlight);
    }

    _drawArrow(group, xOffset, yOffset, width, height, start, end, seqLen) {
        const xScale = width / seqLen;
        const x1 = xOffset + start * xScale - xScale/2;
        const x2 = xOffset + end * xScale - xScale/2;
        const centerY = yOffset + height / 2;
        const h = 14;
        
        // 简化的箭头路径
        const arrowHead = 10;
        const pathData = `M ${x1} ${centerY-h/2} L ${x2-arrowHead} ${centerY-h/2} L ${x2} ${centerY} L ${x2-arrowHead} ${centerY+h/2} L ${x1} ${centerY+h/2} Z`;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', this.options.colors.positions.sheet);
        path.setAttribute('rx', 2);
        
        // 渐变填充效果需要defs，这里简单用纯色+边框
        path.setAttribute('stroke', 'rgba(0,0,0,0.1)');
        path.setAttribute('stroke-width', 1);

        group.appendChild(path);
    }

    _drawBlock(group, xOffset, yOffset, width, height, start, end, seqLen) {
        const xScale = width / seqLen;
        const x = xOffset + start * xScale + xScale/2;
        const w = (end - start) * xScale;
        const h = 12;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', yOffset + height/2 - h/2);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', '#9CA3AF');
        rect.setAttribute('rx', 4);
        group.appendChild(rect);
    }

    _renderSharedXAxis(width, yOffset, sequenceLength) {
        const margin = { left: this.options.titleWidth + 10 };
        const xScale = width / sequenceLength;

        // 主轴线
        const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axis.setAttribute('x1', margin.left);
        axis.setAttribute('y1', yOffset);
        axis.setAttribute('x2', margin.left + width);
        axis.setAttribute('y2', yOffset);
        axis.setAttribute('stroke', this.options.colors.axis);
        axis.setAttribute('stroke-width', 2);
        this.svg.appendChild(axis);

        // 刻度
        for (let i = 5; i <= sequenceLength; i += 5) {
            const x = margin.left + (i - 1) * xScale + xScale / 2;
            
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', yOffset);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', yOffset + 6);
            tick.setAttribute('stroke', this.options.colors.axis);
            this.svg.appendChild(tick);

            const label = this._createText(x, yOffset + 20, i.toString(), {
                anchor: 'middle',
                size: 12,
                color: this.options.colors.axis
            });
            this.svg.appendChild(label);
        }
    }
}

// ----------------------------------------------------------------------
// React Component
// ----------------------------------------------------------------------

const Tooltip = ({ x, y, content, visible }) => {
    if (!visible) return null;
    return (
        <div style={{
            position: 'fixed',
            left: x + 10,
            top: y + 10,
            background: 'rgba(31, 41, 55, 0.9)', // Gray-900 with opacity
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(4px)',
            maxWidth: '200px',
            lineHeight: '1.4'
        }}>
            {content}
        </div>
    );
};

const PeptideVisualizer = ({ sequence, features = [], options = {}, className = '', style = {} }) => {
    const containerRef = useRef(null);
    const visualizerRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

    // 初始化绘图引擎
    useEffect(() => {
        if (!containerRef.current) return;

        visualizerRef.current = new SVGVisualizerEngine(containerRef.current, options);
        
        // 初始渲染
        visualizerRef.current
            .setSequence(sequence)
            .setFeatures(features)
            .render();

        // 响应式处理
        const resizeObserver = new ResizeObserver(() => {
            visualizerRef.current?.render();
        });
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []); // 仅挂载时运行一次，后续更新通过下面的useEffect处理

    // 数据更新时重绘
    useEffect(() => {
        if (visualizerRef.current) {
            visualizerRef.current
                .setSequence(sequence)
                .setFeatures(features)
                .render();
        }
    }, [sequence, features, options]);

    // 事件委托处理 Tooltip
    const handleMouseMove = useCallback((e) => {
        const target = e.target;
        // 检查是否是交互区域
        if (target.classList.contains('residue-hit-area')) {
            const index = parseInt(target.getAttribute('data-index'), 10);
            const residue = sequence[index];
            const position = index + 1;
            
            // 构建 Tooltip 内容
            let content = `Position: ${position}\nResidue: ${residue}`;
            
            // 查找该位置在各个 feature 中的值
            features.forEach(feature => {
                if (feature.type === 'line' || feature.type === 'bar') {
                    const val = feature.data.values[index];
                    if (val !== undefined) {
                        content += `\n${feature.title}: ${val.toFixed(2)}`;
                    }
                }
            });

            setTooltip({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                content: <pre style={{margin:0, fontFamily:'inherit'}}>{content}</pre>
            });
        } else {
            setTooltip(prev => ({ ...prev, visible: false }));
        }
    }, [sequence, features]);

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
        <div 
            className={`peptide-viz-wrapper ${className}`} 
            style={{ 
                fontFamily: '"Inter", sans-serif',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px',
                border: '1px solid #F3F4F6',
                ...style 
            }}
        >
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: 600 }}>
                    Peptide Analysis
                </h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span> Helix
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#F43F5E' }}></span> Sheet
                    </div>
                </div>
            </div>
            
            <div 
                ref={containerRef} 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ width: '100%', minHeight: '200px' }}
            />
            
            <Tooltip {...tooltip} />
        </div>
    );
};

export default PeptideVisualizer;
