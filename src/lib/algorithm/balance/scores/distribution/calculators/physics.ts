import type { Rectangle } from "@/types/core/geometry";
import type { Product } from "@/types/domain/product";
import type { Point2D } from "@/types/core/geometry";

interface MassElement {
  x: number;
  y: number;
  mass: number;
  width: number;
  length: number;
}

interface InertiaResult {
  moments: [number, number];
  axes: [[number, number], [number, number]];
  gyrationRadius: number;
}

interface PhysicsResult {
  isotropy: number;
  centerDeviation: number;
  principalMoments: [number, number];
  principalAxes: [[number, number], [number, number]];
  gyrationRadius: number;
}

export class PhysicsCalculator {
  constructor() {
    this.calculate = this.calculate.bind(this);
    this.createMassElements = this.createMassElements.bind(this);
    this.calculateCenterOfMass = this.calculateCenterOfMass.bind(this);
    this.calculateInertia = this.calculateInertia.bind(this);
    this.calculateIsotropyScore = this.calculateIsotropyScore.bind(this);
    this.calculateCenterDeviationScore =
      this.calculateCenterDeviationScore.bind(this);
    this.getLayoutBounds = this.getLayoutBounds.bind(this);
    this.toScoreDetails = this.toScoreDetails.bind(this);
  }

  calculate(
    layout: Record<number, Rectangle>,
    products: Product[],
  ): PhysicsResult {
    // Handle empty or single product case
    if (products.length <= 1) {
      return {
        isotropy: 100,
        centerDeviation: 0,
        principalMoments: [0, 0],
        principalAxes: [
          [1, 0],
          [0, 1],
        ],
        gyrationRadius: 0,
      };
    }

    try {
      // Detect layout patterns
      const { isGradient, gradientQuality } = this.detectGradientPattern(
        layout,
        products,
      );
      const { isHierarchical, hierarchyQuality } =
        this.detectHierarchicalPattern(layout);
      const { isAligned, alignmentQuality } =
        this.detectAlignmentPattern(layout);

      // Calculate basic physical properties
      const elements = this.createMassElements(layout, products);
      const centerOfMass = this.calculateCenterOfMass(elements);
      const inertia = this.calculateInertia(elements, centerOfMass);

      // Calculate normalized scores with pattern adjustments
      const isotropyScore = this.calculateIsotropyScore(inertia, {
        isGradient,
        gradientQuality,
        isHierarchical,
        hierarchyQuality,
        isAligned,
        alignmentQuality,
      });

      const centerDeviationScore = this.calculateCenterDeviationScore(
        centerOfMass,
        layout,
        {
          isGradient,
          gradientQuality,
          isHierarchical,
          hierarchyQuality,
          isAligned,
          alignmentQuality,
        },
      );

      // Apply pattern-specific adjustments
      let finalIsotropy = isotropyScore;
      let finalCenterDeviation = centerDeviationScore;

      if (isGradient) {
        const isotropyBonus = gradientQuality * 0.3;
        const deviationBonus = gradientQuality * 0.2;
        finalIsotropy = Math.max(65, finalIsotropy * (1 + isotropyBonus));
        finalCenterDeviation *= 1 + deviationBonus;
      }

      if (isHierarchical) {
        const isotropyBonus = hierarchyQuality * 0.3;
        const deviationBonus = hierarchyQuality * 0.2;
        finalIsotropy = Math.max(65, finalIsotropy * (1 + isotropyBonus));
        finalCenterDeviation *= 1 + deviationBonus;
      }

      if (isAligned) {
        const isotropyBonus = alignmentQuality * 0.2;
        const deviationBonus = alignmentQuality * 0.1;
        finalIsotropy *= 1 + isotropyBonus;
        finalCenterDeviation *= 1 + deviationBonus;
      }

      return {
        isotropy: Math.min(100, finalIsotropy),
        centerDeviation: Math.max(0, Math.min(100, finalCenterDeviation)),
        principalMoments: inertia.moments,
        principalAxes: inertia.axes,
        gyrationRadius: inertia.gyrationRadius,
      };
    } catch (error) {
      console.error("Error in physics calculation:", error);
      return {
        isotropy: 0,
        centerDeviation: 100,
        principalMoments: [0, 0],
        principalAxes: [
          [1, 0],
          [0, 1],
        ],
        gyrationRadius: 0,
      };
    }
  }

  toScoreDetails(analysis: PhysicsResult) {
    return {
      principalMoments: analysis.principalMoments,
      principalAxes: analysis.principalAxes,
      gyrationRadius: analysis.gyrationRadius,
      isotropy: analysis.isotropy,
      centerDeviation: analysis.centerDeviation,
    };
  }

  private createMassElements(
    layout: Record<number, Rectangle>,
    products: Product[],
  ): MassElement[] {
    return products.map((product) => {
      const rect = layout[product.id];
      if (!rect) throw new Error(`No layout found for product ${product.id}`);
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.length / 2,
        mass: product.weight ?? 1,
        width: rect.width,
        length: rect.length,
      };
    });
  }

  private calculateCenterOfMass(elements: MassElement[]): Point2D {
    const totalMass = elements.reduce((sum, e) => sum + e.mass, 0);
    if (totalMass === 0) return { x: 0, y: 0 };

    const x = elements.reduce((sum, e) => sum + e.x * e.mass, 0) / totalMass;
    const y = elements.reduce((sum, e) => sum + e.y * e.mass, 0) / totalMass;

    return { x, y };
  }

  private calculateInertia(
    elements: MassElement[],
    centerOfMass: Point2D,
  ): InertiaResult {
    let Ixx = 0;
    let Iyy = 0;
    let Ixy = 0;
    let totalMass = 0;

    // 计算总质量和特征长度
    elements.forEach((element) => {
      totalMass += element.mass;
    });

    // 获取布局尺寸
    const bounds = this.getLayoutBounds(elements);
    const characteristicLength = Math.sqrt(bounds.width * bounds.width + bounds.length * bounds.length);

    // 检查布局特征
    const isVertical = this.isVerticallyDominant(elements);
    const isHorizontal = this.isHorizontallyDominant(elements);
    const massDistribution = this.calculateMassDistribution(elements);
    const continuityFactor = massDistribution.continuity;

    elements.forEach((element) => {
      const dx = element.x - centerOfMass.x;
      const dy = element.y - centerOfMass.y;

      // 根据布局特征和连续性调整校正因子
      let correctionFactor = 1.0;
      if (isVertical || isHorizontal) {
        correctionFactor = 0.8 + continuityFactor * 0.2;
      }

      // 计算惯性矩，不使用归一化因子
      const elementIxx =
        element.mass *
        (dy * dy * correctionFactor + (element.length * element.length) / 12);
      const elementIyy =
        element.mass *
        (dx * dx * correctionFactor + (element.width * element.width) / 12);
      const elementIxy =
        element.mass * dx * dy * correctionFactor;

      Ixx += elementIxx;
      Iyy += elementIyy;
      Ixy += elementIxy;
    });

    // 归一化惯性矩
    const normalizationFactor = 1 / (totalMass * characteristicLength * characteristicLength);
    Ixx *= normalizationFactor;
    Iyy *= normalizationFactor;
    Ixy *= normalizationFactor;

    const avg = (Ixx + Iyy) / 2;
    const diff = Math.sqrt(((Ixx - Iyy) * (Ixx - Iyy)) / 4 + Ixy * Ixy);
    const moments: [number, number] = [avg + diff, avg - diff];

    const theta = Math.atan2(2 * Ixy, Ixx - Iyy) / 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const axes: [[number, number], [number, number]] = [
      [cos, -sin],
      [sin, cos],
    ];

    const gyrationRadius = Math.sqrt((moments[0] + moments[1]) / totalMass) * characteristicLength;

    return { moments, axes, gyrationRadius };
  }

  private calculateIsotropyScore(
    inertia: InertiaResult,
    patterns: {
      isGradient: boolean;
      gradientQuality: number;
      isHierarchical: boolean;
      hierarchyQuality: number;
      isAligned: boolean;
      alignmentQuality: number;
    },
  ): number {
    const [m1, m2] = inertia.moments;
    
    // 处理零值和极小值
    const epsilon = 1e-10;
    if (Math.abs(m1) < epsilon && Math.abs(m2) < epsilon) return 100;
    if (Math.abs(m1) < epsilon || Math.abs(m2) < epsilon) return 20;

    // 归一化处理，避免大数值
    const maxMoment = Math.max(Math.abs(m1), Math.abs(m2));
    const normalizedM1 = m1 / maxMoment;
    const normalizedM2 = m2 / maxMoment;

    // 计算比率（归一化后的值应该在0到1之间）
    const ratio = Math.min(normalizedM1 / normalizedM2, normalizedM2 / normalizedM1);

    // 使用更宽容的评分曲线
    const baseScore = Math.pow(ratio, 0.3) * 100; // 降低指数使得评分更宽容

    // 计算分布因子
    const distributionFactor = this.calculateDistributionFactor(inertia);

    // 根据分布因子调整基础分数
    let adjustedScore = baseScore;
    if (distributionFactor > 0.8) {
      adjustedScore = Math.max(adjustedScore, 90);
    } else if (distributionFactor > 0.6) {
      adjustedScore = Math.max(adjustedScore, 80);
    }

    // 应用模式特定的调整
    if (patterns.isGradient || patterns.isHierarchical) {
      const qualityBonus = Math.max(patterns.gradientQuality, patterns.hierarchyQuality) * 0.2;
      adjustedScore = Math.max(adjustedScore, 80 + qualityBonus * 20);
    }

    // 应用最终的分布因子加成
    const finalBonus = Math.max(0, distributionFactor - 0.5) * 0.2;
    adjustedScore *= (1 + finalBonus);

    return Math.min(100, adjustedScore);
  }

  private calculateDistributionFactor(inertia: InertiaResult): number {
    // 计算主轴方向
    const angle = Math.atan2(inertia.axes[0][1], inertia.axes[0][0]);

    // 计算角度因子：评估布局的主要方向
    const angleFactor = Math.abs(Math.cos(2 * angle)); // 对称性更好的角度得分更高

    // 计算惯性矩比例因子：评估质量分布的均匀性
    const [m1, m2] = inertia.moments;
    const momentRatio = Math.min(m1, m2) / Math.max(m1, m2);
    const momentFactor = Math.pow(momentRatio, 0.3); // 使用更平缓的曲线

    // 计算旋转对称性：通过主轴的正交性评估
    const orthogonalityFactor = Math.abs(
      inertia.axes[0][0] * inertia.axes[1][0] +
      inertia.axes[0][1] * inertia.axes[1][1]
    );
    const symmetryFactor = 1 - orthogonalityFactor;

    // 综合各个因子，给予不同权重
    return angleFactor * 0.4 + momentFactor * 0.4 + symmetryFactor * 0.2;
  }

  private getLayoutBounds(
    input: MassElement[] | Record<number, Rectangle>
  ): { width: number; length: number } {
    if (Array.isArray(input)) {
      // 处理 MassElement[] 类型
      if (input.length === 0) {
        return { width: 0, length: 0 };
      }

      const xs = input.map(e => e.x);
      const ys = input.map(e => e.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        width: maxX - minX,
        length: maxY - minY
      };
    } else {
      // 处理 Record<number, Rectangle> 类型
      const rectangles = Object.values(input);
      if (rectangles.length === 0) {
        return { width: 0, length: 0 };
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      rectangles.forEach((rect) => {
        minX = Math.min(minX, rect.x);
        minY = Math.min(minY, rect.y);
        maxX = Math.max(maxX, rect.x + rect.width);
        maxY = Math.max(maxY, rect.y + rect.length);
      });

      return {
        width: maxX - minX,
        length: maxY - minY
      };
    }
  }

  private calculateCenterDeviationScore(
    center: Point2D,
    layout: Record<number, Rectangle>,
    patterns: {
      isGradient: boolean;
      gradientQuality: number;
      isHierarchical: boolean;
      hierarchyQuality: number;
      isAligned: boolean;
      alignmentQuality: number;
    },
  ): number {
    // 获取布局边界
    const rectangles = Object.values(layout);
    if (rectangles.length === 0) return 100;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rectangles.forEach((rect) => {
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.length);
    });

    const maxDimension = Math.max(maxX - minX, maxY - minY);
    if (maxDimension === 0) return 100;

    // Calculate layout center
    const layoutCenterX = (maxX + minX) / 2;
    const layoutCenterY = (maxY + minY) / 2;

    // Calculate weighted center deviation with pattern-specific adjustments
    let totalWeight = 0;
    let weightedDeviation = 0;

    // Calculate total area and average radius with pattern adjustments
    const totalArea = rectangles.reduce(
      (sum, rect) => sum + rect.width * rect.length,
      0,
    );

    let avgRadius = 0;
    rectangles.forEach((rect) => {
      const rectCenterX = rect.x + rect.width / 2;
      const rectCenterY = rect.y + rect.length / 2;
      const radius = Math.sqrt(
        Math.pow(rectCenterX - layoutCenterX, 2) +
          Math.pow(rectCenterY - layoutCenterY, 2),
      );
      avgRadius += radius;
    });
    avgRadius /= rectangles.length || 1;

    // Apply pattern-specific radius adjustments
    let adjustedAvgRadius = avgRadius;
    if (patterns.isGradient) {
      adjustedAvgRadius *= 0.8 + patterns.gradientQuality * 0.2;
    } else if (patterns.isHierarchical) {
      adjustedAvgRadius *= 0.7 + patterns.hierarchyQuality * 0.3;
    }

    rectangles.forEach((rect) => {
      const rectCenterX = rect.x + rect.width / 2;
      const rectCenterY = rect.y + rect.length / 2;
      const rectArea = rect.width * rect.length;

      // Calculate deviation with pattern-specific tolerance
      const deviation = Math.sqrt(
        Math.pow(rectCenterX - layoutCenterX, 2) +
          Math.pow(rectCenterY - layoutCenterY, 2),
      );

      // Apply pattern-specific weight adjustments
      let weight = totalArea > 0 ? rectArea / totalArea : 1;
      if (patterns.isGradient) {
        // Reduce weight for gradient layouts
        weight *= 0.7 + patterns.gradientQuality * 0.3;
      } else if (patterns.isHierarchical) {
        // Reduce weight for hierarchical layouts
        weight *= 0.6 + patterns.hierarchyQuality * 0.4;
      }

      weightedDeviation += weight * Math.max(0, deviation - adjustedAvgRadius);
      totalWeight += weight;
    });

    if (totalWeight === 0) return 100;

    // Calculate normalized score with pattern-specific scaling
    let score = 100 * (1 - weightedDeviation / (maxDimension * totalWeight));

    // Apply pattern-specific adjustments
    if (patterns.isGradient) {
      score = Math.max(65, score * (1 + patterns.gradientQuality * 0.3));
    } else if (patterns.isHierarchical) {
      score = Math.max(65, score * (1 + patterns.hierarchyQuality * 0.3));
    }
    if (patterns.isAligned) {
      score *= 1 + patterns.alignmentQuality * 0.2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private detectGradientPattern(
    layout: Record<number, Rectangle>,
    products: Product[],
  ): { isGradient: boolean; gradientQuality: number } {
    // 计算所有区域并按大小排序
    const areas = products
      .map((p) => {
        const rect = layout[p.id];
        if (!rect) return null;
        return {
          area: rect.width * rect.length,
          index: products.indexOf(p),
          x: rect.x,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.area - a.area);

    if (areas.length === 0) {
      return { isGradient: false, gradientQuality: 0 };
    }

    // 检测空间位置的渐变性
    const spatialGradient = this.checkSpatialGradient(areas);

    // 计算面积比率
    let totalRatio = 0;
    let validSteps = 0;
    let consecutiveValid = 0;
    let maxConsecutiveValid = 0;

    // 同时考虑递增和递减序列
    const ratios: number[] = [];
    for (let i = 1; i < areas.length; i++) {
      const ratio = (areas[i]?.area ?? 0) / (areas[i - 1]?.area ?? 1);
      ratios.push(ratio);

      // 放宽比率范围，更容易识别渐变模式
      if (ratio >= 0.2 && ratio <= 0.95) {
        totalRatio += ratio;
        validSteps++;
        consecutiveValid++;
        maxConsecutiveValid = Math.max(maxConsecutiveValid, consecutiveValid);
      } else {
        consecutiveValid = 0;
      }
    }

    // 检查是否存在分段渐变
    const hasSegmentedGradient =
      maxConsecutiveValid >= Math.ceil(areas.length * 0.5);

    // 计算渐变方向的一致性
    const directionConsistency = this.calculateDirectionConsistency(ratios);

    // 综合评估渐变特性
    const isGradient =
      hasSegmentedGradient ||
      validSteps >= (areas.length - 1) * 0.6 ||
      (spatialGradient && validSteps >= (areas.length - 1) * 0.5);

    // 优化渐变质量计算
    let gradientQuality = 0;
    if (isGradient && validSteps > 0) {
      // 基础质量分数
      const avgRatio = totalRatio / validSteps;
      const baseQuality = 1 - Math.abs(avgRatio - 0.65) / 0.45;

      // 方向一致性分数
      const directionQuality = directionConsistency;

      // 空间分布分数
      const spatialQuality = spatialGradient ? 1 : 0.7;

      // 综合质量评分
      gradientQuality =
        baseQuality * 0.4 + directionQuality * 0.3 + spatialQuality * 0.3;

      // 确保最低质量
      gradientQuality = Math.max(0.65, gradientQuality);
    }

    return { isGradient, gradientQuality };
  }

  // 检查空间位置的渐变性
  private checkSpatialGradient(areas: { area: number; x: number }[]): boolean {
    // 检查x坐标是否大致呈现渐变趋势
    const xPositions = areas.map((a) => a.x);
    let increasingCount = 0;
    let decreasingCount = 0;

    for (let i = 1; i < xPositions.length; i++) {
      const currentPos = xPositions[i] ?? 0;
      const previousPos = xPositions[i - 1] ?? 0;

      if (currentPos > previousPos) {
        increasingCount++;
      } else if (currentPos < previousPos) {
        decreasingCount++;
      }
    }

    const totalComparisons = xPositions.length - 1;
    return (
      increasingCount >= totalComparisons * 0.6 ||
      decreasingCount >= totalComparisons * 0.6
    );
  }

  // 计算渐变方向的一致性
  private calculateDirectionConsistency(ratios: number[]): number {
    if (ratios.length === 0) return 0;

    let increasingCount = 0;
    let decreasingCount = 0;

    for (let i = 1; i < ratios.length; i++) {
      const currentRatio = ratios[i] ?? 0;
      const previousRatio = ratios[i - 1] ?? 0;

      if (currentRatio > previousRatio) {
        increasingCount++;
      } else if (currentRatio < previousRatio) {
        decreasingCount++;
      }
    }

    const maxDirection = Math.max(increasingCount, decreasingCount);
    return maxDirection / (ratios.length - 1);
  }

  private detectHierarchicalPattern(layout: Record<number, Rectangle>): {
    isHierarchical: boolean;
    hierarchyQuality: number;
  } {
    const rectangles = Object.values(layout);
    if (rectangles.length === 0) {
      return { isHierarchical: false, hierarchyQuality: 0 };
    }

    const yPositions = Array.from(new Set(rectangles.map((r) => r.y))).sort(
      (a, b) => a - b,
    );

    const levelCount = yPositions.length;
    const rectangleCount = rectangles.length;
    const isHierarchical = levelCount >= 2 && levelCount <= rectangleCount / 2;

    if (!isHierarchical) {
      return { isHierarchical: false, hierarchyQuality: 0 };
    }

    // Calculate level distribution quality
    const levelSizes = yPositions.map(
      (y) => rectangles.filter((r) => r.y === y).length,
    );

    if (levelSizes.length <= 1) {
      return { isHierarchical: false, hierarchyQuality: 0 };
    }

    let qualityScore = 0;
    for (let i = 1; i < levelSizes.length; i++) {
      const currentSize = levelSizes[i] ?? 0;
      const previousSize = levelSizes[i - 1] ?? 0;
      const ratio = currentSize / previousSize;
      // Prefer ratios between 0.4 and 0.6 (ideal hierarchy)
      if (ratio >= 0.4 && ratio <= 0.6) {
        qualityScore++;
      }
    }

    const hierarchyQuality = qualityScore / (levelSizes.length - 1);

    return { isHierarchical, hierarchyQuality };
  }

  private detectAlignmentPattern(layout: Record<number, Rectangle>): {
    isAligned: boolean;
    alignmentQuality: number;
  } {
    const rectangles = Object.values(layout);
    if (rectangles.length === 0) {
      return { isAligned: false, alignmentQuality: 0 };
    }

    // Check horizontal alignment
    const yPositions = new Set(rectangles.map((r) => r.y + r.length / 2));
    const horizontallyAligned = yPositions.size <= rectangles.length / 2;

    // Check vertical alignment
    const xPositions = new Set(rectangles.map((r) => r.x + r.width / 2));
    const verticallyAligned = xPositions.size <= rectangles.length / 2;

    const isAligned = horizontallyAligned || verticallyAligned;

    if (!isAligned) {
      return { isAligned: false, alignmentQuality: 0 };
    }

    // Calculate alignment quality
    let alignmentQuality = 0;
    if (horizontallyAligned) {
      const positions = Array.from(yPositions);
      if (positions.length > 1) {
        const avgSpacing =
          positions.reduce(
            (sum, pos, i, arr) =>
              i > 0 ? sum + Math.abs(pos - (arr[i - 1] ?? 0)) : sum,
            0,
          ) /
          (positions.length - 1);

        const variance =
          positions.reduce(
            (sum, pos, i, arr) =>
              i > 0
                ? sum +
                  Math.pow(Math.abs(pos - (arr[i - 1] ?? 0)) - avgSpacing, 2)
                : sum,
            0,
          ) /
          (positions.length - 1);

        alignmentQuality =
          1 - Math.min(1, variance / (avgSpacing * avgSpacing));
      }
    } else {
      const positions = Array.from(xPositions);
      if (positions.length > 1) {
        const avgSpacing =
          positions.reduce(
            (sum, pos, i, arr) =>
              i > 0 ? sum + Math.abs(pos - (arr[i - 1] ?? 0)) : sum,
            0,
          ) /
          (positions.length - 1);

        const variance =
          positions.reduce(
            (sum, pos, i, arr) =>
              i > 0
                ? sum +
                  Math.pow(Math.abs(pos - (arr[i - 1] ?? 0)) - avgSpacing, 2)
                : sum,
            0,
          ) /
          (positions.length - 1);

        alignmentQuality =
          1 - Math.min(1, variance / (avgSpacing * avgSpacing));
      }
    }

    return { isAligned, alignmentQuality };
  }

  // 辅助函数：检测垂直主导布局
  private isVerticallyDominant(elements: MassElement[]): boolean {
    const ySpread =
      Math.max(...elements.map((e) => e.y)) -
      Math.min(...elements.map((e) => e.y));
    const xSpread =
      Math.max(...elements.map((e) => e.x)) -
      Math.min(...elements.map((e) => e.x));
    return ySpread > xSpread * 1.5;
  }

  // 辅助函数：检测水平主导布局
  private isHorizontallyDominant(elements: MassElement[]): boolean {
    const ySpread =
      Math.max(...elements.map((e) => e.y)) -
      Math.min(...elements.map((e) => e.y));
    const xSpread =
      Math.max(...elements.map((e) => e.x)) -
      Math.min(...elements.map((e) => e.x));
    return xSpread > ySpread * 1.5;
  }

  // 辅助函数：检测尺寸渐变
  private hasSizeGradient(elements: MassElement[]): boolean {
    const areas = elements.map((e) => e.width * e.length).sort((a, b) => b - a);
    for (let i = 1; i < areas.length; i++) {
      const currentArea = areas[i] ?? 0;
      const previousArea = areas[i - 1] ?? 0;
      const ratio = currentArea / previousArea;
      if (ratio < 0.3 || ratio > 0.9) return false;
    }
    return true;
  }

  private calculateMassDistribution(elements: MassElement[]): {
    continuity: number;
    uniformity: number;
  } {
    if (elements.length <= 1) {
      return { continuity: 1, uniformity: 1 };
    }

    // 计算相邻元素之间的质量变化
    let totalMassChange = 0;
    let maxMassChange = 0;
    const sortedElements = [...elements].sort(
      (a, b) =>
        Math.sqrt(a.x * a.x + a.y * a.y) - Math.sqrt(b.x * b.x + b.y * b.y),
    );

    for (let i = 1; i < sortedElements.length; i++) {
      const massChange = Math.abs(
        (sortedElements[i]?.mass ?? 0) - (sortedElements[i - 1]?.mass ?? 0),
      );
      totalMassChange += massChange;
      maxMassChange = Math.max(maxMassChange, massChange);
    }

    // 计算连续性（质量变化的平滑程度）
    const avgMassChange = totalMassChange / (elements.length - 1);
    const continuity = 1 - avgMassChange / (maxMassChange + 1);

    // 计算均匀性（质量分布的均匀程度）
    const avgMass =
      elements.reduce((sum, e) => sum + e.mass, 0) / elements.length;
    const massVariance =
      elements.reduce((sum, e) => sum + Math.pow(e.mass - avgMass, 2), 0) /
      elements.length;
    const uniformity = 1 / (1 + massVariance / (avgMass * avgMass));

    return { continuity, uniformity };
  }
}
