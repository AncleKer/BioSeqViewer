import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderLineChart } from './renderers/lineChart';
import { renderBarChart } from './renderers/barChart';
import { renderPositionChart } from './renderers/positionChart';
import { renderSequenceChart } from './renderers/sequenceChart';
import { normalizeFeature } from './utils/featureNormalizer';
import Tooltip from './components/Tooltip';

/**
 * 核心绘图逻辑类（由原版改造适配React）
 * 不直接操作DOM ID，而是接收DOM引用
 */
class SVGVisualizerEngine {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: options.margin || {
                top: 0, // Reduced from 40 to 20
                right: 80,
                bottom: 0,
                left: 100
            },
            colors: {
                text: options.colors?.text || '#374151', // Gray-700
                axis: options.colors?.axis || '#9CA3AF', // Gray-400
                grid: options.colors?.grid || '#F3F4F6',  // Gray-100
                ...options.colors // Allow other colors to be passed through for renderers to pick up
            },
            defaultChartHeight: options.defaultChartHeight || 80,
            titleWidth: options.titleWidth || 100,
            chartSpacing: options.chartSpacing || 24,
            minPixelPerResidue: options.minPixelPerResidue || 20, // 每个残基的最小像素宽度
        };
        this.rawOptions = options; // 保存原始配置以便 render 时使用

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

    setSequence(sequenceData) {
        this.rawSequenceData = null;
        if (typeof sequenceData === 'object' && sequenceData !== null) {
            this.sequence = sequenceData.sequence || '';
            this.rawSequenceData = sequenceData;
        } else {
            this.sequence = sequenceData || '';
        }
        return this;
    }

    setFeatures(features) {
        this.features = features || [];
        return this;
    }

    render() {
        this.svg.innerHTML = '';

        // 构造渲染列表
        const featuresToRender = [];
        
        // 准备 normalization 上下文
        const context = {
            defaultChartHeight: this.options.defaultChartHeight,
            rawOptions: this.rawOptions,
            defaultSequence: this.sequence
        };
        
        // 1. 添加序列作为第一个 feature (如果存在)
        if (this.sequence) {
            // 使用保存的原始对象或空对象
            const seqRaw = this.rawSequenceData || {};
            featuresToRender.push(normalizeFeature(seqRaw, 'sequence', context));
        }
        
        // 2. 添加其他 features
        this.features.forEach(f => {
            featuresToRender.push(normalizeFeature(f, null, context));
        });

        // 0. 动态计算所需的左侧宽度 (标题 + Y轴标签)
        // 保存原始配置以便每次重新计算
        if (!this.options._originalTitleWidth) {
            this.options._originalTitleWidth = this.options.titleWidth;
        }

        // 检查是否有任何 feature 开启了 Y 轴
        this.hasAnyYAxis = featuresToRender.some(f => 
            (f.type === 'line' || f.type === 'bar') && f.yAxis?.visible !== false
        );

        // 如果有 Y 轴，需要额外空间给 Y 轴标签 (约 35px -> 调整为 30)
        const yAxisPadding = this.hasAnyYAxis ? 30 : 0;
        
        // 计算最终需要的左侧宽度
        // 恢复固定宽度逻辑，不再随标题长度自动扩展
        const newTitleWidth = this.options._originalTitleWidth + yAxisPadding;
        this.options.titleWidth = newTitleWidth;
        this.options.margin.left = newTitleWidth;
        
        // 1. 计算最大序列长度 和 总高度
        let sequenceLength = this.sequence ? this.sequence.length : 0;
        let currentYOffset = this.options.margin.top;
        const featureOffsets = [];

        featuresToRender.forEach(feature => {
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
        // const { width } = this.container.getBoundingClientRect(); // Removed: Don't limit by container width
        // 计算基于序列长度的最小内容宽度
        const minContentWidth = sequenceLength * this.options.minPixelPerResidue + this.options.titleWidth + this.options.margin.right;
        
        // 如果容器宽度大于最小内容宽度，则占满容器；否则使用最小内容宽度（这将触发横向滚动）
        const effectiveWidth = Math.max(800, minContentWidth); // Use fixed min width or just content width
        
        const chartWidth = effectiveWidth - this.options.titleWidth - this.options.margin.right;

        // 设置容器样式以支持横向滚动
        // this.container.style.overflowX = 'auto'; // Removed: Let parent handle scrolling
        this.svg.style.minWidth = `${effectiveWidth}px`; // 确保SVG至少有这么宽

        const labelHeight = 30;
        const xAxisYOffset = currentYOffset;
        
        const totalHeight = xAxisYOffset + labelHeight + this.options.margin.bottom;
        this.svg.setAttribute('height', totalHeight);
        this.svg.setAttribute('viewBox', `0 0 ${effectiveWidth} ${totalHeight}`);

        // 渲染图表
        featuresToRender.forEach((feature, index) => {
            const yOffset = featureOffsets[index];
            const height = feature.height || this.options.defaultChartHeight;
            
            // Renderers now handle background and title internally via BaseRenderer

            switch (feature.type) {
                case 'sequence':
                    renderSequenceChart(this, chartWidth, height, yOffset, sequenceLength, feature.data, feature);
                    break;
                case 'line':
                    renderLineChart(this, chartWidth, height, yOffset, sequenceLength, feature.data, feature);
                    break;
                case 'bar':
                    renderBarChart(this, chartWidth, height, yOffset, sequenceLength, feature.data, feature);
                    break;
                case 'position':
                    renderPositionChart(this, chartWidth, height, yOffset, sequenceLength, feature.data, feature);
                    break;
            }
        });

        this._renderSharedXAxis(chartWidth, xAxisYOffset, sequenceLength);
    }

    _createText(x, y, content, { anchor = 'start', size = 14, color = null, weight = 'normal', fontFamily = null } = {}) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('font-size', size);
        
        const effectiveFontFamily = fontFamily || this.options.fontFamily;
        if (effectiveFontFamily) {
            text.setAttribute('font-family', effectiveFontFamily);
        }

        text.setAttribute('font-weight', weight);
        text.setAttribute('fill', color || this.options.colors.text);
        text.setAttribute('text-anchor', anchor);
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = content;
        return text;
    }

    _renderSharedXAxis(width, yOffset, sequenceLength) {
        const margin = { left: this.options.titleWidth + 5 };
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

const PeptideVisualizer = ({ sequence, features = [], options = {}, className = '', style = {} }) => {
    const containerRef = useRef(null);
    const visualizerRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

    // 默认配置
    const showHeader = options.showHeader !== undefined ? options.showHeader : true;
    const showHeaderTitle = options.showHeaderTitle !== undefined ? options.showHeaderTitle : true;
    const showLegend = options.showLegend !== undefined ? options.showLegend : true;

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
        // 检查全局配置是否启用了 tooltip (默认为 true)
        if (options.tooltip?.visible === false) return;

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
    }, [sequence, features, options]);

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
        <div 
            className={`peptide-viz-wrapper ${className}`} 
            style={{ 
                position: 'relative', // Ensure relative positioning for contained absolute elements if any
                ...style 
            }}
        >
            {showHeader && (
                <div className="peptide-viz-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {showHeaderTitle ? (
                        <h3 className="peptide-viz-title" style={{ margin: 0 }}>
                            Peptide Analysis
                        </h3>
                    ) : <div></div>}
                    
                    {showLegend && (
                        <div className="peptide-viz-legend" style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span> Helix
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#F43F5E' }}></span> Sheet
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div 
                ref={containerRef} 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ width: '100%', minHeight: '200px' }}
            />
            
            <Tooltip 
                {...tooltip} 
                style={{
                    ...(options.tooltip?.backgroundColor && { background: options.tooltip.backgroundColor }),
                    ...(options.tooltip?.textColor && { color: options.tooltip.textColor }),
                    ...(options.tooltip?.fontSize && { fontSize: options.tooltip.fontSize }),
                    ...(options.tooltip?.style || {})
                }}
            />
        </div>
    );
};

export default PeptideVisualizer;
