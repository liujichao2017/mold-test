/**
 * 2D点
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 3D点
 */
export interface Point3D extends Point2D {
  z: number;
}

/**
 * 2D矩形（仅包含长宽）
 */
export interface Rectangle2D {
  width: number;   // 宽度
  length: number;  // 长度
}

/**
 * 2D矩形（带位置信息）
 */
export interface Rectangle extends Rectangle2D {
  x: number;      // x坐标
  y: number;      // y坐标
  id?: number;    // 可选的ID，用于关联产品
}

/**
 * 3D盒子
 */
export interface Box extends Rectangle {
  z: number;      // z坐标
  height: number; // 高度
}

/**
 * 2D边界
 */
export interface Bounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 3D边界
 */
export interface Bounds3D extends Bounds2D {
  minZ: number;
  maxZ: number;
}
