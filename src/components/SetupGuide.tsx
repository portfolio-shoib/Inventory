import React, { useState } from "react";
import { APPS_SCRIPT_CODE, INSTRUCTIONS } from "../utils/googleAppsScriptCode";
import { ConnectionConfig, ConnectionMode } from "../types";
import { 
  Clipboard, 
  Check, 
  Settings, 
  ExternalLink, 
  Database, 
  Cpu, 
  Play, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Code
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
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState(config.webAppUrl);
  const [showFullCode, setShowFullCode] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(urlInput.trim());
  };

  return (
    <div className="space-y-8" id="setup-guide-container">
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
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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

      {/* Guide Instructions and Code Accordion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="instructions-grid">
        {/* Left Side: Step-by-Step Instructions */}
        <div className="lg:col-span-5 space-y-6" id="instructions-pane">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">How to Setup Live Google Sheet Integration</h3>
          </div>
          
          <div className="relative border-l border-indigo-100 pl-6 ml-3 space-y-8" id="steps-list">
            {INSTRUCTIONS.map((step, index) => (
              <div key={index} className="relative" id={`step-item-${index}`}>
                <div className="absolute -left-[35px] top-0 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                  {index + 1}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm leading-6">{step.title}</h4>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Code Viewer */}
        <div className="lg:col-span-7 bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-lg flex flex-col" id="code-viewer-pane">
          <div className="bg-gray-900/80 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-medium text-gray-300">GoogleAppsScript.gs</span>
            </div>
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded border border-gray-700/60 transition-all cursor-pointer"
              id="btn-copy-code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[500px] font-mono text-xs text-gray-300 leading-relaxed bg-gray-950" id="code-content">
            <pre className="whitespace-pre-wrap select-all">
              {showFullCode ? APPS_SCRIPT_CODE : `${APPS_SCRIPT_CODE.substring(0, 1000)}\n\n// ... [Click below to show remaining ${APPS_SCRIPT_CODE.length - 1000} characters of script] ...`}
            </pre>
          </div>

          <div className="p-4 bg-gray-900/60 border-t border-gray-800/80 text-center">
            <button
              onClick={() => setShowFullCode(!showFullCode)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              id="btn-toggle-full-code"
            >
              {showFullCode ? "Show Less Code" : "Expand Full Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
