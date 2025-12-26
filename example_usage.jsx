import React from 'react';
import PeptideVisualizer from './PeptideVisualizerReact';

const App = () => {
    // 示例数据：一段假设的肽序列 (50 residues)
    const sequence = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLS";
    
    // 示例特性数据
    const features = [
        {
            type: 'line',
            title: '疏水性',
            height: 60,
            data: {
                values: [
                    -0.5, 0.2, 1.5, 2.1, 1.8, 0.5, -1.2, -0.8, 0.1, 1.2,
                    1.5, 2.0, 1.7, 0.9, -0.2, -1.5, -2.0, -1.2, 0.5, 1.8,
                    2.2, 1.9, 0.8, -0.5, -1.8, -2.2, -1.5, -0.1, 1.5, 2.1,
                    1.6, 0.4, -0.8, -1.9, -2.1, -1.0, 0.2, 1.6, 2.3, 1.8,
                    0.5, -0.9, -2.0, -2.2, -1.4, 0.1, 1.7, 2.2, 1.5, 0.3
                ],
                color: '#3B82F6'
            },
            backgroundColor: '#EFF6FF', // Light Blue 50
            backgroundOpacity: 0.5,
            yAxis: {
                visible: true,
                range: [-3, 3], // 自定义范围
                color: '#000000' // 自定义轴颜色 (Blue 600)
            },
            xAxis: {
                visible: true,
                color: 'red',
                width: 0.5, // 可以设置更细的线，例如 0.5
            }
        },
        {
            type: 'bar',
            title: '电荷',
            height: 60,
            config: {
                positiveColor: '#10B981', // Emerald 500 (自定义正值颜色)
                negativeColor: '#F43F5E', // Rose 500 (自定义负值颜色)
                shape: 'rect',            // 'rect' | 'rounded' | 'circle' | 'triangle' | 'star' | 'diamond' | any char
                filled: true,             // 是否填充形状
                barWidthRatio: 0.8        // 0.1 - 1.0 (自定义柱子宽度比例)
            },
            data: {
                values: Array(50).fill(0).map(() => Math.floor(Math.random() * 5) - 2), // -2 to 2
            },
            backgroundColor: '#FEF3C7', // Amber 50
            backgroundOpacity: 0.3,
            yAxis: {
                visible: false // 隐藏Y轴
            },
            xAxis: {
                visible: true,
                width: 1,
            }
        },
        {
            type: 'position',
            title: '二级结构',
            height: 40,
            backgroundColor: '#FFFFFF', // 琥珀色背景
            backgroundOpacity: 1,    // 5% 透明度
            data: {
                positions: [
                    { type: 'helix', start: 4, end: 18 },
                    { type: 'loop', start: 18, end: 20 },
                    { type: 'helix', start: 20, end: 35 },
                    { type: 'sheet', start: 38, end: 44 },
                    { type: 'loop', start: 44, end: 50 }
                ]
            },
            xAxis: {
                visible: true,
            }
        }
    ];

    return (
        <div style={{ padding: '40px', background: '#F9FAFB', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ color: '#111827', marginBottom: '24px' }}>Protein Analysis Dashboard</h1>
                
                {/* 渲染组件 */}
                <div style={{ 
                width: '100%', 
                height: '400px', 
                border: '1px solid #ccc',
                padding: '20px',
                overflow: 'auto', // 允许内容溢出时显示滚动条
                margin: '0 auto' // 居中显示
            }}>
                    <PeptideVisualizer 
                        sequence={{
                            sequence: sequence,
                            title: '序列',
                        }}
                        features={features}
                        options={{
                            defaultChartHeight: 60,
                            titleWidth: 70,
                            minPixelPerResidue: 10, // 设置每个残基的最小宽度，序列较长时会出现横向滚动
                            showHeader: false,
                        }}
                    />
                </div>
                
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
