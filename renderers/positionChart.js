import { BaseRenderer } from './BaseRenderer';

export class PositionRenderer extends BaseRenderer {
    draw(yOffset, width, height, sequenceLength) {
        if (!this.feature.data?.positions) return;
        const margin = { left: this.engine.options.titleWidth + 5 };
        
        // Background line (Backbone)
        this.renderXAxisLine(yOffset, width, height, -1, 1);
    
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Get shape mapping configuration
        const shapeMap = this.feature.config?.shapeMap || {};

        this.feature.data.positions.forEach(pos => {
            const type = pos.type || 'loop';
            
            // Determine shape and color from config, map, or defaults
            // Priority: pos.shape > shapeMap[type].shape > default for type
            let shape = pos.shape;
            let color = pos.color;

            if (!shape && shapeMap[type]) {
                shape = shapeMap[type].shape;
            }
            if (!color && shapeMap[type]) {
                color = shapeMap[type].color;
            }

            // Fallback to defaults if still undefined
            if (!shape) {
                switch(type) {
                    case 'helix': shape = 'helix'; break;
                    case 'sheet': shape = 'arrow'; break;
                    case 'loop': shape = 'line'; break;
                    default: shape = 'block';
                }
            }

            switch(shape) {
                case 'helix': 
                    this.drawHelix(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color); 
                    break;
                case 'arrow': 
                    this.drawArrow(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color); 
                    break;
                case 'block': // Explicit block falls back to rect logic now, or empty if drawBlock is kept empty.
                    // Let's reimplement drawBlock to actually draw a rectangle since user asked for 'rect'
                    this.drawBlock(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color);
                    break;
                case 'rect':
                    this.drawRect(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color);
                    break;
                case 'star':
                    this.drawStar(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color);
                    break;
                case 'diamond':
                    this.drawDiamond(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color);
                    break;
                case 'line':
                    // Just a thicker line segment
                    this.drawLine(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color);
                    break;
                default:
                    // Default to rect for unknown shapes (renamed from drawBlock)
                    this.drawBlock(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength, color);
            }
        });
        this.engine.svg.appendChild(group);
    }

    drawLine(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
        const xScale = width / seqLen;
        const x1 = xOffset + start * xScale - xScale/2;
        const x2 = xOffset + end * xScale - xScale/2;
        const centerY = yOffset + height / 2;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', centerY);
        line.setAttribute('stroke', color || this.engine.options.colors?.axis || '#9CA3AF');
        line.setAttribute('stroke-width', 4);
        line.setAttribute('stroke-linecap', 'round');
        group.appendChild(line);
    }

    drawHelix(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
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
        
        // Default color logic
        const helixColor = color || this.engine.options.colors?.positions?.helix || '#10B981'; // Emerald
        
        path.setAttribute('stroke', helixColor);
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

    drawArrow(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
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
        
        // Default color logic
        const sheetColor = color || this.engine.options.colors?.positions?.sheet || '#F43F5E'; // Rose
        
        path.setAttribute('fill', sheetColor);
        path.setAttribute('rx', 2);
        
        // 渐变填充效果需要defs，这里简单用纯色+边框
        path.setAttribute('stroke', 'rgba(0,0,0,0.1)');
        path.setAttribute('stroke-width', 1);

        group.appendChild(path);
    }

    drawRect(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
        const xScale = width / seqLen;
        const x1 = xOffset + (start - 1) * xScale;
        const x2 = xOffset + end * xScale;
        const rectWidth = Math.max(x2 - x1, 4); // Minimum width for visibility
        
        const centerY = yOffset + height / 2;
        const blockHeight = 12;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x1);
        rect.setAttribute('y', centerY - blockHeight/2);
        rect.setAttribute('width', rectWidth);
        rect.setAttribute('height', blockHeight);
        
        const blockColor = color || this.engine.options.colors?.positions?.other || '#A8A29E'; 
        
        rect.setAttribute('fill', blockColor);
        rect.setAttribute('rx', 2);
        
        group.appendChild(rect);
    }

    drawStar(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
        const xScale = width / seqLen;
        // Draw stars at each position in the range, or one large star? 
        // Typically for position chart, a range implies a segment. 
        // Let's draw stars distributed along the segment.
        
        const centerY = yOffset + height / 2;
        const starColor = color || '#F59E0B'; // Amber
        
        // Loop through integer positions from start to end
        for(let i = Math.ceil(start); i <= Math.floor(end); i++) {
            const cx = xOffset + (i - 1) * xScale + xScale / 2;
            const size = 10;
            
            // 5-pointed star path
            // M cx, cy-size ...
            // Simplified star polygon points
            const points = [];
            for(let j = 0; j < 10; j++) {
                const angle = j * Math.PI / 5 - Math.PI / 2;
                const r = (j % 2 === 0) ? size : size / 2;
                points.push((cx + Math.cos(angle) * r) + ',' + (centerY + Math.sin(angle) * r));
            }
            
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', points.join(' '));
            polygon.setAttribute('fill', starColor);
            group.appendChild(polygon);
        }
    }

    drawDiamond(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
        const xScale = width / seqLen;
        const centerY = yOffset + height / 2;
        const diamondColor = color || '#8B5CF6'; // Violet
        const size = 8;

        for(let i = Math.ceil(start); i <= Math.floor(end); i++) {
            const cx = xOffset + (i - 1) * xScale + xScale / 2;
            
            // Diamond: M cx, cy-size L cx+size, cy L cx, cy+size L cx-size, cy Z
            const points = [
                `${cx},${centerY - size}`,
                `${cx + size},${centerY}`,
                `${cx},${centerY + size}`,
                `${cx - size},${centerY}`
            ];

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', points.join(' '));
            polygon.setAttribute('fill', diamondColor);
            group.appendChild(polygon);
        }
    }

    drawBlock(group, xOffset, yOffset, width, height, start, end, seqLen, color) {
        // Kept as empty legacy or specifically for 'block' if user wants empty
        // But logic above maps 'block' string to drawRect.
        // So this is effectively unused unless explicitly called.
        return;
    }
}

export function renderPositionChart(engine, width, height, yOffset, sequenceLength, data, feature) {
    new PositionRenderer(engine, feature).render(yOffset, width, height, sequenceLength);
}
