import { BaseRenderer } from './BaseRenderer';

export class BarChartRenderer extends BaseRenderer {
    draw(yOffset, width, height, sequenceLength) {
        const data = this.feature.data;
        if (!data?.values?.length) return;

        const margin = { left: this.engine.options.titleWidth + 5 };
        const values = data.values;

        // Config priority: feature.config > feature > data > defaults
        const config = this.feature.config || {};
        const barPositiveColor = config.positiveColor || this.feature.positiveColor || data.positiveColor || this.engine.options.colors?.barPositive || '#F59E0B';
        const barNegativeColor = config.negativeColor || this.feature.negativeColor || data.negativeColor || this.engine.options.colors?.barNegative || '#EF4444';
        const barWidthRatio = config.barWidthRatio || this.feature.barWidthRatio || 0.6;
        const barShape = config.shape || this.feature.shape || 'rounded'; // 'rounded' | 'rect' | 'circle' | 'triangle' | 'star' | char
        const borderRadius = config.borderRadius !== undefined ? config.borderRadius : (barShape === 'rect' ? 0 : 2);
        const filled = config.filled !== undefined ? config.filled : true; // For shapes: filled or outline?
        
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
        
        // 绘制Y轴 (BaseRenderer 处理 visible 检查)
        this.renderYAxis(yOffset, height, -range, range);
        // Draw Reference Line (X-Axis) - Default to 0 via BaseRenderer
        // Default style is now solid, width 1, gray
        this.renderXAxisLine(yOffset, width, height, -range, range);

        const xScale = width / sequenceLength;
        const barWidth = xScale * barWidthRatio;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

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
            
            const color = isNegative ? barNegativeColor : barPositiveColor;

            // Determine if using classic bar or lollipop style
            const isClassicBar = ['rect', 'rounded'].includes(barShape);

            if (isClassicBar) {
                // Classic Bar Chart Logic
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
                rect.setAttribute('rx', borderRadius);
                group.appendChild(rect);
            } else {
                // Stretched Shape Logic (User requested: stretch the shape, no stem)
                
                // Calculate position and height like a normal bar
                if (isNegative) {
                    h = (Math.abs(renderValue) / range) * (height / 2);
                    y = yOffset + height / 2;
                } else {
                    h = (renderValue / range) * (height / 2);
                    y = yOffset + height / 2 - h;
                }

                // Ensure minimum height for visibility
                h = Math.max(h, 1);

                // Render the shape stretched into the bounding box (x, y, barWidth, h)
                this._renderStretchedShape(group, barShape, x, y, barWidth, h, color, filled, isNegative);
            }
        });
        this.engine.svg.appendChild(group);
    }

    _renderStretchedShape(group, shape, x, y, width, height, color, filled, isNegative) {
        let element;

        switch (shape) {
            case 'circle': // Ellipse
                element = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                element.setAttribute('cx', x + width / 2);
                element.setAttribute('cy', y + height / 2);
                element.setAttribute('rx', width / 2);
                element.setAttribute('ry', height / 2);
                break;
            case 'square': // Just a rect, effectively same as 'rect' but maybe sharp corners intended
                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                element.setAttribute('x', x);
                element.setAttribute('y', y);
                element.setAttribute('width', width);
                element.setAttribute('height', height);
                break;
            case 'triangle':
                // Triangle pointing away from zero
                let p1, p2, p3;
                if (isNegative) {
                     // Pointing down (v)
                     // Top-Left, Top-Right, Bottom-Center
                     p1 = `${x},${y}`;
                     p2 = `${x + width},${y}`;
                     p3 = `${x + width / 2},${y + height}`;
                } else {
                     // Pointing up (^)
                     // Bottom-Left, Bottom-Right, Top-Center
                     p1 = `${x},${y + height}`;
                     p2 = `${x + width},${y + height}`;
                     p3 = `${x + width / 2},${y}`;
                }
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                element.setAttribute('points', `${p1} ${p2} ${p3}`);
                break;
            case 'diamond':
                // Rhombus
                const d1 = `${x + width / 2},${y}`;             // Top
                const d2 = `${x + width},${y + height / 2}`;    // Right
                const d3 = `${x + width / 2},${y + height}`;    // Bottom
                const d4 = `${x},${y + height / 2}`;            // Left
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                element.setAttribute('points', `${d1} ${d2} ${d3} ${d4}`);
                break;
            case 'star':
                 // Stretched Star - Complex, we map a unit star to the bounding box
                 // 10 points (5 outer, 5 inner)
                 const cx = x + width / 2;
                 const cy = y + height / 2;
                 const rx = width / 2;
                 const ry = height / 2;
                 
                 const points = [];
                 for (let i = 0; i < 10; i++) {
                    const angle = i * 36 * Math.PI / 180 - Math.PI / 2; // Start from top
                    // If pointing up (positive), start -PI/2. If negative, maybe flip? 
                    // Let's keep it simple: standard star stretched.
                    
                    const radX = (i % 2 === 0 ? 1.0 : 0.4) * rx;
                    const radY = (i % 2 === 0 ? 1.0 : 0.4) * ry;
                    
                    // Flip vertically if negative to point "down"? Optional. 
                    // Usually star orientation is fixed. Let's keep it fixed but stretched.
                    
                    points.push(`${cx + radX * Math.cos(angle)},${cy + radY * Math.sin(angle)}`);
                 }
                 element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                 element.setAttribute('points', points.join(' '));
                break;
            default:
                // Text character - stretch via scale transform
                element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                element.setAttribute('x', 0);
                element.setAttribute('y', 0);
                element.setAttribute('text-anchor', 'middle');
                // Use a standard font size, then scale it
                element.setAttribute('font-size', '10px'); 
                element.setAttribute('font-family', 'monospace');
                element.setAttribute('font-weight', 'bold');
                element.textContent = shape;
                element.setAttribute('fill', color);
                
                // Calculate transform
                // Center of box
                const centerX = x + width / 2;
                const centerY = y + height / 2;
                
                // Approximate scaling: Font height ~ 10px, Width ~ 6px (monospace)
                // We want to scale to width and height
                const scaleX = width / 6; 
                const scaleY = height / 8; // Slight adjustment for baseline
                
                element.setAttribute('transform', `translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY})`);
                element.setAttribute('dy', '0.35em'); // Center vertically before scale
                
                group.appendChild(element);
                return;
        }

        if (element) {
            if (filled) {
                element.setAttribute('fill', color);
            } else {
                element.setAttribute('fill', 'none');
                element.setAttribute('stroke', color);
                element.setAttribute('stroke-width', 2);
            }
            group.appendChild(element);
        }
    }
}

export function renderBarChart(engine, width, height, yOffset, sequenceLength, data, feature) {
    new BarChartRenderer(engine, feature).render(yOffset, width, height, sequenceLength);
}
