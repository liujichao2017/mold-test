// import {
//   fixedLossRate,
//   defaultMoldMaterialDensity,
// } from "../constants/calculator-constants";

import { getMachinePriceSettingList, getMaterialPriceSettingList, getMoldConstantSettingList, getMoldOperatingExpenseSettingList, getMoldPriceDifferSettingList } from "./get-calulator-price-data";
import { type MoldPriceDifferSettingItem } from "../validations/mold-price-differ";
import { type MachinePriceSettingItem } from "../validations/machine-price";
import { type MoldOperatingExpenseSettingItem } from "../validations/mold-operating-expense";
import { type MoldConstantSettingItem } from "../validations/mold-constant";
import { type MaterialPriceSettingItem } from "../validations/material";
import { type ProductPrice, type MoldDimensions, type ProductPriceDimensions, } from "../validations/mold-calculator";

class ProductPriceCalculator {
  private readonly weightDiffer = 1000;
  private readonly exchangeRate: number;
  private readonly moldPriceDifferSettingList: MoldPriceDifferSettingItem[];
  private readonly moldOperatingExpenseSettingList: MoldOperatingExpenseSettingItem[];
  private readonly moldConstantSettingList: MoldConstantSettingItem[];
  private readonly materialPriceSettingList: MaterialPriceSettingItem[];
  private readonly machinePriceSettingList: MachinePriceSettingItem[];

  constructor(
    moldPriceDifferSettingList: MoldPriceDifferSettingItem[], 
    moldOperatingExpenseSettingList: MoldOperatingExpenseSettingItem[], 
    moldConstantSettingList: MoldConstantSettingItem[],
    materialPriceSettingList: MaterialPriceSettingItem[],
    machinePriceSettingList: MachinePriceSettingItem[]
  ) {
    
    this.exchangeRate = moldConstantSettingList.find(item => item.constantName === "exchangeRate")?.constantValue ?? 7.1; //exchangeRate
    this.moldPriceDifferSettingList = moldPriceDifferSettingList;
    this.moldOperatingExpenseSettingList = moldOperatingExpenseSettingList;
    this.moldConstantSettingList = moldConstantSettingList;
    this.materialPriceSettingList = materialPriceSettingList;
    this.machinePriceSettingList = machinePriceSettingList;
  }
  
  //计算加工费
  public calculateMachiningCostByParams(moldDimensions: MoldDimensions, paramsProducts: ProductPriceDimensions[]): number {
    if (!moldDimensions) return 0;

    const productsWithMaterialPrice = paramsProducts.map(product => ({
      ...product,
      materialPrice: this.calculateMaterialPrice(product.volume ?? 0, product.productMaterial ?? ""),
      weight: this.calculateMaterialWeight(product.volume ?? 0, product.productMaterial ?? "")
    }));

    const totalWeight = productsWithMaterialPrice.reduce((acc, product) => 
      acc + (product.weight ?? 0), 0);
    
    // 2. 计算机器加工费
    // const maxHeight = Math.max(...productsWithMaterialPrice.map(p => p.height));
    const machiningCost = this.calculateMachiningCost(moldDimensions, totalWeight);

    return machiningCost;
  }

  // 根据传入的产品计算价格
  public calculateProductPriceByParams(moldDimensions: MoldDimensions, paramsProducts: ProductPriceDimensions[], machiningCost: number): ProductPrice[] {
    if (!paramsProducts) return [];

    // 1. 计算原材料价格和重量
    const productsWithMaterialPrice = paramsProducts.map(product => ({
      ...product,
      materialPrice: this.calculateMaterialPrice(product.volume ?? 0, product.productMaterial ?? ""),
      weight: this.calculateMaterialWeight(product.volume ?? 0, product.productMaterial ?? "")
    }));

    // 2. 计算总重量占比来分配加工费
    const totalWeight = productsWithMaterialPrice.reduce((acc, product) => 
      acc + (product.weight ?? 0), 0);

    // 3. 计算每个产品的价格
    const profitCoefficient = this.moldConstantSettingList.find(rule => rule.constantName === "profitCoefficient")?.constantValue ?? 1.5;

    const finalProducts = productsWithMaterialPrice.map(product => {
      // 根据重量占比分配加工费
      const weightRatio = (product.weight ?? 0) / totalWeight;
      const productMachiningCost = machiningCost * weightRatio;

      // 计算单个产品的成本和价格
      const singleCost = product.materialPrice + productMachiningCost;
      const singlePrice = singleCost * profitCoefficient / this.exchangeRate;
      const totalPrice = singlePrice * (product.productQuantity ?? 0);

      return {
        ...product,
        remainingQuantity: product.productQuantity,
        processingCost: [{
          productMakingQuantity: product.productQuantity ?? 0,
          productMakingPrice: productMachiningCost,
          productSinglePrice: singlePrice,
          productTotalPrice: totalPrice
        }],
        finalPrice: totalPrice
      };
    });

    return finalProducts;
  }

  private calculateMaterialWeight(volume: number, material: string): number {
    const materialData = this.materialPriceSettingList.find(item => item.name === material);
    if (!materialData) return 0;

    return volume * materialData.density;
  }

  private calculateMaterialPrice(volume: number, material: string): number {
    const materialData = this.materialPriceSettingList.find(item => item.name === material);
    if (!materialData) return 0;

    const weight = volume * materialData.density;
    const fixedLossRate = this.moldConstantSettingList.find(rule => rule.constantName === 'fixedLossRate')?.constantValue ?? 1.1;
    return weight * fixedLossRate * materialData.price;
  }

  private calculateMachiningCost(moldDimensions: MoldDimensions, totalWeight: number): number {
    if (!moldDimensions) return 0;

    const { length, width, height } = moldDimensions;
    const moldWidth = Math.min(length, width);
    const moldHeight = height;

    // 找到合适的机器
    const eligibleMachine = this.machinePriceSettingList
      .filter(machine => 
        moldWidth <= machine.moldWidth &&
        moldHeight <= machine.moldHeight &&
        (totalWeight / 0.8) <= machine.injectionVolume
      )
      .sort((a, b) => {
        const aValue = parseInt(a.name.replace('T', ''));
        const bValue = parseInt(b.name.replace('T', ''));
        return aValue - bValue;
      })[0];

    if (!eligibleMachine) return 0;

    // 计算实际机器加工费
    const machiningFee = eligibleMachine.machiningFee;
    const utilizationRate = 0.8; // 机器利用率，可以从配置中获取
    
    return machiningFee * utilizationRate;
  }

  public async calculateMoldPrice(moldDimensions: MoldDimensions): Promise<MoldDimensions> {
    if (!moldDimensions){
      return {
          length: 0,
          width: 0,
          height: 0,
          moldMaterial: "",
          moldWeight: 0,
          moldPrice: 0,
          maxInnerLength: 0,
          maxInnerWidth: 0,
          verticalMargin: 0,
          horizontalMargin: 0,
      };
    } 

    const moldVolume = 
      moldDimensions.length *
      moldDimensions.width *
      moldDimensions.height;
  
    const moldConstantSettingList = await getMoldConstantSettingList();
    const defaultMoldMaterialDensity = moldConstantSettingList.find(rule => rule.constantName === 'defaultMoldMaterialDensity')?.constantValue ?? 0.00000785;
    const moldWeight = moldVolume * defaultMoldMaterialDensity;
    
   
    // console.log("convertedOperatingExpenseRules:",convertedOperatingExpenseRules);
    const runningFee = this.moldOperatingExpenseSettingList.find(rule => moldWeight <= rule.maxWeight)?.price ?? 0;

    // console.log("runningFee:",runningFee);
    // console.log("moldMaterial:",this.bestMold.moldMaterial);
    const moldMaterialName = moldDimensions.moldMaterial ?? "";
    let differPrice = 0;
    
      // console.log("convertedPriceDifferRules:",convertedPriceDifferRules);
    const differPriceCoefficient = this.moldPriceDifferSettingList.find(rule => moldMaterialName == rule.name.trim())?.coefficient ?? 0;
    if(differPriceCoefficient != 0){
      differPrice = (moldWeight  * differPriceCoefficient) / this.exchangeRate;
    }
    // console.log("moldWeight:",moldWeight);
    // console.log("differPrice:",differPrice);

    // console.log("differPrice:",differPrice);

    // 如果重量小于100，则按照100计算
    const moldPrice = moldWeight > this.weightDiffer ? ((moldWeight * 40 + runningFee) / this.exchangeRate + differPrice)
    : ((Math.max(moldWeight, 100) * 50 + runningFee) / this.exchangeRate + differPrice );
    // return  Math.ceil(finalPrice / 100) * 100
    return {
        ...moldDimensions, 
        moldWeight,
        moldPrice
    };
  }

  public calculateMoldPriceByWeight(moldMaterialName: string, moldWeight: number): number {
    
   
    // console.log("convertedOperatingExpenseRules:",convertedOperatingExpenseRules);
    const runningFee = this.moldOperatingExpenseSettingList.find(rule => moldWeight <= rule.maxWeight)?.price ?? 0;

    // console.log("runningFee:",runningFee);
    // console.log("moldMaterial:",this.bestMold.moldMaterial);
  
    let differPrice = 0;
    
      // console.log("convertedPriceDifferRules:",convertedPriceDifferRules);
    const differPriceCoefficient = this.moldPriceDifferSettingList.find(rule => moldMaterialName == rule.name.trim())?.coefficient ?? 0;
    if(differPriceCoefficient != 0){
      differPrice = (moldWeight  * differPriceCoefficient) / this.exchangeRate;
    }
    // console.log("moldWeight:",moldWeight);
    // console.log("differPrice:",differPrice);

    // console.log("differPrice:",differPrice);

    const moldPrice = moldWeight > this.weightDiffer ? ((moldWeight * 40 + runningFee) / this.exchangeRate + differPrice)
    : ((Math.max(moldWeight, 100) * 50 + runningFee) / this.exchangeRate + differPrice );
    // return  Math.ceil(finalPrice / 100) * 100
    return moldPrice;
  }
}

export async function createProductPriceCalculator(
  
): Promise<ProductPriceCalculator> {

  const moldPriceDifferSettingList = await getMoldPriceDifferSettingList();
  const moldOperatingExpenseSettingList = await getMoldOperatingExpenseSettingList();
  const moldConstantSettingList = await getMoldConstantSettingList();
  const materialPriceSettingList = await getMaterialPriceSettingList();
  const machinePriceSettingList = await getMachinePriceSettingList();
  return new ProductPriceCalculator(
    moldPriceDifferSettingList, 
    moldOperatingExpenseSettingList, 
    moldConstantSettingList, 
    materialPriceSettingList, 
    machinePriceSettingList
  );
}
