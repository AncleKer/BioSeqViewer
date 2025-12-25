/**
 * 标准化 Feature 配置
 * 
 * 将不同类型的 feature（包括 sequence）统一转换为标准的配置对象，
 * 处理默认值、样式继承和向后兼容逻辑。
 * 
 * @param {Object} feature - 单个 feature 配置对象
 * @param {string} defaultType - 默认类型 (如 'sequence')
 * @param {Object} context - 上下文信息
 * @param {number} context.defaultChartHeight - 默认图表高度
 * @param {Object} context.rawOptions - 原始全局配置（用于兼容旧的 sequenceLabel）
 * @param {string} context.defaultSequence - 默认序列数据（用于 sequence 类型缺失 data 时回退）
 * @returns {Object} 标准化后的 feature 对象
 */
export function normalizeFeature(feature, defaultType = null, context = {}) {
    const { 
        defaultChartHeight = 80, 
        rawOptions = {}, 
        defaultSequence = '' 
    } = context;

    const type = feature.type || defaultType;
    
    // 基础默认配置
    const baseConfig = {
        type: type,
        data: feature.data,
        height: defaultChartHeight,
        showTitle: true,
        title: '',
        titleStyle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: null,
            fontFamily: null
        },
        backgroundColor: 'transparent',
        yAxis: { visible: false },
        xAxis: { visible: false } // 暂留接口
    };

    // 根据类型调整默认值
    if (type === 'sequence') {
        baseConfig.height = 30;
        baseConfig.title = 'Sequence';
        
        // 兼容旧的 sequenceLabel 配置
        const seqOpts = rawOptions.sequenceLabel || {};
        if (typeof seqOpts === 'object') {
            if (seqOpts.text) baseConfig.title = seqOpts.text;
            // 合并样式
            baseConfig.titleStyle = { ...baseConfig.titleStyle, ...seqOpts };
        }
    }

    // 合并用户配置 (feature 自身属性覆盖默认值)
    const merged = { ...baseConfig, ...feature };
    
    // 特殊处理嵌套对象，避免直接覆盖导致丢失默认属性
    if (feature.titleStyle) {
        merged.titleStyle = { ...baseConfig.titleStyle, ...feature.titleStyle };
    }
    if (feature.yAxis) {
        merged.yAxis = { ...baseConfig.yAxis, ...feature.yAxis };
    }
    if (feature.xAxis) {
        merged.xAxis = { ...baseConfig.xAxis, ...feature.xAxis };
    }

    // 确保 sequence 数据正确 (如果 feature.data 为空，可能是在 rawSequenceData 传入时 data 字段缺失，但 this.sequence 有值)
    if (type === 'sequence' && !merged.data) {
        merged.data = defaultSequence;
    }

    return merged;
}
