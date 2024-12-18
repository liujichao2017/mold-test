import { describe, expect, test } from "vitest";
import { calculateDistributionScore } from "../index";
import type { Rectangle } from "@/types/core/geometry";
import type { Product, Dimensions3D } from "@/types/domain/product";
import { calculateMinArea } from "@/lib/algorithm/min-area";

describe("分布平衡总分测试", () => {
  // 产品尺寸常量
  const SIZES = {
    MEDIUM: { length: 100, width: 100, height: 50 } as Dimensions3D,
  } as const;

  // 辅助函数：创建带尺寸的产品
  function createSizedProduct(
    id: number,
    weight: number,
    dimensions: Dimensions3D,
  ): Product {
    return {
      id,
      name: `产品${id}`,
      weight,
      dimensions,
    };
  }

  test("完美对称布局：4个相同产品呈正方形分布", () => {
    // 创建4个完全相同的产品
    const products = Array.from({ length: 4 }, (_, i) =>
      createSizedProduct(i + 1, 100, SIZES.MEDIUM)
    );

    // 获取最小面积布局并转换为Record形式
    const minAreaResult = calculateMinArea(
      products.map((p) => ({
        length: p.dimensions!.length,
        width: p.dimensions!.width,
      }))
    );

    // 转换布局格式为Record<number, Rectangle>
    const layout: Record<number, Rectangle> = {};
    minAreaResult.layout.forEach((rect, index) => {
      layout[products[index]!.id] = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        length: rect.length,
      };
    });

    const result = calculateDistributionScore(layout, products);

    // 输出详细分数以便分析
    console.log("Distribution Details:", {
      layout,
      result: {
        isotropy: result.details.isotropy,
        centerDeviation: result.details.centerDeviation,
        volumeBalance: result.details.volumeBalance,
        total: result.score,
      }
    });

    // 期望总分应该在80分以上
    expect(result.score).toBeGreaterThanOrEqual(80);

    // 期望物理分布分数应该很高（考虑到完美对称性）
    expect(result.details.isotropy).toBeGreaterThanOrEqual(90);
    expect(result.details.centerDeviation).toBeGreaterThanOrEqual(90);

    // 期望体积平衡分数应该是满分（因为所有产品完全相同）
    expect(result.details.volumeBalance.densityVariance).toBe(100);
    expect(result.details.volumeBalance.heightBalance).toBe(100);
    expect(result.details.volumeBalance.massDistribution).toBe(100);
    expect(result.details.volumeBalance.symmetry).toBe(100);
  });
});