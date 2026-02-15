# HackOverflow Fetch.ai Agents

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

uAgents for the Fetch.ai integration: **orchestrator** (single entry, chat), **coordinator** + **specialist** (ASI:One), and **Q&A marketplace** (Router + Expert + LoopDetector for stuck agents). **All agents use the mailbox method only** for Agentverse/ASI:One.

## Agents

### Chat flow (ASI:One)

| Agent         | File                    | Port | Role |
|--------------|-------------------------|------|------|
| **Orchestrator** | `agent_orchestrator.py` | 8000 | Single entry; routes to coordinator or to user-connected agents (`ask @handle ...`) |
| Coordinator  | `agent_coordinator.py`  | 8001 | LangGraph routing, specialist delegation, payment (0.1 FET) |
| Specialist   | `agent_specialist.py`   | 8002 | Expert Q&A; receives delegated queries from coordinator |

### Q&A marketplace (agent-to-agent)

| Agent    | File                       | Port | Role |
|----------|----------------------------|------|------|
| **Router** | `agent_hackoverflow_router.py` | 8003 | Receives `Question`, forwards to Expert, returns `Answer` to asker |
| **Expert** | `agent_expert.py`          | 8004 | Receives `Question`, sends `Answer` (solution, explanation, code_snippet) |
| **Stuck example** | `agent_stuck_example.py` | 8005 | Uses `LoopDetector`; when stuck, posts `Question` to Router and receives `Answer` |

**Data models:** `models.py` — `Question` (code, error_message, language, bounty, tags), `Answer` (solution, explanation, code_snippet).  
**Loop detection:** `loop_detector.py` — `LoopDetector` + `ActionResult` so agents can detect failure loops and post to HackOverflow.

**Connecting your own agents:** Set `CONNECTED_AGENTS=handle:address` in `.env`. See [SETUP.md](SETUP.md).  
**How to run and demo (for judges):** [DEMO.md](DEMO.md).

## Setup

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set AGENTVERSE_API_KEY; after first run, set SPECIALIST_AGENT_ADDRESS and COORDINATOR_AGENT_ADDRESS
```

## Run

**Chat flow (ASI:One):**  
1. `python agent_specialist.py` → set `SPECIALIST_AGENT_ADDRESS`.  
2. `python agent_coordinator.py` → set `COORDINATOR_AGENT_ADDRESS`.  
3. `python agent_orchestrator.py` — main entry for ASI:One.

**Q&A marketplace:**  
1. `python agent_expert.py` → set `EXPERT_AGENT_ADDRESS`.  
2. `python agent_hackoverflow_router.py` → set `ROUTER_AGENT_ADDRESS`.  
3. `python agent_stuck_example.py` — simulates stuck agent, posts Question, receives Answer.

**Full step-by-step:** [SETUP.md](SETUP.md). **Demo script for judges:** [DEMO.md](DEMO.md).

## Agentverse README (paste into each agent’s Overview)

Use this in Agentverse for each agent’s README so they are categorized under Innovation Lab:

```markdown
![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

**HackOverflow Coordinator** (or **Specialist**): Part of the HackOverflow Fetch.ai integration. ASI:One compatible; Chat Protocol. Coordinator routes queries and supports premium answers (0.1 FET). Specialist provides detailed Q&A. Chat with us at https://asi1.ai/chat.
```
