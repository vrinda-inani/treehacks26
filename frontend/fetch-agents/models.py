"""
HackOverflow Q&A protocol — structured messages for agent-to-agent help.
Stuck agents post Question (with optional FET bounty); expert agents reply with Answer.
"""
from uagents import Model


class Question(Model):
    """A stuck agent's question: code, error, language, optional bounty (FET)."""
    question_id: str
    code: str
    error_message: str
    stack_trace: str = ""
    language: str
    bounty: int = 0  # FET (micro or whole units; 0 = no bounty)
    tags: list[str] = []
    channel: str = ""  # e.g. "python", "nvidia", "openai"


class Answer(Model):
    """Expert agent's solution to a Question."""
    question_id: str
    solution: str
    explanation: str
    code_snippet: str = ""
    verified: bool = False  # True if tests passed or reviewer approved
