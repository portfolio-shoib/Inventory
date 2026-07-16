import React, { useState, useEffect, useRef } from "react";
import { InventoryItem, LogItem, ConnectionMode, ConnectionConfig } from "./types";
import Dashboard from "./components/Dashboard";
import ItemList from "./components/ItemList";
import ItemForm from "./components/ItemForm";
import SetupGuide from "./components/SetupGuide";
import LogsView from "./components/LogsView";
import Logo from "./components/Logo";
import { 
  Database, 
  Layers, 
  LayoutDashboard, 
  Settings, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  CheckCircle,
  FileSpreadsheet,
  History
} from "lucide-react";

const DEFAULT_ITEMS: InventoryItem[] = [];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedUrl = localStorage.getItem("inventory_webapp_url") || "";
    return savedUrl ? "dashboard" : "setup";
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Connection Settings State
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("live");

  const [config, setConfig] = useState<ConnectionConfig>(() => {
    const savedUrl = localStorage.getItem("inventory_webapp_url") || "";
    const savedStatus = localStorage.getItem("inventory_test_status") || "untested";
    const savedTested = localStorage.getItem("inventory_last_tested") || null;
    return {
      webAppUrl: savedUrl,
      lastTested: savedTested,
      testStatus: savedStatus as any,
    };
  });

  // Core Data States
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Debouncing refs for fast, accurate stock updates
  const pendingUpdates = useRef<Record<string | number, { targetQty: number; originalItem: InventoryItem; accumulatedDelta: number }>>({});
  const debounceTimeouts = useRef<Record<string | number, any>>({});

  // Form Modals State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Cleanup any legacy or predefined/mock data on initial app load
  useEffect(() => {
    const mockKeys = ["sheet_inventory_items", "sheet_inventory_logs", "sheet_inventory_backup", "sheet_inventory_logs_backup"];
    mockKeys.forEach(key => localStorage.removeItem(key));
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem("inventory_connection_mode", connectionMode);
  }, [connectionMode]);

  useEffect(() => {
    localStorage.setItem("inventory_webapp_url", config.webAppUrl);
    localStorage.setItem("inventory_test_status", config.testStatus);
    if (config.lastTested) {
      localStorage.setItem("inventory_last_tested", config.lastTested);
    }
  }, [config]);

  // Load items on mount or when mode/webAppUrl changes
  useEffect(() => {
    loadInventoryData();
  }, [connectionMode, config.webAppUrl]);

  // Main Data Load Function
  const loadInventoryData = async (forceRefresh = false, isSilent = false) => {
    setGlobalError(null);
    if (!isSilent) {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsSyncing(true);
    }

    try {
      // Live Mode
      if (!config.webAppUrl) {
        setGlobalError("Google Sheets Web App URL is not configured. Please go to Setup & settings.");
        setItems([]);
        setLogs([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSyncing(false);
        return;
      }

      // Fetch both items and logs in parallel for maximum speed!
      const itemsPromise = fetch(config.webAppUrl, { redirect: "follow" });
      const logsUrl = `${config.webAppUrl}${config.webAppUrl.includes("?") ? "&" : "?"}action=logs`;
      const logsPromise = fetch(logsUrl, { redirect: "follow" }).catch(err => {
        console.error("Defensive logs load error:", err);
        return null;
      });

      const [itemsResponse, logsResponse] = await Promise.all([itemsPromise, logsPromise]);

      if (!itemsResponse || !itemsResponse.ok) {
        throw new Error(`Cloud server returned status ${itemsResponse ? itemsResponse.status : "unknown"}. Please check your deployment settings.`);
      }
      
      const data = await itemsResponse.json();
      
      if (Array.isArray(data)) {
        // Merge with any active/pending optimistic updates so they don't get overwritten by background loads
        const mergedData = data.map((loadedItem: InventoryItem) => {
          const pending = pendingUpdates.current[loadedItem.ID];
          if (pending) {
            const finalTargetQty = pending.targetQty;
            const unitPrice = Number(loadedItem["Unit Price"]) || 0;
            let totalVal = finalTargetQty * unitPrice;
            
            if (loadedItem["Weight Value"] && Number(loadedItem["Weight Value"]) > 0) {
              const wVal = Number(loadedItem["Weight Value"]) || 0;
              if (loadedItem["Weight Unit"] === "g") {
                totalVal = finalTargetQty * (wVal / 1000) * unitPrice;
              } else {
                totalVal = finalTargetQty * wVal * unitPrice;
              }
            }
            return {
              ...loadedItem,
              Quantity: finalTargetQty,
              "Total Value": Number(totalVal.toFixed(2)),
              "Last Updated": new Date().toLocaleString("en-US", { hour12: false })
            };
          }
          return loadedItem;
        });

        setItems(mergedData);
        // Sync live data copy to localstorage as an offline backup
        localStorage.setItem("sheet_inventory_backup", JSON.stringify(mergedData));
      } else if (data && data.status === "error") {
        throw new Error(data.message || "Failed to parse spreadsheet response");
      } else {
        throw new Error("Invalid spreadsheet response layout. Ensure you initialized 'Inventory' sheet with headers.");
      }

      // Fetch Logs (defensive loading)
      if (logsResponse && logsResponse.ok) {
        try {
          const logsData = await logsResponse.json();
          if (Array.isArray(logsData)) {
            setLogs(logsData);
            localStorage.setItem("sheet_inventory_logs_backup", JSON.stringify(logsData));
          }
        } catch (logsErr) {
          console.error("Error loading logs from Web App:", logsErr);
        }
      }
    } catch (err: any) {
      console.error("Error loading inventory:", err);
      
      let friendlyMessage = err.message || "Unknown data retrieval error.";
      if (friendlyMessage.includes("Failed to fetch") || friendlyMessage.includes("NetworkError")) {
        friendlyMessage = "Network block or CORS error. Confirm that your Google Sheets Web App is deployed with Access set to 'Anyone' and CORS is fully supported by the URL.";
      }
      setGlobalError(friendlyMessage);
      
      // Load offline backup if live load failed, ensuring no mock/demo items or logs are parsed
      const backup = localStorage.getItem("sheet_inventory_backup");
      if (backup) {
        try {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed)) {
            // Keep only non-mock/real items
            const realItems = parsed.filter(item => item && item.ID && !String(item["Item Name"]).includes("Pro Developer Laptop") && !String(item["Item Name"]).includes("Mechanical Keyboard"));
            setItems(realItems);
          }
        } catch (e) {
          console.error("Backup parse error:", e);
        }
      }
      const logsBackup = localStorage.getItem("sheet_inventory_logs_backup");
      if (logsBackup) {
        try {
          const parsedLogs = JSON.parse(logsBackup);
          if (Array.isArray(parsedLogs)) {
            // Strictly exclude mock logs
            const realLogs = parsedLogs.filter(
              (log: any) => log && log["Updated By"] && !log["Updated By"].includes("Demo") && !log["Updated By"].includes("mock")
            );
            setLogs(realLogs);
          }
        } catch (e) {
          console.error("Logs backup parse error:", e);
        }
      }
      setGlobalError(`${friendlyMessage} (Displaying cached offline backup)`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSyncing(false);
    }
  };

  // Sync/Refresh button handler
  const handleRefresh = async () => {
    await loadInventoryData(true);
  };

  // Test Connection to Apps Script Web App
  const testLiveConnection = async () => {
    if (!config.webAppUrl) {
      setConfig(prev => ({
        ...prev,
        testStatus: "error",
        errorMessage: "Please enter a valid Web App URL before testing.",
      }));
      return;
    }

    setIsTesting(true);
    try {
      const testUrl = `${config.webAppUrl}${config.webAppUrl.includes("?") ? "&" : "?"}action=test`;
      const response = await fetch(testUrl, { redirect: "follow" });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}. Connection failed.`);
      }
      
      const resData = await response.json();
      if (resData && resData.status === "success") {
        setConfig(prev => ({
          ...prev,
          testStatus: "success",
          lastTested: new Date().toLocaleTimeString(),
          errorMessage: undefined,
        }));
      } else {
        throw new Error(resData?.message || "Invalid response format returned from script.");
      }
    } catch (err: any) {
      console.error("Connection test failed:", err);
      let errorText = err.message || "Verification request failed.";
      if (errorText.includes("Failed to fetch") || errorText.includes("cors")) {
        errorText = "Access Denied / CORS Error. Ensure Apps Script Web App 'Who has access' is configured to 'Anyone' and that you have authorized the execution.";
      }
      setConfig(prev => ({
        ...prev,
        testStatus: "error",
        lastTested: new Date().toLocaleTimeString(),
        errorMessage: errorText,
      }));
    } finally {
      setIsTesting(false);
    }
  };

  // Update URL in settings config
  const handleUpdateConfigUrl = (url: string) => {
    setConfig({
      webAppUrl: url,
      lastTested: null,
      testStatus: "untested",
    });
  };

  // CRUD: Handle Add or Edit Item Save
  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    if (!config.webAppUrl) {
      throw new Error("Cannot save. Spreadsheet URL is not configured!");
    }

    setIsSyncing(true);
    const isEditMode = !!editingItem;
    const previousItems = [...items];
    const previousLogs = [...logs];

    let nextId = 1001;

    try {
      if (isEditMode && editingItem) {
        // Optimistic edit
        const updatedItems = items.map(it => {
          if (it.ID === editingItem.ID) {
            const merged = { ...it, ...itemData };
            const q = Number(merged.Quantity) || 0;
            const u = Number(merged["Unit Price"]) || 0;
            merged.Quantity = q;
            merged["Unit Price"] = u;
            
            // Only recalculate standard Total Value if Weight Value is NOT present
            if (!merged["Weight Value"] || Number(merged["Weight Value"]) === 0) {
              merged["Total Value"] = Number((q * u).toFixed(2));
            } else {
              merged["Total Value"] = Number(itemData["Total Value"]) !== undefined ? Number(itemData["Total Value"]) : merged["Total Value"];
            }
            
            merged["Last Updated"] = new Date().toLocaleString("en-US", { hour12: false });
            return merged;
          }
          return it;
        });
        setItems(updatedItems);
        localStorage.setItem("sheet_inventory_backup", JSON.stringify(updatedItems));

        const newLog: LogItem = {
          Timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          "Item ID": editingItem.ID,
          "Item Name": itemData["Item Name"] || editingItem["Item Name"],
          Action: "Item Updated",
          "Quantity Changed": (Number(itemData.Quantity) || editingItem.Quantity) - editingItem.Quantity,
          "Updated By": "mshoibmehar@gmail.com"
        };
        const updatedLogs = [newLog, ...logs];
        setLogs(updatedLogs);
        localStorage.setItem("sheet_inventory_logs_backup", JSON.stringify(updatedLogs));

        // Background POST call (non-blocking)
        fetch(config.webAppUrl, {
          method: "POST",
          mode: "cors",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "update",
            id: editingItem.ID,
            item: itemData,
            updatedBy: "mshoibmehar@gmail.com"
          }),
        })
        .then(response => {
          if (!response.ok) throw new Error("Server error updating item");
          return response.json();
        })
        .then(res => {
          if (res && res.status === "success" && res.item) {
            // Refine local state with the exact item object returned by Google Sheet
            setItems(current => current.map(it => it.ID === editingItem.ID ? res.item : it));
          }
          // Silent refresh of inventory and logs in background
          loadInventoryData(false, true).catch(e => console.warn("Silent background load warning:", e));
        })
        .catch(err => {
          console.error("Background sync error:", err);
          setGlobalError("Failed to sync updates to Google Sheet. Displaying local offline copy.");
          setIsSyncing(false);
        });

      } else {
        // Add mode: Generate a temporary ID (find max ID or use date)
        const numericIds = items.map(it => Number(it.ID)).filter(id => !isNaN(id));
        nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1001;
        
        const q = Number(itemData.Quantity) || 0;
        const u = Number(itemData["Unit Price"]) || 0;
        const newItem: InventoryItem = {
          ID: nextId,
          "Item Name": itemData["Item Name"] || "",
          SKU: itemData.SKU || "",
          Category: itemData.Category || "Other",
          Quantity: q,
          "Unit Price": u,
          "Total Value": itemData["Total Value"] !== undefined ? Number(itemData["Total Value"]) : Number((q * u).toFixed(2)),
          "Last Updated": new Date().toLocaleString("en-US", { hour12: false }),
          Description: itemData.Description || "",
          Unit: itemData.Unit || "pcs",
          "Weight Value": itemData["Weight Value"] || 0,
          "Weight Unit": itemData["Weight Unit"] || "g",
          "Vendor Name": itemData["Vendor Name"] || "",
          "Vendor Contact": itemData["Vendor Contact"] || "",
        };

        const updatedItems = [newItem, ...items];
        setItems(updatedItems);
        localStorage.setItem("sheet_inventory_backup", JSON.stringify(updatedItems));

        const newLog: LogItem = {
          Timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          "Item ID": nextId,
          "Item Name": newItem["Item Name"],
          Action: "New Item Added",
          "Quantity Changed": q,
          "Updated By": "mshoibmehar@gmail.com"
        };
        const updatedLogs = [newLog, ...logs];
        setLogs(updatedLogs);
        localStorage.setItem("sheet_inventory_logs_backup", JSON.stringify(updatedLogs));

        // Background POST call (non-blocking)
        fetch(config.webAppUrl, {
          method: "POST",
          mode: "cors",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "add",
            item: itemData,
            updatedBy: "mshoibmehar@gmail.com"
          }),
        })
        .then(response => {
          if (!response.ok) throw new Error("Server error adding item");
          return response.json();
        })
        .then(res => {
          if (res && res.status === "success" && res.item) {
            // Replace local temporary ID item with the final row object from the server
            setItems(current => current.map(it => it.ID === nextId ? res.item : it));
          }
          // Silent refresh of inventory and logs in background
          loadInventoryData(false, true).catch(e => console.warn("Silent background load warning:", e));
        })
        .catch(err => {
          console.error("Background sync error:", err);
          setGlobalError("Failed to sync new item with Google Sheet. Displaying local offline copy.");
          setIsSyncing(false);
        });
      }
    } catch (err: any) {
      console.error("Save setup error:", err);
      setGlobalError(err.message || "Failed to save item. Local backup maintained.");
      setItems(previousItems);
      setLogs(previousLogs);
      setIsSyncing(false);
    }
  };

  // CRUD: Handle Delete Item
  const handleDeleteItem = async (id: string | number) => {
    if (!config.webAppUrl) {
      throw new Error("No webapp endpoint configured.");
    }

    setIsSyncing(true);
    const targetItem = items.find(it => it.ID === id);
    const previousItems = [...items];
    const previousLogs = [...logs];

    // Optimistic Delete
    const updatedItems = items.filter(it => it.ID !== id);
    setItems(updatedItems);
    localStorage.setItem("sheet_inventory_backup", JSON.stringify(updatedItems));

    if (targetItem) {
      const newLog: LogItem = {
        Timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        "Item ID": id,
        "Item Name": targetItem["Item Name"],
        Action: "Item Deleted",
        "Quantity Changed": -targetItem.Quantity,
        "Updated By": "mshoibmehar@gmail.com"
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      localStorage.setItem("sheet_inventory_logs_backup", JSON.stringify(updatedLogs));
    }

    // Trigger non-blocking background delete
    fetch(config.webAppUrl, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "delete",
        id: id,
        updatedBy: "mshoibmehar@gmail.com"
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to delete the item from cloud sheet.");
      }
      // Silently sync state in background
      loadInventoryData(false, true).catch(e => console.warn("Silent background load warning:", e));
    })
    .catch(err => {
      console.error("Deletion background error:", err);
      setGlobalError("Failed to delete item from Google Sheet in background. Displaying local offline list.");
      setIsSyncing(false);
    });
  };

  // CRUD: Handle Quick Stock Adjustment (+/- buttons) with debounced queueing
  const handleAdjustQuantity = async (item: InventoryItem, delta: number) => {
    const itemId = item.ID;
    const currentQty = Number(item.Quantity) || 0;
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty === currentQty) return; // No change

    // 1. Update the pending updates ref so that any concurrent loadInventoryData will respect our local state
    if (!pendingUpdates.current[itemId]) {
      pendingUpdates.current[itemId] = {
        targetQty: nextQty,
        originalItem: item,
        accumulatedDelta: delta
      };
    } else {
      const pending = pendingUpdates.current[itemId];
      pending.targetQty = Math.max(0, pending.targetQty + delta);
      pending.accumulatedDelta += delta;
    }

    const finalTargetQty = pendingUpdates.current[itemId].targetQty;

    // 2. Optimistic UI update for items
    setItems(currentItems => {
      const newItems = currentItems.map(it => {
        if (it.ID === itemId) {
          const unitPrice = Number(it["Unit Price"]) || 0;
          let totalVal = finalTargetQty * unitPrice;
          
          if (it["Weight Value"] && Number(it["Weight Value"]) > 0) {
            const wVal = Number(it["Weight Value"]) || 0;
            if (it["Weight Unit"] === "g") {
              totalVal = finalTargetQty * (wVal / 1000) * unitPrice;
            } else {
              totalVal = finalTargetQty * wVal * unitPrice;
            }
          }
          
          return {
            ...it,
            Quantity: finalTargetQty,
            "Total Value": Number(totalVal.toFixed(2)),
            "Last Updated": new Date().toLocaleString("en-US", { hour12: false })
          };
        }
        return it;
      });
      localStorage.setItem("sheet_inventory_backup", JSON.stringify(newItems));
      return newItems;
    });

    // 3. Clear existing debounce timer for this item
    if (debounceTimeouts.current[itemId]) {
      clearTimeout(debounceTimeouts.current[itemId]);
    }

    // 4. Set a new debounce timer to send the consolidated updates to Google Sheet after 800ms of inactivity
    debounceTimeouts.current[itemId] = setTimeout(() => {
      const pending = pendingUpdates.current[itemId];
      if (!pending) return;

      const finalQtyToSend = pending.targetQty;
      const totalDelta = pending.accumulatedDelta;

      setIsSyncing(true);

      // Add a single consolidated log entry for the accumulated change
      const newLogEntry: LogItem = {
        Timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        "Item ID": itemId,
        "Item Name": item["Item Name"],
        Action: totalDelta > 0 ? "Quantity Increased" : "Quantity Decreased",
        "Quantity Changed": totalDelta,
        "Updated By": "mshoibmehar@gmail.com"
      };
      setLogs(currentLogs => {
        const updatedLogs = [newLogEntry, ...currentLogs];
        localStorage.setItem("sheet_inventory_logs_backup", JSON.stringify(updatedLogs));
        return updatedLogs;
      });

      if (!config.webAppUrl) {
        setGlobalError("Google Sheets URL is not configured; adjustments saved offline.");
        setIsSyncing(false);
        delete pendingUpdates.current[itemId];
        return;
      }

      fetch(config.webAppUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "update",
          id: itemId,
          item: {
            Quantity: finalQtyToSend,
          },
          updatedBy: "mshoibmehar@gmail.com"
        }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to adjust quantity on Google Sheet.");
        }
        // Success: Now we can remove it from the pending updates map
        delete pendingUpdates.current[itemId];
        
        // Silently sync state in background after a slight delay to allow spreadsheet to calculate formulas
        setTimeout(() => {
          // If no new adjustments were started for this item while this fetch was in progress,
          // then trigger background sync.
          if (!pendingUpdates.current[itemId]) {
            loadInventoryData(false, true).catch(e => console.warn("Silent background load warning:", e));
          } else {
            setIsSyncing(false);
          }
        }, 1200);
      })
      .catch(err => {
        console.error("Error adjusting quantity:", err);
        setGlobalError("Failed to sync quantity adjustment in background.");
        setIsSyncing(false);
        delete pendingUpdates.current[itemId];
      });

    }, 800); // 800ms debounce
  };

  // Form open triggers
  const triggerEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const triggerAddNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 antialiased" id="main-app-shell">
      
      {/* Dynamic Navigation Header */}
      <header className="bg-white border-b border-gray-100 shrink-0 sticky top-0 z-40 shadow-2xs" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Title / Brand logo */}
            <div className="flex items-center gap-4">
              <Logo className="w-10 h-10" showText={true} />
              
              <div className="flex flex-col justify-center border-l border-gray-100 pl-3 h-8 sm:pl-4">
                {isSyncing ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 animate-pulse border border-indigo-100 shadow-3xs">
                    <svg className="animate-spin h-2.5 w-2.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-3xs">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Synced
                  </span>
                )}
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <nav className="hidden md:flex space-x-1 sm:space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200/50" id="tabs-navigation">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                id="tab-dashboard-trigger"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </button>
              
              <button
                onClick={() => setActiveTab("inventory")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === "inventory"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                id="tab-inventory-trigger"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inventory Items</span>
              </button>

              <button
                onClick={() => setActiveTab("logs")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === "logs"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                id="tab-logs-trigger"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Activity Log</span>
              </button>
              
              <button
                onClick={() => setActiveTab("setup")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === "setup"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                id="tab-setup-trigger"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Sheet Setup</span>
                {connectionMode === "live" && config.testStatus === "success" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                )}
                {connectionMode === "live" && config.testStatus === "error" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Global Notice Area / Alerts Banner */}
      {globalError && (
        <div className="bg-amber-50 border-b border-amber-200/60 text-amber-800" id="global-error-banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-3 text-xs leading-relaxed">
            <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-amber-900">Database Warning: </span>
              {globalError}
            </div>
            {connectionMode === "live" && (
              <button 
                onClick={() => setActiveTab("setup")} 
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0 ml-4 cursor-pointer"
              >
                Configure Settings
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Body Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6" id="main-content-stage">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4" id="global-loading">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-semibold text-gray-500">Loading inventory database...</span>
          </div>
        ) : (
          <div className="space-y-6" id="tab-stage-view">
            {activeTab === "dashboard" && (
              <Dashboard 
                items={items} 
                setActiveTab={setActiveTab} 
                setCategoryFilter={setCategoryFilter} 
              />
            )}
            
            {activeTab === "inventory" && (
              <ItemList
                items={items}
                onEdit={triggerEdit}
                onDelete={handleDeleteItem}
                onAddNew={triggerAddNew}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                connectionMode={connectionMode}
                webAppUrl={config.webAppUrl}
                onAdjustQuantity={handleAdjustQuantity}
              />
            )}

            {activeTab === "logs" && (
              <LogsView
                logs={logs}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                connectionMode={connectionMode}
              />
            )}
            
            {activeTab === "setup" && (
              <SetupGuide
                connectionMode={connectionMode}
                config={config}
                updateConfig={handleUpdateConfigUrl}
                testConnection={testLiveConnection}
                isTesting={isTesting}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-gray-100 py-4 pb-24 md:pb-4 text-center text-xs text-gray-400 shrink-0" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 flex-wrap text-[11px] sm:text-xs">
          <Logo className="w-4 h-4" />
          <span className="font-semibold text-gray-600">Swot<span className="text-[#1BC2A4]">.works</span> Inventory</span>
          <span className="text-gray-300">|</span>
          <span>Secure Cloud-Synced Operations Portal</span>
        </div>
      </footer>

      {/* Item Form Modal */}
      {isFormOpen && (
        <ItemForm
          item={editingItem}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveItem}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center z-40 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe" id="mobile-tabs-navigation">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "dashboard"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          id="mobile-tab-dashboard-trigger"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Overview</span>
        </button>
        
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "inventory"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          id="mobile-tab-inventory-trigger"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "logs"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          id="mobile-tab-logs-trigger"
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">Logs</span>
        </button>
        
        <button
          onClick={() => setActiveTab("setup")}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer relative ${
            activeTab === "setup"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          id="mobile-tab-setup-trigger"
        >
          <div className="relative">
            <Settings className="w-5 h-5" />
            {connectionMode === "live" && config.testStatus === "success" && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"></span>
            )}
            {connectionMode === "live" && config.testStatus === "error" && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
            )}
          </div>
          <span className="text-[10px]">Setup</span>
        </button>
      </nav>
    </div>
  );
}
