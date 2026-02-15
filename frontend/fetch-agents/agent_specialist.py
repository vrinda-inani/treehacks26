"""
HackOverflow Specialist uAgent — ASI:One compatible.
Expert agent for Q&A and code help; receives delegated queries from the coordinator.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

from shared import create_text_chat

load_dotenv()

SPECIALIST_SEED = os.getenv("AGENT_SPECIALIST_SEED", "hackoverflow-specialist-agent-seed-phrase")
PORT = int(os.getenv("AGENT_PORT_SPECIALIST", "8002"))

specialist = Agent(
    name="hackoverflow_specialist",
    seed=SPECIALIST_SEED,
    port=PORT,
    mailbox=True,  # Required: mailbox is the only method for Agentverse/ASI:One
    publish_agent_details=True,
)

chat_proto = Protocol(spec=chat_protocol_spec)


@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    ctx.logger.info(f"Specialist received message from {sender}")
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id),
    )

    text_parts = []
    for item in msg.content:
        if isinstance(item, TextContent):
            text_parts.append(item.text)
    user_query = " ".join(text_parts).strip() if text_parts else ""

    # Internal delegation from coordinator: INTERNAL_DELEGATE|reply_to_address|session_id|query
    if user_query.startswith("INTERNAL_DELEGATE|"):
        parts = user_query.split("|", 3)
        if len(parts) >= 4:
            _reply_to, _session_id, delegated_query = parts[1], parts[2], parts[3]
            specialist_answer = (
                f"I'm the HackOverflow specialist. You asked: \"{delegated_query}\"\n\n"
                "Here's a detailed answer: verify your .env (AGENTVERSE_API_KEY, ASI_ONE_API_KEY), "
                "run agents with mailbox=True, and register on Agentverse. "
                "Chat with us at https://asi1.ai/chat."
            )
            internal_reply = f"INTERNAL_REPLY|{_reply_to}|{_session_id}|{specialist_answer}"
            await ctx.send(
                sender,
                ChatMessage(
                    timestamp=datetime.now(timezone.utc),
                    msg_id=uuid4(),
                    content=[
                        TextContent(type="text", text=internal_reply),
                        EndSessionContent(type="end-session"),
                    ],
                ),
            )
            return

    # Direct user message (e.g. from ASI:One)
    response = (
        f"I'm the HackOverflow specialist. You asked: \"{user_query}\"\n\n"
        "Here's a focused answer: check your environment variables and API keys, "
        "ensure your agent is running with mailbox enabled, and that it's registered on Agentverse. "
        "For ASI:One, chat at https://asi1.ai/chat and use the agent handle to reach me."
    )

    await ctx.send(
        sender,
        ChatMessage(
            timestamp=datetime.now(timezone.utc),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=response),
                EndSessionContent(type="end-session"),
            ],
        ),
    )


@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Specialist received ack from {sender} for {msg.acknowledged_msg_id}")


specialist.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    specialist.run()
