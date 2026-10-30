import asyncio
from app.models import Workflow, WorkflowNode, WorkflowEdge, NodeType
from app.dag_engine import DAGEngine

def test_cycle_detection():
    # Construct a circular graph: Node A -> Node B -> Node C -> Node A
    nodes = [
        WorkflowNode(id="A", type=NodeType.TRIGGER, label="Node A"),
        WorkflowNode(id="B", type=NodeType.LLM, label="Node B"),
        WorkflowNode(id="C", type=NodeType.OUTPUT, label="Node C"),
    ]
    edges = [
        WorkflowEdge(id="e1", source="A", target="B"),
        WorkflowEdge(id="e2", source="B", target="C"),
        WorkflowEdge(id="e3", source="C", target="A"),  # Cycle!
    ]

    is_valid, err = DAGEngine.validate_dag(nodes, edges)
    assert not is_valid
    assert "Cycle detected" in err

def test_valid_dag_execution():
    async def _run():
        nodes = [
            WorkflowNode(id="in", type=NodeType.TRIGGER, label="Trigger"),
            WorkflowNode(id="ai", type=NodeType.LLM, label="AI Agent", config={"prompt": "Review: {{text}}"}),
            WorkflowNode(id="out", type=NodeType.OUTPUT, label="Output"),
        ]
        edges = [
            WorkflowEdge(id="e1", source="in", target="ai"),
            WorkflowEdge(id="e2", source="ai", target="out"),
        ]

        wf = Workflow(id="test_wf", name="Simple AI", nodes=nodes, edges=edges)
        res = await DAGEngine.execute_workflow(wf, {"text": "This product is amazing!"})

        assert res.status == "success"
        assert len(res.steps) == 3
        assert res.steps[1].output_data["sentiment"] == "positive"

    asyncio.run(_run())

def test_conditional_branching():
    async def _run():
        nodes = [
            WorkflowNode(id="in", type=NodeType.TRIGGER, label="Input"),
            WorkflowNode(id="cond", type=NodeType.CONDITION, label="Check", config={"field": "status", "operator": "==", "value": "critical"}),
            WorkflowNode(id="branch_true", type=NodeType.TRANSFORM, label="Alert", config={"template": "ALERT: {{status}}"}),
            WorkflowNode(id="branch_false", type=NodeType.TRANSFORM, label="Ignore", config={"template": "OK: {{status}}"}),
        ]
        edges = [
            WorkflowEdge(id="e1", source="in", target="cond"),
            WorkflowEdge(id="e2", source="cond", target="branch_true", source_handle="true"),
            WorkflowEdge(id="e3", source="cond", target="branch_false", source_handle="false"),
        ]
        wf = Workflow(id="branch_wf", name="Branching", nodes=nodes, edges=edges)

        # Run with status="critical" -> branch_true should run, branch_false skipped
        res = await DAGEngine.execute_workflow(wf, {"status": "critical"})
        assert res.status == "success"
        steps_by_node = {s.node_id: s for s in res.steps}
        assert steps_by_node["branch_true"].status == "success"
        assert steps_by_node["branch_false"].status == "skipped"

    asyncio.run(_run())
