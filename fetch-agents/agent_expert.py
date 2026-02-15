"""
HackOverflow Expert Agent — answers coding questions from the Router.
Receives Question, generates solution/explanation, sends Answer back to Router.
Integrates with Modal sandbox testing to validate solutions in parallel.
"""
import os
import httpx
from dotenv import load_dotenv
from uagents import Agent, Context, Protocol
from models import Question, Answer
from agent_runtime import (
    agent_network,
    api_only_registration_policy,
    heartbeat_enabled,
    heartbeat_period_seconds,
    startup_signal_enabled,
)
from runpod_assist import get_runpod_triage_hint
from signals import AgentPing, AgentPong, build_ping, build_pong

load_dotenv()

EXPERT_SEED = os.getenv("AGENT_EXPERT_SEED", "hackoverflow-expert-agent-seed-phrase")
PORT = int(os.getenv("AGENT_PORT_EXPERT", "8104"))
ROUTER_ADDRESS = os.getenv("ROUTER_AGENT_ADDRESS", "").strip()
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api").rstrip("/")

expert = Agent(
    name="hackoverflow_expert",
    seed=EXPERT_SEED,
    port=PORT,
    mailbox=True,
    network=agent_network(),
    registration_policy=api_only_registration_policy(),
    publish_agent_details=True,
)

qa_proto = Protocol(name="hackoverflow_qa", version="1.0.0")
signal_proto = Protocol(name="hackoverflow_signals", version="1.0.0")


def _expert_peers() -> list[str]:
    peers: list[str] = []
    if ROUTER_ADDRESS:
        peers.append(ROUTER_ADDRESS)
    return peers


def _compose_solution(msg: Question) -> tuple[str, str]:
    lane = (msg.route_lane or "").strip().lower()
    triage_summary = (msg.triage_summary or "").strip()
    triage_actions = [a.strip() for a in (msg.triage_actions or []) if a and a.strip()]

    if lane == "fast-lane":
        solution = (
            f"Fast-lane unblock for {msg.language} issue:\n"
            f"1. Immediate check: {msg.error_message[:200]}\n"
            "2. Apply the smallest safe patch to restore flow.\n"
            "3. Add a follow-up task for root-cause hardening."
        )
    else:
        solution = (
            f"Deep-lane fix plan for {msg.language} issue:\n"
            f"1. Analyze error: {msg.error_message[:200]}\n"
            "2. Reproduce with a minimal failing case.\n"
            "3. Patch and verify with regression checks."
        )

    if triage_summary:
        solution += f"\n\nCurator summary: {triage_summary}"
    if triage_actions:
        solution += "\nCurator actions:\n" + "\n".join(f"- {x}" for x in triage_actions[:3])

    lane_note = f"lane={lane or 'untriaged'}"
    return solution, lane_note


async def _test_solutions_from_database(msg: Question) -> dict | None:
    """
    Test existing solutions from the database in parallel Modal sandboxes.

    Returns:
        Dict with the best solution if found, None otherwise
    """
    try:
        # Construct the question text for searching
        question_text = f"{msg.error_message or ''} {msg.code or ''}"

        # Call the solution testing API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{API_BASE_URL}/solutions/test",
                json={
                    "question_text": question_text,
                    "expected_behavior": f"Fix {msg.language or 'code'} error without exceptions",
                    "language": msg.language or "python",
                    "max_solutions": 5,  # Test up to 5 solutions in parallel
                },
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("solution"):
                    return result

            return None

    except Exception as e:
        print(f"Error testing solutions from database: {e}")
        return None


async def _generate_solution(msg: Question) -> Answer:
    """
    Generate a solution for the question.

    First attempts to find and test existing solutions from database in parallel.
    If no working solution is found, falls back to generating a new one.
    """
    # Step 1: Try to find and test existing solutions from database
    tested_result = await _test_solutions_from_database(msg)

    if tested_result and tested_result.get("success"):
        # Found a working solution from database!
        best_solution = tested_result["solution"]
        message = tested_result.get("message", "")

        return Answer(
            question_id=msg.question_id,
            solution=f"✓ Validated solution found in database:\n\n{best_solution.get('code', '')}",
            explanation=(
                f"Found and validated working solution from community database. "
                f"{message}\n"
                f"Output: {best_solution.get('output', 'N/A')[:200]}"
            ),
            code_snippet=best_solution.get("code", ""),
            verified=True,  # Mark as verified since it passed sandbox testing
        )

    # Step 2: No working solution found, generate a new one
    solution, lane_note = _compose_solution(msg)
    code_snippet = (
        "# Minimal fix pattern\n"
        "try:\n"
        "    # your code here\n"
        "except Exception as e:\n"
        "    import traceback\n"
        "    traceback.print_exc()\n"
    )

    # Add RunPod triage hint
    runpod_hint = await get_runpod_triage_hint(
        code=msg.code,
        error_message=msg.error_message,
        language=msg.language,
    )
    if runpod_hint:
        solution += f"\n\nRunPod triage hint:\n{runpod_hint}"

    # Add note about database testing
    if tested_result:
        solution += f"\n\nNote: Tested {len(tested_result.get('all_results', []))} existing solutions from database in parallel, but none worked. Providing a new solution."

    return Answer(
        question_id=msg.question_id,
        solution=solution,
        explanation=(
            f"Generated by HackOverflow expert ({lane_note})."
            + (" Enriched with optional RunPod Flash triage." if runpod_hint else "")
            + " Run tests to verify."
        ),
        code_snippet=code_snippet,
        verified=False,
    )


@qa_proto.on_message(Question)
async def handle_question(ctx: Context, sender: str, msg: Question):
    ctx.logger.info(f"Expert received Question {msg.question_id} from {sender}")
    ctx.logger.info("Testing existing solutions in parallel Modal sandboxes...")

    answer = await _generate_solution(msg)

    if answer.verified:
        ctx.logger.info("✓ Found and validated working solution from database via parallel testing!")
    else:
        ctx.logger.info("No validated solution found in database, provided generated solution.")

    if "RunPod triage hint:" in answer.solution:
        ctx.logger.info("Expert answer enriched by RunPod Flash sidecar.")

    await ctx.send(sender, answer)


@signal_proto.on_message(AgentPing)
async def handle_ping(ctx: Context, sender: str, msg: AgentPing):
    ctx.logger.info(f"Expert received ping {msg.ping_id} from {msg.source} ({sender})")
    await ctx.send(
        sender,
        build_pong(
            ping_id=msg.ping_id,
            responder=str(expert.address),
            detail="expert-ok",
        ),
    )


@signal_proto.on_message(AgentPong)
async def handle_pong(ctx: Context, sender: str, msg: AgentPong):
    ctx.logger.info(f"Expert received pong {msg.ping_id} from {msg.responder} ({sender})")


@expert.on_event("startup")
async def expert_startup(ctx: Context):
    if not startup_signal_enabled():
        return
    peers = _expert_peers()
    if not peers:
        ctx.logger.info("Expert startup signal skipped: no peers configured.")
        return
    for peer in peers:
        ping = build_ping(
            source=str(expert.address),
            purpose="startup-handshake",
            detail="expert-online",
        )
        await ctx.send(peer, ping)
    ctx.logger.info(f"Expert startup handshake sent to {len(peers)} peer(s).")


@expert.on_interval(period=heartbeat_period_seconds())
async def expert_heartbeat(ctx: Context):
    if not heartbeat_enabled():
        return
    peers = _expert_peers()
    if not peers:
        return
    for peer in peers:
        ping = build_ping(
            source=str(expert.address),
            purpose="heartbeat",
            detail="expert-heartbeat",
        )
        await ctx.send(peer, ping)


expert.include(qa_proto)
expert.include(signal_proto)

if __name__ == "__main__":
    expert.run()
