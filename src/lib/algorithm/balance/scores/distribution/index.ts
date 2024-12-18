import type { Rectangle } from "@/types/core/geometry";
import type { Product } from "@/types/domain/product";
import { PhysicsCalculator } from "./calculators/physics";
import { SpatialCalculator } from "./calculators/spatial";
import { VolumeCalculator } from "./calculators/volume";

export interface DetailedDistributionScore {
  score: number;
  details: {
    principalMoments: [number, number];
    principalAxes: [[number, number], [number, number]];
    gyrationRadius: number;
    isotropy: number;
    centerDeviation: number;
    volumeBalance: {
      densityVariance: number;
      heightBalance: number;
      massDistribution: number;
      symmetry: number;
    };
  };
}

interface InertiaResult {
  principalMoments: [number, number];
  principalAxes: [[number, number], [number, number]];
  gyrationRadius: number;
  isotropy: number;
  centerDeviation: number;
}

interface VolumeResult {
  score: number;
  details: {
    symmetry: number;
  };
}

export function calculateDistributionScore(
  layout: Record<number, Rectangle>,
  products: Product[],
): DetailedDistributionScore {
  // Handle empty case
  if (products.length === 0) {
    return {
      score: 100,
      details: {
        principalMoments: [0, 0],
        principalAxes: [
          [1, 0],
          [0, 1],
        ],
        gyrationRadius: 0,
        isotropy: 100,
        centerDeviation: 100,
        volumeBalance: {
          densityVariance: 100,
          heightBalance: 100,
          massDistribution: 100,
          symmetry: 100,
        },
      },
    };
  }

  // 仅在开发环境下输出关键调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log("calculateDistributionScore - Input:", {
      layoutKeys: Object.keys(layout),
      productCount: products.length,
    });
  }

  // Initialize calculators
  const physicsCalculator = new PhysicsCalculator();
  const volumeCalculator = new VolumeCalculator();
  const spatialCalculator = new SpatialCalculator();

  try {
    // Calculate physics scores
    const physicsResult = physicsCalculator.calculate(layout, products);

    // Calculate volume balance scores
    const volumeResult = volumeCalculator.calculate(layout, products);

    // Calculate spatial scores
    const spatialResult = spatialCalculator.calculate(layout, products);

    const physicalDetails = physicsCalculator.toScoreDetails(physicsResult);
    const volumeDetails = volumeResult;

    const layoutPatterns = detectLayoutPatterns(layout, products);
    const patternBonus = calculatePatternBonus(
      layoutPatterns,
      layout,
      products,
    );
    const weights = {
      physical: 0.3,
      spatial: 0.3,
      volume: 0.4,
    };
    const physicalScore = calculatePhysicalScore(
      physicalDetails,
      layoutPatterns,
    );

    const volumeScore = calculateVolumeScore(volumeDetails, layoutPatterns);

    const baseScore =
      physicalScore * weights.physical +
      spatialResult.uniformity * weights.spatial +
      volumeScore * weights.volume;

    // Apply bonuses
    const minScore = Math.min(
      physicalScore,
      spatialResult.uniformity,
      volumeScore,
    );
    const maxScore = Math.max(
      physicalScore,
      spatialResult.uniformity,
      volumeScore,
    );
    const balanceBonus = minScore > 70 && maxScore - minScore < 20 ? 5 : 0;

    // Apply pattern-specific bonuses
    const finalScore = Math.min(100, baseScore + balanceBonus + patternBonus);

    return {
      score: finalScore,
      details: {
        ...physicalDetails,
        volumeBalance: volumeDetails.details,
      },
    };
  } catch (error) {
    console.error("Error calculating distribution score:", error);
    return {
      score: 0,
      details: {
        principalMoments: [0, 0],
        principalAxes: [
          [1, 0],
          [0, 1],
        ],
        gyrationRadius: 0,
        isotropy: 0,
        centerDeviation: 100,
        volumeBalance: {
          densityVariance: 0,
          heightBalance: 0,
          massDistribution: 0,
          symmetry: 0,
        },
      },
    };
  }
}

// Helper function to detect layout patterns
function detectLayoutPatterns(
  layout: Record<number, Rectangle>,
  products: Product[],
): { isGradient: boolean; isHierarchical: boolean; quality: number } {
  const rectangles = Object.values(layout);
  const sizes = products.map((p) => p.dimensions?.width ?? 0);

  // Check for size gradient with improved quality measure
  const diffs = sizes
    .slice(1)
    .map((size, i) => Math.abs(size - (sizes[i] ?? size)) / (sizes[i] ?? size));
  const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
  const isGradient = diffs.every((diff) => diff <= 0.5);

  // Check for hierarchical structure with improved quality measure
  const yPositions = rectangles.map((r) => r.y);
  const uniqueLevels = new Set(yPositions);
  const levelCount = uniqueLevels.size;
  const isHierarchical = levelCount >= 2 && levelCount <= products.length / 2;

  // Calculate overall pattern quality
  const quality = isGradient
    ? 1 - avgDiff // For gradient: smoother transition = higher quality
    : isHierarchical
      ? Math.min(1, levelCount / 4) // For hierarchy: optimal levels = higher quality
      : 0;

  return { isGradient, isHierarchical, quality };
}

function calculatePhysicalScore(
  details: InertiaResult,
  patterns: { isGradient: boolean; isHierarchical: boolean; quality: number },
): number {
  let isotropyWeight = 0.7;
  let centerDeviationWeight = 0.3;

  // Adjust weights based on patterns and their quality
  if (patterns.isGradient) {
    const qualityFactor = patterns.quality;
    isotropyWeight = 0.8 * qualityFactor + 0.7 * (1 - qualityFactor);
    centerDeviationWeight = 1 - isotropyWeight;
  } else if (patterns.isHierarchical) {
    const qualityFactor = patterns.quality;
    isotropyWeight = 0.6 * qualityFactor + 0.7 * (1 - qualityFactor);
    centerDeviationWeight = 1 - isotropyWeight;
  }

  // Improved isotropy calculation
  const isotropyScore =
    details.isotropy > 80 ? details.isotropy : details.isotropy * 0.95; // Less penalty for moderate isotropy

  // Improved center deviation calculation
  const centerDeviationScore = Math.max(65, details.centerDeviation);

  return (
    isotropyScore * isotropyWeight +
    centerDeviationScore * centerDeviationWeight
  );
}

export function calculateVolumeScore(
  details: VolumeResult,
  patterns: { isGradient: boolean; isHierarchical: boolean; quality: number },
): number {
  let baseWeight = 0.7;
  let symmetryWeight = 0.3;

  // Adjust weights based on patterns and their quality
  if (patterns.isGradient) {
    const qualityFactor = patterns.quality;
    baseWeight = 0.8 * qualityFactor + 0.7 * (1 - qualityFactor);
    symmetryWeight = 1 - baseWeight;
  } else if (patterns.isHierarchical) {
    const qualityFactor = patterns.quality;
    baseWeight = 0.6 * qualityFactor + 0.7 * (1 - qualityFactor);
    symmetryWeight = 1 - baseWeight;
  }

  // Improved symmetry calculation
  const symmetryScore =
    details.details.symmetry > 75
      ? details.details.symmetry
      : details.details.symmetry * 0.95; // Less penalty for moderate symmetry

  // Improved base score calculation
  const baseScore = details.score > 80 ? details.score : details.score * 0.95; // Less penalty for moderate base score

  return baseScore * baseWeight + symmetryScore * symmetryWeight;
}

function calculatePatternBonus(
  patterns: { isGradient: boolean; isHierarchical: boolean; quality: number },
  layout: Record<number, Rectangle>,
  _products: Product[],
): number {
  let bonus = 0;

  if (patterns.isGradient) {
    // Improved gradient bonus calculation
    const qualityBonus = 20 * patterns.quality; // Up to 20 points for perfect gradient
    bonus += qualityBonus;

    // Additional bonus for consistent spacing
    const positions = Object.values(layout).map((r) => r.x);
    const spacings = positions
      .slice(1)
      .map((pos, i) => Math.abs(pos - (positions[i] ?? pos)));
    const avgSpacing =
      spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
    const spacingVariance =
      spacings.reduce((sum, s) => sum + Math.abs(s - avgSpacing), 0) /
      spacings.length;
    const spacingBonus = 5 * (1 - spacingVariance / avgSpacing); // Up to 5 points for consistent spacing
    bonus += spacingBonus;
  }

  if (patterns.isHierarchical) {
    // Improved hierarchy bonus calculation
    const qualityBonus = 20 * patterns.quality; // Up to 20 points for optimal hierarchy
    bonus += qualityBonus;

    // Additional bonus for symmetrical level arrangement
    const yPositions = Object.values(layout).map((r) => r.y);
    const levels = Array.from(new Set(yPositions));
    const levelCounts = levels.map(
      (y) => yPositions.filter((py) => py === y).length,
    );
    const maxLevelSize = Math.max(...levelCounts);
    const levelBalanceScore =
      levelCounts.reduce((sum, count) => sum + count / maxLevelSize, 0) /
      levelCounts.length;
    const levelBonus = 5 * levelBalanceScore; // Up to 5 points for balanced levels
    bonus += levelBonus;
  }

  return bonus;
}
