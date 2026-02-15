"""
Orchestration using LangGraph: route queries to direct answer or delegate to specialist.
"""
import os
from typing import Literal, TypedDict

try:
    from langgraph.graph import StateGraph, START, END
    _LANGGRAPH_AVAILABLE = True
except ImportError:
    _LANGGRAPH_AVAILABLE = False
    StateGraph = None


class RouterState(TypedDict, total=False):
    query: str
    action: str  # "direct" | "delegate"
    response: str


def should_delegate_to_specialist(query: str) -> bool:
    """Decide if the query should be handled by the specialist agent."""
    q = (query or "").strip().lower()
    if not q:
        return False
    # Delegate if user asks for expert/specialist or detailed/code help
    keywords = ("expert", "specialist", "detailed", "code", "debug", "help me", "how do i")
    return any(k in q for k in keywords)


def get_direct_response(query: str) -> str:
    """Generate a direct response using LLM (ASI:One or OpenAI) or a fixed fallback."""
    if not query or not query.strip():
        return "Please ask a question about HackOverflow, agents, or ASI:One."

    # Prefer ASI:One API if available
    asione_key = os.getenv("ASI_ONE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    if asione_key:
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://api.asi1.ai/v1", api_key=asione_key)
            r = client.chat.completions.create(
                model="asi1",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant for HackOverflow, a Q&A platform for AI agents. Answer briefly and clearly."},
                    {"role": "user", "content": query},
                ],
                max_tokens=1024,
            )
            if r.choices and r.choices[0].message.content:
                return r.choices[0].message.content
        except Exception:
            pass
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            r = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant for HackOverflow. Answer briefly."},
                    {"role": "user", "content": query},
                ],
                max_tokens=1024,
            )
            if r.choices and r.choices[0].message.content:
                return r.choices[0].message.content
        except Exception:
            pass
    # Fallback
    return (
        f"You asked: \"{query}\". "
        "I'm the HackOverflow coordinator. For detailed or expert answers, try asking for the 'specialist' or 'expert'. "
        "You can also chat with us on ASI:One at https://asi1.ai/chat."
    )


def run_orchestration(query: str) -> tuple[Literal["direct", "delegate"], str]:
    """
    Run LangGraph orchestration: route to direct answer or delegate.
    Returns (action, response). If action is "delegate", response is empty (caller sends to specialist).
    """
    if _LANGGRAPH_AVAILABLE and StateGraph is not None:
        try:
            graph = StateGraph(RouterState)

            def route(state: RouterState) -> RouterState:
                q = state.get("query") or ""
                if should_delegate_to_specialist(q):
                    return {"action": "delegate", "response": ""}
                resp = get_direct_response(q)
                return {"action": "direct", "response": resp}

            graph.add_node("route", route)
            graph.add_edge(START, "route")
            graph.add_edge("route", END)
            app = graph.compile()
            initial = {"query": query, "action": "direct", "response": ""}
            result = app.invoke(initial)
            action = result.get("action") or "direct"
            response = result.get("response") or ""
            return action, response
        except Exception:
            pass
    # Fallback without LangGraph
    if should_delegate_to_specialist(query):
        return ("delegate", "")
    return ("direct", get_direct_response(query))
