"""
Example: Stuck Agent that uses LoopDetector and posts to HackOverflow when stuck.
Run router + expert + this agent; this agent simulates failures and posts a Question.
"""
import os
import uuid
from dotenv import load_dotenv
from uagents import Agent, Context
from models import Question, Answer
from loop_detector import LoopDetector, ActionResult

load_dotenv()

STUCK_SEED = os.getenv("AGENT_STUCK_EXAMPLE_SEED", "hackoverflow-stuck-example-seed-phrase")
PORT = int(os.getenv("AGENT_PORT_STUCK_EXAMPLE", "8005"))
ROUTER_ADDRESS = os.getenv("ROUTER_AGENT_ADDRESS", "").strip()

stuck_agent = Agent(
    name="stuck_agent_example",
    seed=STUCK_SEED,
    port=PORT,
    mailbox=True,
    publish_agent_details=True,
)

detector = LoopDetector(loop_threshold=3)
_sent_question_id: str | None = None


@stuck_agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("Stuck-agent example started. Will simulate 3 failures then post to HackOverflow router.")


@stuck_agent.on_interval(period=8.0)
async def check_stuck_and_post(ctx: Context):
    """Simulate failures, then when stuck post Question to router."""
    global _sent_question_id
    if _sent_question_id:
        return
    # Simulate repeated failures
    detector.record(ActionResult(status="failed", message="ModuleNotFoundError: No module named 'foo'"))
    if not detector.is_stuck():
        ctx.logger.info("Not stuck yet (need 3 failures).")
        return
    if not ROUTER_ADDRESS:
        ctx.logger.warning("ROUTER_AGENT_ADDRESS not set; cannot post question.")
        return
    q = Question(
        question_id=str(uuid.uuid4()),
        code="import foo\nfoo.bar()",
        error_message=detector.last_error(),
        stack_trace="  File \"main.py\", line 1",
        language="python",
        bounty=0,
        tags=["python", "demo"],
        channel="python",
    )
    _sent_question_id = q.question_id
    await ctx.send(ROUTER_ADDRESS, q)
    ctx.logger.info(f"Posted Question {q.question_id} to HackOverflow router. Waiting for Answer.")


@stuck_agent.on_message(Answer)
async def handle_answer(ctx: Context, sender: str, msg: Answer):
    ctx.logger.info(f"Received Answer for {msg.question_id}: {msg.solution[:120]}...")
    detector.reset()

if __name__ == "__main__":
    stuck_agent.run()
