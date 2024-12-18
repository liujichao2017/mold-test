"use client";

import { useState } from "react";
import { BalanceAnalyzer } from "@/components/score-visualizer/BalanceAnalyzer";
import { ProductViewer } from "@/components/viewers/ProductViewer";
// import { generateRandomProducts } from "@/lib/utils/product-generator";
import { calculateMinArea } from "@/lib/algorithm/min-area";
import { calculateInjectionPoint } from "@/lib/algorithm/balance/utils/geometry";
import type { Rectangle, Rectangle2D } from "@/types/core/geometry";
import type { Product } from "@/types/domain/product";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// import { getMoldPrice,  getProductPriceByGroup } from "@/actions/mold-price";
import { useMoldStore } from "@/stores/useMoldStore";
// import { MoldDetails } from "@/components/MoldDetails";
import { calculateProductGroupSchemas } from "@/lib/algorithm/product-group";
// import { GroupedProductDetails } from "@/components/GroupedProductDetails";
import type { groupedProductsSchemas } from "@/lib/validations/mold-calculator";
import { ProductGroupSchemas } from "@/components/ProductGroupSchemas";
// import { a } from "vitest/dist/suite-IbNSsUWN.js";
import { ProductInputForm } from "@/components/ProductInputForm";

const scoreTooltips = {
  geometry: {
    title: "几何平衡分数",
    description:
      "评估产品在模具中的几何分布是否均匀。高分表示产品布局对称、重心分布合理，这有助于：\n• 模具填充时的压力均衡\n• 减少模具变形风险\n• 提高产品质量稳定性",
  },
  flow: {
    title: "流动平衡分数",
    description:
      "评估熔融材料从注塑点到各产品的流动路径是否均衡。高分表示流长相近，这有助于：\n• 保证各产品填充同步性\n• 减少翘曲和缩水\n• 提高尺寸精度",
  },
  distribution: {
    title: "分布平衡分数",
    description:
      "评估产品在模具中的整体分布状况。高分表示产品排布紧凑、间距合理，这有助于：\n• 优化冷却效果\n• 减少模具尺寸\n• 提高生产效率",
  },
};

export default function BalanceVisualizerPage() {
  // const [productCount, setProductCount] = useState<number>(4);
  const [products, setProducts] = useState<Product[]>([]);
  const [layout, setLayout] = useState<Rectangle[] | null>(null);
  // const [identical, setIdentical] = useState<boolean>(false);
  // const [productPriceGroupedResult, setProductPriceGroupedResult] = useState<ProductPriceGroup[]>([]);
  // const { setMoldMaterial, setMoldWeight, setMoldPrice, setMoldDimensions, setError, setEdgeMargin } = useMoldStore();
  const { setError } = useMoldStore();
  // const { edgeMargin, bottomMargin } = useMoldStore();
  const [productGroupSchemas, setProductGroupSchemas] = useState<groupedProductsSchemas>([]);
  const [allowDifferentColors] = useState<boolean>(false);
  const [allowDifferentMaterials] = useState<boolean>(false);

  // 生成新的随机产品并计算布局
  const handleGenerateProducts = async (newProducts: Product[], moldMaterial: string) => {
    try {
      const rectangles: Rectangle2D[] = newProducts.map((product) => ({
        width: product.dimensions?.width ?? 0,
        length: product.dimensions?.length ?? 0,
      }));

      // 2. 计算最小面积布局
      const layoutResult = calculateMinArea(rectangles);

      // 3. 将布局结果转换为 Rectangle 数组，保留originalIndex信息
      const transformedLayout = layoutResult.layout.map(
        (rect, index): Rectangle => ({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          length: rect.length,
          // 使用数组索引作为originalIndex
          id: newProducts[index]?.id,
        }),
      );

      // 仅在开发环境下输出关键调试信息
      if (process.env.NODE_ENV === 'development') {
        console.log("handleGenerateProducts - Layout Result:", {
          layout: transformedLayout,
          productCount: newProducts.length,
        });
      }

      const productGroupSchemas = calculateProductGroupSchemas(newProducts.map((p) => ({
        // 基本尺寸属性
        length: p.dimensions?.length ?? 0,
        width: p.dimensions?.width ?? 0,
        height: p.dimensions?.height ?? 0,

        // 体积和材料属性
        volume: p.volume ?? 0,
        material: p.materialName ?? '',
        density: p.density ?? 0,

        // 产品基本信息
        quantity: p.quantity ?? 0,
        color: p.color ?? '',
        name: p.name ?? '',
        id: p.id ?? 0,
        // CAD 相关数据
        cadData: {
          boundingBox: {
            center: { 
              x: p.cadData?.boundingBox?.center?.x ?? 0, 
              y: p.cadData?.boundingBox?.center?.y ?? 0, 
              z: p.cadData?.boundingBox?.center?.z ?? 0 
            },
            dimensions: {
              x: p.cadData?.boundingBox?.dimensions?.x ?? 0,
              y: p.cadData?.boundingBox?.dimensions?.y ?? 0,
              z: p.cadData?.boundingBox?.dimensions?.z ?? 0
            }
          },
          volume: p.cadData?.volume ?? 0,
          surfaceArea: p.cadData?.surfaceArea ?? 0,
          centerOfMass: p.cadData?.centerOfMass ?? { x: 0, y: 0, z: 0 },
          topology: p.cadData?.topology,
          features: p.cadData?.features,
          momentOfInertia: p.cadData?.momentOfInertia,
          format: p.cadData?.format,
          version: p.cadData?.version,
          lastModified: p.cadData?.lastModified
        }

      })), allowDifferentColors, allowDifferentMaterials, moldMaterial);

      setProductGroupSchemas(await productGroupSchemas);
      setProducts(newProducts);
      setLayout(transformedLayout);
    } catch (error) {
      console.error('Error generating products:', error);
      if (error instanceof Error) {
        setError(error.message ?? '生成产品布局失败');
      } else {
        setError('生成产品布局失败');
      }
    }
  };

  const handleSchemaChange = async (selectedSchema: groupedProductsSchemas[number]) => {
    // console.log("Selected schema in parent:", selectedSchema);
    // TODO: 在这里添加其他需要的处理逻辑
    // 例如：更新状态、调用API、触发其他计算等



    // 1. 将产品转换为 Rectangle2D 数组
    // const rectangles: Rectangle2D[] = newProducts.map((product) => ({
    //   width: product.dimensions?.width ?? 0,
    //   length: product.dimensions?.length ?? 0,
    // }));

    // // 2. 计算最小面积布局
    // const layoutResult = calculateMinArea(rectangles);
    // // TODO: 紧急且重要
    // // 根据布局的长宽，计算出模具的边缘间距
    // const moldEdgeMargin = await calculateEdgeMargin(
    //   layoutResult.length,
    //   layoutResult.width,
    // );
    // // 根据Product最大高度计算模具底部间距
    // const maxProductHeight = Math.max(...newProducts.map((p) => p.dimensions?.height ?? 0));
    // const moldBottomMargin = await calculateBottomMargin(maxProductHeight);


    // // const moldBottomMargin = await calculateBottomMargin(
    // //   Math.max(...newProducts.map((p) => p.dimensions?.height ?? 0)),
    // // );
    // // 生成临时的随机模具材料、密度和单位价格
    // const randomMold = getRandomMold();
    // // 此时，有了产品的总体积，模具的总体积以及模具的边缘间距和底部间距，可以计算出模具的重量
    // const moldWeight = calculateMoldWeight(
    //   layoutResult.length,
    //   layoutResult.width,
    //   moldBottomMargin,
    //   moldEdgeMargin,
    // );
    // // 模具的总价格也能计算出来
    // const moldPriceResult = await getMoldPrice(
    //   randomMold?.name ?? 'NAK80',
    //   moldWeight
    // );
    // // 以上信息，都应该通过zustand管理起来
    // // console.log("moldTotalPrice:",moldPriceResult);
    // if(moldPriceResult.success) { 
    //   setMoldDimensions({
    //     length: layoutResult.length + moldEdgeMargin * 2,
    //     width: layoutResult.width + moldEdgeMargin * 2,
    //     height: moldBottomMargin,
    //   });
    //   setEdgeMargin(moldEdgeMargin);
    //   setMoldMaterial(randomMold?.name ?? 'NAK80');
    //   setMoldWeight(moldWeight);
    //   setMoldPrice(moldPriceResult.data ?? 0);
    // } else {
    //   console.error('Error getting mold price:', moldPriceResult.message);
    //   setError(moldPriceResult.message ?? '获取模具价格失败');
    // }
    // const moldDimensions = {
    //   length: layoutResult.length + moldEdgeMargin * 2,
    //   width: layoutResult.width + moldEdgeMargin * 2,
    //   height: moldBottomMargin,
    //   moldMaterial: randomMold?.name ?? 'NAK80',
    //   moldWeight: moldWeight,
    //   moldPrice: moldPriceResult.data ?? 0,
    //   maxInnerLength: layoutResult.length,
    //   maxInnerWidth: layoutResult.width,
    //   verticalMargin: moldEdgeMargin,
    //   horizontalMargin: moldEdgeMargin,
    // };
    
    // 将 selectedSchema 转换为 groupedProducts 类型
    // const convertedGroups: groupedProducts = selectedSchema.groups.map(groupWithScore => 
    //   groupWithScore.group.map(product => ({
    //     length: product.length,
    //     width: product.width,
    //     height: product.height,
    //     volume: product.volume,
    //     material: product.material,
    //     quantity: product.quantity,
    //     color: product.color,
    //     density: product.density
    //   }))
    // );

    // console.log("Converted groups:", convertedGroups);
    // const productPriceGroupedResult = await getProductPriceByGroup(moldDimensions, convertedGroups);
    // if(productPriceGroupedResult.success) {
    //   setProductPriceGroupedResult(productPriceGroupedResult.data ?? []);
    // } else {
    //   console.error('Error getting product price by group:', productPriceGroupedResult.message);
    //   setError(productPriceGroupedResult.message ?? '获取产品价格分组失败');
    // }
    
    
  };

  // const handleCalculateGroup = async (groupProducts: groupedProductsSchemas[number]['groups'][number]) => {
    
  //   console.log("Group:", groupProducts);
  //   try {

  //     // 1. 将产品转换为 Rectangle2D 数组
  //   const rectangles: Rectangle2D[] = groupProducts.group.map((product) => ({
  //     width: product.width ?? 0,
  //     length: product.length ?? 0,
  //   }));

  //   // 2. 计算最小面积布局
  //   const layoutResult = calculateMinArea(rectangles);
  //   // TODO: 紧急且重要
  //   // 根据布局的长宽，计算出模具的边缘间距
  //   const moldEdgeMargin = await calculateEdgeMargin(
  //     layoutResult.length,
  //     layoutResult.width,
  //   );
  //   // 根据Product最大高度计算模具底部间距
  //   const maxProductHeight = Math.max(...groupProducts.group.map((p) => p.height ?? 0));
  //   const moldBottomMargin = await calculateBottomMargin(maxProductHeight);


  //   // const moldBottomMargin = await calculateBottomMargin(
  //   //   Math.max(...newProducts.map((p) => p.dimensions?.height ?? 0)),
  //   // );
  //   // 生成临时的随机模具材料、密度和单位价格
  //   const randomMold = getRandomMold();
  //   // 此时，有了产品的总体积，模具的总体积以及模具的边缘间距和底部间距，可以计算出模具的重量
  //   const moldWeight = calculateMoldWeight(
  //     layoutResult.length,
  //     layoutResult.width,
  //     moldBottomMargin,
  //     moldEdgeMargin,
  //   );
  //   // 模具的总价格也能计算出来
  //   const moldPriceResult = await getMoldPrice(
  //     randomMold?.name ?? 'NAK80',
  //     moldWeight
  //   );
  //   // 以上信息，都应该通过zustand管理起来
  //   // console.log("moldTotalPrice:",moldPriceResult);
  //   if(moldPriceResult.success) { 
  //     setMoldDimensions({
  //       length: layoutResult.length + moldEdgeMargin * 2,
  //       width: layoutResult.width + moldEdgeMargin * 2,
  //       height: moldBottomMargin,
  //     });
  //     setEdgeMargin(moldEdgeMargin);
  //     setMoldMaterial(randomMold?.name ?? 'NAK80');
  //     setMoldWeight(moldWeight);
  //     setMoldPrice(moldPriceResult.data ?? 0);
  //   } else {
  //     console.error('Error getting mold price:', moldPriceResult.message);
  //     setError(moldPriceResult.message ?? '获取模具价格失败');
  //   }
  //   const moldDimensions = {
  //     length: layoutResult.length + moldEdgeMargin * 2,
  //     width: layoutResult.width + moldEdgeMargin * 2,
  //     height: moldBottomMargin,
  //     moldMaterial: randomMold?.name ?? 'NAK80',
  //     moldWeight: moldWeight,
  //     moldPrice: moldPriceResult.data ?? 0,
  //     maxInnerLength: layoutResult.length,
  //     maxInnerWidth: layoutResult.width,
  //     verticalMargin: moldEdgeMargin,
  //     horizontalMargin: moldEdgeMargin,
  //   };

  //     // 将单个组转换为 groupedProducts 类型
  //     const convertedGroup: groupedProducts = [
  //       groupProducts.group.map(product => ({
  //         length: product.length,
  //         width: product.width,
  //         height: product.height,
  //         volume: product.volume,
  //         material: product.material,
  //         quantity: product.quantity,
  //         color: product.color,
  //         density: product.density,
  //         cadData: product.cadData,
  //         name: product.name,
  //         id: product.id,
  //       }))
  //     ];

  //     console.log("Converted group:", convertedGroup);
  //     const productPriceGroupedResult = await getProductPriceByGroup(moldDimensions, convertedGroup);
  //     if(productPriceGroupedResult.success) {
  //       return productPriceGroupedResult.data ?? [];
  //     } else {
  //       console.error('Error getting product price by group:', productPriceGroupedResult.message);
  //       setError(productPriceGroupedResult.message ?? '获取产品价格分组失败');
  //       return [];
  //     }
  //   } catch (error) {
  //     console.error('Error calculating group:', error);
  //     setError('计算分组失败');
  //     return [];
  //   }
  // };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-2 text-2xl font-bold">模具布局平衡分析</h1>
          <p className="mb-8 text-gray-600">
            通过几何平衡、流动分析和分布平衡多个维度评估模具布局的合理性
          </p>

          {/* 产品数量和产品组配置 */}
          {/* <div className="flex items-center gap-4 mb-4">
            <input
              type="number"
              min="1"
              max="10"
              value={productCount}
              onChange={(e) =>
                setProductCount(
                  Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                )
              }
              className="w-16 rounded border px-2 py-1"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={identical}
                onChange={(e) => setIdentical(e.target.checked)}
                className="h-4 w-4"
              />
              <span>相同产品</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowDifferentColors}
                onChange={(e) => setAllowDifferentColors(e.target.checked)}
                className="h-4 w-4"
              />
              <span>允许不同颜色同组</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowDifferentMaterials}
                onChange={(e) => setAllowDifferentMaterials(e.target.checked)}
                className="h-4 w-4"
              />
              <span>允许不同材料同组</span>
            </label>
            <button
              onClick={handleGenerateProducts}
              className="rounded bg-blue-500 px-4 py-1 text-white hover:bg-blue-600"
            >
              随机生成
            </button>
            
          </div> */}

          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">产品信息输入</h2>
            <ProductInputForm onSubmit={handleGenerateProducts} />
          </div>

          {/* 产品布局视图 */}
          {products.length > 0 && layout &&  productGroupSchemas.length > 0 && (
            <>
              <ProductGroupSchemas 
                schemas={productGroupSchemas} 
                onSchemaChange={handleSchemaChange}
                // onCalculateGroup={handleCalculateGroup}
              />
              {/* <MoldDetails productPriceGroups={productPriceGroupedResult} />
              
              <GroupedProductDetails groupedProducts={productPriceGroupedResult} /> */}
              
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">产品布局</h2>
                <ProductViewer products={products} layout={layout} />
              </div>
            </>
          )}

          {/* 布局分析区域 */}
          <div className="container mx-auto py-8">
            {products.length > 0 && layout ? (
              <TooltipProvider>
                <BalanceAnalyzer
                  products={products}
                  layout={layout}
                  injectionPoint={calculateInjectionPoint(layout)}
                  renderScore={(type, score) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{score.toFixed(1)}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <div className="space-y-2">
                          <h3 className="font-semibold">
                            {scoreTooltips[type]?.title}
                          </h3>
                          <p className="whitespace-pre-line text-sm">
                            {scoreTooltips[type]?.description}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                />
              </TooltipProvider>
            ) : (
              <div className="text-center text-gray-500">
                请先输入产品信息后，再进行布局分析
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
