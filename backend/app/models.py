from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class NodeType(str):
    TRIGGER = "trigger"
    LLM = "llm"
    CONDITION = "condition"
    TRANSFORM = "transform"
    OUTPUT = "output"

class NodeData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    label: str
    node_type: str = Field(..., alias="type")
    config: Dict[str, Any] = Field(default_factory=dict)

class WorkflowNode(BaseModel):
    id: str
    type: str
    label: str
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Optional[Dict[str, float]] = None

class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None  # e.g., 'true' or 'false' for condition nodes

class Workflow(BaseModel):
    id: str
    name: str
    description: str = ""
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ExecutionStep(BaseModel):
    node_id: str
    node_type: str
    node_label: str
    status: str  # 'running', 'success', 'failed', 'skipped'
    input_data: Dict[str, Any] = Field(default_factory=dict)
    output_data: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    latency_ms: int = 0
    executed_at: datetime = Field(default_factory=datetime.utcnow)

class ExecutionResult(BaseModel):
    id: str
    workflow_id: str
    status: str  # 'success', 'failed', 'partial'
    steps: List[ExecutionStep] = Field(default_factory=list)
    final_output: Dict[str, Any] = Field(default_factory=dict)
    total_latency_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
