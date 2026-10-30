import uuid
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

from app.models import Workflow, WorkflowNode, WorkflowEdge, ExecutionResult, NodeType
from app.dag_engine import DAGEngine, DAGValidationError

app = FastAPI(
    title="Visual AI Agent Workflow Builder (DAG Engine)",
    version="1.0.0",
    description="Asynchronous DAG execution engine with conditional branching and AI LLM nodes"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

workflows_db: Dict[str, Workflow] = {}
executions_db: Dict[str, ExecutionResult] = {}

def seed_demo_workflow():
    wf_id = "wf_feedback_triage_01"
    nodes = [
        WorkflowNode(
            id="node_trigger",
            type=NodeType.TRIGGER,
            label="1. Webhook Customer Input",
            config={"default_payload": {"text": "Your API is failing and returning 500 errors. Please refund!"}},
            position={"x": 50, "y": 150}
        ),
        WorkflowNode(
            id="node_llm_analyzer",
            type=NodeType.LLM,
            label="2. AI Sentiment & Triage Agent",
            config={
                "prompt": "Evaluate this customer feedback: {{text}}",
                "model": "gemini-1.5-flash"
            },
            position={"x": 300, "y": 150}
        ),
        WorkflowNode(
            id="node_condition",
            type=NodeType.CONDITION,
            label="3. Is Negative Sentiment?",
            config={"field": "sentiment", "operator": "==", "value": "negative"},
            position={"x": 550, "y": 150}
        ),
        WorkflowNode(
            id="node_urgent_escalate",
            type=NodeType.TRANSFORM,
            label="4a. Escalation Alert (True)",
            config={"template": "[CRITICAL ALERT]: Priority customer issue detected: {{ai_response}}"},
            position={"x": 800, "y": 60}
        ),
        WorkflowNode(
            id="node_normal_log",
            type=NodeType.TRANSFORM,
            label="4b. Standard Log (False)",
            config={"template": "[INFO]: Positive or routine customer note: {{ai_response}}"},
            position={"x": 800, "y": 240}
        ),
        WorkflowNode(
            id="node_output",
            type=NodeType.OUTPUT,
            label="5. Final Result Dispatcher",
            config={},
            position={"x": 1050, "y": 150}
        )
    ]

    edges = [
        WorkflowEdge(id="e1", source="node_trigger", target="node_llm_analyzer"),
        WorkflowEdge(id="e2", source="node_llm_analyzer", target="node_condition"),
        WorkflowEdge(id="e3", source="node_condition", target="node_urgent_escalate", source_handle="true"),
        WorkflowEdge(id="e4", source="node_condition", target="node_normal_log", source_handle="false"),
        WorkflowEdge(id="e5", source="node_urgent_escalate", target="node_output"),
        WorkflowEdge(id="e6", source="node_normal_log", target="node_output"),
    ]

    wf = Workflow(
        id=wf_id,
        name="Customer Feedback AI Auto-Triage",
        description="Analyzes incoming feedback with AI, routes negative issues to incident alerts and routine notes to archive.",
        nodes=nodes,
        edges=edges
    )
    workflows_db[wf_id] = wf

seed_demo_workflow()

class RunWorkflowRequest(BaseModel):
    input_data: Dict[str, Any]

@app.get("/")
def root():
    return {
        "engine": "Visual AI Agent Workflow Builder",
        "status": "online",
        "port": 8082,
        "docs": "/docs"
    }

@app.get("/api/v1/workflows", response_model=List[Workflow])
def list_workflows():
    return list(workflows_db.values())

@app.post("/api/v1/workflows", response_model=Workflow)
def create_workflow(wf: Workflow):
    is_valid, err = DAGEngine.validate_dag(wf.nodes, wf.edges)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)

    if not wf.id:
        wf.id = f"wf_{uuid.uuid4().hex[:8]}"
    wf.updated_at = datetime.utcnow()
    workflows_db[wf.id] = wf
    return wf

@app.get("/api/v1/workflows/{workflow_id}", response_model=Workflow)
def get_workflow(workflow_id: str):
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflows_db[workflow_id]

@app.post("/api/v1/workflows/{workflow_id}/run", response_model=ExecutionResult)
async def run_workflow(workflow_id: str, req: RunWorkflowRequest):
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail="Workflow not found")

    wf = workflows_db[workflow_id]
    try:
        result = await DAGEngine.execute_workflow(wf, req.input_data)
        executions_db[result.id] = result
        return result
    except DAGValidationError as ex:
        raise HTTPException(status_code=400, detail=str(ex))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(ex)}")

@app.get("/api/v1/executions", response_model=List[ExecutionResult])
def list_executions():
    # Return recent executions in reverse chronological order
    return sorted(list(executions_db.values()), key=lambda x: x.created_at, reverse=True)

@app.get("/api/v1/executions/{execution_id}", response_model=ExecutionResult)
def get_execution(execution_id: str):
    if execution_id not in executions_db:
        raise HTTPException(status_code=404, detail="Execution not found")
    return executions_db[execution_id]
