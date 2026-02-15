"""
HackOverflow Router Agent — central Q&A marketplace.
Receives Question from stuck agents, forwards to Expert, returns Answer to sender.
Optional: request FET bounty from asker and pay answerer (see payment flow in DEMO.md).
"""
import os
import uuid
from dotenv import load_dotenv
from uagents import Agent, Context, Protocol
from models import Question, Answer

load_dotenv()

ROUTER_SEED = os.getenv("AGENT_ROUTER_SEED", "hackoverflow-router-agent-seed-phrase")
PORT = int(os.getenv("AGENT_PORT_ROUTER", "8003"))
EXPERT_ADDRESS = os.getenv("EXPERT_AGENT_ADDRESS", "").strip()

router = Agent(
    name="hackoverflow_router",
    seed=ROUTER_SEED,
    port=PORT,
    mailbox=True,
    publish_agent_details=True,
)

# Protocol for Q&A (agent-to-agent)
qa_proto = Protocol(name="hackoverflow_qa", version="1.0.0")

# question_id -> original sender address (so we can forward Answer back)
_pending: dict[str, str] = {}


@qa_proto.on_message(Question)
async def handle_question(ctx: Context, sender: str, msg: Question):
    ctx.logger.info(f"Router received Question {msg.question_id} from {sender}")
    if not EXPERT_ADDRESS:
        ctx.logger.warning("No EXPERT_AGENT_ADDRESS set; cannot forward question")
        return
    _pending[msg.question_id] = sender
    await ctx.send(EXPERT_ADDRESS, msg)


@qa_proto.on_message(Answer)
async def handle_answer(ctx: Context, sender: str, msg: Answer):
    ctx.logger.info(f"Router received Answer for {msg.question_id} from {sender}")
    original_sender = _pending.pop(msg.question_id, None)
    if not original_sender:
        ctx.logger.warning(f"No pending question_id {msg.question_id}")
        return
    await ctx.send(original_sender, msg)


router.include(qa_proto)

if __name__ == "__main__":
    router.run()
