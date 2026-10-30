# Visual AI Agent Workflow Builder (DAG Engine)

A high-performance asynchronous Directed Acyclic Graph (DAG) workflow orchestrator built in **Python (FastAPI + AsyncIO + Pydantic v2)** with an interactive visual studio built in **Next.js 14 / React**.

Allows engineers and product teams to assemble multi-step AI reasoning pipelines with **cycle detection (Kahn's algorithm)**, **dynamic variable interpolation**, and **conditional branch execution**.

---

## 🌟 Key Features

* **Strict DAG Topology Validation**: Kahn's algorithm (topological in-degree analysis) automatically detects and rejects circular dependencies/infinite loops before execution.
* **Asynchronous Multi-Step Execution**: Runs nodes in topological sequence with parallel branching support using Python AsyncIO.
* **Dynamic Variable Templating**: Seamlessly interpolates outputs across previous nodes (e.g. `{{trigger.text}}`, `{{llm_analyzer.sentiment}}`).
* **Conditional Branching (If-Else)**: Dynamically routes execution along `true` or `false` paths, marking unchosen branches as `skipped` without terminating the graph.
* **Granular Step Telemetry**: Tracks per-node latency in milliseconds, inputs, outputs, and aggregated payload summaries.
* **Next.js Workflow Studio**: Interactive visual flow representation, real-time node state lighting, and execution step inspector.

---

## 📐 Architecture Overview

```text
[ Incoming Webhook / Input Payload ]
                │
                ▼
┌────────────────────────────────────────────────────────┐
│               FastAPI DAG Execution Engine             │
│                                                        │
│  1. Kahn's Algorithm Validation (Zero-Cycle Guarantee) │
│                                                        │
│  2. Topological Node Scheduling                        │
│                                                        │
│       ┌───────────────┐                                │
│       │ 1. Trigger    │                                │
│       └───────┬───────┘                                │
│               ▼                                        │
│       ┌───────────────┐                                │
│       │ 2. AI LLM     │ (Sentiment & Task Processing)  │
│       └───────┬───────┘                                │
│               ▼                                        │
│       ┌───────────────┐                                │
│       │ 3. Condition  │ (If sentiment == "negative")   │
│       └───┬───────┬───┘                                │
│    [true] │       │ [false]                            │
│           ▼       ▼                                    │
│   ┌───────────┐ ┌───────────┐                          │
│   │ Escalation│ │ Archive   │                          │
│   └─────┬─────┘ └─────┬─────┘                          │
│         └───────┬─────┘                                │
│                 ▼                                      │
│       ┌──────────────────┐                             │
│       │ 5. Output Result │                             │
│       └──────────────────┘                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Python** 3.11+
* **Node.js** 18+ (for Next.js frontend)

### 2. Run the Python FastAPI Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8082 --reload
```
The server will start on `http://localhost:8082`. Swagger docs available at [http://localhost:8082/docs](http://localhost:8082/docs).

### 3. Run the Next.js Studio
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3002](http://localhost:3002) in your browser.

*(Optional)* You can also double click `frontend/public/standalone.html` to run the DAG studio immediately in any browser!

---

## 🧪 Automated Tests

Run automated test suites verifying cycle detection and execution:
```bash
cd backend
python -m pytest tests -v
```

---

## 📂 Project Structure

```text
03-ai-workflow-dag/
├── backend/
│   ├── app/
│   │   ├── dag_engine.py       # Topological sort, Kahn's algorithm, node runner
│   │   ├── main.py             # FastAPI entrypoint, REST APIs, seeded DAG
│   │   └── models.py           # Pydantic v2 schemas for nodes, edges, steps
│   ├── tests/
│   │   └── test_dag_engine.py  # Unit tests for cycle detection & branching
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Visual DAG canvas & execution timeline
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── public/standalone.html  # Zero-dependency instant preview UI
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```
