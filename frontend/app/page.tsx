'use client'

import React, { useState, useEffect } from 'react'
import {
  Workflow as WorkflowIcon,
  Play,
  GitBranch,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Send,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react'

interface WorkflowNode {
  id: string
  type: string
  label: string
  config: Record<string, any>
  position?: { x: number; y: number }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  source_handle?: string
}

interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

interface ExecutionStep {
  node_id: string
  node_type: string
  node_label: string
  status: 'running' | 'success' | 'failed' | 'skipped'
  input_data: any
  output_data: any
  error_message?: string
  latency_ms: number
  executed_at: string
}

interface ExecutionResult {
  id: string
  workflow_id: string
  status: 'success' | 'failed' | 'partial'
  steps: ExecutionStep[]
  final_output: any
  total_latency_ms: number
  created_at: string
}

const API_BASE = 'http://localhost:8082'

export default function DAGStudio() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null)
  const [inputText, setInputText] = useState('Our payment endpoint crashed and users are getting 500 errors. We need urgent support!')
  const [isRunning, setIsRunning] = useState(false)
  const [latestRun, setLatestRun] = useState<ExecutionResult | null>(null)
  const [executions, setExecutions] = useState<ExecutionResult[]>([])
  const [selectedStep, setSelectedStep] = useState<ExecutionStep | null>(null)

  const fetchData = async () => {
    try {
      const [resWf, resExecs] = await Promise.all([
        fetch(`${API_BASE}/api/v1/workflows`),
        fetch(`${API_BASE}/api/v1/executions`)
      ])
      if (resWf.ok) {
        const wfList = await resWf.json()
        setWorkflows(wfList)
        if (!activeWorkflow && wfList.length > 0) {
          setActiveWorkflow(wfList[0])
        }
      }
      if (resExecs.ok) {
        const execList = await resExecs.json()
        setExecutions(execList)
      }
    } catch (e) {
      console.warn('Backend server not connected yet on :8082', e)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleRunWorkflow = async () => {
    if (!activeWorkflow) return
    setIsRunning(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/${activeWorkflow.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_data: { text: inputText }
        })
      })
      if (res.ok) {
        const result: ExecutionResult = await res.json()
        setLatestRun(result)
        if (result.steps.length > 0) {
          setSelectedStep(result.steps[result.steps.length - 1])
        }
        fetchData()
      } else {
        const err = await res.json()
        alert('Workflow execution failed: ' + (err.detail || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to connect to FastAPI backend on :8082')
    } finally {
      setIsRunning(false)
    }
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return 'border-sky-500/40 bg-sky-950/20 text-sky-400'
      case 'llm':
        return 'border-purple-500/40 bg-purple-950/20 text-purple-400'
      case 'condition':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-400'
      case 'transform':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
      default:
        return 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400'
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'trigger':
        return <Zap className="w-4 h-4 text-sky-400" />
      case 'llm':
        return <Bot className="w-4 h-4 text-purple-400" />
      case 'condition':
        return <GitBranch className="w-4 h-4 text-amber-400" />
      case 'transform':
        return <Sparkles className="w-4 h-4 text-emerald-400" />
      default:
        return <Database className="w-4 h-4 text-indigo-400" />
    }
  }

  // Find execution status of node if latest run exists
  const getNodeExecutionStatus = (nodeId: string) => {
    if (!latestRun) return null
    const step = latestRun.steps.find((s) => s.node_id === nodeId)
    return step ? step.status : null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 border border-purple-500/40 rounded-lg text-purple-400">
            <WorkflowIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Visual AI Agent Workflow Builder
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800 font-mono">
                DAG Engine :8082
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Asynchronous DAG execution engine with conditional branching and AI nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning || !activeWorkflow}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Executing DAG...' : 'Run Workflow DAG'}
          </button>
        </div>
      </header>

      {/* Main Studio View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Workflow Header & Input Simulator */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold">Active Workflow Graph</span>
              <h2 className="text-xl font-bold text-white mt-0.5">{activeWorkflow?.name || 'Customer Feedback AI Auto-Triage'}</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">{activeWorkflow?.description}</p>
            </div>
            {latestRun && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> DAG Run #{latestRun.id.slice(0, 6)} ({latestRun.total_latency_ms}ms)
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1 font-medium">Test Trigger Input Payload (Customer Feedback Text)</label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type customer message..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => setInputText('Your API is failing and returning 500 errors. Please refund!')}
                className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-red-300 text-xs border border-red-950"
              >
                Preset: Negative Bug
              </button>
              <button
                onClick={() => setInputText('Love your product! Setup took 2 minutes and works smoothly.')}
                className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 text-xs border border-emerald-950"
              >
                Preset: Positive Praise
              </button>
            </div>
          </div>
        </div>

        {/* Visual DAG Nodes Canvas Representation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Directed Acyclic Graph (DAG) Pipeline Visualization</span>
            <span>Click any node to inspect execution step data</span>
          </div>

          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/30 overflow-x-auto min-h-[260px] flex items-center justify-start gap-4">
            {activeWorkflow?.nodes.map((node, i) => {
              const execStatus = getNodeExecutionStatus(node.id)
              const isSkipped = execStatus === 'skipped'
              const isSuccess = execStatus === 'success'

              return (
                <React.Fragment key={node.id}>
                  {i > 0 && (
                    <div className="flex flex-col items-center">
                      <ArrowRight className={`w-5 h-5 ${isSkipped ? 'text-slate-700' : 'text-purple-400'}`} />
                      {node.type === 'transform' && node.label.includes('True') && (
                        <span className="text-[10px] font-mono text-emerald-400">true</span>
                      )}
                      {node.type === 'transform' && node.label.includes('False') && (
                        <span className="text-[10px] font-mono text-slate-500">false</span>
                      )}
                    </div>
                  )}

                  <div
                    onClick={() => {
                      const step = latestRun?.steps.find((s) => s.node_id === node.id)
                      if (step) setSelectedStep(step)
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer min-w-[200px] max-w-[230px] flex flex-col gap-2 relative ${
                      isSkipped
                        ? 'opacity-40 bg-slate-900/20 border-slate-800 line-through'
                        : isSuccess
                        ? 'ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-500/10 bg-slate-900 border-slate-700'
                        : getNodeColor(node.type)
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        {getNodeIcon(node.type)}
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950/60 text-slate-300">
                        {node.type}
                      </span>
                    </div>

                    <div>
                      <div className="font-semibold text-xs text-white truncate">{node.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 font-mono">
                        {node.type === 'llm'
                          ? `Prompt: ${node.config.prompt}`
                          : node.type === 'condition'
                          ? `If ${node.config.field} ${node.config.operator} "${node.config.value}"`
                          : node.type === 'trigger'
                          ? 'Ingests initial payload'
                          : 'Processes output'}
                      </div>
                    </div>

                    {execStatus && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className={isSuccess ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {execStatus.toUpperCase()}
                        </span>
                        {isSuccess && (
                          <span className="font-mono text-slate-400">
                            {latestRun?.steps.find((s) => s.node_id === node.id)?.latency_ms}ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Step Inspector & Final Aggregated Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step Detail Inspector */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                Step Inspector: {selectedStep ? selectedStep.node_label : 'Select a node'}
              </h3>
              {selectedStep && (
                <span className="text-xs font-mono text-slate-400">Latency: {selectedStep.latency_ms}ms</span>
              )}
            </div>

            {selectedStep ? (
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block mb-1">
                    Step Output Data
                  </span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-purple-300 overflow-x-auto min-h-[140px]">
                    {JSON.stringify(selectedStep.output_data, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block mb-1">
                    Step Input Data
                  </span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 overflow-x-auto max-h-[120px]">
                    {JSON.stringify(selectedStep.input_data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Run the workflow to inspect step-by-step intermediate execution results.
              </div>
            )}
          </div>

          {/* Final Aggregated Output */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Final Aggregated Workflow Result
            </h3>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto min-h-[240px]">
              {latestRun
                ? JSON.stringify(latestRun.final_output, null, 2)
                : '// Click "Run Workflow DAG" above to trigger automated execution.'}
            </pre>
          </div>
        </div>
      </main>
    </div>
  )
}
