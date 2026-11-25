import { InventoryItem, ProductSku, Vendor } from '@/types/akoya';

export interface ReorderRecommendation {
  inventoryId: string;
  sku: ProductSku;
  manufacturer?: Vendor;
  currentStock: number;
  incomingQty: number;
  effectiveStock: number;
  reorderPoint: number;
  targetStock: number;
  ordersLast7Days: number;
  ordersLast30Days: number;
  dailyVelocity: number;
  daysOfCover: number;
  recommendedQty: number;
  estimatedPoCost: number;
  urgency: 'critical' | 'recommended' | 'watch' | 'healthy';
  reason: string;
}

export function getTotalStock(item: InventoryItem): number {
  return Object.values(item.stockBySize).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export function evaluateReorderRecommendations(
  inventory: InventoryItem[],
  skus: ProductSku[],
  vendors: Vendor[]
): ReorderRecommendation[] {
  const results: ReorderRecommendation[] = [];

  for (const item of inventory) {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku) continue;
    const manufacturer = vendors.find((v) => v.id === (item.manufacturerId || sku.manufacturerId));
    const currentStock = getTotalStock(item);
    const effectiveStock = currentStock + (item.incomingQty || 0);

    // Weighted daily velocity: emphasize recent 7-day spike alongside 30-day average
    const vel7 = (item.ordersLast7Days || 0) / 7;
    const vel30 = (item.ordersLast30Days || 0) / 30;
    const dailyVelocity = Math.max(vel7 * 0.65 + vel30 * 0.35, 0.05);
    const daysOfCover = effectiveStock / dailyVelocity;
    const leadTime = manufacturer?.leadTimeDays || 30;
    const moq = manufacturer?.moq || 50;

    // Raw need to cover lead time + target buffer
    const projectedLeadDemand = Math.ceil(dailyVelocity * leadTime);
    const rawShortfall = Math.max(item.targetStock + projectedLeadDemand - effectiveStock, item.targetStock - effectiveStock, 0);
    const recommendedQty = rawShortfall > 0 ? Math.max(rawShortfall, moq) : moq;
    const estimatedPoCost = recommendedQty * (item.unitCost || sku.targetCogs || 0);

    let urgency: ReorderRecommendation['urgency'] = 'healthy';
    let reason = 'Stock buffer covers projected demand.';

    if (effectiveStock <= item.reorderPoint && item.ordersLast7Days >= 10) {
      urgency = 'critical';
      reason = `Low stock (${currentStock} pcs) + strong orders (${item.ordersLast7Days} in 7d · ~${Math.round(daysOfCover)}d cover left vs ${leadTime}d factory lead time).`;
    } else if (effectiveStock <= item.reorderPoint) {
      urgency = 'recommended';
      reason = `Effective stock (${effectiveStock} pcs) is below your ${item.reorderPoint}-pc reorder threshold.`;
    } else if (daysOfCover <= leadTime * 1.15 && item.ordersLast7Days >= 8) {
      urgency = 'recommended';
      reason = `Order velocity (${item.ordersLast7Days} pcs/wk) will deplete stock in ~${Math.round(daysOfCover)}d before a ${leadTime}d factory run arrives.`;
    } else if (currentStock <= item.reorderPoint * 1.25) {
      urgency = 'watch';
      reason = `Approaching reorder point (${currentStock} vs ${item.reorderPoint} pcs).`;
    }

    results.push({
      inventoryId: item.id,
      sku,
      manufacturer,
      currentStock,
      incomingQty: item.incomingQty || 0,
      effectiveStock,
      reorderPoint: item.reorderPoint,
      targetStock: item.targetStock,
      ordersLast7Days: item.ordersLast7Days,
      ordersLast30Days: item.ordersLast30Days,
      dailyVelocity,
      daysOfCover,
      recommendedQty,
      estimatedPoCost,
      urgency,
      reason,
    });
  }

  const rank: Record<ReorderRecommendation['urgency'], number> = {
    critical: 0,
    recommended: 1,
    watch: 2,
    healthy: 3,
  };

  return results.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
}
