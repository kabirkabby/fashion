'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Check,
  Factory,
  FolderPlus,
  ImagePlus,
  Layers,
  MessageSquare,
  Package,
  Plus,
  Ruler,
  Trash2,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { PASTEL_THEMES, uid } from '@/lib/themes';
import { addDaysIso, formatDisplayDate } from '@/lib/dateUtils';
import { Collection, PastelTheme, ProductSku, SkuNote, SkuStatus } from '@/types/akoya';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { AvatarBadge } from '@/components/ui/AvatarBadge';

const SKU_STATUSES: SkuStatus[] = [
  'Concept',
  'Tech Pack',
  'Sampling',
  'Pre-Production',
  'Approved',
  'In Production',
];

const SKU_CATEGORIES = [
  'Hoodies',
  'Tees',
  'Bottoms',
  'Outerwear',
  'Knitwear',
  'Shirts',
  'Accessories',
];

const STARTER_IMAGES = [
  { label: 'Hoodie Flat', url: '/garments/hoodie.svg' },
  { label: 'Tee Flat', url: '/garments/tee.svg' },
  { label: 'Jacket Flat', url: '/garments/jacket.svg' },
  { label: 'Trouser Flat', url: '/garments/trouser.svg' },
];

export default function CollectionsPage() {
  const { store, today, updateStore, notify } = useAkoya();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(store.skus[0]?.id || null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Modals
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // New Collection form
  const [colForm, setColForm] = useState({
    name: '',
    code: '',
    season: 'FW26',
    description: '',
    theme: 'peach' as PastelTheme,
    startDate: today,
    launchDate: addDaysIso(today, 45),
    milestoneLabel: 'Sample Approval',
    priority: 'High Priority' as Collection['priority'],
    leadMemberIds: [store.profile.activeMemberId],
  });

  // SKU form
  const [skuForm, setSkuForm] = useState({
    skuCode: '',
    name: '',
    collectionId: store.collections[0]?.id || '',
    category: 'Hoodies',
    colorway: '',
    sizesText: 'S, M, L, XL',
    status: 'Concept' as SkuStatus,
    targetRetailPrice: 120,
    targetCogs: 28,
    fabricSpec: '',
    manufacturerId: '',
    supplierIds: [] as string[],
    images: ['/garments/hoodie.svg'] as string[],
    measurementsSummary: '',
    initialNote: '',
  });

  // New Note on SKU detail
  const [noteTag, setNoteTag] = useState<SkuNote['tag']>('Fit');
  const [noteText, setNoteText] = useState('');

  const filteredSkus = useMemo(() => {
    if (selectedCollectionId === 'all') return store.skus;
    return store.skus.filter((s) => s.collectionId === selectedCollectionId);
  }, [store.skus, selectedCollectionId]);

  const selectedSku = useMemo(
    () => store.skus.find((s) => s.id === selectedSkuId) || filteredSkus[0] || null,
    [store.skus, selectedSkuId, filteredSkus]
  );

  const manufacturers = useMemo(
    () => store.vendors.filter((v) => v.kind === 'manufacturer'),
    [store.vendors]
  );
  const suppliers = useMemo(
    () => store.vendors.filter((v) => v.kind === 'supplier'),
    [store.vendors]
  );

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.name.trim()) return;
    const newCol: Collection = {
      id: uid('col'),
      name: colForm.name.trim(),
      code: colForm.code.trim().toUpperCase() || `COL-${store.collections.length + 1}`,
      season: colForm.season.trim() || 'SS27',
      description: colForm.description.trim(),
      theme: colForm.theme,
      startDate: colForm.startDate,
      launchDate: colForm.launchDate,
      milestoneLabel: colForm.milestoneLabel.trim() || 'Launch',
      status: 'Planning',
      priority: colForm.priority,
      leadMemberIds: colForm.leadMemberIds.length
        ? colForm.leadMemberIds
        : [store.profile.activeMemberId],
    };
    updateStore(
      (prev) => ({
        ...prev,
        collections: [newCol, ...prev.collections],
      }),
      `Created collection "${newCol.name}"`
    );
    setSelectedCollectionId(newCol.id);
    setCollectionModalOpen(false);
    setColForm({ ...colForm, name: '', code: '', description: '' });
  };

  const openAddSku = () => {
    setEditingSkuId(null);
    setSkuForm({
      skuCode: `AKY-${String(store.skus.length + 1).padStart(3, '0')}`,
      name: '',
      collectionId:
        selectedCollectionId !== 'all' ? selectedCollectionId : store.collections[0]?.id || '',
      category: 'Hoodies',
      colorway: '',
      sizesText: 'S, M, L, XL',
      status: 'Concept',
      targetRetailPrice: 120,
      targetCogs: 28,
      fabricSpec: '',
      manufacturerId: manufacturers[0]?.id || '',
      supplierIds: [],
      images: ['/garments/hoodie.svg'],
      measurementsSummary: '',
      initialNote: '',
    });
    setSkuModalOpen(true);
  };

  const openEditSku = (sku: ProductSku) => {
    setEditingSkuId(sku.id);
    setSkuForm({
      skuCode: sku.skuCode,
      name: sku.name,
      collectionId: sku.collectionId,
      category: sku.category,
      colorway: sku.colorway,
      sizesText: sku.sizes.join(', '),
      status: sku.status,
      targetRetailPrice: sku.targetRetailPrice,
      targetCogs: sku.targetCogs,
      fabricSpec: sku.fabricSpec,
      manufacturerId: sku.manufacturerId || '',
      supplierIds: sku.supplierIds,
      images: sku.images.length ? sku.images : ['/garments/tee.svg'],
      measurementsSummary: sku.measurementsSummary,
      initialNote: '',
    });
    setSkuModalOpen(true);
  };

  const handleImageUpload = async (files: FileList | null, target: 'form' | 'detail') => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          uploadedUrls.push(data.url);
        }
      }
      if (uploadedUrls.length > 0) {
        if (target === 'form') {
          setSkuForm((prev) => ({
            ...prev,
            images: [...prev.images.filter((i) => !i.startsWith('/garments/') || prev.images.length > 1), ...uploadedUrls],
          }));
        } else if (selectedSku) {
          updateStore(
            (prev) => ({
              ...prev,
              skus: prev.skus.map((s) =>
                s.id === selectedSku.id ? { ...s, images: [...s.images, ...uploadedUrls] } : s
              ),
            }),
            'Product image uploaded'
          );
        }
      } else {
        notify('Could not upload image. Try PNG, JPG, or WebP.', 'warning');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuForm.name.trim()) return;
    const sizes = skuForm.sizesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingSkuId) {
      updateStore(
        (prev) => ({
          ...prev,
          skus: prev.skus.map((s) =>
            s.id === editingSkuId
              ? {
                  ...s,
                  skuCode: skuForm.skuCode.trim() || s.skuCode,
                  name: skuForm.name.trim(),
                  collectionId: skuForm.collectionId,
                  category: skuForm.category,
                  colorway: skuForm.colorway.trim() || 'Core',
                  sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
                  status: skuForm.status,
                  targetRetailPrice: Number(skuForm.targetRetailPrice) || 0,
                  targetCogs: Number(skuForm.targetCogs) || 0,
                  fabricSpec: skuForm.fabricSpec.trim(),
                  manufacturerId: skuForm.manufacturerId || undefined,
                  supplierIds: skuForm.supplierIds,
                  images: skuForm.images,
                  measurementsSummary: skuForm.measurementsSummary.trim(),
                }
              : s
          ),
        }),
        `Updated ${skuForm.name}`
      );
    } else {
      const newId = uid('sku');
      const newSku: ProductSku = {
        id: newId,
        skuCode: skuForm.skuCode.trim() || `AKY-${store.skus.length + 1}`,
        name: skuForm.name.trim(),
        collectionId: skuForm.collectionId || store.collections[0]?.id || '',
        category: skuForm.category,
        colorway: skuForm.colorway.trim() || 'Core',
        sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
        status: skuForm.status,
        targetRetailPrice: Number(skuForm.targetRetailPrice) || 0,
        targetCogs: Number(skuForm.targetCogs) || 0,
        fabricSpec: skuForm.fabricSpec.trim(),
        manufacturerId: skuForm.manufacturerId || undefined,
        supplierIds: skuForm.supplierIds,
        images: skuForm.images.length ? skuForm.images : ['/garments/tee.svg'],
        measurementsSummary: skuForm.measurementsSummary.trim(),
        notes: skuForm.initialNote.trim()
          ? [
              {
                id: uid('sn'),
                date: today,
                authorId: store.profile.activeMemberId,
                tag: 'General',
                text: skuForm.initialNote.trim(),
              },
            ]
          : [],
        createdAt: today,
      };
      updateStore(
        (prev) => ({
          ...prev,
          skus: [newSku, ...prev.skus],
        }),
        `Added SKU ${newSku.skuCode}`
      );
      setSelectedSkuId(newId);
      setActiveImageIdx(0);
    }
    setSkuModalOpen(false);
  };

  const handleAddSkuNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || !noteText.trim()) return;
    const note: SkuNote = {
      id: uid('sn'),
      date: today,
      authorId: store.profile.activeMemberId,
      tag: noteTag,
      text: noteText.trim(),
    };
    updateStore(
      (prev) => ({
        ...prev,
        skus: prev.skus.map((s) =>
          s.id === selectedSku.id ? { ...s, notes: [note, ...s.notes] } : s
        ),
      }),
      'Product note saved'
    );
    setNoteText('');
  };

  const handleAddToInventory = (sku: ProductSku) => {
    const exists = store.inventory.some((i) => i.skuId === sku.id);
    if (exists) {
      notify(`${sku.skuCode} is already tracked in Inventory`, 'neutral');
      return;
    }
    const stockBySize: Record<string, number> = {};
    for (const sz of sku.sizes) stockBySize[sz] = 0;

    updateStore(
      (prev) => ({
        ...prev,
        inventory: [
          {
            id: uid('inv'),
            skuId: sku.id,
            collectionId: sku.collectionId,
            manufacturerId: sku.manufacturerId,
            stockBySize,
            reorderPoint: 30,
            targetStock: 120,
            incomingQty: 0,
            ordersLast7Days: 0,
            ordersLast30Days: 0,
            totalUnitsSold: 0,
            lastOrderDate: today,
            unitCost: sku.targetCogs,
          },
          ...prev.inventory,
        ],
      }),
      `Added ${sku.skuCode} to Inventory`
    );
  };

  const marginPct = (retail: number, cogs: number) =>
    retail > 0 ? Math.round(((retail - cogs) / retail) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18]">
            Collections & Product SKUs
          </h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            Organize drops & capsules, upload product imagery, track garment specs, assign factories, and log design notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollectionModalOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#DFDCD3] bg-white px-4 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Collection
          </button>
          <button
            type="button"
            onClick={openAddSku}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white hover:bg-[#32302C]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product SKU
          </button>
        </div>
      </div>

      {/* Collection Cards / Filter Strip */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCollectionId('all')}
          className={`min-w-[170px] shrink-0 rounded-[22px] border p-4 text-left transition ${
            selectedCollectionId === 'all'
              ? 'border-[#1C1B19] bg-[#1C1B19] text-white'
              : 'border-[#E6E3DA] bg-white text-[#1B1A18] hover:border-[#CBC7BC]'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
            All Drops
          </div>
          <div className="mt-1 text-base font-bold">All SKUs ({store.skus.length})</div>
          <div className="mt-1 text-[11px] opacity-75">
            {store.collections.length} collections
          </div>
        </button>

        {store.collections.map((col) => {
          const t = PASTEL_THEMES[col.theme] || PASTEL_THEMES.peach;
          const count = store.skus.filter((s) => s.collectionId === col.id).length;
          const active = selectedCollectionId === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedCollectionId(col.id)}
              className={`min-w-[230px] shrink-0 rounded-[22px] border p-4 text-left transition ${t.cardBg} ${t.cardBorder} ${
                active ? 'ring-2 ring-[#1C1B19]' : 'hover:brightness-[0.98]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#4C4A45]">
                <span>
                  {col.code} · {col.season}
                </span>
                <span>{count} SKUs</span>
              </div>
              <div className="mt-1 truncate text-sm font-bold text-[#1B1A18]">{col.name}</div>
              <div className="mt-1 text-[11px] text-[#4C4A45]">
                Launch: {formatDisplayDate(col.launchDate)}
              </div>
            </button>
          );
        })}
      </div>

      {/* SKU Grid + Right Inspector */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={selectedSku ? 'xl:col-span-7' : 'xl:col-span-12'}>
          {filteredSkus.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#D5D1C7] bg-white p-12 text-center">
              <Layers className="mx-auto h-7 w-7 text-[#96938B]" />
              <h2 className="mt-2 text-sm font-semibold text-[#1B1A18]">No products in this view</h2>
              <p className="mt-1 text-xs text-[#75726B]">
                Add a garment SKU with images, colorway, fabric specs, and manufacturer assignment.
              </p>
              <button
                type="button"
                onClick={openAddSku}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product SKU
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredSkus.map((sku) => {
                const col = store.collections.find((c) => c.id === sku.collectionId);
                const mfg = manufacturers.find((m) => m.id === sku.manufacturerId);
                const inInventory = store.inventory.some((i) => i.skuId === sku.id);
                const selected = selectedSku?.id === sku.id;
                const margin = marginPct(sku.targetRetailPrice, sku.targetCogs);

                return (
                  <div
                    key={sku.id}
                    onClick={() => {
                      setSelectedSkuId(sku.id);
                      setActiveImageIdx(0);
                    }}
                    className={`cursor-pointer rounded-[26px] border bg-white p-4 transition ${
                      selected
                        ? 'border-[#1C1B19] ring-1 ring-[#1C1B19]'
                        : 'border-[#E6E3DA] hover:border-[#CBC7BC]'
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-[#EFECE6] bg-[#FAF9F6]">
                      <img
                        src={sku.images[0] || '/garments/tee.svg'}
                        alt={sku.name}
                        className="h-44 w-full object-contain p-2"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#1B1A18] shadow-sm">
                        {sku.skuCode}
                      </span>
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-[#1C1B19] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                        {sku.status}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[#1B1A18]">{sku.name}</h3>
                          <p className="text-[11px] text-[#6E6C66]">
                            {sku.colorway} · {col?.code || 'Unassigned'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#1B1A18] tabular-nums">
                            ${sku.targetRetailPrice}
                          </div>
                          <div className="text-[10px] font-semibold text-[#2B8A57]">
                            {margin}% margin
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-1 text-[11px] text-[#5A5852]">
                        {sku.fabricSpec || 'Fabric spec pending'}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F2EFE8] pt-2.5 text-[11px]">
                        <span className="flex items-center gap-1 truncate text-[#6E6C66]">
                          <Factory className="h-3 w-3 shrink-0" />
                          {mfg ? mfg.companyName : 'No factory assigned'}
                        </span>
                        {inInventory ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#DFF2E6] px-2 py-0.5 text-[10px] font-semibold text-[#1F6B43]">
                            <Check className="h-2.5 w-2.5" /> In Inventory
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToInventory(sku);
                            }}
                            className="rounded-full border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 py-0.5 text-[10px] font-semibold text-[#1B1A18] hover:bg-[#EFECE6]"
                          >
                            + Add to Inventory
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right SKU Detail & Notes Inspector */}
        {selectedSku && (
          <aside className="rounded-[28px] border border-[#E6E3DA] bg-white p-5 xl:col-span-5">
            <div className="flex items-start justify-between gap-2 border-b border-[#EFECE6] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#F3F2EE] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1B1A18]">
                    {selectedSku.skuCode}
                  </span>
                  <span className="rounded-full bg-[#FCF0C2] px-2.5 py-0.5 text-[11px] font-semibold text-[#845E07]">
                    {selectedSku.category}
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold text-[#1B1A18]">{selectedSku.name}</h2>
                <p className="text-xs text-[#6E6C66]">
                  Colorway: {selectedSku.colorway} · Sizes: {selectedSku.sizes.join(' / ')}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditSku(selectedSku)}
                  className="whitespace-nowrap rounded-full border border-[#DFDCD3] px-3 py-1.5 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
                >
                  Edit SKU
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateStore(
                      (prev) => ({
                        ...prev,
                        skus: prev.skus.filter((s) => s.id !== selectedSku.id),
                      }),
                      `Deleted ${selectedSku.skuCode}`
                    );
                    setSelectedSkuId(null);
                  }}
                  aria-label="Delete SKU"
                  className="rounded-full border border-[#F0D5D1] p-1.5 text-[#A8382B] hover:bg-[#FDF1EE]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Image Gallery + Quick Upload */}
            <div className="mt-4">
              <div className="relative overflow-hidden rounded-2xl border border-[#EFECE6] bg-[#FAF9F6]">
                <img
                  src={selectedSku.images[activeImageIdx] || selectedSku.images[0] || '/garments/tee.svg'}
                  alt={selectedSku.name}
                  className="h-56 w-full object-contain p-3"
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {selectedSku.images.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setActiveImageIdx(i)}
                    className={`h-12 w-12 overflow-hidden rounded-xl border bg-[#FAF9F6] ${
                      i === activeImageIdx ? 'border-[#1C1B19] ring-1 ring-[#1C1B19]' : 'border-[#E6E3DA]'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                <label className="inline-flex h-12 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#CBC7BC] bg-[#FAF9F6] px-3 text-[11px] font-semibold text-[#4C4A45] hover:bg-[#EFECE6]">
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => handleImageUpload(e.target.files, 'detail')}
                  />
                </label>
              </div>
            </div>

            {/* Costing, Specs & Sourcing */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-[#EFECE6] bg-[#FAF9F6] p-3 text-center">
              <div>
                <div className="text-[10px] text-[#75726B]">Target COGS</div>
                <div className="text-sm font-bold text-[#1B1A18] tabular-nums">
                  ${selectedSku.targetCogs}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#75726B]">Target Retail</div>
                <div className="text-sm font-bold text-[#1B1A18] tabular-nums">
                  ${selectedSku.targetRetailPrice}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#75726B]">Gross Margin</div>
                <div className="text-sm font-bold text-[#2B8A57] tabular-nums">
                  {marginPct(selectedSku.targetRetailPrice, selectedSku.targetCogs)}%
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="rounded-xl bg-[#FAF9F6] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                  Fabric & Construction Spec
                </div>
                <div className="mt-1 font-medium text-[#1B1A18]">
                  {selectedSku.fabricSpec || 'No fabric spec entered yet.'}
                </div>
                {selectedSku.measurementsSummary && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#5A5852]">
                    <Ruler className="h-3.5 w-3.5 text-[#75726B]" />
                    {selectedSku.measurementsSummary}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[#FAF9F6] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                  Assigned Manufacturer & Suppliers
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedSku.manufacturerId ? (
                    <Link
                      href="/manufacturers"
                      className="inline-flex items-center gap-1 rounded-full bg-[#DFF2E6] px-2.5 py-1 text-[11px] font-semibold text-[#1F6B43]"
                    >
                      <Factory className="h-3 w-3" />
                      {manufacturers.find((m) => m.id === selectedSku.manufacturerId)?.companyName ||
                        'Factory'}
                    </Link>
                  ) : (
                    <span className="text-[11px] text-[#75726B]">No manufacturer assigned</span>
                  )}

                  {selectedSku.supplierIds.map((sid) => {
                    const sup = suppliers.find((s) => s.id === sid);
                    if (!sup) return null;
                    return (
                      <Link
                        key={sid}
                        href="/suppliers"
                        className="inline-flex items-center gap-1 rounded-full bg-[#E5E3FA] px-2.5 py-1 text-[11px] font-semibold text-[#4B3EA8]"
                      >
                        <Package className="h-3 w-3" />
                        {sup.companyName}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleAddToInventory(selectedSku)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#DFDCD3] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
                >
                  <Boxes className="h-3.5 w-3.5" />
                  {store.inventory.some((i) => i.skuId === selectedSku.id)
                    ? 'Tracked in Inventory'
                    : 'Track in Inventory'}
                </button>

                <select
                  aria-label="Update SKU development status"
                  value={selectedSku.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as SkuStatus;
                    updateStore(
                      (prev) => ({
                        ...prev,
                        skus: prev.skus.map((s) =>
                          s.id === selectedSku.id ? { ...s, status: nextStatus } : s
                        ),
                      }),
                      'SKU stage updated'
                    );
                  }}
                  className="h-8 rounded-full border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-xs font-semibold"
                >
                  {SKU_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Notes & Fit Feedback */}
            <div className="mt-5 border-t border-[#EFECE6] pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#1B1A18]">
                <MessageSquare className="h-3.5 w-3.5" />
                Product Notes & Fit Log ({selectedSku.notes.length})
              </div>

              <form onSubmit={handleAddSkuNote} className="space-y-2 rounded-2xl bg-[#FAF9F6] p-3">
                <div className="flex gap-2">
                  <select
                    aria-label="Note tag"
                    value={noteTag}
                    onChange={(e) => setNoteTag(e.target.value as SkuNote['tag'])}
                    className="h-8 rounded-lg border border-[#DFDCD3] bg-white px-2 text-xs font-medium"
                  >
                    <option value="Fit">Fit</option>
                    <option value="Fabric">Fabric</option>
                    <option value="Sample">Sample</option>
                    <option value="Costing">Costing</option>
                    <option value="General">General</option>
                  </select>
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add fit tweak, shrinkage note, or measurement update..."
                    className="h-8 flex-1 rounded-lg border border-[#DFDCD3] bg-white px-2.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-lg bg-[#1C1B19] px-3 text-xs font-semibold text-white"
                  >
                    Post
                  </button>
                </div>
              </form>

              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {selectedSku.notes.length === 0 ? (
                  <p className="text-xs text-[#8A877F]">No product notes yet.</p>
                ) : (
                  selectedSku.notes.map((n) => {
                    const author = store.team.find((m) => m.id === n.authorId);
                    return (
                      <div
                        key={n.id}
                        className="rounded-xl border border-[#F0EDE6] bg-[#FAF9F6] p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AvatarBadge member={author} size="xs" />
                            <span className="font-semibold text-[#1B1A18]">
                              {author?.name.split(' ')[0] || 'Team'}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5A5852]">
                              {n.tag}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#75726B]">
                            {formatDisplayDate(n.date)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[#3C3A36]">{n.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Create Collection Modal */}
      <ModalDialog
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        title="Create New Collection"
        subtitle="Group upcoming garments and launches into a seasonal drop or capsule."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveCollection} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="c-name" className="block text-xs font-semibold text-[#3C3A36]">
                Collection Name *
              </label>
              <input
                id="c-name"
                required
                value={colForm.name}
                onChange={(e) => setColForm({ ...colForm, name: e.target.value })}
                placeholder="e.g. Drop 02 · Coastal Linen"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="c-code" className="block text-xs font-semibold text-[#3C3A36]">
                Code
              </label>
              <input
                id="c-code"
                value={colForm.code}
                onChange={(e) => setColForm({ ...colForm, code: e.target.value })}
                placeholder="DROP-02"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="c-season" className="block text-xs font-semibold text-[#3C3A36]">
                Season
              </label>
              <input
                id="c-season"
                value={colForm.season}
                onChange={(e) => setColForm({ ...colForm, season: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="c-theme" className="block text-xs font-semibold text-[#3C3A36]">
                Card Tint
              </label>
              <select
                id="c-theme"
                value={colForm.theme}
                onChange={(e) => setColForm({ ...colForm, theme: e.target.value as PastelTheme })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                <option value="peach">Warm Peach</option>
                <option value="sage">Fresh Sage</option>
                <option value="lavender">Soft Lavender</option>
                <option value="blush">Blush Rose</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-pri" className="block text-xs font-semibold text-[#3C3A36]">
                Priority
              </label>
              <select
                id="c-pri"
                value={colForm.priority}
                onChange={(e) =>
                  setColForm({ ...colForm, priority: e.target.value as Collection['priority'] })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                <option value="High Priority">High Priority</option>
                <option value="Mid Priority">Mid Priority</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-start" className="block text-xs font-semibold text-[#3C3A36]">
                Start Date
              </label>
              <input
                id="c-start"
                type="date"
                value={colForm.startDate}
                onChange={(e) => setColForm({ ...colForm, startDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="c-launch" className="block text-xs font-semibold text-[#3C3A36]">
                Target Launch Date
              </label>
              <input
                id="c-launch"
                type="date"
                value={colForm.launchDate}
                onChange={(e) => setColForm({ ...colForm, launchDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="c-desc" className="block text-xs font-semibold text-[#3C3A36]">
              Description & Direction
            </label>
            <textarea
              id="c-desc"
              rows={2}
              value={colForm.description}
              onChange={(e) => setColForm({ ...colForm, description: e.target.value })}
              placeholder="Silhouettes, fabric direction, and drop narrative..."
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCollectionModalOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              Create Collection
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Add / Edit Product SKU Modal */}
      <ModalDialog
        open={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        title={editingSkuId ? 'Edit Product SKU' : 'Add New Product SKU'}
        subtitle="Track garment images, fabric specs, target margin, manufacturer, and trim suppliers."
      >
        <form onSubmit={handleSaveSku} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="s-code" className="block text-xs font-semibold text-[#3C3A36]">
                SKU Code *
              </label>
              <input
                id="s-code"
                required
                value={skuForm.skuCode}
                onChange={(e) => setSkuForm({ ...skuForm, skuCode: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="s-name" className="block text-xs font-semibold text-[#3C3A36]">
                Product Name *
              </label>
              <input
                id="s-name"
                required
                value={skuForm.name}
                onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })}
                placeholder="e.g. Heavyweight Zip Hoodie"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="s-col" className="block text-xs font-semibold text-[#3C3A36]">
                Collection
              </label>
              <select
                id="s-col"
                value={skuForm.collectionId}
                onChange={(e) => setSkuForm({ ...skuForm, collectionId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                {store.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-cat" className="block text-xs font-semibold text-[#3C3A36]">
                Category
              </label>
              <select
                id="s-cat"
                value={skuForm.category}
                onChange={(e) => setSkuForm({ ...skuForm, category: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                {SKU_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-status" className="block text-xs font-semibold text-[#3C3A36]">
                Stage
              </label>
              <select
                id="s-status"
                value={skuForm.status}
                onChange={(e) => setSkuForm({ ...skuForm, status: e.target.value as SkuStatus })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                {SKU_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="s-color" className="block text-xs font-semibold text-[#3C3A36]">
                Colorway
              </label>
              <input
                id="s-color"
                value={skuForm.colorway}
                onChange={(e) => setSkuForm({ ...skuForm, colorway: e.target.value })}
                placeholder="Washed Charcoal"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="s-sizes" className="block text-xs font-semibold text-[#3C3A36]">
                Sizes (comma)
              </label>
              <input
                id="s-sizes"
                value={skuForm.sizesText}
                onChange={(e) => setSkuForm({ ...skuForm, sizesText: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="s-cogs" className="block text-xs font-semibold text-[#3C3A36]">
                Target COGS ($)
              </label>
              <input
                id="s-cogs"
                type="number"
                step="0.5"
                value={skuForm.targetCogs}
                onChange={(e) =>
                  setSkuForm({ ...skuForm, targetCogs: Number(e.target.value) || 0 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="s-retail" className="block text-xs font-semibold text-[#3C3A36]">
                Retail Price ($)
              </label>
              <input
                id="s-retail"
                type="number"
                value={skuForm.targetRetailPrice}
                onChange={(e) =>
                  setSkuForm({ ...skuForm, targetRetailPrice: Number(e.target.value) || 0 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="s-mfg" className="block text-xs font-semibold text-[#3C3A36]">
                Assigned Manufacturer
              </label>
              <select
                id="s-mfg"
                value={skuForm.manufacturerId}
                onChange={(e) => setSkuForm({ ...skuForm, manufacturerId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                <option value="">Unassigned</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.companyName} ({m.country})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-fabric" className="block text-xs font-semibold text-[#3C3A36]">
                Fabric & Trim Spec
              </label>
              <input
                id="s-fabric"
                value={skuForm.fabricSpec}
                onChange={(e) => setSkuForm({ ...skuForm, fabricSpec: e.target.value })}
                placeholder="e.g. 460gsm Organic Loopback Fleece"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          {suppliers.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-[#3C3A36]">
                Linked Material / Trim Suppliers
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {suppliers.map((sup) => {
                  const checked = skuForm.supplierIds.includes(sup.id);
                  return (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() =>
                        setSkuForm((prev) => ({
                          ...prev,
                          supplierIds: checked
                            ? prev.supplierIds.filter((id) => id !== sup.id)
                            : [...prev.supplierIds, sup.id],
                        }))
                      }
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        checked
                          ? 'bg-[#1C1B19] text-white'
                          : 'border border-[#DFDCD3] bg-[#FAF9F6] text-[#4C4A45]'
                      }`}
                    >
                      {sup.companyName} ({sup.category})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Images Upload & Garment Flats */}
          <div>
            <span className="block text-xs font-semibold text-[#3C3A36]">Product Images</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {skuForm.images.map((img, i) => (
                <div
                  key={`${img}-${i}`}
                  className="relative h-14 w-14 overflow-hidden rounded-xl border border-[#DFDCD3] bg-[#FAF9F6]"
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  {skuForm.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSkuForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1 text-[9px] text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <label className="inline-flex h-14 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#CBC7BC] bg-[#FAF9F6] px-3 text-xs font-semibold text-[#4C4A45] hover:bg-[#EFECE6]">
                <ImagePlus className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleImageUpload(e.target.files, 'form')}
                />
              </label>
              <div className="flex flex-wrap gap-1">
                {STARTER_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() =>
                      setSkuForm((prev) => ({
                        ...prev,
                        images: prev.images.includes(preset.url)
                          ? prev.images
                          : [preset.url, ...prev.images],
                      }))
                    }
                    className="rounded-lg border border-[#E5E2DA] bg-white px-2 py-1 text-[10px] font-medium text-[#5A5852] hover:bg-[#F3F2EE]"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!editingSkuId && (
            <div>
              <label htmlFor="s-note" className="block text-xs font-semibold text-[#3C3A36]">
                Initial Product Note (optional)
              </label>
              <textarea
                id="s-note"
                rows={2}
                value={skuForm.initialNote}
                onChange={(e) => setSkuForm({ ...skuForm, initialNote: e.target.value })}
                placeholder="Fit references, wash instructions, or sample notes..."
                className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-2.5 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSkuModalOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              {editingSkuId ? 'Save Changes' : 'Create Product SKU'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
