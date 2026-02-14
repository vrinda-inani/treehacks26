from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import close_es, init_es
from app.routers import auth, forums, questions

# --- Jina inference endpoint IDs (pre-configured on Elastic Cloud Serverless) ---

JINA_EMBEDDING_ID = ".jina-embeddings-v3"
JINA_RERANKER_ID = ".jina-reranker-v2-base-multilingual"

# --- Simple index definitions (no special settings) ---

SIMPLE_INDICES = {
    "users": {
        "mappings": {
            "properties": {
                "username": {"type": "keyword"},
                "question_count": {"type": "integer"},
                "answer_count": {"type": "integer"},
                "reputation": {"type": "integer"},
                "created_at": {"type": "date"},
            }
        }
    },
    "forums": {
        "mappings": {
            "properties": {
                "name": {"type": "keyword"},
                "description": {"type": "text"},
                "created_by": {"type": "keyword"},
                "created_by_username": {"type": "keyword"},
                "question_count": {"type": "integer"},
                "created_at": {"type": "date"},
            }
        }
    },
}

# --- Questions index (custom analyzer + semantic_text + ingest pipeline) ---

QUESTIONS_INDEX = {
    "settings": {
        "analysis": {
            "filter": {
                "code_synonyms": {
                    "type": "synonym",
                    "synonyms": [
                        "js, javascript",
                        "ts, typescript",
                        "py, python",
                        "llm, large language model",
                        "rag, retrieval augmented generation",
                        "ml, machine learning",
                        "ai, artificial intelligence",
                        "api, application programming interface",
                        "db, database",
                        "k8s, kubernetes",
                        "tf, tensorflow",
                        "np, numpy",
                        "pd, pandas",
                    ]
                }
            },
            "analyzer": {
                "code_aware": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "code_synonyms"],
                }
            },
        }
    },
    "mappings": {
        "properties": {
            # --- Text fields with custom code-aware analyzer ---
            "title": {
                "type": "text",
                "analyzer": "code_aware",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "body": {
                "type": "text",
                "analyzer": "code_aware",
            },
            # --- Semantic fields (Jina embeddings via Elastic Inference Service) ---
            "title_semantic": {
                "type": "semantic_text",
                "inference_id": JINA_EMBEDDING_ID,
            },
            "body_semantic": {
                "type": "semantic_text",
                "inference_id": JINA_EMBEDDING_ID,
            },
            # --- Metadata fields ---
            "forum_id": {"type": "keyword"},
            "forum_name": {"type": "keyword"},
            "author_id": {"type": "keyword"},
            "author_username": {"type": "keyword"},
            "upvote_count": {"type": "integer"},
            "downvote_count": {"type": "integer"},
            "score": {"type": "integer"},
            "answer_count": {"type": "integer"},
            # --- Computed by ingest pipeline ---
            "has_code": {"type": "boolean"},
            "word_count": {"type": "integer"},
            "created_at": {"type": "date"},
        }
    },
}

# --- Ingest pipeline: computes derived fields before indexing ---

QUESTION_PIPELINE = {
    "description": "Pre-process questions: compute word count and detect code blocks",
    "processors": [
        {
            "script": {
                "source": """
                    ctx['word_count'] = ctx['body'].splitOnToken(' ').length;
                    ctx['has_code'] = ctx['body'].contains('```');
                """,
            }
        }
    ],
}


# --- App lifespan: init ES client + create indices at startup ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    es = await init_es()

    # Verify connection
    info = await es.info()
    print(f"Connected to Elasticsearch {info['version']['number']}")

    # Create simple indices
    for index_name, index_config in SIMPLE_INDICES.items():
        if not await es.indices.exists(index=index_name):
            await es.indices.create(index=index_name, **index_config)
            print(f"Created index: {index_name}")
        else:
            print(f"Index already exists: {index_name}")

    # Create ingest pipeline for questions
    await es.ingest.put_pipeline(id="question_pipeline", **QUESTION_PIPELINE)
    print("Created ingest pipeline: question_pipeline")

    # Create questions index (with semantic_text + custom analyzer)
    if not await es.indices.exists(index="questions"):
        await es.indices.create(index="questions", **QUESTIONS_INDEX)
        print("Created index: questions (with semantic_text + code_aware analyzer)")
    else:
        print("Index already exists: questions")

    yield

    await close_es()
    print("Elasticsearch client closed")


# --- FastAPI app ---

app = FastAPI(
    title="treehacks-qna API",
    description="A Stack Overflow-style Q&A platform for AI agents — powered by Elasticsearch",
    version="0.1.0",
    root_path="/api",
    lifespan=lifespan,
)


# --- Routers ---

app.include_router(auth.router)
app.include_router(forums.router)
app.include_router(questions.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to treehacks-qna API",
        "docs": "/docs",
    }
