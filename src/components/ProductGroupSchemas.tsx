import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Button } from '@/components/ui/button';
import { type MoldDimensions, type groupedProductsSchemas, type ProductPriceGroup } from '@/lib/validations/mold-calculator';
import { MoldDetails } from '@/components/MoldDetails';
import { GroupedProductDetails } from '@/components/GroupedProductDetails';
// import { type Rectangle2D } from '@/types/core/geometry';
// import { calculateBottomMargin, calculateEdgeMargin, calculateMinArea, calculateMoldWeight, getRandomMold } from '@/lib/algorithm/min-area';
// import { getMoldPrice, getProductPriceByGroup } from '@/actions/mold-price';
import { SchemaStats } from "@/components/SchemaStats";
// import { calculateProductGroup } from '@/lib/algorithm/product-group';
// import { calculateInjectionPoint } from '@/lib/algorithm/balance';
// import { useBalanceStore } from '@/stores/useBalanceStore';

interface ProductGroupSchemasProps {
  schemas: groupedProductsSchemas;
  onSchemaChange?: (schema: groupedProductsSchemas[number]) => void;
  // onCalculateGroup?: (group: groupedProductsSchemas[number]['groups'][number]) => void;
}

interface GroupResult {
  priceGroups: ProductPriceGroup[];
  moldDimensions: MoldDimensions;
}

const DEFAULT_MOLD_DIMENSIONS = {
  length: 0,
  width: 0,
  height: 0,
  moldMaterial: '',
  moldWeight: 0,
  moldPrice: 0,
  maxInnerLength: 0,
  maxInnerWidth: 0,
  verticalMargin: 0,
  horizontalMargin: 0
};

export function ProductGroupSchemas({ 
  schemas, 
  onSchemaChange,
  // onCalculateGroup 
}: ProductGroupSchemasProps) {
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('');
  const [, setGroupResults] = useState<Record<number, GroupResult>>({});
  // const { calculateScores, score } = useBalanceStore();


  useEffect(() => {
    if (schemas.length > 0) {
      setSelectedSchemaId(schemas[0]?.solutionsName ?? '');
      // Clear group results when schemas change (new products generated)
      setGroupResults({});
    }
  }, [schemas]);

  const selectedSchema = schemas.find(schema => schema.solutionsName === selectedSchemaId);

  useEffect(() => {
    if (selectedSchema) {
      // console.log("Selected Schema:", selectedSchema);
      // Clear group results when schema changes
      setGroupResults({});
      onSchemaChange?.(selectedSchema);
    }
  }, [selectedSchema, onSchemaChange]);

  // const handleCalculateGroup = async (groupWithScore: groupedProductsSchemas[number]['groups'][number], groupIndex: number) => {
  //   // onCalculateGroup?.(groupWithScore);
  //   try {
  //     // 1. 将产品转换为 Rectangle2D 数组
  //     const rectangles: Rectangle2D[] = groupWithScore.group.map((product) => ({
  //       width: product.width ?? 0,
  //       length: product.length ?? 0,
  //     }));

  //     // console.log("rectangles:", rectangles);

  //     // 2. 计算最小面积布局
  //     const layoutResult = calculateMinArea(rectangles);

  //     // console.log("layoutResult:", layoutResult);
  //     // TODO: 紧急且重要
  //     // 根据布局的长宽，计算模具的边缘间距
  //     const moldEdgeMargin = await calculateEdgeMargin(
  //       layoutResult.length,
  //       layoutResult.width,
  //     );
  //     // 根据Product最大高度计算模具底部间距
  //     const maxProductHeight = Math.max(...groupWithScore.group.map((p) => p.height ?? 0));
  //     const moldBottomMargin = await calculateBottomMargin(maxProductHeight);


  //     // const moldBottomMargin = await calculateBottomMargin(
  //     //   Math.max(...newProducts.map((p) => p.dimensions?.height ?? 0)),
  //     // );
  //     // 生成临时的随机模具材料、密度和单位价格
  //     const randomMold = getRandomMold();
  //     // 此时，有了产品的总体积，模具的体积以及模具的边缘间距和底部间距，可以计算出模具的重量
  //     const moldWeight = calculateMoldWeight(
  //       layoutResult.length,
  //       layoutResult.width,
  //       moldBottomMargin,
  //       moldEdgeMargin,
  //     );
  //     // 模具的总价格也能计算出来
  //     const moldPriceResult = await getMoldPrice(
  //       randomMold?.name ?? 'NAK80',
  //       moldWeight
  //     );
  //     // 以上信息，都应该通过zustand管理起来
      
  //     const convertedProducts = groupWithScore.group.map((product) => ({
  //       // 基本尺寸
  //       dimensions: {
  //         length: product.length ?? 0,
  //         width: product.width ?? 0,
  //         height: product.height ?? 0,
  //       },
  
  //       // 体积和材料属性
  //       volume: product.volume ?? 0,
  //       material: product.material ?? '',
  //       density: product.density ?? 0,
        
  //       // 产品基本信息
  //       quantity: product.quantity ?? 0,
  //       color: product.color ?? '',
  //       id: product.id ?? 0,
  //       name: product.name ?? '',

  //       // CAD 数据
  //       cadData: {
  //         boundingBox: {
  //           center: product.cadData.boundingBox.center,
  //           dimensions: product.cadData.boundingBox.dimensions,
  //           rotation: product.cadData.boundingBox.rotation,
  //         },
  //         volume: product.cadData.volume,
  //         surfaceArea: product.cadData.surfaceArea,
  //         centerOfMass: product.cadData.centerOfMass,
  //         topology: product.cadData.topology,
  //         features: product.cadData.features,
  //         momentOfInertia: product.cadData.momentOfInertia,
  //         format: product.cadData.format,
  //         version: product.cadData.version,
  //         lastModified: product.cadData.lastModified,
  //       },  
  //     }));

  //     const layout = layoutResult.layout;
  //     const injectionPoint = calculateInjectionPoint(layout);
  //     console.log("injectionPoint: ", injectionPoint);
  //     let groupScore = 0;
  //     if(convertedProducts.length > 1) {
  //       calculateScores(layout, convertedProducts, injectionPoint);
  //       console.log("group scores: ", score);
  //       groupScore = Number(score?.total ?? 0);
  //       groupWithScore.score = groupScore;
  //       // 更新组的分数
  //       // if (selectedSchema) {
  //       //   const updatedSchema = {
  //       //     ...selectedSchema,
  //       //     groups: selectedSchema.groups.map((group, idx) => 
  //       //       idx === groupIndex 
  //       //         ? { ...group, score: groupScore }
  //       //         : group
  //       //     )
  //       //   };
  //       //   onSchemaChange?.(updatedSchema);
  //       // }
  //     }
      

  //     const moldDimensions = {
  //       length: layoutResult.length + moldEdgeMargin * 2,
  //       width: layoutResult.width + moldEdgeMargin * 2,
  //       height: moldBottomMargin,
  //       moldMaterial: randomMold?.name ?? 'NAK80',
  //       moldWeight: moldWeight,
  //       moldPrice: moldPriceResult.data ?? 0,
  //       maxInnerLength: layoutResult.length,
  //       maxInnerWidth: layoutResult.width,
  //       verticalMargin: moldEdgeMargin,
  //       horizontalMargin: moldEdgeMargin,
  //     };

  //     const convertedGroup = calculateProductGroup(groupWithScore.group.map((p) => ({
  //       length: p?.length ?? 0,
  //       width: p?.width ?? 0,
  //       height: p?.height ?? 0,
  //       volume: p?.volume ?? 0,
  //       material: p?.material ?? '',
  //       quantity: p?.quantity ?? 0,
  //       color: p?.color ?? '',
  //       density: p.density ?? 0,
  //       name: p?.name ?? '',
  //       id: p?.id ?? 0,
  //       cadData: p?.cadData ?? {},
  //     })));

      
  //     console.log("convertedGroup:", convertedGroup);

  //     // 将单个组转换为 groupedProducts 类型
  //     // const convertedGroup: groupedProducts = [
  //     //   productGroupSchemas.groups.group.map(product => ({
  //     //     length: product.length,
  //     //     width: product.width,
  //     //     height: product.height,
  //     //     volume: product.volume,
  //     //     material: product.material,
  //     //     quantity: product.quantity,
  //     //     color: product.color,
  //     //     density: product.density
  //     //   }))
  //     // ];

  //     // console.log("Converted group:", convertedGroup);
  //     const productPriceGroupedResult = await getProductPriceByGroup(moldDimensions, convertedGroup);
      
  //     // console.log("groupResults:", groupResults);
  //     if(productPriceGroupedResult.success) {
  //       setGroupResults(prevResults => ({
  //         ...prevResults,
  //         [groupIndex]: {
  //           priceGroups: productPriceGroupedResult.data ?? [],
  //           moldDimensions: moldDimensions
  //         }
  //       }));
  //       return productPriceGroupedResult.data ?? [];
  //     } else {
  //       console.error('Error getting product price by group:', productPriceGroupedResult.message);
  //       return [];
  //     }
  //   } catch (error) {
  //     console.error('Error calculating group:', error);
  //     return [];
  //   }
  // };

  return (
    <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">产品分组方案</h2>
        <Select
          value={selectedSchemaId}
          onValueChange={setSelectedSchemaId}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="选择分组方案" />
          </SelectTrigger>
          <SelectContent>
            {schemas.map((schema) => (
              <SelectItem 
                key={schema.solutionsName} 
                value={schema.solutionsName}
              >
                {schema.solutionsName} 
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSchema && (
        <div className="space-y-8">
          
          <SchemaStats 
            totalMoldPrice={selectedSchema.totalMoldPrice}
            totalProductPrice={selectedSchema.totalProductPrice}
            totalPrice={selectedSchema.totalPrice}
            totalGroups={selectedSchema.groups.length} 
          />
          
          
          {selectedSchema.groups.map((groupWithScore, groupIndex) => (
            <div key={groupIndex} className="rounded-lg border bg-gray-50 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="font-medium text-gray-700">组 {groupIndex + 1}</span>
                  <span className="ml-4 text-blue-600">{groupWithScore.score > 0 ? `分数: ${groupWithScore.score.toFixed(0)}` : ''}</span>
                </div>
                {/* <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleCalculateGroup(groupWithScore, groupIndex)}
                >
                  计算此组
                </Button> */}
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 mb-6">
                {groupWithScore.group.map((product, productIndex) => (
                  <div key={productIndex} className="rounded bg-blue-50 p-3 text-sm">
                    <div className="mb-2 font-medium text-blue-700">产品 {productIndex + 1}</div>
                    <div>颜色: {product.color}</div>
                    <div>材料: {product.material}</div>
                    <div>尺寸: {product.length}×{product.width}×{product.height}</div>
                    <div>体积: {product.volume.toFixed(2)} mm³</div>
                    <div>密度: {product.density.toFixed(6)} </div>
                    <div>数量: {product.quantity}</div>
                  </div>
                ))}
              </div>

              {/* 显示该组的计算结果 */}
              <div className="mt-4 space-y-4 border-t pt-4">
                <MoldDetails 
                  productPriceGroups={groupWithScore.productsWithPrice ?? []} 
                  moldDimensions={groupWithScore.mold ?? DEFAULT_MOLD_DIMENSIONS} 
                />
                  <GroupedProductDetails 
                    groupedProducts={groupWithScore.productsWithPrice ?? []} 
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
