# BioSeqViewer

BioSeqViewer 是一个基于 React 和 SVG 的生物序列可视化组件。它支持展示序列信息以及相关的多种特征图表（如折线图、柱状图、位置标注等），并提供高度可定制的配置选项。

## 特性

- **多图表支持**：支持 Sequence（序列）、Line Chart（折线图）、Bar Chart（柱状图）、Position Chart（位置/区间标注）。
- **高度可配置**：支持自定义颜色、高度、标题样式、背景等。
- **交互式 Tooltip**：支持鼠标悬停查看详细数据，且样式可配置。
- **响应式设计**：支持横向滚动，适应不同长度的序列。
- **模块化架构**：基于继承的渲染器架构，易于扩展。

## 安装

你可以通过以下两种方式将此组件集成到你的项目中：

### 方法 1: 通过 Git 安装 (推荐)

在你的项目根目录下运行：

```bash
# 替换为你的仓库地址
npm install git+https://gitee.com/AncleKer/BioSeqViewer.git
# 或
yarn add git+https://gitee.com/AncleKer/BioSeqViewer.git
```

### 方法 2: 手动复制

将以下文件和文件夹复制到你的项目组件目录中（例如 `src/components/BioSeqViewer`）：

- `PeptideVisualizerReact.jsx`
- `renderers/` 文件夹
- `components/` 文件夹
- `utils/` 文件夹
- `index.js` (可选)

确保你的项目安装了必要的依赖 (`react`, `react-dom`)。

## 快速开始

```jsx
import React from 'react';
// 如果是通过 npm 安装
import { PeptideVisualizer } from 'bioseqviewer';
// 如果是手动复制
// import PeptideVisualizer from './components/BioSeqViewer/PeptideVisualizerReact';

const MyComponent = () => {
  const sequence = "MKTIIALSYIFCLVFADYKDDDDK";
  const features = [
    {
      type: 'line',
      title: 'Hydrophobicity',
      data: { values: [0.5, 0.8, -0.2, ...] }
    },
    {
      type: 'position',
      title: 'Domains',
      data: { 
        positions: [
            { start: 1, end: 10, color: 'red', label: 'Signal' }
        ] 
      }
    }
  ];

  return (
    <PeptideVisualizer 
      sequence={sequence} 
      features={features} 
    />
  );
};
```

## 配置说明

组件接受 `options` 属性用于全局配置。

### Tooltip 配置 (新功能)

你可以通过 `options.tooltip` 完全控制提示框的行为和样式。

```javascript
const options = {
  tooltip: {
    // 是否启用 Tooltip，默认为 true
    visible: true, 
    
    // 背景颜色 (支持 CSS 颜色值)
    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
    
    // 文字颜色
    textColor: '#ffffff',
    
    // 字体大小
    fontSize: '12px',
    
    // 其他自定义样式 (会合并到 style 属性中)
    style: {
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid #333'
    }
  }
};
```

### 全局图表配置

```javascript
const options = {
  // 画布边距
  margin: { top: 40, right: 80, bottom: 40, left: 100 },
  
  // 默认图表高度
  defaultChartHeight: 80,
  
  // 标题区域宽度
  titleWidth: 100,
  
  // 图表间距
  chartSpacing: 24,
  
  // 每个残基的最小像素宽度
  minPixelPerResidue: 20,
  
  // 全局颜色配置
  colors: {
    text: '#374151',
    axis: '#9CA3AF',
    grid: '#F3F4F6'
  },
  
  // 全局标题样式 (可被单个 feature 覆盖)
  featureTitleStyle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333'
  },

  // 底部共享 X 轴配置
  xAxis: {
    visible: true,      // 是否显示底部 X 轴
    interval: 5,        // 刻度间隔
    tickSize: 6,        // 刻度线长度
    labelSize: 12,      // 标签字体大小
    width: 2            // 轴线宽度 (支持小数，例如 0.5)
  }
};
```

## Feature 配置

`features` 数组中的每个对象代表一行图表。所有图表类型共享以下通用配置：

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | string | 图表类型: `'sequence'`, `'line'`, `'bar'`, `'position'` |
| `title` | string | 左侧显示的标题文本 |
| `showTitle` | boolean | 是否显示标题 (默认 true) |
| `height` | number | 图表高度 (默认使用 options.defaultChartHeight) |
| `backgroundColor` | string | 背景网格带颜色 |
| `backgroundOpacity` | number | 背景透明度 |
| `yAxis` | object | Y 轴配置 `{ visible, range: [min,max], color, width }` |
| `xAxis` | object | 行内 X 轴/参考线配置 `{ visible, value, color, width, dashArray }` |
| `titleStyle` | object | 覆盖全局的标题样式 `{ fontSize, color, ... }` |

### 1. Sequence (序列展示)

通常作为第一个 feature 自动添加，也可以手动配置以自定义样式。

```javascript
{
  type: 'sequence',
  data: { 
    sequence: "ACDEF...", // 如果不传则使用主 sequence
    secondaryStructure: "HHH..." // 可选：二级结构字符串 (H=Helix, E=Sheet)
  }
}
```

### 2. Line Chart (折线图)

用于展示连续的数值数据（如疏水性、电荷分布）。

```javascript
{
  type: 'line',
  title: 'Hydrophobicity',
  data: {
    values: [0.1, 0.5, 0.9, ...] // 数组长度应与序列一致
  },
  lineColor: '#2563EB', // 线条颜色
  lineWidth: 2,         // 线宽
  fillColor: 'rgba(37, 99, 235, 0.1)' // 填充颜色 (可选)
}
```

### 3. Bar Chart (柱状图)

```javascript
{
  type: 'bar',
  title: 'Charge',
  data: {
    values: [10, -5, 8, -2, ...]
  },
  // 高级样式配置
  config: {
    positiveColor: '#10B981', // 正值颜色
    negativeColor: '#F43F5E', // 负值颜色
    // 形状支持: 'rect' (默认), 'circle', 'triangle', 'star', 'diamond', 或任意字符
    shape: 'rect',            
    filled: true,             // 是否填充形状 (仅对几何形状有效)
    barWidthRatio: 0.8        // 柱子宽度占槽位的比例 (0.1 - 1.0)
  },
  // 也可以仅使用 color 属性设置统一颜色
  // color: '#059669' 
}
```

### 4. Position Chart (位置标注)

用于标记特定的序列片段（如结构域、信号肽）。

```javascript
{
  type: 'position',
  title: 'Domains',
  data: {
    positions: [
      { 
        start: 1, 
        end: 15, 
        color: '#EA580C', 
        label: 'Signal Peptide',
        shape: 'block' // 可选: 'block', 'arrow', 'helix'
      },
      { 
        start: 20, 
        end: 50, 
        color: '#6366F1', 
        label: 'Domain A' 
      }
    ]
  }
}
```

## 开发架构

项目采用模块化的渲染器架构：

- `PeptideVisualizerReact.jsx`: 主组件，负责 React 生命周期和事件管理。
- `renderers/BaseRenderer.js`: 所有图表的基类，处理公共逻辑（背景、标题）。
- `renderers/*.js`: 具体图表的实现。
- `components/Tooltip.jsx`: 独立的提示框组件。
