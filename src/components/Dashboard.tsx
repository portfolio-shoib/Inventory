import React from "react";
import { InventoryItem, CATEGORIES } from "../types";
import { 
  Package, 
  DollarSign, 
  AlertCircle, 
  TrendingUp, 
  Layers, 
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  CheckCircle
} from "lucide-react";

interface DashboardProps {
  items: InventoryItem[];
  setActiveTab: (tab: string) => void;
  setCategoryFilter: (cat: string) => void;
}

export default function Dashboard({ items, setActiveTab, setCategoryFilter }: DashboardProps) {
  // Calculations
  const totalItemsCount = items.length;
  
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.Quantity) || 0), 0);
  
  const totalValue = items.reduce((sum, item) => sum + (Number(item["Total Value"]) || 0), 0);
  
  const averagePrice = totalItemsCount > 0 
    ? items.reduce((sum, item) => sum + (Number(item["Unit Price"]) || 0), 0) / totalItemsCount 
    : 0;

  const lowStockThreshold = 10;
  const lowStockItems = items.filter(item => {
    const qty = Number(item.Quantity) || 0;
    return qty > 0 && qty <= lowStockThreshold;
  });

  const outOfStockItems = items.filter(item => (Number(item.Quantity) || 0) === 0);

  // Category breakdown calculation
  const categoryData = CATEGORIES.map(category => {
    const catItems = items.filter(item => item.Category === category);
    const count = catItems.length;
    const value = catItems.reduce((sum, item) => sum + (Number(item["Total Value"]) || 0), 0);
    return {
      category,
      count,
      value
    };
  }).filter(c => c.count > 0) // Only show categories with items
    .sort((a, b) => b.value - a.value); // Sort by highest value first

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Critical Stock Alerts */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
        <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="alerts-banner">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" id="alert-banner-icon" />
            <div>
              <h4 className="font-semibold text-rose-900 text-sm">Critical Inventory Action Required</h4>
              <p className="text-xs text-rose-700/90 mt-1">
                You have {outOfStockItems.length} items completely out of stock and {lowStockItems.length} items with low stock (10 or fewer units).
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setCategoryFilter("");
              setActiveTab("inventory");
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start md:self-auto"
            id="btn-fix-stock"
          >
            Manage Stock
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Card 1: Total Stock Value */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between" id="kpi-total-val">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</span>
            <div className="text-2xl font-bold text-gray-900 font-sans">
              Rs. {totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>All assets accounted</span>
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Items (SKUs) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between" id="kpi-total-items">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items (SKUs)</span>
            <div className="text-2xl font-bold text-gray-900">
              {totalItemsCount}
            </div>
            <p className="text-xs text-gray-400">
              Across {categoryData.length} active categories
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Out of Stock */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between" id="kpi-out-stock">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Out of Stock</span>
            <div className={`text-2xl font-bold ${outOfStockItems.length > 0 ? "text-rose-600" : "text-gray-900"}`}>
              {outOfStockItems.length}
            </div>
            <p className="text-xs text-gray-400">
              {outOfStockItems.length > 0 ? "Requires urgent replenishment" : "All items are in stock"}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${outOfStockItems.length > 0 ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-400"}`}>
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between" id="kpi-low-stock">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Low Stock Warnings</span>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {lowStockItems.length}
            </div>
            <p className="text-xs text-gray-400">
              Quantity is 10 or fewer units
            </p>
          </div>
          <div className={`p-3 rounded-xl ${lowStockItems.length > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-charts-grid">
        {/* Category Breakdown Progress Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-xs p-6" id="category-distribution-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Category Distribution</h3>
              <p className="text-xs text-gray-500 mt-0.5">Asset value and unit distribution per category</p>
            </div>
            <Layers className="w-5 h-5 text-gray-400" />
          </div>

          {categoryData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-gray-400">
              No inventory data to display category metrics.
            </div>
          ) : (
            <div className="space-y-5" id="category-progress-bars">
              {categoryData.map(({ category, count, value }, index) => {
                const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                return (
                  <div key={category} className="space-y-1.5" id={`category-item-${index}`}>
                    <div className="flex justify-between text-xs font-medium">
                      <button
                        onClick={() => {
                          setCategoryFilter(category);
                          setActiveTab("inventory");
                        }}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline text-left cursor-pointer font-medium"
                      >
                        {category} ({count} {count === 1 ? 'item' : 'items'})
                      </button>
                      <span className="text-gray-900">
                        Rs. {value.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Watchlist */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-100 shadow-xs p-6 flex flex-col" id="watchlist-card">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 text-base">Stock Watchlist</h3>
            <p className="text-xs text-gray-500 mt-0.5">Items needing immediate reorder or replenishment</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-gray-50 pr-1" id="watchlist-items">
            {outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10" id="watchlist-empty">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <span className="text-sm font-medium text-gray-800">Perfect Stock Levels!</span>
                <span className="text-xs text-gray-400 mt-0.5">No items are low or out of stock.</span>
              </div>
            ) : (
              <>
                {/* Out of Stock Section */}
                {outOfStockItems.map(item => (
                  <div key={item.ID} className="py-3 flex items-center justify-between gap-2" id={`watchlist-out-${item.ID}`}>
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                        {item.SKU || "No SKU"}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900 truncate mt-1">{item["Item Name"]}</h4>
                      <span className="text-xs text-gray-400">{item.Category}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 text-2xs font-semibold rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                        OUT OF STOCK
                      </span>
                      <p className="text-xs text-gray-500 mt-1 font-mono font-medium">Qty: 0</p>
                    </div>
                  </div>
                ))}

                {/* Low Stock Section */}
                {lowStockItems.map(item => (
                  <div key={item.ID} className="py-3 flex items-center justify-between gap-2" id={`watchlist-low-${item.ID}`}>
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                        {item.SKU || "No SKU"}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900 truncate mt-1">{item["Item Name"]}</h4>
                      <span className="text-xs text-gray-400">{item.Category}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 text-2xs font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                        LOW STOCK
                      </span>
                      <p className="text-xs text-amber-700 mt-1 font-mono font-medium">Qty: {item.Quantity}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
