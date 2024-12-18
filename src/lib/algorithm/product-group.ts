import { type Rectangle2D } from "@/types/core/geometry";
import { type productGroup, type groupedProducts, type groupedProductsSchemas, type ProductGroupItem, type groupedProductsWithScoreItem } from "../validations/mold-calculator";
import { calculateBottomMargin, calculateEdgeMargin, calculateMinArea, calculateMoldWeight } from "./min-area";
import { getMoldPrice, getProductPriceByGroup } from "@/actions/mold-price";
import { calculateInjectionPoint, calculateBalanceScore } from "./balance";


export function calculateProductGroup(products: productGroup): groupedProducts {
  // 用 Map 存储分组，key 为 "color-material" 格式
  const groups = new Map<string, productGroup>();

  products.forEach(product => {
    const color = product.color ?? 'unknown';
    const material = product.material ?? 'unknown';
    const groupKey = `${color}-${material}`;

    const existingGroup = groups.get(groupKey);
    if (existingGroup) {
      // 如果已存在相同颜色和材料的组，将产品添加到该组
      existingGroup.push(product);
    } else {
      // 创建新组
      groups.set(groupKey, [product]);
    }
  });

  // 将 Map 转换为数组返回
  return Array.from(groups.values());
}


// Helper function to check if a product can be added to a group
function canAddToGroup(group: productGroup, product: ProductGroupItem, allowDifferentColors: boolean, allowDifferentMaterials: boolean): boolean {
  if (!group.length) return true;
  
  const referenceProduct = group[0];
  return (
    (allowDifferentColors || product.color === referenceProduct?.color) && 
    (allowDifferentMaterials || product.material === referenceProduct?.material)
  );
}

function calculateGroupScore(group: productGroup): number {
  // 如果组内只有一个产品，返回基础分数
  if (group.length === 1) return 100;
  
  // 计算组内产品的各项指标
  const products = group.map(product => ({
    volume: product.volume ?? 0,
    weight: (product.density ?? 0) * (product.volume ?? 0),
    height: product.height ?? 0
  }));

  // 计算各项指标的标准差
  // const volumeStd = calculateStandardDeviation(products.map(p => p.volume));
  // const weightStd = calculateStandardDeviation(products.map(p => p.weight));
  // const heightStd = calculateStandardDeviation(products.map(p => p.height));

  // 计算各项指标的变异系数 (CV = 标准差/平均值)
  const volumeCV = calculateCV(products.map(p => p.volume));
  const weightCV = calculateCV(products.map(p => p.weight));
  const heightCV = calculateCV(products.map(p => p.height));

  // 根据变异系数计算得分（变异系数越小，得分越高）
  const volumeScore = Math.max(0, 100 * (1 - volumeCV));
  const weightScore = Math.max(0, 100 * (1 - weightCV));
  const heightScore = Math.max(0, 100 * (1 - heightCV));

  // 计算最终得分（三项指标的加权平均）
  const finalScore = (
    volumeScore * 0.4 + // 体积占比40%
    weightScore * 0.4 + // 重量占比40%
    heightScore * 0.2   // 高度占比20%
  );

  // 确保分数在0-100之间
  return Math.max(0, Math.min(100, finalScore));
}

// 计算标准差的辅助函数
function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const mean = values.reduce((a, b) => a + b) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  return Math.sqrt(variance);
}

// 计算变异系数的辅助函数
function calculateCV(values: number[]): number {
  const mean = values.reduce((a, b) => a + b) / values.length;
  if (mean === 0) return 0;
  
  const std = calculateStandardDeviation(values);
  return std / mean;
}

export function generateAllGroupings(products: productGroup, allowDifferentColors: boolean, allowDifferentMaterials: boolean): groupedProductsSchemas {
  const result: groupedProductsSchemas = [];

  function backtrack(start: number, currentGroups: groupedProductsWithScoreItem) {
    if (start === products.length) {
      // Calculate average score for all groups
      
      //  const solutionsName = `方案得分-（${solutionsScore}）`;
      

      const newGroups = currentGroups.map(group => ({
        group: [...group.group],
        score: calculateGroupScore([...group.group])
      }))

      const groupScores = newGroups.map(g => g.score);
      const solutionsScore = Math.floor(
        groupScores.reduce((acc, score) => acc + score, 0) / groupScores.length
      );
      // const solutionsName = `方案${result.length + 1}，得分-${solutionsScore}`;
      const solutionsName = `方案${result.length + 1}`;
      result.push({
        groups: newGroups,
        solutionsScore,
        solutionsName,
        totalMoldPrice: 0,
        totalProductPrice: 0,
        totalPrice: 0,
      });
      return;
    }

    if (products[start]) {
      // Try adding to existing groups
      for (const group of currentGroups) {
        if (canAddToGroup(group.group, products[start], allowDifferentColors, allowDifferentMaterials)) {
          group.group.push(products[start]);
          group.score = calculateGroupScore(group.group); // Recalculate score
          backtrack(start + 1, [...currentGroups]);
          group.group.pop();
        }
      }

      // Create new group
      currentGroups.push({
        group: [products[start]],
        score: 100 // Single item groups always score 100
      });
      backtrack(start + 1, currentGroups);
      currentGroups.pop();
    }
  }

  backtrack(0, []);
  return result;
  return result.sort((a, b) => b.solutionsScore - a.solutionsScore);
}

export function calculateProductGroupSchemasSync(products: productGroup, allowDifferentColors: boolean, allowDifferentMaterials: boolean): groupedProductsSchemas {
  
  const result = generateAllGroupings(products, allowDifferentColors, allowDifferentMaterials);
  return result;
}

export async function calculateProductGroupSchemas(products: productGroup, allowDifferentColors: boolean, allowDifferentMaterials: boolean, moldMaterial: string): Promise<groupedProductsSchemas> {
  
  const result = generateAllGroupings(products, allowDifferentColors, allowDifferentMaterials);
  return await calculateGroupMoldAndProductPrice(result, moldMaterial);
}


 async function calculateGroupMoldAndProductPrice(productGroupSchemas: groupedProductsSchemas, moldMaterial: string): Promise<groupedProductsSchemas> {
  for(const schema of productGroupSchemas) {
    if(schema && schema.groups.length > 0){
    
      const groupResults = await Promise.all(schema.groups.map(async (groupWithScore) => {
        
        
        const rectangles: Rectangle2D[] = groupWithScore.group.map((product) => ({
          width: product.width ?? 0,
          length: product.length ?? 0,
        }));

        // 2. 计算最小面积布局
        const layoutResult = calculateMinArea(rectangles);

        // 根据布局的长宽，计算模具的边缘间距
        const moldEdgeMargin = await calculateEdgeMargin(
          layoutResult.length,
          layoutResult.width,
        );
        // 根据Product最大高度计算模具底部间距
        const maxProductHeight = Math.max(...groupWithScore.group.map((p) => p.height ?? 0));
        const moldBottomMargin = await calculateBottomMargin(maxProductHeight);

        
        // 生成临时的随机模具材料、密度和单位价格
        // const randomMold = getRandomMold();
        // 此时，有了产品的总体积，模具的体积以及模具的边缘间距和底部间距，可计算出模具的重量
        const moldWeight = calculateMoldWeight(
          layoutResult.length,
          layoutResult.width,
          moldBottomMargin,
          moldEdgeMargin,
        );
        // 模具的总价格也能计算出来
        const moldPriceResult = await getMoldPrice(
          moldMaterial,
          moldWeight
        );
        
        const convertedProducts = groupWithScore.group.map((product) => ({
          // 基本尺寸
          dimensions: {
            length: product.length ?? 0,
            width: product.width ?? 0,
            height: product.height ?? 0,
          },
    
          // 体积和材料属性
          volume: product.volume ?? 0,
          material: product.material ?? '',
          density: product.density ?? 0,
          
          // 产品基本信息
          quantity: product.quantity ?? 0,
          color: product.color ?? '',
          id: product.id ?? 0,
          name: product.name ?? '',

          // CAD 数据
          cadData: {
            boundingBox: {
              center: product.cadData.boundingBox.center,
              dimensions: product.cadData.boundingBox.dimensions,
              rotation: product.cadData.boundingBox.rotation,
            },
            volume: product.cadData.volume,
            surfaceArea: product.cadData.surfaceArea,
            centerOfMass: product.cadData.centerOfMass,
            topology: product.cadData.topology,
            features: product.cadData.features,
            momentOfInertia: product.cadData.momentOfInertia,
            format: product.cadData.format,
            version: product.cadData.version,
            lastModified: product.cadData.lastModified,
          },  
        }));

        const layout = layoutResult.layout;
        const injectionPoint = calculateInjectionPoint(layout);

        // console.log("injectionPoint: ", injectionPoint);
        const moldDimensions = {
          length: layoutResult.length + moldEdgeMargin * 2,
          width: layoutResult.width + moldEdgeMargin * 2,
          height: moldBottomMargin,
          moldMaterial: moldMaterial,
          moldWeight: moldWeight,
          moldPrice: moldPriceResult.data ?? 0,
          maxInnerLength: layoutResult.length,
          maxInnerWidth: layoutResult.width,
          verticalMargin: moldEdgeMargin,
          horizontalMargin: moldEdgeMargin,
        };

        let groupScore = 0;
        if(convertedProducts.length > 1) {
          const score = calculateBalanceScore(layout, convertedProducts, injectionPoint);
          // console.log("group scores: ", score);
          groupScore = Number(score?.total ?? 0);
          groupWithScore.score = groupScore;
          
        }
        groupWithScore.mold = moldDimensions;
        

        

        const convertedGroup = calculateProductGroup(groupWithScore.group.map((p) => ({
          length: p?.length ?? 0,
          width: p?.width ?? 0,
          height: p?.height ?? 0,
          volume: p?.volume ?? 0,
          material: p?.material ?? '',
          quantity: p?.quantity ?? 0,
          color: p?.color ?? '',
          density: p.density ?? 0,
          name: p?.name ?? '',
          id: p?.id ?? 0,
          cadData: p?.cadData ?? {},
        })));

        
        // console.log("convertedGroup:", convertedGroup);

        const productPriceGroupedResult = await getProductPriceByGroup(moldDimensions, convertedGroup);
      
        // console.log("groupResults:", groupResults);
        if(productPriceGroupedResult.success && productPriceGroupedResult.data) {
          // console.log("productPriceGroupedResult:", productPriceGroupedResult.data);

          groupWithScore.productsWithPrice = productPriceGroupedResult.data;
          const groupData = productPriceGroupedResult.data;
          
          // 计算这一组的模具价格和产品总价
          const groupMoldPrice = moldPriceResult.data ?? 0;

          const groupProductPrice = groupData.reduce((outerTotal, productGroup) => {
            // 处理每个内部数组
            const groupPrice = productGroup.reduce((innerTotal, product) => {
              return innerTotal + (product.finalPrice ?? 0);
            }, 0);
            return outerTotal + groupPrice;
          }, 0);
          
          // console.log("groupProductPrice:", groupProductPrice);
          
          return {
            moldPrice: groupMoldPrice,
            productPrice: groupProductPrice
          };

        } 
        
        return { moldPrice: 0, productPrice: 0 };
      }));

      // 计算方案的总价格
      const schemaTotalMoldPrice = groupResults.reduce((total, group) => 
        total + group.moldPrice, 0);
      const schemaTotalProductPrice = groupResults.reduce((total, group) => 
        total + group.productPrice, 0);
      
      // 更新方案的价格信息
      schema.totalMoldPrice = schemaTotalMoldPrice;
      schema.totalProductPrice = schemaTotalProductPrice;
      schema.totalPrice = schemaTotalMoldPrice + schemaTotalProductPrice;
      // 更新方案名称，添加总价格信息
      const baseName = schema.solutionsName; // 获取原始方案名称（不包含价格）
      schema.solutionsName = `${baseName}，总价格-$${schema.totalPrice.toFixed(2)}`;
      // console.log("\n=== 方案总价格信息 ===");
      // console.log("方案名称:", schema.solutionsName);
      // console.log("方案信息:", schema);
    }
  }

  // 对方案进行排序，按照总价格从低到高
  productGroupSchemas.sort((a, b) => a.totalPrice - b.totalPrice);
  //需要移除掉那些groups下面存在group.score小于50的方案
  productGroupSchemas = productGroupSchemas.filter((schema) => schema.groups.every((group) => group.score >= 50));
  return productGroupSchemas;
}