import React, { useState, useMemo } from "react";
import { LogItem } from "../types";
import { 
  History, 
  Search, 
  RefreshCw, 
  ArrowUpDown, 
  Trash2,
  Calendar,
  User,
  Tag,
  PlusCircle,
  MinusCircle,
  FileSpreadsheet
} from "lucide-react";

interface LogsViewProps {
  logs: LogItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  connectionMode: "demo" | "live";
  onClearDemoLogs?: () => void;
}

type LogSortField = "Timestamp" | "Item ID" | "Item Name" | "Action" | "Quantity Changed" | "Updated By";
type SortDirection = "asc" | "desc";

export default function LogsView({
  logs,
  onRefresh,
  isRefreshing,
  connectionMode,
  onClearDemoLogs,
}: LogsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [sortField, setSortField] = useState<LogSortField>("Timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle Sorting
  const handleSort = (field: LogSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc (newest first) for date, asc for others
    }
  };

  // Unique actions in logs for filtering dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach(log => {
      if (log.Action) actions.add(log.Action);
    });
    return Array.from(actions);
  }, [logs]);

  // Filter & Search Logic
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (log["Item Name"] || "").toLowerCase().includes(query) ||
          String(log["Item ID"]).toLowerCase().includes(query) ||
          (log["Updated By"] || "").toLowerCase().includes(query);

        const matchesAction = actionFilter ? log.Action === actionFilter : true;

        return matchesSearch && matchesAction;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "Quantity Changed") {
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
  }, [logs, searchQuery, actionFilter, sortField, sortDirection]);

  // Action badge formatting helper
  const getActionBadge = (action: string) => {
    switch (action) {
      case "New Item Added":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <PlusCircle className="w-3 h-3 text-emerald-500" />
            New Item
          </span>
        );
      case "Stock In":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            <PlusCircle className="w-3 h-3 text-blue-500" />
            Stock In
          </span>
        );
      case "Stock Out":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            <MinusCircle className="w-3 h-3 text-amber-500" />
            Stock Out
          </span>
        );
      case "Item Deleted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            <Trash2 className="w-3 h-3 text-rose-500" />
            Deleted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200/60">
            <History className="w-3 h-3 text-gray-400" />
            {action || "Update"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4" id="logs-view-container">
      {/* Header Description */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6" id="logs-header-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Activity Log & Audit Trail
            </h2>
            <p className="text-sm text-gray-500">
              Live chronological record of all stock adjustments, details updates, and item acquisitions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              id="btn-refresh-logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Sync History
            </button>
          </div>
        </div>

        {/* Info panel */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3.5 border border-gray-200/40 text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Logging actions live to your Google Sheet tab: <strong>Logs</strong></span>
          </span>
          <span className="font-medium text-gray-600">Total Log Entries: {logs.length}</span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="logs-filters">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Item ID, Name, or Operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm bg-gray-50 hover:bg-gray-50/80 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-hidden"
              id="logs-search-input"
            />
          </div>

          {/* Action type dropdown */}
          <div className="sm:w-48">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 outline-hidden cursor-pointer"
              id="action-filter-select"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden" id="logs-table-card">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse" id="logs-table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th 
                  onClick={() => handleSort("Timestamp")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Date & Time
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </th>

                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item ID</th>

                <th 
                  onClick={() => handleSort("Item Name")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Item Name
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </th>

                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>

                <th 
                  onClick={() => handleSort("Quantity Changed")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Qty Delta
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort("Updated By")}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/70 select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Operator
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <History className="w-8 h-8 text-gray-300" />
                      <span className="text-sm font-medium text-gray-700">No logs recorded yet</span>
                      <span className="text-xs text-gray-400">
                        {searchQuery || actionFilter 
                          ? "Adjust your filters to see more results." 
                          : "Once you change stock or update items, live logs will populate here."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const qtyChange = Number(log["Quantity Changed"]) || 0;
                  const isPositive = qtyChange > 0;
                  const isNegative = qtyChange < 0;

                  return (
                    <tr key={index} className="hover:bg-gray-50/30 transition-colors" id={`log-row-${index}`}>
                      {/* Timestamp */}
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-700">{log.Timestamp}</span>
                        </div>
                      </td>

                      {/* Item ID */}
                      <td className="p-4 text-xs font-mono font-bold text-indigo-950 whitespace-nowrap">
                        {log["Item ID"] || "N/A"}
                      </td>

                      {/* Item Name */}
                      <td className="p-4">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {log["Item Name"] || "Unknown Item"}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-4 whitespace-nowrap">
                        {getActionBadge(log.Action)}
                      </td>

                      {/* Qty Changed */}
                      <td className="p-4 text-right font-mono text-sm whitespace-nowrap">
                        {qtyChange === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : isPositive ? (
                          <span className="text-emerald-600 font-bold">+{qtyChange}</span>
                        ) : (
                          <span className="text-rose-600 font-bold">{qtyChange}</span>
                        )}
                      </td>

                      {/* Operator / Updated By */}
                      <td className="p-4 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log["Updated By"] || "System"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Timeline */}
        <div className="block md:hidden divide-y divide-gray-100 bg-white" id="logs-mobile-list">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="flex flex-col items-center justify-center space-y-2">
                <History className="w-8 h-8 text-gray-300" />
                <span className="text-sm font-medium text-gray-700">No logs recorded yet</span>
                <span className="text-xs text-gray-400">
                  {searchQuery || actionFilter 
                    ? "Adjust your filters to see more results." 
                    : "Once you change stock or update items, live logs will populate here."}
                </span>
              </div>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const qtyChange = Number(log["Quantity Changed"]) || 0;
              const isPositive = qtyChange > 0;
              const isNegative = qtyChange < 0;

              // Border indicator color
              let borderCol = "border-l-gray-300";
              if (log.Action === "New Item Added" || log.Action === "Stock In") {
                borderCol = "border-l-emerald-500";
              } else if (log.Action === "Stock Out" || log.Action === "Quantity Decreased" || log.Action === "Quantity Increased") {
                borderCol = isPositive ? "border-l-emerald-500" : "border-l-amber-500";
              } else if (log.Action === "Item Deleted") {
                borderCol = "border-l-rose-500";
              }

              return (
                <div 
                  key={index} 
                  className={`p-4 border-l-4 ${borderCol} space-y-2 transition-colors hover:bg-gray-50/50`}
                  id={`log-card-${index}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getActionBadge(log.Action)}
                      <span className="text-[10px] font-mono text-gray-500 font-bold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                        ID: {log["Item ID"] || "N/A"}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {log.Timestamp}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4">
                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{log["Item Name"] || "Unknown Item"}</h4>
                    <div className="text-right shrink-0 font-mono text-sm font-bold">
                      {qtyChange === 0 ? (
                        <span className="text-gray-400 font-medium">—</span>
                      ) : isPositive ? (
                        <span className="text-emerald-600">+{qtyChange}</span>
                      ) : (
                        <span className="text-rose-600">{qtyChange}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>Operator: {log["Updated By"] || "System"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
