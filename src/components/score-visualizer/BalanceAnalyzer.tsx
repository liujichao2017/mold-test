"use client";
import React, { useEffect } from "react";
import { GeometryScoreVisualizer } from "./GeometryScoreVisualizer";
import { FlowScoreVisualizer } from "./FlowScoreVisualizer";
import { DistributionScoreVisualizer } from "./DistributionScoreVisualizer";
import { ScoreCard } from "../ScoreCard";
import { useBalanceStore } from "@/stores/useBalanceStore";
import type { Rectangle, Point2D } from "@/types/core/geometry";
import type { Product } from "@/types/domain/product";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BalanceAnalyzerProps {
  layout: Rectangle[];
  products: Product[];
  injectionPoint: Point2D;
  renderScore?: (
    type: "geometry" | "flow" | "distribution",
    score: number,
  ) => React.ReactNode;
}

/**
 * 布局平衡分析主组件
 * Main component for analyzing layout balance
 */
export const BalanceAnalyzer: React.FC<BalanceAnalyzerProps> = ({
  layout,
  products,
  injectionPoint,
}) => {
  const { calculateScores, score } = useBalanceStore();

  // Calculate scores when inputs change
  useEffect(() => {
    calculateScores(layout, products, injectionPoint);
  }, [layout, products, injectionPoint, calculateScores]);

  if (!score) {
    return null;
  }
  console.log("layout:", layout);
  console.log("score.details.distribution:", score.details.distribution);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <div className="flex h-full flex-col gap-4">
        {score && (
          <>
            <ScoreCard score={score} />
            <Tabs defaultValue="geometry" className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geometry">几何评分</TabsTrigger>
                <TabsTrigger value="flow">流动评分</TabsTrigger>
                <TabsTrigger value="distribution">分布评分</TabsTrigger>
              </TabsList>
              <TabsContent value="geometry" className="h-[calc(100vh-300px)]">
                <GeometryScoreVisualizer layout={layout} products={products} />
              </TabsContent>
              <TabsContent value="flow" className="h-[calc(100vh-300px)]">
                <FlowScoreVisualizer
                  layout={layout}
                  products={products}
                  injectionPoint={injectionPoint}
                />
              </TabsContent>
              <TabsContent
                value="distribution"
                className="h-[calc(100vh-300px)]"
              >
                <DistributionScoreVisualizer
                  layout={layout}
                  products={products}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};
