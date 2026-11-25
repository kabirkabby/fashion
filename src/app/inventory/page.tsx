'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Check,
  Factory,
  Minus,
  PackagePlus,
  Plus,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { getTotalStock } from '@/lib/reorderEngine';
import { addDaysIso, formatDisplayDate } from '@/lib/dateUtils';
import { uid } from '@/lib/themes';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { InventoryItem, OrderRecord, PurchaseOrder } from '@/types/akoya';

export default function InventoryPage() {
  const { store, today, updateStore, reorderRecommendations, notify } = useAkoya();

  const [activeTab, setActiveTab] = useState<'stock' | 'pos' | 'orders'>('stock');
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [recordOrderOpen, setRecordOrderOpen] = useState(false);

  const manufacturers = useMemo(
    () => store.vendors.filter((v) => v.kind === 'manufacturer'),
    [store.vendors]
  );

  // Add from collection form
  const availableSkusToTrack = useMemo(
    () => store.skus.filter((s) => !store.inventory.some((i) => i.skuId === s.id)),
    [store.skus, store.inventory]
  );

  const [invForm, setInvForm] = useState({
    skuId: availableSkusToTrack[0]?.id || store.skus[0]?.id || '',
    manufacturerId: manufacturers[0]?.id || '',
    reorderPoint: 35,
    targetStock: 140,
    initialQtyPerSize: 15,
  });

  // Purchase Order form
  const [poForm, setPoForm] = useState({
    skuId: store.skus[0]?.id || '',
    manufacturerId: manufacturers[0]?.id || '',
    quantity: 150,
    unitCost: 24.5,
    expectedDate: addDaysIso(today, 35),
    notes: '',
  });

  // Order / Sales Log form (for pre-Shopify order tracking & velocity testing)
  const [orderForm, setOrderForm] = useState({
    skuId: store.inventory[0]?.skuId || store.skus[0]?.id || '',
    size: 'M',
    quantity: 5,
    channel: 'Pre-Order' as OrderRecord['channel'],
  });

  const urgentRecommendations = useMemo(
    () =>
      reorderRecommendations.filter(
        (r) => r.urgency === 'critical' || r.urgency === 'recommended'
      ),
    [reorderRecommendations]
  );

  const totalInventoryUnits = useMemo(
    () => store.inventory.reduce((sum, item) => sum + getTotalStock(item), 0),
    [store.inventory]
  );

  const totalInventoryValue = useMemo(
    () =>
      store.inventory.reduce(
        (sum, item) => sum + getTotalStock(item) * (item.unitCost || 0),
        0
      ),
    [store.inventory]
  );

  const adjustSizeStock = (inventoryId: string, size: string, delta: number) => {
    updateStore((prev) => ({
      ...prev,
      inventory: prev.inventory.map((item) => {
        if (item.id !== inventoryId) return item;
        const curr = item.stockBySize[size] || 0;
        const nextVal = Math.max(0, curr + delta);
        return {
          ...item,
          stockBySize: { ...item.stockBySize, [size]: nextVal },
        };
      }),
    }));
  };

  const openPoFromRecommendation = (rec: (typeof reorderRecommendations)[number]) => {
    setPoForm({
      skuId: rec.sku.id,
      manufacturerId: rec.manufacturer?.id || manufacturers[0]?.id || '',
      quantity: rec.recommendedQty,
      unitCost: rec.sku.targetCogs || 20,
      expectedDate: addDaysIso(today, rec.manufacturer?.leadTimeDays || 35),
      notes: `Auto-recommended reorder (${rec.reason})`,
    });
    setPoModalOpen(true);
  };

  const handleAddInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = store.skus.find((s) => s.id === invForm.skuId);
    if (!sku) return;
    if (store.inventory.some((i) => i.skuId === sku.id)) {
      notify('SKU is already in Inventory', 'warning');
      return;
    }

    const stockBySize: Record<string, number> = {};
    for (const sz of sku.sizes) {
      stockBySize[sz] = Math.max(0, Number(invForm.initialQtyPerSize) || 0);
    }

    const newItem: InventoryItem = {
      id: uid('inv'),
      skuId: sku.id,
      collectionId: sku.collectionId,
      manufacturerId: invForm.manufacturerId || sku.manufacturerId,
      stockBySize,
      reorderPoint: Number(invForm.reorderPoint) || 30,
      targetStock: Number(invForm.targetStock) || 120,
      incomingQty: 0,
      ordersLast7Days: 0,
      ordersLast30Days: 0,
      totalUnitsSold: 0,
      lastOrderDate: today,
      unitCost: sku.targetCogs,
    };

    updateStore(
      (prev) => ({
        ...prev,
        inventory: [newItem, ...prev.inventory],
        skus: prev.skus.map((s) =>
          s.id === sku.id && invForm.manufacturerId
            ? { ...s, manufacturerId: invForm.manufacturerId }
            : s
        ),
      }),
      `Added ${sku.skuCode} to live inventory`
    );
    setAddInventoryOpen(false);
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = store.skus.find((s) => s.id === poForm.skuId);
    if (!sku || !poForm.manufacturerId) return;

    const qty = Math.max(1, Number(poForm.quantity) || 0);
    const unitCost = Number(poForm.unitCost) || 0;
    const po: PurchaseOrder = {
      id: uid('po'),
      poNumber: `PO-2026-${String(store.purchaseOrders.length + 1).padStart(3, '0')}`,
      skuId: poForm.skuId,
      manufacturerId: poForm.manufacturerId,
      quantity: qty,
      unitCost,
      totalCost: qty * unitCost,
      status: 'Sent',
      orderDate: today,
      expectedDate: poForm.expectedDate,
      notes: poForm.notes.trim(),
    };

    const mfg = manufacturers.find((m) => m.id === poForm.manufacturerId);

    updateStore(
      (prev) => ({
        ...prev,
        purchaseOrders: [po, ...prev.purchaseOrders],
        inventory: prev.inventory.map((inv) =>
          inv.skuId === poForm.skuId
            ? { ...inv, incomingQty: (inv.incomingQty || 0) + qty, manufacturerId: poForm.manufacturerId }
            : inv
        ),
        reminders: [
          {
            id: uid('rem'),
            title: `Check ${po.poNumber} production milestone with ${mfg?.companyName || 'Factory'}`,
            askStatusPrompt: `Ask for mid-production QC photos for ${qty} pcs of ${sku.skuCode}.`,
            dueDate: addDaysIso(today, 10),
            dueTime: '11:00',
            targetType: 'manufacturer',
            targetId: poForm.manufacturerId,
            assigneeId: prev.profile.activeMemberId,
            status: 'pending',
            priority: 'high',
          },
          ...prev.reminders,
        ],
      }),
      `${po.poNumber} created & incoming stock updated`
    );
    setPoModalOpen(false);
    setActiveTab('pos');
  };

  const handleReceivePo = (po: PurchaseOrder) => {
    if (po.status === 'Received') return;
    updateStore(
      (prev) => ({
        ...prev,
        purchaseOrders: prev.purchaseOrders.map((item) =>
          item.id === po.id ? { ...item, status: 'Received' } : item
        ),
        inventory: prev.inventory.map((inv) => {
          if (inv.skuId !== po.skuId) return inv;
          const sizeKeys = Object.keys(inv.stockBySize);
          const perSize = sizeKeys.length > 0 ? Math.floor(po.quantity / sizeKeys.length) : 0;
          const remainder = sizeKeys.length > 0 ? po.quantity % sizeKeys.length : 0;
          const nextStock = { ...inv.stockBySize };
          sizeKeys.forEach((sz, idx) => {
            nextStock[sz] = (nextStock[sz] || 0) + perSize + (idx === 0 ? remainder : 0);
          });
          return {
            ...inv,
            stockBySize: nextStock,
            incomingQty: Math.max(0, (inv.incomingQty || 0) - po.quantity),
          };
        }),
      }),
      `${po.poNumber} marked received — stock added to sizes`
    );
  };

  const handleLogOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = store.skus.find((s) => s.id === orderForm.skuId);
    if (!sku) return;
    const qty = Math.max(1, Number(orderForm.quantity) || 1);

    const rec: OrderRecord = {
      id: uid('ord'),
      orderNumber: `AK-${1043 + store.orders.length}`,
      skuId: sku.id,
      size: orderForm.size,
      quantity: qty,
      channel: orderForm.channel,
      date: today,
      revenue: qty * sku.targetRetailPrice,
    };

    updateStore(
      (prev) => ({
        ...prev,
        orders: [rec, ...prev.orders],
        inventory: prev.inventory.map((inv) => {
          if (inv.skuId !== sku.id) return inv;
          const currSize = inv.stockBySize[orderForm.size] || 0;
          return {
            ...inv,
            stockBySize: {
              ...inv.stockBySize,
              [orderForm.size]: Math.max(0, currSize - qty),
            },
            ordersLast7Days: (inv.ordersLast7Days || 0) + qty,
            ordersLast30Days: (inv.ordersLast30Days || 0) + qty,
            totalUnitsSold: (inv.totalUnitsSold || 0) + qty,
            lastOrderDate: today,
          };
        }),
      }),
      `Recorded order ${rec.orderNumber} (-${qty} pcs)`
    );
    setRecordOrderOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18]">
            Inventory & Smart Reorder Engine
          </h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            Pull products from Collections, assign factories, track stock & orders, and get automatic PO reorder recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRecordOrderOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#DFDCD3] bg-white px-4 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Record Order
          </button>
          <button
            type="button"
            onClick={() => setAddInventoryOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white hover:bg-[#32302C]"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            Add Product from Collection
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[24px] border border-[#E6E3DA] bg-white p-4">
          <div className="text-[11px] font-medium text-[#75726B]">Units On Hand</div>
          <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
            {totalInventoryUnits} pcs
          </div>
          <div className="mt-0.5 text-[11px] text-[#6E6C66]">
            Across {store.inventory.length} active SKUs
          </div>
        </div>
        <div className="rounded-[24px] border border-[#E6E3DA] bg-white p-4">
          <div className="text-[11px] font-medium text-[#75726B]">Stock Cost Value</div>
          <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
            ${Math.round(totalInventoryValue).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-[#6E6C66]">Landed inventory COGS</div>
        </div>
        <div className="rounded-[24px] border border-[#F0CFC7] bg-[#FDF1EE] p-4">
          <div className="text-[11px] font-semibold text-[#9C3325]">Reorder Alerts</div>
          <div className="mt-1 text-2xl font-bold text-[#6E2218] tabular-nums">
            {urgentRecommendations.length} SKUs
          </div>
          <div className="mt-0.5 text-[11px] text-[#8A352A]">Low stock + active demand</div>
        </div>
        <div className="rounded-[24px] border border-[#E6E3DA] bg-white p-4">
          <div className="text-[11px] font-medium text-[#75726B]">Open Purchase Orders</div>
          <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
            {store.purchaseOrders.filter((p) => p.status !== 'Received').length} POs
          </div>
          <div className="mt-0.5 text-[11px] text-[#6E6C66]">
            {store.inventory.reduce((s, i) => s + (i.incomingQty || 0), 0)} units incoming
          </div>
        </div>
      </div>

      {/* Smart Reorder Recommendations Panel */}
      {urgentRecommendations.length > 0 && (
        <section className="rounded-[28px] border border-[#EAD497] bg-[#FFF8DF] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7D147] text-[#1B1A18]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#1B1A18]">
                  Smart Reorder Recommendations
                </h2>
                <p className="text-xs text-[#6E5C25]">
                  Calculated from current stock, 7-day order surge, factory MOQ, and production lead times.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {urgentRecommendations.map((rec) => (
              <div
                key={rec.inventoryId}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[#EDE0B5] bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={rec.sku.images[0] || '/garments/hoodie.svg'}
                    alt={rec.sku.name}
                    className="h-14 w-14 shrink-0 rounded-xl border border-[#EFECE6] bg-[#FAF9F6] object-contain p-1"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          rec.urgency === 'critical'
                            ? 'bg-[#FDE2DD] text-[#A8382B]'
                            : 'bg-[#FCF0C2] text-[#845E07]'
                        }`}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {rec.urgency === 'critical' ? 'Urgent Reorder' : 'Recommended'}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#5A5852]">
                        {rec.sku.skuCode}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-bold text-[#1B1A18]">
                      {rec.sku.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#5A5852]">{rec.reason}</p>
                    <div className="mt-1.5 text-[11px] text-[#6E6C66]">
                      Factory:{' '}
                      <strong className="text-[#1B1A18]">
                        {rec.manufacturer?.companyName || 'Assign factory'}
                      </strong>{' '}
                      · MOQ {rec.manufacturer?.moq || 50} pcs · Lead{' '}
                      {rec.manufacturer?.leadTimeDays || 30}d
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                  <div className="text-right">
                    <div className="text-[11px] text-[#75726B]">Recommended PO</div>
                    <div className="text-base font-bold text-[#1B1A18] tabular-nums">
                      {rec.recommendedQty} pcs
                    </div>
                    <div className="text-[10px] text-[#6E6C66]">
                      Est. ${Math.round(rec.estimatedPoCost).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPoFromRecommendation(rec)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white hover:bg-[#32302C]"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Place New Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'stock'
              ? 'bg-[#1C1B19] text-white'
              : 'border border-[#E5E2DA] bg-white text-[#5A5852]'
          }`}
        >
          Stock & Size Matrix ({store.inventory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'pos'
              ? 'bg-[#1C1B19] text-white'
              : 'border border-[#E5E2DA] bg-white text-[#5A5852]'
          }`}
        >
          Factory Purchase Orders ({store.purchaseOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'orders'
              ? 'bg-[#1C1B19] text-white'
              : 'border border-[#E5E2DA] bg-white text-[#5A5852]'
          }`}
        >
          Recent Orders ({store.orders.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'stock' && (
        <div className="overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white">
          {store.inventory.length === 0 ? (
            <div className="p-12 text-center">
              <Boxes className="mx-auto h-7 w-7 text-[#96938B]" />
              <h2 className="mt-2 text-sm font-semibold text-[#1B1A18]">No products in Inventory yet</h2>
              <p className="mt-1 text-xs text-[#75726B]">
                Import SKUs from your Collections, set reorder thresholds, and assign manufacturers.
              </p>
              <button
                type="button"
                onClick={() => setAddInventoryOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product from Collection
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Inventory Cards */}
              <div className="divide-y divide-[#F2EFE8] md:hidden">
                {reorderRecommendations.map((rec) => {
                  const item = store.inventory.find((i) => i.id === rec.inventoryId)!;
                  return (
                    <div key={item.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={rec.sku.images[0] || '/garments/tee.svg'}
                            alt={rec.sku.name}
                            className="h-12 w-12 shrink-0 rounded-xl border border-[#EFECE6] bg-[#FAF9F6] object-contain p-1"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-[#1B1A18]">
                              {rec.sku.name}
                            </div>
                            <div className="font-mono text-[10px] text-[#75726B]">
                              {rec.sku.skuCode} · {rec.currentStock} pcs on hand
                            </div>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            rec.urgency === 'critical'
                              ? 'bg-[#FDE2DD] text-[#A8382B]'
                              : rec.urgency === 'recommended'
                              ? 'bg-[#FCF0C2] text-[#845E07]'
                              : 'bg-[#DFF2E6] text-[#1F6B43]'
                          }`}
                        >
                          {rec.urgency === 'critical'
                            ? 'Reorder Now'
                            : rec.urgency === 'recommended'
                            ? 'Low Stock'
                            : 'Healthy'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(item.stockBySize).map(([sz, qty]) => (
                          <div
                            key={sz}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#E6E3DA] bg-[#FAF9F6] px-2 py-1"
                          >
                            <span className="font-mono text-[10px] font-bold text-[#5A5852]">
                              {sz}
                            </span>
                            <button
                              type="button"
                              aria-label={`Decrease ${sz} stock`}
                              onClick={() => adjustSizeStock(item.id, sz, -1)}
                              className="rounded p-0.5 text-[#75726B]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[18px] text-center text-xs font-semibold text-[#1B1A18] tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${sz} stock`}
                              onClick={() => adjustSizeStock(item.id, sz, 1)}
                              className="rounded p-0.5 text-[#75726B]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                        <span className="text-[11px] text-[#6E6C66]">
                          {item.ordersLast7Days} orders/7d · Min {item.reorderPoint}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPoFromRecommendation(rec)}
                          className="rounded-full bg-[#1C1B19] px-3 py-1.5 text-[11px] font-semibold text-white"
                        >
                          Order +{rec.recommendedQty} pcs
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div tabIndex={0} role="region" aria-label="Inventory stock table" className="akoya-table-wrapper hidden md:block">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-[#EFECE6] bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider text-[#75726B]">
                  <tr>
                    <th className="px-4 py-3.5">Product SKU</th>
                    <th className="px-3 py-3.5">Assigned Manufacturer</th>
                    <th className="px-3 py-3.5">Stock by Size</th>
                    <th className="px-3 py-3.5">Total / Threshold</th>
                    <th className="px-3 py-3.5">7d / 30d Orders</th>
                    <th className="px-4 py-3.5">Status & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE8] text-xs">
                  {reorderRecommendations.map((rec) => {
                    const item = store.inventory.find((i) => i.id === rec.inventoryId)!;
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF9F6]">
                        <th className="px-4 py-3.5 font-normal">
                          <div className="flex items-center gap-3">
                            <img
                              src={rec.sku.images[0] || '/garments/tee.svg'}
                              alt={rec.sku.name}
                              className="h-11 w-11 shrink-0 rounded-xl border border-[#EFECE6] bg-[#FAF9F6] object-contain p-1"
                            />
                            <div>
                              <div className="font-semibold text-[#1B1A18]">{rec.sku.name}</div>
                              <div className="font-mono text-[10px] text-[#75726B]">
                                {rec.sku.skuCode} · {rec.sku.colorway}
                              </div>
                            </div>
                          </div>
                        </th>
                        <td className="px-3 py-3.5">
                          <select
                            aria-label={`Assign manufacturer for ${rec.sku.name}`}
                            value={item.manufacturerId || ''}
                            onChange={(e) => {
                              const mfgId = e.target.value;
                              updateStore(
                                (prev) => ({
                                  ...prev,
                                  inventory: prev.inventory.map((inv) =>
                                    inv.id === item.id ? { ...inv, manufacturerId: mfgId } : inv
                                  ),
                                }),
                                'Assigned manufacturer updated'
                              );
                            }}
                            className="h-9 rounded-xl border border-[#DFDCD3] bg-white px-2.5 text-xs font-medium"
                          >
                            <option value="">Unassigned</option>
                            {manufacturers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.companyName} (MOQ {m.moq})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(item.stockBySize).map(([sz, qty]) => (
                              <div
                                key={sz}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#E6E3DA] bg-[#FAF9F6] px-2 py-1"
                              >
                                <span className="font-mono text-[10px] font-bold text-[#5A5852]">
                                  {sz}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Decrease ${sz} stock`}
                                  onClick={() => adjustSizeStock(item.id, sz, -1)}
                                  className="rounded p-0.5 text-[#75726B] hover:bg-white hover:text-[#1B1A18]"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <span className="min-w-[18px] text-center font-semibold text-[#1B1A18] tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Increase ${sz} stock`}
                                  onClick={() => adjustSizeStock(item.id, sz, 1)}
                                  className="rounded p-0.5 text-[#75726B] hover:bg-white hover:text-[#1B1A18]"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 tabular-nums">
                          <div className="font-bold text-[#1B1A18]">{rec.currentStock} pcs</div>
                          <div className="text-[11px] text-[#75726B]">
                            Min: {item.reorderPoint} · In: +{item.incomingQty}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 tabular-nums">
                          <div className="font-semibold text-[#1B1A18]">
                            {item.ordersLast7Days} / 7d
                          </div>
                          <div className="text-[11px] text-[#75726B]">
                            {item.ordersLast30Days} / 30d · ~{Math.round(rec.daysOfCover)}d cover
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                rec.urgency === 'critical'
                                  ? 'bg-[#FDE2DD] text-[#A8382B]'
                                  : rec.urgency === 'recommended'
                                  ? 'bg-[#FCF0C2] text-[#845E07]'
                                  : 'bg-[#DFF2E6] text-[#1F6B43]'
                              }`}
                            >
                              {rec.urgency === 'critical'
                                ? 'Reorder Now'
                                : rec.urgency === 'recommended'
                                ? 'Low Stock'
                                : 'Healthy'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openPoFromRecommendation(rec)}
                              className="text-[11px] font-semibold text-[#1B1A18] underline-offset-2 hover:underline"
                            >
                              Order +{rec.recommendedQty} pcs →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="space-y-3">
          {store.purchaseOrders.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#D5D1C7] bg-white p-10 text-center text-xs text-[#75726B]">
              No factory purchase orders yet.
            </div>
          ) : (
            store.purchaseOrders.map((po) => {
              const sku = store.skus.find((s) => s.id === po.skuId);
              const mfg = manufacturers.find((m) => m.id === po.manufacturerId);
              return (
                <div
                  key={po.id}
                  className="flex flex-col justify-between gap-3 rounded-[24px] border border-[#E6E3DA] bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1B1A18]">
                        {po.poNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          po.status === 'Received'
                            ? 'bg-[#DFF2E6] text-[#1F6B43]'
                            : 'bg-[#FCF0C2] text-[#845E07]'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[#1B1A18]">
                      {sku?.name || 'SKU'} · {po.quantity} pcs
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6C66]">
                      <span className="flex items-center gap-1">
                        <Factory className="h-3.5 w-3.5" /> {mfg?.companyName || 'Factory'}
                      </span>
                      <span>Total: ${po.totalCost.toLocaleString()}</span>
                      <span>ETA: {formatDisplayDate(po.expectedDate)}</span>
                    </div>
                  </div>
                  {po.status !== 'Received' && (
                    <button
                      type="button"
                      onClick={() => handleReceivePo(po)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark Received into Stock
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white">
          <div tabIndex={0} role="region" aria-label="Recent orders" className="akoya-table-wrapper">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[#EFECE6] bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider text-[#75726B]">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Size & Qty</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE8]">
                {store.orders.map((ord) => {
                  const sku = store.skus.find((s) => s.id === ord.skuId);
                  return (
                    <tr key={ord.id}>
                      <th className="px-4 py-3 font-mono font-semibold text-[#1B1A18]">
                        {ord.orderNumber}
                      </th>
                      <td className="px-3 py-3 font-medium text-[#1B1A18]">
                        {sku?.name || ord.skuId}
                      </td>
                      <td className="px-3 py-3">
                        Size {ord.size} × {ord.quantity}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-[#F3F2EE] px-2.5 py-0.5 text-[10px] font-semibold">
                          {ord.channel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#6E6C66]">{formatDisplayDate(ord.date)}</td>
                      <td className="px-4 py-3 font-bold text-[#1B1A18] tabular-nums">
                        ${ord.revenue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product from Collection to Inventory Modal */}
      <ModalDialog
        open={addInventoryOpen}
        onClose={() => setAddInventoryOpen(false)}
        title="Add Collection Product to Inventory"
        subtitle="Select a product SKU from your collections, assign its manufacturer, and set stock thresholds."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleAddInventoryItem} className="space-y-4">
          <div>
            <label htmlFor="inv-sku" className="block text-xs font-semibold text-[#3C3A36]">
              Select Product SKU *
            </label>
            <select
              id="inv-sku"
              required
              value={invForm.skuId}
              onChange={(e) => setInvForm({ ...invForm, skuId: e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            >
              {store.skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.skuCode} · {s.name} ({s.colorway})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="inv-mfg" className="block text-xs font-semibold text-[#3C3A36]">
              Assign Manufacturer
            </label>
            <select
              id="inv-mfg"
              value={invForm.manufacturerId}
              onChange={(e) => setInvForm({ ...invForm, manufacturerId: e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            >
              <option value="">Select Manufacturer</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.companyName} ({m.country} · MOQ {m.moq})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="inv-init" className="block text-xs font-semibold text-[#3C3A36]">
                Initial Qty / Size
              </label>
              <input
                id="inv-init"
                type="number"
                value={invForm.initialQtyPerSize}
                onChange={(e) =>
                  setInvForm({ ...invForm, initialQtyPerSize: Number(e.target.value) || 0 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="inv-min" className="block text-xs font-semibold text-[#3C3A36]">
                Reorder Alert Min
              </label>
              <input
                id="inv-min"
                type="number"
                value={invForm.reorderPoint}
                onChange={(e) =>
                  setInvForm({ ...invForm, reorderPoint: Number(e.target.value) || 0 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="inv-target" className="block text-xs font-semibold text-[#3C3A36]">
                Target Buffer Stock
              </label>
              <input
                id="inv-target"
                type="number"
                value={invForm.targetStock}
                onChange={(e) =>
                  setInvForm({ ...invForm, targetStock: Number(e.target.value) || 0 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddInventoryOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              Add to Inventory
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Place Purchase Order Modal */}
      <ModalDialog
        open={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        title="Place Factory Purchase Order"
        subtitle="Create a restock PO and automatically schedule a mid-production check-in reminder."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleCreatePo} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="po-sku" className="block text-xs font-semibold text-[#3C3A36]">
                Product SKU
              </label>
              <select
                id="po-sku"
                value={poForm.skuId}
                onChange={(e) => setPoForm({ ...poForm, skuId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                {store.skus.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.skuCode} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="po-mfg" className="block text-xs font-semibold text-[#3C3A36]">
                Manufacturer
              </label>
              <select
                id="po-mfg"
                value={poForm.manufacturerId}
                onChange={(e) => setPoForm({ ...poForm, manufacturerId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="po-qty" className="block text-xs font-semibold text-[#3C3A36]">
                Quantity (pcs)
              </label>
              <input
                id="po-qty"
                type="number"
                value={poForm.quantity}
                onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) || 0 })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="po-cost" className="block text-xs font-semibold text-[#3C3A36]">
                Unit Cost ($)
              </label>
              <input
                id="po-cost"
                type="number"
                step="0.5"
                value={poForm.unitCost}
                onChange={(e) => setPoForm({ ...poForm, unitCost: Number(e.target.value) || 0 })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="po-eta" className="block text-xs font-semibold text-[#3C3A36]">
                Expected ETA
              </label>
              <input
                id="po-eta"
                type="date"
                value={poForm.expectedDate}
                onChange={(e) => setPoForm({ ...poForm, expectedDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="po-notes" className="block text-xs font-semibold text-[#3C3A36]">
              PO Notes / Size Breakdown
            </label>
            <textarea
              id="po-notes"
              rows={2}
              value={poForm.notes}
              onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#FAF9F6] px-4 py-3 text-xs">
            <span className="text-[#6E6C66]">Estimated PO Total:</span>
            <span className="text-base font-bold text-[#1B1A18] tabular-nums">
              ${Math.round(poForm.quantity * poForm.unitCost).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPoModalOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              Send Purchase Order
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Record Order Modal */}
      <ModalDialog
        open={recordOrderOpen}
        onClose={() => setRecordOrderOpen(false)}
        title="Record Customer Order"
        subtitle="Log pre-orders, pop-up sales, or IG orders. Deducts stock and updates reorder velocity."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleLogOrder} className="space-y-4">
          <div>
            <label htmlFor="ord-sku" className="block text-xs font-semibold text-[#3C3A36]">
              Product SKU
            </label>
            <select
              id="ord-sku"
              value={orderForm.skuId}
              onChange={(e) => setOrderForm({ ...orderForm, skuId: e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            >
              {store.skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.skuCode} · {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="ord-size" className="block text-xs font-semibold text-[#3C3A36]">
                Size
              </label>
              <input
                id="ord-size"
                value={orderForm.size}
                onChange={(e) => setOrderForm({ ...orderForm, size: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ord-qty" className="block text-xs font-semibold text-[#3C3A36]">
                Qty
              </label>
              <input
                id="ord-qty"
                type="number"
                min={1}
                value={orderForm.quantity}
                onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) || 1 })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ord-chan" className="block text-xs font-semibold text-[#3C3A36]">
                Channel
              </label>
              <select
                id="ord-chan"
                value={orderForm.channel}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, channel: e.target.value as OrderRecord['channel'] })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2 text-xs"
              >
                <option value="Pre-Order">Pre-Order</option>
                <option value="Pop-Up">Pop-Up</option>
                <option value="Direct / IG">Direct / IG</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRecordOrderOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              Log Order
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
