import type { Point2D } from "../../core/geometry";

/**
 * 分布配置
 */
export interface DistributionConfig {
  // 对称性检测阈值
  symmetric: {
    default: number; // 对称性检测的默认阈值
    min: number; // 最小可接受阈值
    max: number; // 最大可接受阈值
  };

  // 渐进布局阈值
  progressive: {
    default: number; // 渐进布局的默认阈值
    min: number; // 最小可接受阈值
    max: number; // 最大可接受阈值
  };

  // 物理属性
  physics: {
    inertia: {
      weightFactor: number; // 惯性计算的权重因子
      momentThreshold: number; // 惯性矩的阈值
    };
    mass: {
      centerTolerance: number; // 质心偏差的容差
      balanceWeight: number; // 质量平衡在评分中的权重
    };
  };

  // 评分权重
  weights: {
    symmetry: number; // 对称性得分权重
    balance: number; // 平衡性得分权重
    uniformity: number; // 均匀性得分权重
  };

  // 惩罚因子
  penalties: {
    asymmetry: number; // 不对称布局的惩罚因子
    imbalance: number; // 不平衡布局的惩罚因子
    nonUniformity: number; // 非均匀分布的惩罚因子
  };

  // 物理平衡参数
  maxInertiaRadius: number; // 最大惯性半径
  maxCenterDeviation: number; // 最大中心偏差

  // 空间平衡参数
  minSymmetryScore: number; // 最小对称性得分
  minUniformityScore: number; // 最小均匀性得分

  // 体积平衡参数
  gridSize: number; // 网格大小
  maxDensityVariance: number; // 最大密度方差
  maxHeightDeviation: number; // 最大高度偏差
}

/**
 * 内部物理分析结果
 */
export interface InternalPhysicalAnalysis {
  mass: {
    total: number; // 总质量
    center: Point2D; // 质心位置
    distribution: number[]; // 质量分布
  };

  inertia: {
    tensor: [number, number, number]; // [Ixx, Iyy, Ixy]
    principal: {
      moments: [number, number]; // 主惯性矩
      axes: [[number, number], [number, number]]; // 主轴方向
    };
    gyrationRadius: number; // 回转半径
  };
}

/**
 * 分布平衡得分详情
 */
export interface DetailedDistributionScore {
  overall: number; // 总分

  details: {
    // 物理特性
    principalMoments: [number, number]; // 主惯性矩（特征值）
    principalAxes: [[number, number], [number, number]]; // 主轴方向（特征向量）
    gyrationRadius: number; // 陀螺半径
    isotropy: number; // 各向同性比
    centerDeviation: number; // 质心偏移

    // 体积平衡
    volumeBalance: {
      densityVariance: number; // 密度方差 - 反映平面空间利用
      heightBalance: number; // 高度分布的平衡性
      massDistribution: number; // 考虑体积带来的质量分布
      symmetry: number; // 对称性分数
    };

    // 布局模式（可选）
    layoutPatterns?: {
      type: string; // 布局模式类型
      confidence: number; // 置信度
    }[];
    patternBonus?: number; // 布局模式奖励分数
    balanceBonus?: number; // 平衡奖励分数
  };
}