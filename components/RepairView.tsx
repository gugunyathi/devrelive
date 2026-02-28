import React, { useState, useEffect } from 'react';
import { Wrench, Github, Globe, CheckCircle2, CircleDashed, ArrowRight, FileCode2, Terminal, Activity, ShieldCheck, Play, ExternalLink, FileText, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export function RepairView() {
  const [appUrl, setAppUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairStep, setRepairStep] = useState(0);
  const [isRepairFinished, setIsRepairFinished] = useState(false);

  const steps = [
    { title: 'Checking Manifest & Embed', desc: 'Validating Base Mini App configuration' },
    { title: 'App Preview Analysis', desc: 'Testing UI and interactions' },
    { title: 'Identifying Problems', desc: 'Scanning for errors and vulnerabilities' },
    { title: 'Auto-Fixing Code', desc: 'Applying patches via OpenClaw Agent' },
    { title: 'Pushing to GitHub', desc: 'Triggering auto-deployment to production' },
    { title: 'Final Testing & Report', desc: 'Generating DevRel report' },
  ];

  const mockReport = {
    appName: "Base Quest Mini",
    issuesFound: 3,
    issuesFixed: 3,
    status: "Ready for Production",
    summary: "OpenClaw successfully identified and patched 3 critical issues in the Base Mini App manifest and frame routing. The application now passes all Base ecosystem requirements.",
    details: [
      "Fixed missing 'icon' field in manifest.json",
      "Resolved CORS policy block on /api/graphql",
      "Corrected frame sizing for mobile viewports"
    ]
  };

  const handleStartRepair = () => {
    if (!appUrl || !repoUrl) return;
    setIsRepairing(true);
    setIsRepairFinished(false);
    setRepairStep(0);
    
    // Simulate the repair process
    const interval = setInterval(() => {
      setRepairStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setIsRepairFinished(true);
          return steps.length;
        }
        return prev + 1;
      });
    }, 2000);
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 text-white overflow-hidden">
      {/* Left Panel - Input & Process */}
      <div className="w-1/2 flex flex-col border-r border-white/10 overflow-y-auto">
        <div className="p-8 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">OpenClaw Repair Agent</h1>
              <p className="text-zinc-400 text-sm">Autonomous Coding Agent for Base Mini App Repair Services</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Input Form */}
          <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-400" />
              Start New Repair
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Deployed App URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="url"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://your-mini-app.base.org"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">GitHub Repository</label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-sm text-indigo-300 flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>
                    <strong>Action Required:</strong> Please invite <code className="bg-black/30 px-1.5 py-0.5 rounded text-indigo-200">openclaw-agent</code> as a collaborator to your GitHub repository so it can push auto-fixes.
                  </span>
                </p>
                <button className="mt-3 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  Auto-Invite Agent <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={handleStartRepair}
                disabled={isRepairing && !isRepairFinished}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isRepairing && !isRepairFinished ? (
                  <>
                    <CircleDashed className="w-5 h-5 animate-spin" />
                    Repair in Progress...
                  </>
                ) : isRepairFinished ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Start Another Repair
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Initialize Repair Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Repair Progress */}
          {isRepairing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Agent Activity</h3>
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const isCompleted = index < repairStep;
                  const isCurrent = index === repairStep && !isRepairFinished;
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-4 p-4 rounded-xl border ${
                        isCurrent ? 'bg-indigo-500/10 border-indigo-500/30' : 
                        isCompleted ? 'bg-zinc-900/50 border-emerald-500/20' : 
                        'bg-zinc-900/20 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isCurrent ? (
                          <CircleDashed className="w-5 h-5 text-indigo-400 animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />
                        )}
                      </div>
                      <div>
                        <h4 className={`font-medium ${isCurrent ? 'text-indigo-300' : isCompleted ? 'text-emerald-300' : 'text-zinc-400'}`}>
                          {step.title}
                        </h4>
                        <p className="text-sm text-zinc-500 mt-1">
                          {isCompleted && index === steps.length - 1 ? 'Report Generated' : step.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summarized Report in Left Panel */}
          {isRepairFinished && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-emerald-300">Repair Summary</h3>
              </div>
              <p className="text-sm text-emerald-200/80 leading-relaxed">
                {mockReport.summary}
              </p>
              <ul className="space-y-2">
                {mockReport.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/70">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {detail}
                  </li>
                ))}
              </ul>
              <button className="w-full mt-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Full DevRel Report
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Panel - Dashboard & DevRel Tools */}
      <div className="w-1/2 flex flex-col bg-zinc-950 overflow-y-auto">
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-zinc-900/30">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            DevRel Dashboard
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              base.dev/preview
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Top Report Summary in Dashboard */}
          {isRepairFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{mockReport.appName}</h3>
                  <p className="text-sm text-indigo-300">Latest Repair Report</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  {mockReport.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Issues Found</p>
                  <p className="text-2xl font-bold text-white">{mockReport.issuesFound}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Issues Fixed</p>
                  <p className="text-2xl font-bold text-emerald-400">{mockReport.issuesFixed}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400">{mockReport.summary}</p>
            </motion.div>
          )}

          {/* DevRel Manual Follow-up */}
          <div className="bg-zinc-900/30 border border-white/10 rounded-2xl overflow-hidden flex-shrink-0">
            <div className="p-4 border-b border-white/10 bg-zinc-900/50 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Integrated App Preview & Manual Fixes</h3>
            </div>
            <div className="p-6">
              {isRepairFinished ? (
                <div className="flex gap-6">
                  {/* Mock App Screens */}
                  <div className="w-1/3 flex flex-col items-center gap-4">
                    <div className="w-full aspect-[9/16] bg-zinc-900 rounded-2xl border-4 border-zinc-800 overflow-hidden relative shadow-xl">
                      {/* Mock App Header */}
                      <div className="h-12 bg-indigo-600 flex items-center justify-center border-b border-indigo-700">
                        <span className="text-white font-bold text-sm">{mockReport.appName}</span>
                      </div>
                      {/* Mock App Content */}
                      <div className="p-4 space-y-3">
                        <div className="h-24 bg-zinc-800 rounded-xl animate-pulse" />
                        <div className="h-8 bg-zinc-800 rounded-lg w-3/4 animate-pulse" />
                        <div className="h-8 bg-zinc-800 rounded-lg w-1/2 animate-pulse" />
                        <div className="mt-auto absolute bottom-4 left-4 right-4 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Connect Wallet</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Preview Working
                    </div>
                  </div>
                  
                  {/* Code/Details Side */}
                  <div className="w-2/3 flex flex-col">
                    <div className="flex-1 bg-black rounded-xl border border-white/10 p-4 font-mono text-xs text-zinc-400 overflow-y-auto">
                      <div className="text-indigo-400 mb-2">{"// manifest.json - Fixed"}</div>
                      <div className="text-emerald-400 mb-4">{'+ "icon": "https://example.com/icon.png"'}</div>
                      
                      <div className="text-indigo-400 mb-2">{"// api/graphql - Fixed"}</div>
                      <div className="text-emerald-400 mb-4">{"+ res.setHeader('Access-Control-Allow-Origin', '*');"}</div>
                      
                      <div className="text-indigo-400 mb-2">{"// styles.css - Fixed"}</div>
                      <div className="text-emerald-400">{"+ height: 100dvh;"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-black rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                  <div className="text-center z-10">
                    <FileCode2 className="w-12 h-12 text-zinc-600 mx-auto mb-3 group-hover:text-indigo-400 transition-colors" />
                    <p className="text-zinc-400 font-medium">Select an app to preview</p>
                    <p className="text-xs text-zinc-500 mt-1">Integrated VS Code environment available</p>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex justify-end gap-3">
                <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-xl transition-colors">
                  View Full Report
                </button>
                <button 
                  onClick={() => {
                    if (repoUrl) {
                      const vscodeUrl = repoUrl.replace('github.com', 'vscode.dev/github');
                      window.open(vscodeUrl, '_blank');
                    } else {
                      window.open('https://vscode.dev', '_blank');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Open in VS Code
                </button>
              </div>
            </div>
          </div>

          {/* Resolved Issues Dashboard */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Recently Resolved by OpenClaw</h3>
            <div className="space-y-3">
              {[
                { id: 'REP-1042', app: 'SwapWidget', issue: 'Manifest missing icon field', status: 'Auto-Fixed', time: '10m ago' },
                { id: 'REP-1041', app: 'NFTMinter', issue: 'Embed frame sizing error', status: 'Auto-Fixed', time: '1h ago' },
                { id: 'REP-1040', app: 'BaseQuest', issue: 'CORS policy block on API', status: 'Manual Review', time: '2h ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'Auto-Fixed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{item.app}</span>
                        <span className="text-xs text-zinc-500">{item.id}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5">{item.issue}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                      item.status === 'Auto-Fixed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
