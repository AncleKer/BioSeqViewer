import { BaseRenderer } from './BaseRenderer';

export class BarChartRenderer extends BaseRenderer {
    draw(yOffset, width, height, sequenceLength) {
        const data = this.feature.data;
        if (!data?.values?.length) return;

        const margin = { left: this.engine.options.titleWidth + 5 };
        const values = data.values;
        
        // 确定Y轴范围
        let range;
        let isCustomRange = false;
        
        if (this.feature.yAxis?.range && Array.isArray(this.feature.yAxis.range) && this.feature.yAxis.range.length === 2) {
             const [min, max] = this.feature.yAxis.range;
             range = Math.max(Math.abs(min), Math.abs(max));
             isCustomRange = true;
        } else {
            const absMax = Math.max(...values.map(Math.abs));
            range = absMax * 1.2 || 1;
        }
        
        // 绘制Y轴
        if (this.feature.yAxis?.visible !== false) {
             this.renderYAxis(
                yOffset, 
                height, 
                -range, 
                range,
                this.feature.yAxis?.color
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
        zeroLine.setAttribute('stroke', this.engine.options.colors.axis);
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
            
            // Default color logic moved here
            const barPositiveColor = data.positiveColor || this.engine.options.colors?.barPositive || '#F59E0B'; // Amber
            const barNegativeColor = data.negativeColor || this.engine.options.colors?.barNegative || '#EF4444'; // Red
            
            const color = isNegative ? barNegativeColor : barPositiveColor;

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
        this.engine.svg.appendChild(group);
    }
}

export function renderBarChart(engine, width, height, yOffset, sequenceLength, data, feature) {
    new BarChartRenderer(engine, feature).render(yOffset, width, height, sequenceLength);
}
