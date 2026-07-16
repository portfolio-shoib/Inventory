import React, { useState, useMemo } from "react";
import { InventoryItem, CATEGORIES } from "../types";
import Logo from "./Logo";
import { 
  Search, 
  Filter, 
  Plus, 
  Minus,
  Edit2, 
  Trash2, 
  AlertTriangle, 
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Printer
} from "lucide-react";

interface ItemListProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string | number) => Promise<void>;
  onAddNew: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  connectionMode: "demo" | "live";
  webAppUrl?: string;
  onAdjustQuantity: (item: InventoryItem, delta: number) => Promise<void>;
}

type SortField = "Item Name" | "SKU" | "Category" | "Quantity" | "Unit Price" | "Total Value" | "Last Updated" | "Description" | "Weight Value" | "Vendor Name" | "Vendor Contact";
type SortDirection = "asc" | "desc";

export default function ItemList({
  items,
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
  isRefreshing,
  categoryFilter,
  setCategoryFilter,
  connectionMode,
  webAppUrl,
  onAdjustQuantity,
}: ItemListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const [sortField, setSortField] = useState<SortField>("Item Name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (item["Item Name"] || "").toLowerCase().includes(query) ||
          (item.SKU || "").toLowerCase().includes(query) ||
          String(item.ID).toLowerCase().includes(query);
        
        const matchesCategory = categoryFilter ? item.Category === categoryFilter : true;
        
        const qty = Number(item.Quantity) || 0;
        const matchesLowStock = showOnlyLowStock ? qty <= 10 : true;

        return matchesSearch && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Safely parse numbers for calculation/comparison
        if (sortField === "Quantity" || sortField === "Unit Price" || sortField === "Total Value") {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [items, searchQuery, categoryFilter, showOnlyLowStock, sortField, sortDirection]);

  // Total calculated metrics of the FILTERED items
  const totalFilteredValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (Number(item["Total Value"]) || 0), 0);
  }, [filteredItems]);

  const confirmDelete = async () => {
    if (itemToDelete) {
      await onDelete(itemToDelete.ID);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-4" id="item-list-container">
      {/* Print-Only Professional Header */}
      <div className="hidden print:block border-b border-teal-600/30 pb-5 mb-6" id="print-report-header">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-black text-gray-950 tracking-tight leading-none">
                Swot<span className="text-[#1BC2A4]">.works</span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-wider text-teal-700/80 mt-1">Inventory Management Portal</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight uppercase">Inventory Stock Report</h2>
            <div className="text-[9px] text-gray-500 font-medium mt-1.5 space-y-0.5">
              <div>Date Generated: <span className="font-semibold text-gray-800">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
              <div>Database Connection: <span className="font-semibold text-gray-800">{connectionMode === "live" ? "Google Sheets Live" : "Local Demo Storage"}</span></div>
              <div>Filtered Category: <span className="font-semibold text-gray-800">{categoryFilter || "All Categories"}{showOnlyLowStock ? " (Low Stock Only)" : ""}</span></div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-teal-50/40 p-3.5 rounded-lg border border-teal-100/70 flex flex-col justify-between" id="print-card-skus">
            <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">Total SKUs Listed</span>
            <span className="text-lg font-black text-teal-900 mt-1">{filteredItems.length} items</span>
          </div>
          <div className="bg-teal-50/40 p-3.5 rounded-lg border border-teal-100/70 flex flex-col justify-between" id="print-card-units">
            <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">Total Stock Units</span>
            <span className="text-lg font-black text-teal-900 mt-1">
              {filteredItems.reduce((sum, item) => sum + (Number(item.Quantity) || 0), 0).toLocaleString()} pcs
            </span>
          </div>
          <div className="bg-teal-50/40 p-3.5 rounded-lg border border-teal-100/70 flex flex-col justify-between" id="print-card-valuation">
            <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">Total Stock Valuation</span>
            <span className="text-lg font-black text-teal-900 mt-1">
              Rs. {totalFilteredValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Top Filter & Operations Controls Panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="controls-panel">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by item name, SKU, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm bg-gray-50 hover:bg-gray-50/80 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-hidden"
              id="search-input"
            />
          </div>

          {/* Category Selector */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-lg outline-hidden cursor-pointer w-full sm:w-48"
              id="category-filter-select"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              showOnlyLowStock
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
            id="btn-toggle-lowstock"
          >
            <AlertTriangle className={`w-4 h-4 ${showOnlyLowStock ? "text-amber-600" : "text-gray-400"}`} />
            Low Stock Only
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto print:hidden">
          {/* Print Report Button */}
          <button
            onClick={() => {
              window.focus();
              window.print();
            }}
            title="Print inventory list view"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            id="btn-print-report"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Print Report</span>
          </button>

          {/* Refresh/Sync button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Force synchronization with database"
            className="p-2 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            id="btn-sync-database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Add Item Button */}
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            id="btn-add-item-trigger"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Iframe print warning hint */}
      {isIframe && (
        <div className="bg-amber-50/50 border border-amber-200/40 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2.5 print:hidden" id="iframe-print-tip">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">Printing Hint</p>
            <p className="text-amber-700/95 leading-relaxed">
              Because this application is running inside a secure preview pane, some browsers block printing tasks. If nothing happens when you click "Print Report", click the <strong className="text-amber-900 font-semibold">"Open in New Tab"</strong> button in the top-right corner, then print flawlessly!
            </p>
          </div>
        </div>
      )}

      {/* Connection Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-gray-500 print:hidden">
        <div>
          Showing <span className="font-semibold text-gray-800">{filteredItems.length}</span> of <span className="font-semibold text-gray-800">{items.length}</span> items
          {categoryFilter && <span> in <span className="font-semibold text-gray-800">{categoryFilter}</span></span>}
          {showOnlyLowStock && <span className="text-amber-600 font-semibold"> (Low stock filtered)</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span>Database Mode:</span>
          {connectionMode === "live" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              ● Google Sheet Live
              {webAppUrl && (
                <a 
                  href={webAppUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-500 hover:text-emerald-700 inline-block"
                  title="View Web App Endpoint"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200/50">
              ● Local Demo Storage
            </span>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden" id="inventory-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="inventory-table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                
                <th 
                  onClick={() => handleSort("Item Name")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Item Name
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Description")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Description
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Category")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Category
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Quantity")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Quantity
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Unit Price")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Unit Price
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Weight Value")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Weight
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Vendor Name")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Vendor Name
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Vendor Contact")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Vendor Contact
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Total Value")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Total Value
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Last Updated")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Last Updated
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors print:hidden" />
                  </div>
                </th>

                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right print:hidden">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                      <span className="text-sm font-medium text-gray-700">No inventory items found</span>
                      <span className="text-xs text-gray-400">Try adjusting your filters, searching for something else, or creating a new item!</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const qty = Number(item.Quantity) || 0;
                  const isOutOfStock = qty === 0;
                  const isLowStock = qty > 0 && qty <= 10;

                  return (
                    <tr 
                      key={item.ID} 
                      className={`hover:bg-gray-50/50 transition-colors ${
                        isOutOfStock ? "bg-rose-50/30" : isLowStock ? "bg-amber-50/15" : ""
                      }`}
                      id={`inventory-row-${item.ID}`}
                    >
                      {/* ID */}
                      <td className="p-4 text-xs font-mono text-gray-500 font-semibold">{item.ID}</td>
                      
                      {/* Item Name */}
                      <td className="p-4">
                        <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{item["Item Name"]}</div>
                      </td>

                      {/* Description */}
                      <td className="p-4">
                        {item.Description ? (
                          <div className="text-xs text-gray-600 max-w-[160px] truncate" title={item.Description}>
                            {item.Description}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No notes</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.Category}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Decrement Button */}
                          <button
                            onClick={() => onAdjustQuantity(item, -1)}
                            disabled={qty <= 0}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer print:hidden"
                            title="Quick Decrement (-1)"
                            id={`btn-qty-dec-${item.ID}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="text-right min-w-14">
                            <div className="text-sm font-semibold font-mono text-gray-900 flex items-baseline justify-end gap-0.5">
                              {qty.toLocaleString()}{" "}
                              <span className="text-[10px] text-gray-400 font-sans font-medium lowercase">
                                {item.Unit || "pcs"}
                              </span>
                            </div>
                            
                            {isOutOfStock && (
                              <span className="inline-block text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded uppercase leading-none mt-0.5 whitespace-nowrap print:border print:border-rose-400">
                                Out of Stock
                              </span>
                            )}
                            {isLowStock && (
                              <span className="inline-block text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded uppercase leading-none mt-0.5 whitespace-nowrap print:border print:border-amber-400">
                                Low Stock
                              </span>
                            )}
                          </div>

                          {/* Quick Increment Button */}
                          <button
                            onClick={() => onAdjustQuantity(item, 1)}
                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer print:hidden"
                            title="Quick Increment (+1)"
                            id={`btn-qty-inc-${item.ID}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="p-4 text-right font-mono text-sm text-gray-700 whitespace-nowrap">
                        <div>Rs. {(Number(item["Unit Price"]) || 0).toFixed(2)}</div>
                        <div className="text-[9px] text-gray-400 font-sans font-medium lowercase">
                          per {item["Weight Value"] && Number(item["Weight Value"]) > 0 ? "kg" : (item.Unit || "unit")}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="p-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                        {item["Weight Value"] && Number(item["Weight Value"]) > 0 ? (
                          <span>⚖️ {item["Weight Value"]}{item["Weight Unit"] || "g"}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Vendor Name */}
                      <td className="p-4 text-xs font-medium text-gray-700 whitespace-nowrap">
                        {item["Vendor Name"] || <span className="text-gray-400 italic">—</span>}
                      </td>

                      {/* Vendor Contact */}
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                        {item["Vendor Contact"] || <span className="text-gray-400 italic">—</span>}
                      </td>

                      {/* Total Value */}
                      <td className="p-4 text-right font-mono text-sm font-semibold text-indigo-950 whitespace-nowrap">
                        Rs. {(Number(item["Total Value"]) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Last Updated */}
                      <td className="p-4 text-2xs text-gray-500 whitespace-nowrap">
                        {item["Last Updated"] || "N/A"}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Item"
                            id={`btn-edit-${item.ID}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Item"
                            id={`btn-delete-${item.ID}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Filtered Valuation Summary */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50/70 border-t border-gray-100 font-semibold text-gray-900">
                  <td colSpan={9} className="p-4 text-right text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Filtered Inventory Valuation:
                  </td>
                  <td className="p-4 text-right font-mono text-base text-indigo-900 font-bold">
                    Rs. {totalFilteredValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55" id="delete-modal">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3.5 text-rose-800">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Delete Inventory Item?</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong>{itemToDelete["Item Name"]}</strong> ({itemToDelete.ID})? This action cannot be undone and will update your spreadsheet immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                id="btn-cancel-delete"
              >
                Keep Item
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                id="btn-confirm-delete"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
