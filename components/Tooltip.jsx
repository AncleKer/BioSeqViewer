import React from 'react';

const Tooltip = ({ x, y, content, visible, style = {} }) => {
    if (!visible) return null;

    // Default styles
    const defaultStyles = {
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
        lineHeight: '1.4',
        ...style // Merge user provided styles
    };

    return (
        <div style={defaultStyles}>
            {content}
        </div>
    );
};

export default Tooltip;
