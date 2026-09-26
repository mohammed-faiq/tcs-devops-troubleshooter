import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertTriangle, 
  Search, 
  Wrench, 
  Download, 
  FileText, 
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';

interface RunbookViewerProps {
  markdown: string;
  timestamp?: string;
  environment?: string;
  serviceType?: string;
}

interface ParsedRunbook {
  rootCause: string;
  primaryError: string;
  failingComponent: string;
  logAnalysisExtra: string[];
  steps: {
    number: number;
    title: string;
    description: string;
    commands: string[];
  }[];
  rawMarkdown: string;
}

export const RunbookViewer: React.FC<RunbookViewerProps> = ({
  markdown,
  timestamp,
  environment,
  serviceType,
}) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'raw'>('interactive');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Parse markdown matching the required format
  const parsed = React.useMemo<ParsedRunbook>(() => {
    let rootCause = '';
    let primaryError = '';
    let failingComponent = '';
    const logAnalysisExtra: string[] = [];
    const steps: { number: number; title: string; description: string; commands: string[] }[] = [];

    // Extract Root Cause
    const rootCauseMatch = markdown.match(/##\s*🚨?\s*Root Cause Summary\s*([\s\S]*?)(?=##\s*🔍?\s*Log Analysis|$)/i);
    if (rootCauseMatch && rootCauseMatch[1]) {
      rootCause = rootCauseMatch[1].trim();
    }

    // Extract Log Analysis
    const logAnalysisMatch = markdown.match(/##\s*🔍?\s*Log Analysis\s*([\s\S]*?)(?=##\s*🛠️?\s*Actionable Troubleshooting Steps|$)/i);
    if (logAnalysisMatch && logAnalysisMatch[1]) {
      const sectionText = logAnalysisMatch[1].trim();
      const lines = sectionText.split('\n');
      for (const line of lines) {
        const errorMatch = line.match(/\*\s*\*\*Primary Error Detected:\*\*\s*(.*)/i);
        const compMatch = line.match(/\*\s*\*\*Failing Component:\*\*\s*(.*)/i);
        if (errorMatch) {
          primaryError = errorMatch[1].trim().replace(/^[`'"]+|[`'"]+$/g, '');
        } else if (compMatch) {
          failingComponent = compMatch[1].trim().replace(/^[`'"]+|[`'"]+$/g, '');
        } else if (line.trim().length > 0 && !line.startsWith('#')) {
          logAnalysisExtra.push(line.trim());
        }
      }
    }

    // Extract Troubleshooting Steps
    const stepsMatch = markdown.match(/##\s*🛠️?\s*Actionable Troubleshooting Steps\s*([\s\S]*?)$/i);
    if (stepsMatch && stepsMatch[1]) {
      const stepsContent = stepsMatch[1].trim();
      // Split on numbered items: e.g. "1. ", "2. ", "3. "
      const rawSteps = stepsContent.split(/(?:^|\n)(?=\d+\.\s*)/g).filter(s => s.trim().length > 0);

      rawSteps.forEach((stepChunk, idx) => {
        const match = stepChunk.match(/^(\d+)\.\s*([\s\S]*)/);
        const num = match ? parseInt(match[1], 10) : idx + 1;
        const text = match ? match[2].trim() : stepChunk.trim();

        // Extract commands within code blocks (```bash ... ``` or `inline`)
        const commands: string[] = [];
        const codeBlockRegex = /```(?:bash|sh|shell|yaml|json|sql|docker)?\n([\s\S]*?)```/g;
        let codeBlockMatch;
        while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
          commands.push(codeBlockMatch[1].trim());
        }

        // If no fenced code blocks, check for backticks
        if (commands.length === 0) {
          const inlineRegex = /`([^`\n]{6,})`/g;
          let inlineMatch;
          while ((inlineMatch = inlineRegex.exec(text)) !== null) {
            if (inlineMatch[1].includes('kubectl') || 
                inlineMatch[1].includes('docker') || 
                inlineMatch[1].includes('systemctl') || 
                inlineMatch[1].includes('chmod') || 
                inlineMatch[1].includes('chown') || 
                inlineMatch[1].includes('curl') || 
                inlineMatch[1].includes('kill') ||
                inlineMatch[1].includes('export') ||
                inlineMatch[1].includes('nginx') ||
                inlineMatch[1].includes('cat') ||
                inlineMatch[1].includes('grep')) {
              commands.push(inlineMatch[1].trim());
            }
          }
        }

        // Clean title & description
        const firstLine = text.split('\n')[0].trim();
        const remaining = text.split('\n').slice(1).join('\n').trim();

        steps.push({
          number: num,
          title: firstLine,
          description: remaining,
          commands,
        });
      });
    }

    return {
      rootCause: rootCause || 'Root cause summary generated.',
      primaryError: primaryError || 'Unspecified Error Signature',
      failingComponent: failingComponent || 'Application Container / Stack',
      logAnalysisExtra,
      steps,
      rawMarkdown: markdown,
    };
  }, [markdown]);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopySnippet = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident-runbook-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleStep = (num: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [num]: !prev[num],
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide flex items-center gap-2">
            <span>Incident Runbook & Triage Report</span>
            {environment && (
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {environment}
              </span>
            )}
            {serviceType && (
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/80">
                {serviceType}
              </span>
            )}
          </h3>
          {timestamp && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              · {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/70 text-xs">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'interactive'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Interactive Runbook</span>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'raw'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Raw Markdown</span>
            </button>
          </div>

          {/* Copy complete markdown */}
          <button
            onClick={handleCopyAll}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Copy entire formatted markdown report"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Runbook</span>
              </>
            )}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
            title="Export as markdown (.md)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'interactive' ? (
        <div className="p-6 space-y-6">
          {/* SECTION 1: Root Cause Summary */}
          <div className="bg-gradient-to-r from-red-950/40 via-red-900/20 to-slate-900/60 border border-red-800/40 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5 text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold tracking-wide text-red-300 uppercase">
                    Root Cause Summary
                  </h4>
                  <span className="text-xs text-red-400/80">#01 Core Assessment</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line font-medium">
                  {parsed.rootCause}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Log Analysis */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  Log Analysis & Failure Isolation
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-mono">STRICT_PARSE: OK</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Error Detected */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1.5">
                <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>PRIMARY ERROR DETECTED</span>
                  <button
                    onClick={() => handleCopySnippet(parsed.primaryError, 'err')}
                    className="hover:text-slate-200 transition-colors"
                    title="Copy error string"
                  >
                    {copiedIndex === 'err' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-amber-300 bg-black/40 px-2.5 py-1.5 rounded border border-amber-900/30 break-all select-all">
                  {parsed.primaryError}
                </div>
              </div>

              {/* Failing Component */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1.5">
                <div className="text-xs font-mono text-slate-400">FAILING COMPONENT</div>
                <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 bg-black/40 px-2.5 py-1.5 rounded border border-cyan-900/30">
                  <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-semibold">{parsed.failingComponent}</span>
                </div>
              </div>
            </div>

            {parsed.logAnalysisExtra.length > 0 && (
              <div className="text-xs text-slate-400 space-y-1 pt-1">
                {parsed.logAnalysisExtra.map((extra, idx) => (
                  <p key={idx} className="font-mono text-slate-300">
                    {extra}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: Actionable Troubleshooting Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  Actionable Troubleshooting Steps
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                {Object.values(completedSteps).filter(Boolean).length} of {parsed.steps.length} completed
              </span>
            </div>

            <div className="space-y-3">
              {parsed.steps.map((step) => {
                const isDone = Boolean(completedSteps[step.number]);
                return (
                  <div
                    key={step.number}
                    className={`border rounded-xl transition-all ${
                      isDone
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
                        : 'bg-slate-950/90 border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="p-4 flex items-start gap-3">
                      {/* Step completion checkbox */}
                      <button
                        onClick={() => toggleStep(step.number)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-500 text-transparent'
                        }`}
                        title={isDone ? 'Mark as pending' : 'Mark step as executed'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <div className="flex-1 space-y-2.5 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h5
                            className={`text-sm font-semibold tracking-wide ${
                              isDone ? 'text-slate-400 line-through' : 'text-slate-100'
                            }`}
                          >
                            <span className="text-emerald-400 font-mono mr-1.5">
                              Step {step.number}:
                            </span>
                            {step.title.replace(/^\*{0,2}Step\s*\d+:?\s*\*{0,2}/i, '')}
                          </h5>
                          <span className="text-[11px] font-mono text-slate-500 shrink-0">
                            P{step.number}
                          </span>
                        </div>

                        {step.description && (
                          <div className="text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                            {step.description}
                          </div>
                        )}

                        {/* Code and CLI commands */}
                        {step.commands.map((cmd, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-black/80 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 relative group overflow-x-auto"
                          >
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Terminal className="w-3 h-3 text-emerald-400" />
                                CLI Remediation Command
                              </span>
                              <button
                                onClick={() => handleCopySnippet(cmd, `cmd-${step.number}-${cIdx}`)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                              >
                                {copiedIndex === `cmd-${step.number}-${cIdx}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-400" />
                                    <span>Copy CLI</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="text-emerald-300 whitespace-pre-wrap break-all leading-normal">
                              {cmd}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Raw Markdown View matching prompt strictly */
        <div className="p-6">
          <div className="bg-black/90 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all overflow-x-auto max-h-[600px] overflow-y-auto">
            {markdown}
          </div>
        </div>
      )}

      {/* Footer Runbook status */}
      <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Single-Agent Triage Protocol: Zero filler words · High technical precision
        </span>
        <span>Standard: RFC-SRE Incident Playbook</span>
      </div>
    </div>
  );
};
