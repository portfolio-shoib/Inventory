import React, { useState } from "react";
import { ConnectionConfig, ConnectionMode } from "../types";
import { 
  Database, 
  Play, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface SetupGuideProps {
  connectionMode: ConnectionMode;
  config: ConnectionConfig;
  updateConfig: (url: string) => void;
  testConnection: () => Promise<void>;
  isTesting: boolean;
}

export default function SetupGuide({
  connectionMode,
  config,
  updateConfig,
  testConnection,
  isTesting,
}: SetupGuideProps) {
  const [urlInput, setUrlInput] = useState(config.webAppUrl);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(urlInput.trim());
  };

  return (
    <div className="space-y-6" id="setup-guide-container">
      {/* DB Connection Config Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6" id="db-config-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-50 pb-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" id="db-icon" />
              Database Connection Settings
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure the connection to your live Google Sheet database.
            </p>
          </div>
        </div>

        <div className="space-y-5" id="live-config-container">
          <form onSubmit={handleSaveUrl} className="space-y-2">
            <label htmlFor="webapp-url" className="block text-sm font-medium text-gray-700">
              Google Apps Script Web App URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="webapp-url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
              />
              <button
                type="submit"
                disabled={urlInput.trim() === config.webAppUrl}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                id="btn-save-url"
              >
                Save URL
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Ensure your Web App URL ends with <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">/exec</code>.
            </p>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200/50" id="test-connection-panel">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {config.testStatus === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-600" id="status-success-icon" />
                )}
                {config.testStatus === "error" && (
                  <AlertTriangle className="w-5 h-5 text-rose-600" id="status-error-icon" />
                )}
                {config.testStatus === "untested" && (
                  <HelpCircle className="w-5 h-5 text-gray-400" id="status-untested-icon" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  Database Status: 
                  {config.testStatus === "success" && <span className="text-green-600 font-semibold">Connected</span>}
                  {config.testStatus === "error" && <span className="text-rose-600 font-semibold">Connection Error</span>}
                  {config.testStatus === "untested" && <span className="text-gray-500 font-semibold">Not Tested</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {config.testStatus === "success" && "Your Google Sheet database is fully configured and ready!"}
                  {config.testStatus === "error" && (config.errorMessage || "Failed to reach the Apps Script endpoint. Please verify the URL.")}
                  {config.testStatus === "untested" && "Enter your URL above and click Test Connection."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={testConnection}
              disabled={isTesting || !config.webAppUrl}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
              id="btn-test-connection"
            >
              {isTesting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
