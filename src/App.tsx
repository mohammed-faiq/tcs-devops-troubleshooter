/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  Activity, 
  UploadCloud, 
  Trash2, 
  Sparkles, 
  Play, 
  History, 
  Check, 
  AlertCircle, 
  Sliders, 
  Copy, 
  CheckCircle2, 
  FileCode, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { SAMPLE_INCIDENTS, IncidentScenario } from './data/sampleLogs';
import { scrubSensitiveData } from './utils/scrubber';
import { RunbookViewer } from './components/RunbookViewer';

interface DiagnosisHistoryItem {
  id: string;
  timestamp: string;
  scenarioName?: string;
  environment: string;
  serviceType: string;
  logSnippet: string;
  report: string;
}

export default function App() {
  const [logText, setLogText] = useState<string>(SAMPLE_INCIDENTS[0].rawLog);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(SAMPLE_INCIDENTS[0].id);
  const [environment, setEnvironment] = useState<string>('Production (EKS)');
  const [serviceType, setServiceType] = useState<string>('Java / Spring Boot');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportTimestamp, setReportTimestamp] = useState<string | null>(null);
  
  const [autoScrub, setAutoScrub] = useState<boolean>(true);
  const [scrubNotice, setScrubNotice] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<DiagnosisHistoryItem[]>([]);
  const [serverHealth, setServerHealth] = useState<'checking' | 'online' | 'missing-key'>('checking');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devops_troubleshoot_history');
      if (saved) {
        setHistoryItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    // Check server health
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'online') {
          setServerHealth(data.hasApiKey ? 'online' : 'missing-key');
        }
      })
      .catch(() => {
        setServerHealth('checking');
      });
  }, []);

  const saveToHistory = (report: string) => {
    const activeIncident = SAMPLE_INCIDENTS.find(s => s.id === activeScenarioId);
    const newItem: DiagnosisHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      scenarioName: activeIncident ? activeIncident.name : 'Custom Deployment Incident',
      environment,
      serviceType,
      logSnippet: logText.slice(0, 180),
      report,
    };

    setHistoryItems(prev => {
      const updated = [newItem, ...prev.slice(0, 19)];
      try {
        localStorage.setItem('devops_troubleshoot_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleSelectScenario = (scenario: IncidentScenario) => {
    setActiveScenarioId(scenario.id);
    setLogText(scenario.rawLog);
    setEnvironment(scenario.environment);
    setServiceType(scenario.serviceType);
    setScrubNotice(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLogText(content);
        setActiveScenarioId('custom');
        setScrubNotice(`Uploaded ${file.name} (${Math.round(file.size / 1024)} KB)`);
      }
    };
    reader.readAsText(file);
  };

  const handleScrubNow = () => {
    const { scrubbed, count } = scrubSensitiveData(logText);
    setLogText(scrubbed);
    setScrubNotice(`Data Privacy Scrub: Masked ${count} potential IP addresses/tokens.`);
    setTimeout(() => setScrubNotice(null), 4000);
  };

  const handleAnalyze = async () => {
    if (!logText.trim()) {
      setErrorMessage('Please provide deployment logs or select a sample scenario.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStage('Parsing server logs and isolating failure signature...');

    // Auto-scrub if enabled
    let textToAnalyze = logText;
    if (autoScrub) {
      const { scrubbed } = scrubSensitiveData(logText);
      textToAnalyze = scrubbed;
    }

    try {
      setTimeout(() => setLoadingStage('Translating cryptic error codes and identifying root cause...'), 700);
      setTimeout(() => setLoadingStage('Generating actionable CLI runbook and verification steps...'), 1600);

      const response = await fetch('/api/troubleshoot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logText: textToAnalyze,
          environment,
          serviceType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze deployment logs.');
      }

      const report = data.report;
      setReportResult(report);
      setReportTimestamp(data.timestamp || new Date().toISOString());
      saveToHistory(report);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during log analysis.');
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base tracking-tight">
                  DevOps Deployment Troubleshooter
                </span>
                <span className="hidden md:inline-flex text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Single-Agent Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Root cause isolation & step-by-step remediation runbooks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Server Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono">
              <span className={`w-2 h-2 rounded-full ${
                serverHealth === 'online' ? 'bg-emerald-400 animate-pulse' :
                serverHealth === 'missing-key' ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              <span className="text-slate-300 hidden sm:inline">
                {serverHealth === 'online' ? 'Gemini 3.8 Online' :
                 serverHealth === 'missing-key' ? 'API Key Missing' : 'Connecting'}
              </span>
            </div>

            {/* History Drawer Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                showHistory 
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Recent Triage History"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History ({historyItems.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Rules of Engagement Banner */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-200">Strict Rules of Engagement:</span>
              <p className="text-slate-400 mt-0.5">
                Isolate exact errors · Provide human-readable summaries · Deliver zero-filler CLI runbooks with immediate action, remediation & verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Zero Hallucinated Fillers</span>
            <span className="text-slate-600">|</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Strict RFC Format</span>
          </div>
        </div>

        {/* Preset Incident Scenarios Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium uppercase tracking-wider text-[11px]">
              Load Common Incident Scenarios
            </span>
            <span className="text-slate-500">Click any preset to simulate messy production logs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {SAMPLE_INCIDENTS.map((scenario) => {
              const isSelected = activeScenarioId === scenario.id;
              return (
                <button
                  key={scenario.id}
                  onClick={() => handleSelectScenario(scenario)}
                  className={`text-left p-3 rounded-lg border transition-all text-xs flex flex-col justify-between h-24 ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/70 text-slate-100 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold line-clamp-2 leading-tight text-slate-200">
                    {scenario.name}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate mt-1">
                    {scenario.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Configuration & Log Terminal */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Metadata Controls Bar */}
          <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Environment:</span>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="bg-slate-800 text-slate-200 rounded-md border border-slate-700 px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Production (EKS)">Production (EKS)</option>
                  <option value="Production (GKE)">Production (GKE)</option>
                  <option value="Production (AWS ECS)">Production (AWS ECS)</option>
                  <option value="Staging (Ubuntu 24.04)">Staging (Ubuntu 24.04)</option>
                  <option value="CI/CD (GitHub Actions)">CI/CD (GitHub Actions)</option>
                  <option value="Cloud Run / Serverless">Cloud Run / Serverless</option>
                  <option value="Bare Metal / Docker Compose">Bare Metal / Docker Compose</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Failing Stack:</span>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="bg-slate-800 text-slate-200 rounded-md border border-slate-700 px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Auto-detect">Auto-detect Stack</option>
                  <option value="Kubernetes & Containerd">Kubernetes & Containerd</option>
                  <option value="Nginx + Gunicorn (Python)">Nginx + Gunicorn (Python)</option>
                  <option value="PostgreSQL & Prisma ORM">PostgreSQL & Prisma ORM</option>
                  <option value="Go / Docker Alpine">Go / Docker Alpine</option>
                  <option value="Envoy / mTLS Gateway">Envoy / mTLS Gateway</option>
                  <option value="Node.js / Express">Node.js / Express</option>
                  <option value="Java / Spring Boot">Java / Spring Boot</option>
                  <option value="Redis / In-Memory Cache">Redis / In-Memory Cache</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Data Privacy Scrubber Toggle */}
              <label 
                className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 hover:border-slate-600 transition-colors"
                title="Automatically redact private IP addresses, passwords, tokens before submission"
              >
                <input
                  type="checkbox"
                  checked={autoScrub}
                  onChange={(e) => setAutoScrub(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Scrub PII & Tokens</span>
              </label>

              {/* Manual Scrub Button */}
              <button
                onClick={handleScrubNow}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Manually sanitize current log buffer"
              >
                Mask Sensitive Data Now
              </button>

              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                title="Upload log file from disk"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>

              {/* Clear */}
              <button
                onClick={() => {
                  setLogText('');
                  setActiveScenarioId('');
                  setScrubNotice(null);
                }}
                className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Privacy scrub notice banner */}
          {scrubNotice && (
            <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-5 py-2 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {scrubNotice}
              </span>
              <button
                onClick={() => setScrubNotice(null)}
                className="text-emerald-400/80 hover:text-emerald-200 text-xs font-mono"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Code / Log Editor */}
          <div className="relative">
            <textarea
              value={logText}
              onChange={(e) => {
                setLogText(e.target.value);
                setActiveScenarioId('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Paste raw deployment logs, docker run output, kubectl describe/logs, systemd journal, or stack traces here..."
              rows={12}
              className="w-full bg-slate-950 px-5 py-4 font-mono text-xs text-slate-200 leading-relaxed border-none outline-none resize-y focus:ring-0 placeholder:text-slate-600 selection:bg-emerald-600/30"
              spellCheck={false}
            />

            <div className="absolute right-4 bottom-3 text-[11px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
              {logText.split('\n').length} lines · {logText.length.toLocaleString()} chars
            </div>
          </div>

          {/* Action Bar */}
          <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="hidden sm:inline">Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                Cmd/Ctrl + Enter
              </kbd>
              <span className="hidden sm:inline">to start diagnosis</span>
            </div>

            <div className="flex items-center gap-3">
              {errorMessage && (
                <span className="text-xs text-red-400 flex items-center gap-1.5 max-w-md truncate">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorMessage}
                </span>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading || !logText.trim()}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                  isLoading
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-950/40 active:scale-[0.99]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>{loadingStage || 'Diagnosing Incident...'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Diagnose & Generate Runbook</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading Progress State */}
        {isLoading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3 animate-pulse">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">
              {loadingStage || 'Analyzing deployment telemetry...'}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Scanning stack traces, discarding successful log noise, pinpointing exact failing components, and structuring CLI remediation steps.
            </p>
          </div>
        )}

        {/* Runbook Results Section */}
        {reportResult && (
          <div ref={resultsRef} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Deployment Triage Diagnostic Output</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Verified Single-Agent Runbook
              </span>
            </div>

            <RunbookViewer
              markdown={reportResult}
              timestamp={reportTimestamp || undefined}
              environment={environment}
              serviceType={serviceType}
            />
          </div>
        )}

        {/* Past History Drawer / Modal */}
        {showHistory && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Recent Incident Triage History</span>
              </div>
              <button
                onClick={() => {
                  setHistoryItems([]);
                  localStorage.removeItem('devops_troubleshoot_history');
                }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear History
              </button>
            </div>

            {historyItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No previous incident reports yet. Run an analysis to store triage records.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">
                          {item.scenarioName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {item.environment}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {item.logSnippet.replace(/\n/g, ' ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => {
                          setReportResult(item.report);
                          setReportTimestamp(item.timestamp);
                          setEnvironment(item.environment);
                          setServiceType(item.serviceType);
                          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                      >
                        Restore Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-600">
        <p>
          DevOps IT Deployment Troubleshooting Assistant · High precision automated root-cause & CLI runbook synthesis
        </p>
      </footer>
    </div>
  );
}
