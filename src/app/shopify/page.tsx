'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { getTotalStock } from '@/lib/reorderEngine';

export default function ShopifyPrepPage() {
  const { store, updateStore, notify } = useAkoya();
  const [domain, setDomain] = useState(store.profile.shopifyStoreDomain || '');

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore(
      (prev) => ({
        ...prev,
        profile: { ...prev.profile, shopifyStoreDomain: domain.trim() },
      }),
      'Planned Shopify store domain saved'
    );
  };

  const handleExportShopifyCsv = () => {
    const header = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Type',
      'Tags',
      'Option1 Name',
      'Option1 Value',
      'Variant SKU',
      'Variant Inventory Qty',
      'Variant Price',
      'Cost per item',
    ];

    const rows: string[][] = [];
    for (const sku of store.skus) {
      const inv = store.inventory.find((i) => i.skuId === sku.id);
      const handle = sku.skuCode.toLowerCase();
      sku.sizes.forEach((sz, idx) => {
        const qty = inv?.stockBySize[sz] ?? 0;
        rows.push([
          handle,
          idx === 0 ? sku.name : '',
          idx === 0 ? `${sku.fabricSpec} (${sku.colorway})` : '',
          idx === 0 ? store.profile.brandName : '',
          idx === 0 ? sku.category : '',
          idx === 0 ? sku.colorway : '',
          'Size',
          sz,
          `${sku.skuCode}-${sz}`,
          String(qty),
          String(sku.targetRetailPrice),
          String(sku.targetCogs),
        ]);
      });
    }

    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csv = [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
      '\n'
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.profile.brandName.toLowerCase().replace(/\s+/g, '-')}-shopify-skus.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported Shopify-ready product & inventory CSV');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FCF0C2] px-3 py-1 text-[11px] font-bold text-[#845E07]">
            <Sparkles className="h-3.5 w-3.5" /> Phase 2 Integration Ready
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1B1A18]">
            Shopify Storefront Sync (Coming Soon)
          </h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            Your Akoya SKUs, size variants, and inventory counts are already structured for Shopify Admin API & Order Webhooks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportShopifyCsv}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white hover:bg-[#32302C]"
        >
          <Download className="h-3.5 w-3.5" />
          Export Shopify Product CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Store Config & Sync Roadmap */}
        <section className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 lg:col-span-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DFF2E6] text-[#1F6B43]">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1B1A18]">Pre-Connection Setup</h2>
              <p className="text-xs text-[#6E6C66]">
                Save your planned Shopify domain now; OAuth & webhooks plug in later.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveDomain} className="mt-5 space-y-3">
            <div>
              <label htmlFor="shop-domain" className="block text-xs font-semibold text-[#3C3A36]">
                Planned Shopify Store Domain
              </label>
              <input
                id="shop-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="your-brand.myshopify.com"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white"
            >
              Save Store Domain
            </button>
          </form>

          <div className="mt-6 space-y-2.5 border-t border-[#EFECE6] pt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A877F]">
              What syncs automatically when connected
            </div>
            {[
              'Push Collection SKUs, photos, sizes, and COGS straight to Shopify Products',
              'Real-time orders/create webhook deducts size stock & updates 7d/30d order velocity',
              'Automatic low-stock + high-order triggers recommend factory Purchase Orders',
              'Sync incoming PO quantities as Shopify Draft / Pre-Order inventory',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-xs text-[#4C4A45]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2B8A57]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Live Pre-Sync Catalog Preview */}
        <section className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1B1A18]">
                Catalog Mapping Preview ({store.skus.length} SKUs)
              </h2>
              <p className="text-xs text-[#6E6C66]">
                Every SKU & size run below is ready to import into Shopify via CSV or API.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F2EE] px-3 py-1 text-[11px] font-semibold text-[#5A5852]">
              <RefreshCw className="h-3 w-3" /> Standby Mode
            </span>
          </div>

          <div className="space-y-2.5">
            {store.skus.map((sku) => {
              const inv = store.inventory.find((i) => i.skuId === sku.id);
              const total = inv ? getTotalStock(inv) : 0;
              return (
                <div
                  key={sku.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#EFECE6] bg-[#FAF9F6] p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={sku.images[0] || '/garments/tee.svg'}
                      alt={sku.name}
                      className="h-11 w-11 rounded-xl border border-[#E6E3DA] bg-white object-contain p-1"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[#1B1A18]">{sku.name}</div>
                      <div className="font-mono text-[10px] text-[#75726B]">
                        {sku.skuCode} · {sku.sizes.length} size variants ({sku.sizes.join(', ')})
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right text-xs">
                    <div>
                      <div className="font-bold text-[#1B1A18]">${sku.targetRetailPrice}</div>
                      <div className="text-[10px] text-[#75726B]">{total} in stock</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#8A877F]" />
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#4C4A45] ring-1 ring-[#E6E3DA]">
                      Shopify Ready
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
