import React, { useState, useEffect } from "react";
import { InventoryItem, CATEGORIES } from "../types";
import { X, Save, AlertTriangle } from "lucide-react";

interface ItemFormProps {
  item: InventoryItem | null; // null if adding a new item
  onClose: () => void;
  onSave: (itemData: Partial<InventoryItem>) => Promise<void>;
}

export default function ItemForm({ item, onClose, onSave }: ItemFormProps) {
  const isEditMode = !!item;

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [weightValue, setWeightValue] = useState<number | "">("");
  const [weightUnit, setWeightUnit] = useState("g");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [pricingType, setPricingType] = useState<"unit" | "weight">("unit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Populate form if we are in Edit Mode
  useEffect(() => {
    if (item) {
      setItemName(item["Item Name"] !== undefined && item["Item Name"] !== null ? String(item["Item Name"]) : "");
      setCategory(item.Category || CATEGORIES[0]);
      setQuantity(Number(item.Quantity) || 0);
      setUnitPrice(Number(item["Unit Price"]) || 0);
      setDescription(item.Description !== undefined && item.Description !== null ? String(item.Description) : "");
      setUnit(item.Unit || "pcs");
      setWeightValue(item["Weight Value"] !== undefined && item["Weight Value"] !== 0 ? Number(item["Weight Value"]) : "");
      setWeightUnit(item["Weight Unit"] || "g");
      setVendorName(item["Vendor Name"] !== undefined && item["Vendor Name"] !== null ? String(item["Vendor Name"]) : "");
      setVendorContact(item["Vendor Contact"] !== undefined && item["Vendor Contact"] !== null ? String(item["Vendor Contact"]) : "");
      
      // Auto-detect pricing calculation
      if (item["Weight Value"] && Number(item["Weight Value"]) > 0) {
        setPricingType("weight");
      } else {
        setPricingType("unit");
      }
    } else {
      setItemName("");
      setCategory(CATEGORIES[0]);
      setQuantity(0);
      setUnitPrice(0);
      setDescription("");
      setUnit("pcs");
      setWeightValue("");
      setWeightUnit("g");
      setVendorName("");
      setVendorContact("");
      setPricingType("unit");
    }
  }, [item]);

  // Dynamically calculate total value
  let calculatedTotalValue = 0;
  if (pricingType === "weight" && Number(weightValue) > 0) {
    const qty = Number(quantity) || 0;
    const wVal = Number(weightValue) || 0;
    const price = Number(unitPrice) || 0;
    if (weightUnit === "g") {
      calculatedTotalValue = qty * (wVal / 1000) * price;
    } else {
      calculatedTotalValue = qty * wVal * price;
    }
  } else {
    calculatedTotalValue = quantity * unitPrice;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const nameStr = String(itemName).trim();
    const descStr = String(description).trim();
    const vendorNameStr = String(vendorName).trim();
    const vendorContactStr = String(vendorContact).trim();

    // Simple validations
    if (!nameStr) {
      setValidationError("Item Name is required.");
      return;
    }

    if (quantity < 0) {
      setValidationError("Quantity cannot be negative.");
      return;
    }

    if (unitPrice < 0) {
      setValidationError("Price cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      const itemData: Partial<InventoryItem> = {
        "Item Name": nameStr,
        SKU: "",
        Category: category,
        Quantity: Number(quantity),
        "Unit Price": Number(unitPrice),
        "Total Value": Number(calculatedTotalValue.toFixed(2)),
        Description: descStr,
        Unit: unit,
        "Weight Value": weightValue !== "" ? Number(weightValue) : 0,
        "Weight Unit": weightUnit,
        "Vendor Name": vendorNameStr,
        "Vendor Contact": vendorContactStr,
      };

      await onSave(itemData);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || "Failed to save the item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      id="item-form-modal"
    >
      <div 
        className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
        id="item-form-container"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditMode ? `Edit Item: ${item?.ID}` : "Add New Inventory Item"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEditMode ? "Modify existing inventory parameters" : "Create a new record in your sheet database"}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            id="btn-close-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4" id="item-form-element">
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-start gap-2.5 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Item Name */}
          <div className="space-y-1">
            <label htmlFor="item-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="item-name"
              required
              placeholder="e.g. Fresh Tomatoes or Chicken Breast"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label htmlFor="item-category" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Category
            </label>
            <select
              id="item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-1">
              <label htmlFor="item-quantity" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Quantity
              </label>
              <input
                type="number"
                id="item-quantity"
                min="0"
                step="any"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value)))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-1">
              <label htmlFor="item-unit-price" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {pricingType === "weight" ? "Rate per Kg (Rs.)" : "Unit Price (Rs.)"}
              </label>
              <input
                type="number"
                id="item-unit-price"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value)))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Unit & Pricing Selector */}
          <div className="grid grid-cols-2 gap-4">
            {/* Base Unit of Measurement */}
            <div className="space-y-1">
              <label htmlFor="item-unit" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Base Unit
              </label>
              <select
                id="item-unit"
                value={unit}
                onChange={(e) => {
                  const u = e.target.value;
                  setUnit(u);
                  if (u === "kg" || u === "g") {
                    setPricingType("weight");
                    if (weightValue === "") setWeightValue(u === "kg" ? 1 : 500);
                    setWeightUnit(u);
                  } else {
                    setPricingType("unit");
                  }
                }}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="pack">Pack / Box</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="L">Liters (L)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="meters">Meters (m)</option>
              </select>
            </div>

            {/* Pricing Model */}
            <div className="space-y-1">
              <label htmlFor="pricing-type" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Pricing Calculation
              </label>
              <select
                id="pricing-type"
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as "unit" | "weight")}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
              >
                <option value="unit">Standard (Qty × Price)</option>
                <option value="weight">By Weight (Qty × Weight × Rate)</option>
              </select>
            </div>
          </div>

          {/* Conditional Weight Input Section */}
          {pricingType === "weight" && (
            <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-lg grid grid-cols-2 gap-4 animate-fade-in" id="weight-calculation-box">
              {/* Weight per Unit */}
              <div className="space-y-1">
                <label htmlFor="weight-value" className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Weight/Size per Item
                </label>
                <input
                  type="number"
                  id="weight-value"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 500"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="block w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              {/* Weight Unit */}
              <div className="space-y-1">
                <label htmlFor="weight-unit" className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Weight Unit
                </label>
                <select
                  id="weight-unit"
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value)}
                  className="block w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>
              
              {Number(weightValue) > 0 && Number(quantity) > 0 && (
                <div className="col-span-2 text-xs text-indigo-600 font-medium">
                  💡 Total weight in stock: {((Number(quantity) * Number(weightValue)) / (weightUnit === "g" ? 1000 : 1)).toFixed(2)} kg
                </div>
              )}
            </div>
          )}

          {/* Item Description / Notes */}
          <div className="space-y-1">
            <label htmlFor="item-description" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Notes / Description (Short details)
            </label>
            <textarea
              id="item-description"
              rows={2}
              placeholder="e.g. Keep refrigerated below 4°C, use within 3 days, handle with care..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden resize-none"
            />
          </div>

          {/* Vendor Details Section */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              Vendor Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Vendor Name */}
              <div className="space-y-1">
                <label htmlFor="vendor-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Vendor Name
                </label>
                <input
                  type="text"
                  id="vendor-name"
                  placeholder="e.g. Metro Cash & Carry, Local Farm Produce"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              {/* Vendor Contact */}
              <div className="space-y-1">
                <label htmlFor="vendor-contact" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contact Number / Details
                </label>
                <input
                  type="text"
                  id="vendor-contact"
                  placeholder="e.g. +92 321 4567890"
                  value={vendorContact}
                  onChange={(e) => setVendorContact(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Automatic calculations preview */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 grid grid-cols-2 gap-4 animate-fade-in" id="valuation-preview">
            <div>
              <span className="block text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Valuation Method</span>
              <span className="text-xs text-gray-600">
                {pricingType === "weight" && Number(weightValue) > 0 
                  ? `Qty × (${weightValue}${weightUnit} / ${weightUnit === "g" ? "1000g" : "1"}) × Rate` 
                  : "Quantity × Unit Price"}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Total Value</span>
              <span className="text-base font-bold text-indigo-900">
                Rs. {calculatedTotalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            id="btn-cancel-form"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !itemName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            id="btn-save-item"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? "Save Changes" : "Create Item"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
