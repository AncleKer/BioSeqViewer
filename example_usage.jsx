import React from 'react';
import PeptideVisualizer from './PeptideVisualizerReact';

const App = () => {
    // 示例数据：一段假设的肽序列
    const sequence = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKL";
    
    // 示例特性数据
    const features = [
        {
            type: 'line',
            title: 'Hydrophobicity',
            height: 80,
            data: {
                values: [
                    -0.5, 0.2, 1.5, 2.1, 1.8, 0.5, -1.2, -0.8, 0.1, 1.2,
                    1.5, 2.0, 1.7, 0.9, -0.2, -1.5, -2.0, -1.2, 0.5, 1.8,
                    2.2, 1.9, 0.8, -0.5, -1.8, -2.2, -1.5, -0.1, 1.5, 2.1,
                    1.6, 0.4, -0.8, -1.9, -2.1, -1.0, 0.2, 1.6, 2.3, 1.8,
                    0.5, -0.9, -2.0, -2.2, -1.4, 0.1, 1.7, 2.2, 1.5, 0.3,
                    -1.0, -2.1, -2.3, -1.5, 0.0, 1.8, 2.4, 1.7, 0.6, -0.8,
                    -1.8, -2.0, -1.2, 0.2, 1.6, 2.1, 1.4, 0.4, -0.9, -1.7,
                    -1.9, -1.1, 0.3, 1.7, 2.2, 1.6, 0.5, -0.7, -1.6, -1.8,
                    -1.0, 0.4, 1.8, 2.3, 1.5, 0.2, -1.1, -2.2, -2.0, -0.8, 0.5, 1.9
                ],
                color: '#3B82F6'
            },
            backgroundColor: '#EFF6FF', // Light Blue 50
            backgroundOpacity: 0.5,
            yAxis: {
                visible: true,
                range: [-3, 3], // 自定义范围
                color: '#2563EB' // 自定义轴颜色 (Blue 600)
            }
        },
        {
            type: 'bar',
            title: 'Charge',
            height: 60,
            data: {
                values: Array(92).fill(0).map(() => Math.floor(Math.random() * 5) - 2), // -2 to 2
                positiveColor: '#F59E0B',
                negativeColor: '#EF4444'
            },
            backgroundColor: '#FEF3C7', // Amber 50
            backgroundOpacity: 0.3,
            yAxis: {
                visible: false // 隐藏Y轴
            }
        },
        {
            type: 'position',
            title: 'Secondary Structure',
            height: 40,
            backgroundColor: '#FFFFFF', // 琥珀色背景
            backgroundOpacity: 1,    // 5% 透明度
            data: {
                positions: [
                    { type: 'helix', start: 4, end: 18 },
                    { type: 'loop', start: 18, end: 20 },
                    { type: 'helix', start: 20, end: 35 },
                    { type: 'sheet', start: 38, end: 44 },
                    { type: 'loop', start: 44, end: 50 },
                    { type: 'helix', start: 52, end: 70 },
                    { type: 'sheet', start: 75, end: 80 }
                ]
            }
        }
    ];

    return (
        <div style={{ padding: '40px', background: '#F9FAFB', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ color: '#111827', marginBottom: '24px' }}>Protein Analysis Dashboard</h1>
                
                {/* 渲染组件 */}
                <PeptideVisualizer 
                    sequence={sequence}
                    features={features}
                    options={{
                        defaultChartHeight: 60,
                        titleWidth: 120,
                        minPixelPerResidue: 10 // 设置每个残基的最小宽度，序列较长时会出现横向滚动
                    }}
                />
                
                <div style={{ marginTop: '24px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>About this sequence</h4>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                        This visualization shows the hydrophobicity profile, charge distribution, and predicted secondary structure elements of the input peptide sequence.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default App;
