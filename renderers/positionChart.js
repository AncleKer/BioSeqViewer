import { BaseRenderer } from './BaseRenderer';

export class PositionRenderer extends BaseRenderer {
    draw(yOffset, width, height, sequenceLength) {
        if (!this.feature.data?.positions) return;
        const margin = { left: this.engine.options.titleWidth + 5 };
        
        // Background line
        const bgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bgLine.setAttribute('x1', margin.left);
        bgLine.setAttribute('y1', yOffset + height / 2);
        bgLine.setAttribute('x2', margin.left + width);
        bgLine.setAttribute('y2', yOffset + height / 2);
        bgLine.setAttribute('stroke', this.engine.options.colors.axis);
        bgLine.setAttribute('stroke-width', 2);
        this.engine.svg.appendChild(bgLine);
    
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        this.feature.data.positions.forEach(pos => {
            const type = pos.type || 'loop';
            switch(type) {
                case 'helix': 
                    this.drawHelix(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength); 
                    break;
                case 'sheet': 
                    this.drawArrow(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength); 
                    break;
                case 'loop': 
                    break; // Just line
                default: 
                    this.drawBlock(group, margin.left, yOffset, width, height, pos.start, pos.end, sequenceLength);
            }
        });
        this.engine.svg.appendChild(group);
    }

    drawHelix(group, xOffset, yOffset, width, height, start, end, seqLen) {
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
        const helixColor = this.engine.options.colors?.positions?.helix || '#10B981'; // Emerald
        
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

    drawArrow(group, xOffset, yOffset, width, height, start, end, seqLen) {
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
        const sheetColor = this.engine.options.colors?.positions?.sheet || '#F43F5E'; // Rose
        
        path.setAttribute('fill', sheetColor);
        path.setAttribute('rx', 2);
        
        // 渐变填充效果需要defs，这里简单用纯色+边框
        path.setAttribute('stroke', 'rgba(0,0,0,0.1)');
        path.setAttribute('stroke-width', 1);

        group.appendChild(path);
    }

    drawBlock(group, xOffset, yOffset, width, height, start, end, seqLen) {
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
}

export function renderPositionChart(engine, width, height, yOffset, sequenceLength, data, feature) {
    new PositionRenderer(engine, feature).render(yOffset, width, height, sequenceLength);
}
