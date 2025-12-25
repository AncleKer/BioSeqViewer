import { BaseRenderer } from './BaseRenderer';

export class SequenceRenderer extends BaseRenderer {
    draw(yOffset, width, height, sequenceLength) {
        const data = this.feature.data;
        if (!data) return;

        const margin = { left: this.engine.options.titleWidth + 5 };
        const xScale = width / sequenceLength;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        for (let i = 0; i < data.length; i++) {
            const x = margin.left + i * xScale + xScale / 2;
            // 垂直居中于该行
            const y = yOffset + height / 2;
            
            // 隐形的可交互矩形
            const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            hitRect.setAttribute('x', margin.left + i * xScale);
            hitRect.setAttribute('y', yOffset);
            hitRect.setAttribute('width', xScale);
            hitRect.setAttribute('height', height);
            hitRect.setAttribute('fill', 'transparent');
            hitRect.setAttribute('data-index', i);
            hitRect.setAttribute('class', 'residue-hit-area');
            hitRect.style.cursor = 'pointer';
            group.appendChild(hitRect);

            const text = this.engine._createText(x, y, data[i], { 
                anchor: 'middle',
                fontFamily: this.engine.options.sequenceFontFamily || '"Roboto Mono", "Courier New", Courier, monospace' // 使用专用等宽字体
            });
            text.style.pointerEvents = 'none'; // 让鼠标事件穿透到下方的矩形
            group.appendChild(text);
        }
        this.engine.svg.appendChild(group);
    }
}

export function renderSequenceChart(engine, width, height, yOffset, sequenceLength, data, feature) {
    new SequenceRenderer(engine, feature).render(yOffset, width, height, sequenceLength);
}
