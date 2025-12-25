import { BaseRenderer } from './BaseRenderer';

export class LineChartRenderer extends BaseRenderer {
    draw(yOffset, width, height, sequenceLength) {
        const data = this.feature.data;
        if (!data?.values?.length) return;

        const margin = { left: this.engine.options.titleWidth + 5 };
        const values = data.values;
        
        // 确定Y轴范围
        let min, max;
        if (this.feature.yAxis?.range && Array.isArray(this.feature.yAxis.range) && this.feature.yAxis.range.length === 2) {
            [min, max] = this.feature.yAxis.range;
        } else {
            min = Math.min(...values);
            max = Math.max(...values);
            const padding = (max - min) * 0.1 || 1;
            min -= padding;
            max += padding;
        }
        const range = max - min;

        // 绘制Y轴 (除非显式禁用)
        if (this.feature.yAxis?.visible !== false) {
             this.renderYAxis(
                yOffset, 
                height, 
                min, 
                max,
                this.feature.yAxis?.color // 自定义Y轴颜色
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
        
        // Default color logic moved here
        const lineColor = data.color || this.engine.options.colors?.line || '#3B82F6'; // Modern Blue
        
        path.setAttribute('stroke', lineColor);
        path.setAttribute('stroke-width', 2);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        
        // 增加阴影效果（复制路径并虚化）
        const shadowPath = path.cloneNode();
        shadowPath.setAttribute('stroke', lineColor);
        shadowPath.setAttribute('stroke-opacity', 0.2);
        shadowPath.setAttribute('stroke-width', 6);
        
        this.engine.svg.appendChild(shadowPath);
        this.engine.svg.appendChild(path);
    }
}

// Keep the function for compatibility if needed, but we will likely switch to class usage
export function renderLineChart(engine, width, height, yOffset, sequenceLength, data, feature) {
    new LineChartRenderer(engine, feature).render(yOffset, width, height, sequenceLength);
}
