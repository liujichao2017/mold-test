// src/components/ProductInputForm.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { materialList, moldMaterialList } from "@/lib/constants/calculator-constants";
import { type CADBoundingBox, type Product } from '@/types/domain/product';
import { type Point3D } from '@/types/core/geometry';


interface UserProduct {
  // id: number;
  color: string;
  material: string;
  productionQuantity: number;
  partsQuantity: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  name: string;
}

const COLORS = [
  { value: '405C', label: '405C' },
  { value: '402C', label: '402C' },
  { value: '302C', label: '302C' },
  { value: '805C', label: '805C' },
];

const MATERIALS = materialList.map(material => ({
  value: material.name,
  label: material.name
}));

const DEFAULT_PRODUCT: UserProduct = {
  // id: 0,
  color: '',
  material: '',
  productionQuantity: 0,
  partsQuantity: 0,
  length: 0,
  width: 0,
  height: 0,
  volume: 0,
  name: '',
};

interface ProductInputFormProps {
  onSubmit: (products: Product[], moldMaterial: string) => void;
}

export function ProductInputForm({ onSubmit }: ProductInputFormProps) {
  const [products, setProducts] = useState<UserProduct[]>([DEFAULT_PRODUCT]);
  const [selectedMoldMaterial, setSelectedMoldMaterial] = useState<string>(''); // 添加模具材料状态

  function handleAddProduct() {
    setProducts([...products, { ...DEFAULT_PRODUCT }]);
  }

  function handleRemoveProduct(index: number) {
    setProducts(products.filter((_, i) => i !== index));
  }

  function handleProductChange(index: number, field: keyof UserProduct, value: string | number) {
    setProducts(products.map((product, i) => {
      if (i !== index) return product;
      
      // 如果是数字类型的字段，才进行数字转换
      const processedValue = typeof value === 'string' && 
        ['productionQuantity', 'length', 'width', 'height', 'volume'].includes(field) 
          ? (value === '' ? 0 : Number(value))
          : value;
      
      return {
        ...product,
        [field]: processedValue
      };
    }));
  }

  // 生成合理的体积和表面积
function generateVolumeAndSurface(
  length: number,
  width: number,
  height: number,
) {
  const volume = length * width * height;
  // 简化的表面积计算 (长方体)
  const surfaceArea = 2 * (length * width + length * height + width * height);
  return { volume, surfaceArea };
}

// 生成边界盒和质心
function generateBoundingBoxAndCenterOfMass(
  length: number,
  width: number,
  height: number,
): {
  boundingBox: CADBoundingBox;
  centerOfMass: Point3D;
} {
  return {
    boundingBox: {
      center: { x: length / 2, y: width / 2, z: height / 2 },
      dimensions: { x: length, y: width, z: height },
    },
    centerOfMass: {
      x: length / 2,
      y: width / 2,
      z: height / 2,
    },
  };
}

  function handleSubmit() {
    // 展开部件数量大于1的产品
    const expandedProducts = products.flatMap(product => {
      const copies = [];
      const partsCount = product.partsQuantity || 0;
      
      for (let i = 0; i < partsCount; i++) {
        copies.push({
          ...product,
          name: `${product.color}-${product.material}-Part${i + 1}`,
          partsQuantity: 1
        });
      }
      
      return partsCount > 0 ? copies : [product];
    });

    const productsWithId = expandedProducts.map((product, index) => ({
      id: index + 1,
      ...product
    }));

    //对productsWithId进行转换，转换为符合onSubmit的Product类型
    const convertedProducts: Product[] = productsWithId.map((product) => {

      const { volume, surfaceArea } = generateVolumeAndSurface(
        product.length,
        product.width,
        product.height,
      );

      const { boundingBox, centerOfMass } = generateBoundingBoxAndCenterOfMass(
        product.length,
        product.width,
        product.height,
      );

      //根据材料获取密度
      const density = materialList.find(material => material.name === product.material)?.density ?? 0;

      //根据密度和体积计算重量
      const weight = density * product.volume;


      const convertedProduct = {
        id: product.id,
        name: product.name,
        weight: weight,
        density: density,
        color: product.color,
        dimensions: {
          length: product.length,
          width: product.width,
          height: product.height,
        },
        volume: product.volume,
        materialName: product.material,
        quantity: product.productionQuantity,
        cadData: {
          volume: volume,
          surfaceArea: surfaceArea,
          boundingBox: boundingBox,
          centerOfMass: centerOfMass,
        },
      };
      return convertedProduct;
    });

    console.log("convertedProducts:", convertedProducts);
    // 验证产品数量
    if (convertedProducts.length < 2) {
      // 可以添加一个提示或错误处理
      alert('至少需要2个产品才能进行布局分析');
        return;
    }
    if (!selectedMoldMaterial) {
      alert('请选择模具材料');
      return;
    }
    onSubmit(convertedProducts, selectedMoldMaterial);
  }

  return (
    <div className="space-y-6">

      {/* 模具材料选择 */}
      <div className="w-full max-w-xs">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          模具材料
        </label>
        <Select
          value={selectedMoldMaterial}
          onValueChange={setSelectedMoldMaterial}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择模具材料" />
          </SelectTrigger>
          <SelectContent>
            {moldMaterialList.map((material) => (
              <SelectItem key={material.name} value={material.name}>
                {material.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">颜色</label>
              <Select
                value={product.color}
                onValueChange={(value) => handleProductChange(index, 'color', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择颜色" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">材料</label>
              <Select
                value={product.material}
                onValueChange={(value) => handleProductChange(index, 'material', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择材料" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((material) => (
                    <SelectItem key={material.value} value={material.value}>
                      {material.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">生产数量</label>
              <Input
                type="number"
                value={product.productionQuantity || ''}
                onChange={(e) => handleProductChange(index, 'productionQuantity', e.target.value)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">部件数量</label>
              <Input
                type="number"
                value={product.partsQuantity || ''}
                onChange={(e) => handleProductChange(index, 'partsQuantity', e.target.value)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">长度 (mm)</label>
              <Input
                type="number"
                value={product.length || ''}
                onChange={(e) => handleProductChange(index, 'length', e.target.value)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">宽度 (mm)</label>
              <Input
                type="number"
                value={product.width || ''}
                onChange={(e) => handleProductChange(index, 'width', e.target.value)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">高度 (mm)</label>
              <Input
                type="number"
                value={product.height || ''}
                onChange={(e) => handleProductChange(index, 'height', e.target.value)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">体积 (mm³)</label>
              <Input
                type="number"
                value={product.volume || ''}
                onChange={(e) => handleProductChange(index, 'volume', e.target.value)}
                min={0}
              />
            </div>

            <Button 
              variant="destructive" 
              onClick={() => handleRemoveProduct(index)}
              className="col-span-4"
            >
              删除产品
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button onClick={handleAddProduct}>
          添加产品
        </Button>
        <Button onClick={handleSubmit} variant="default">
          提交
        </Button>
      </div>
    </div>
  );
}