/**
 * Base Renderer Component
 * 
 * Provides common functionality for all feature renderers:
 * - Background rendering
 * - Title rendering
 * - Axis rendering utilities
 * 
 * All specific chart renderers should extend this class.
 */
export class BaseRenderer {
    constructor(engine, feature) {
        this.engine = engine;
        this.feature = feature;
        // Shortcut to engine options for easier access
        this.options = engine.options;
    }

    /**
     * Main render method
     * @param {number} yOffset - Vertical offset for this feature
     * @param {number} width - Chart width (excluding title area)
     * @param {number} height - Height of this feature
     * @param {number} sequenceLength - Total sequence length
     */
    render(yOffset, width, height, sequenceLength) {
        // 1. Draw Background
        this.renderBackground(yOffset, width, height);

        // 2. Draw Title (if enabled)
        if (this.feature.showTitle !== false) {
            this.renderTitle(yOffset, height);
        }

        // 3. Draw Content (Subclass implementation)
        this.draw(yOffset, width, height, sequenceLength);
    }

    /**
     * Abstract method to be implemented by subclasses
     */
    draw(yOffset, width, height, sequenceLength) {
        console.warn('draw() method not implemented in subclass');
    }

    /**
     * Renders the background grid/strip
     */
    renderBackground(yOffset, width, height) {
        const x = this.options.titleWidth;
        // width passed here is chartWidth. Background usually covers chart area.
        // Original code used chartWidth + 5.
        const bgWidth = width + 5;
        
        const customColor = this.feature.backgroundColor;
        const customOpacity = this.feature.backgroundOpacity;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', yOffset);
        rect.setAttribute('width', bgWidth);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', customColor || this.options.colors.grid);
        
        if (customOpacity !== null && customOpacity !== undefined) {
            rect.setAttribute('fill-opacity', customOpacity);
        }
        
        rect.setAttribute('rx', 4); // Rounded corners
        this.engine.svg.appendChild(rect);
    }

    /**
     * Renders the feature title on the left side
     */
    renderTitle(yOffset, height) {
        const title = this.feature.title;
        if (!title) return;

        // Default style logic
        const defaults = {
            fontSize: 13,
            fontWeight: '500',
            color: null,
            fontFamily: null
        };
        const globalStyle = this.options.featureTitleStyle || defaults;
        
        const style = {
            fontSize: this.feature.titleStyle?.fontSize || globalStyle.fontSize,
            fontWeight: this.feature.titleStyle?.fontWeight || globalStyle.fontWeight,
            color: this.feature.titleStyle?.color || globalStyle.color,
            fontFamily: this.feature.titleStyle?.fontFamily || globalStyle.fontFamily
        };

        const yAxisWidth = this.engine.hasAnyYAxis ? 30 : 5;
        // Available width for title
        const availableWidth = this.options.margin.left - yAxisWidth - 5;
        const x = this.options.margin.left - yAxisWidth;

        // Estimate character width (approx 0.6 * fontSize)
        const charWidth = style.fontSize * 0.6;
        const maxCharsPerLine = Math.floor(availableWidth / charWidth);

        // Simple word wrap
        const words = title.split(/\s+/);
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            if ((currentLine + " " + words[i]).length * charWidth < availableWidth) {
                currentLine += " " + words[i];
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        // Force break if single word is too long
        const finalLines = [];
        lines.forEach(line => {
            if (line.length > maxCharsPerLine) {
                 for(let i = 0; i < line.length; i += maxCharsPerLine) {
                     finalLines.push(line.substring(i, i + maxCharsPerLine));
                 }
            } else {
                finalLines.push(line);
            }
        });

        // Render lines
        const lineHeight = style.fontSize * 1.2;
        const totalHeight = finalLines.length * lineHeight;
        const startY = yOffset + height / 2 - (totalHeight / 2) + (lineHeight / 2); // Vertically centered

        finalLines.forEach((line, index) => {
            const text = this.engine._createText(x, startY + index * lineHeight, line, {
                anchor: 'end',
                size: style.fontSize,
                weight: style.fontWeight,
                color: style.color,
                fontFamily: style.fontFamily
            });
            this.engine.svg.appendChild(text);
        });
    }

    /**
     * Helper to render Y-Axis
     */
    renderYAxis(yOffset, height, min, max, color = null) {
        const axisColor = color || this.options.colors.axis;
        const x = this.options.titleWidth; // Y-axis sits at the boundary of title and chart

        // Axis Line
        const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axis.setAttribute('x1', x);
        axis.setAttribute('y1', yOffset);
        axis.setAttribute('x2', x);
        axis.setAttribute('y2', yOffset + height);
        axis.setAttribute('stroke', axisColor);
        axis.setAttribute('stroke-width', 1);
        this.engine.svg.appendChild(axis);

        // Ticks: min, mid, max
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
            this.engine.svg.appendChild(tickLine);

            const label = this.engine._createText(x - 6, tick.y, tick.val.toFixed(1).replace(/\.0$/, ''), {
                anchor: 'end',
                size: 10,
                color: axisColor
            });
            this.engine.svg.appendChild(label);
        });
    }
}
