import React, { useState } from 'react';
import { InventoryState } from '../utils/inventoryLogic';
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

interface CatalogSuppliersViewProps {
  state: InventoryState;
  onAddProduct: (payload: {
    sku: string;
    product_name: string;
    category: string;
    opening_balance: number;
    reorder_level: number;
    unit_cost: number;
  }) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onAddSupplier: (payload: {
    supplier_name: string;
    contact_email: string;
    lead_time_days: number;
  }) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onResetDemo: () => Promise<void>;
}

export const CatalogSuppliersView: React.FC<CatalogSuppliersViewProps> = ({
  state,
  onAddProduct,
  onAddSupplier,
  onResetDemo,
}) => {
  // Product Form State
  const [sku, setSku] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Sensors & Actuators');
  const [openingBalance, setOpeningBalance] = useState('25');
  const [reorderLevel, setReorderLevel] = useState('15');
  const [unitCost, setUnitCost] = useState('45.00');
  const [prodFeedback, setProdFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Supplier Form State
  const [supplierName, setSupplierName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('5');
  const [supFeedback, setSupFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFeedback(null);
    const res = await onAddProduct({
      sku: sku.trim(),
      product_name: productName.trim(),
      category: category.trim(),
      opening_balance: parseInt(openingBalance, 10),
      reorder_level: parseInt(reorderLevel, 10),
      unit_cost: parseFloat(unitCost),
    });
    if (!res.ok) {
      setProdFeedback({ type: 'error', text: res.error || 'Failed to add product.' });
    } else {
      setProdFeedback({ type: 'success', text: res.message || 'Product added.' });
      setSku('');
      setProductName('');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupFeedback(null);
    const res = await onAddSupplier({
      supplier_name: supplierName.trim(),
      contact_email: contactEmail.trim(),
      lead_time_days: parseInt(leadTimeDays, 10),
    });
    if (!res.ok) {
      setSupFeedback({ type: 'error', text: res.error || 'Failed to add supplier.' });
    } else {
      setSupFeedback({ type: 'success', text: res.message || 'Supplier added.' });
      setSupplierName('');
      setContactEmail('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Add Product Form */}
        <section aria-labelledby="add-product-heading" className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-6">
          <h2 id="add-product-heading" className="text-base font-semibold text-white">
            Register New Product SKU
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inserts into the <span className="font-mono text-sky-400">products</span> table with opening balance, configurable reorder threshold, and unit cost.
          </p>

          <form onSubmit={handleCreateProduct} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-sku" className="block text-xs font-medium text-slate-300 mb-1">
                  SKU Code
                </label>
                <input
                  id="new-sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-109"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="new-category" className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <input
                  id="new-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-prod-name" className="block text-xs font-medium text-slate-300 mb-1">
                Product Name
              </label>
              <input
                id="new-prod-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Inductive Proximity Sensor M12"
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="new-opening" className="block text-xs font-medium text-slate-300 mb-1">
                  Opening Balance
                </label>
                <input
                  id="new-opening"
                  type="number"
                  min={0}
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="new-reorder" className="block text-xs font-medium text-slate-300 mb-1">
                  Reorder Level
                </label>
                <input
                  id="new-reorder"
                  type="number"
                  min={0}
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="new-cost" className="block text-xs font-medium text-slate-300 mb-1">
                  Unit Cost ($)
                </label>
                <input
                  id="new-cost"
                  type="number"
                  step="0.01"
                  min={0}
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                />
              </div>
            </div>

            {prodFeedback && (
              <div
                role="alert"
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  prodFeedback.type === 'error'
                    ? 'bg-red-950/60 border-red-500/40 text-red-200'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                }`}
              >
                {prodFeedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{prodFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Add Product to Catalog
            </button>
          </form>
        </section>

        {/* Add Supplier Form */}
        <section aria-labelledby="add-supplier-heading" className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-6">
          <h2 id="add-supplier-heading" className="text-base font-semibold text-white">
            Register New Supplier
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inserts into the <span className="font-mono text-sky-400">suppliers</span> table for linking inbound stock deliveries.
          </p>

          <form onSubmit={handleCreateSupplier} className="mt-5 space-y-4">
            <div>
              <label htmlFor="sup-name" className="block text-xs font-medium text-slate-300 mb-1">
                Supplier Name
              </label>
              <input
                id="sup-name"
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Rhine Valley Automation GmbH"
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sup-email" className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Email
                </label>
                <input
                  id="sup-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="orders@rhineautomation.de"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="sup-lead" className="block text-xs font-medium text-slate-300 mb-1">
                  Estimated Lead Time (Days)
                </label>
                <input
                  id="sup-lead"
                  type="number"
                  min={1}
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                />
              </div>
            </div>

            {supFeedback && (
              <div
                role="alert"
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  supFeedback.type === 'error'
                    ? 'bg-red-950/60 border-red-500/40 text-red-200'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                }`}
              >
                {supFeedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{supFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Add Supplier
            </button>
          </form>
        </section>
      </div>

      {/* Suppliers Directory Table */}
      <section aria-labelledby="suppliers-list-heading" className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-[#111a2e]/50">
          <div>
            <h2 id="suppliers-list-heading" className="text-base font-semibold text-white">
              Registered Suppliers ({state.suppliers.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active vendors linked to <span className="font-mono text-slate-300">stock_transactions.supplier_id</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Seed Data</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-medium text-slate-400">
                <th className="py-3 px-4">Supplier ID</th>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Email</th>
                <th className="py-3 px-4 text-right">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {state.suppliers.map((s) => (
                <tr key={s.supplier_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-xs text-sky-400">
                    SUP-{s.supplier_id}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-100">
                    {s.supplier_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">
                    {s.contact_email || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-300">
                    {s.lead_time_days} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
