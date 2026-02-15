# Modal Sandbox Integration Setup Guide

This guide explains how to set up and use the Modal sandbox integration for parallel solution testing.

## Overview

The system now automatically:
1. **Searches** the database for existing solutions when a question is received
2. **Tests up to 5 solutions in parallel** in isolated Modal sandboxes
3. **Upvotes** successful solutions and **downvotes** failed ones
4. **Returns the fastest successful solution** (sorted by execution time)
5. Falls back to generating a new solution if none work

## Setup Instructions

### 1. Install Modal CLI

```bash
pip install modal
```

### 2. Create a Modal Account

1. Go to [https://modal.com](https://modal.com)
2. Sign up for a free account
3. Modal provides generous free tier credits

### 3. Authenticate Modal

Run the following command to authenticate:

```bash
modal token new
```

This will:
- Open your browser to authenticate
- Create API credentials automatically
- Store them in `~/.modal.toml`

### 4. Get Your Modal API Tokens

Modal credentials are stored in `~/.modal.toml`. You can view them with:

```bash
cat ~/.modal.toml
```

The file will look like:
```toml
[default]
token_id = "ak-..."
token_secret = "as-..."
```

### 5. Set Environment Variables

Add the following to your `.env` file in the `api/` directory:

```bash
# Modal Sandbox Configuration
MODAL_TOKEN_ID="ak-..."
MODAL_TOKEN_SECRET="as-..."

# API Base URL (for agent to call backend)
API_BASE_URL="http://localhost:8000/api"
```

### 6. Install Dependencies

#### For the API Backend:
```bash
cd api
pip install -r requirements.txt
```

#### For the Fetch Agents:
```bash
cd fetch-agents
pip install -r requirements.txt
```

### 7. Deploy Modal App (Optional)

The Modal sandbox functions are deployed automatically on first use, but you can pre-deploy:

```bash
cd api
modal deploy app/services/modal_sandbox.py
```

## How It Works

### Architecture Flow

```
Question Received
    ↓
Expert Agent
    ↓
Search Database for 5 Solutions
    ↓
Test All 5 in Parallel Modal Sandboxes
    ↓
┌─────────────┬─────────────┬─────────────┐
│ Sandbox 1   │ Sandbox 2   │ Sandbox 3...│
│ (Success ✓) │ (Failed ✗)  │ (Success ✓) │
└─────────────┴─────────────┴─────────────┘
    ↓
Upvote/Downvote Solutions
    ↓
Return Fastest Successful Solution
```

### Parallel Execution

- **5 sandboxes** run simultaneously
- Each has **30 second timeout**
- **512MB RAM** per sandbox
- Results sorted by **execution time** (fastest first)

### Voting System

- **Successful execution** → Upvote the solution
- **Failed execution** → Downvote the solution
- Votes are stored in Elasticsearch `votes` index
- Scores updated via Painless scripts

## Testing the Integration

### 1. Test a Single Code Snippet

```bash
curl -X POST http://localhost:8000/api/solutions/test-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "language": "python"
  }'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": null,
  "execution_time": 0.123
}
```

### 2. Test Parallel Solution Testing

First, add some test answers to your database, then:

```bash
curl -X POST http://localhost:8000/api/solutions/test \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "How do I reverse a list in Python?",
    "expected_behavior": "The list should be reversed",
    "language": "python",
    "max_solutions": 5
  }'
```

Expected response:
```json
{
  "success": true,
  "solution": {
    "id": "answer_123",
    "code": "my_list.reverse()",
    "output": "...",
    "execution_time": 0.234
  },
  "all_results": [
    {"solution_id": "answer_123", "success": true, ...},
    {"solution_id": "answer_456", "success": false, ...}
  ],
  "message": "Found working solution in 0.23s. Tested 5 solutions in parallel."
}
```

### 3. Test via Agent

Send a question to your Expert agent through the normal flow. The agent will now:
1. Automatically search for existing solutions
2. Test them in parallel in Modal sandboxes
3. Return the validated solution if found

Check the agent logs for output like:
```
Expert received Question abc123 from sender
Testing existing solutions in parallel Modal sandboxes...
✓ Found and validated working solution from database via parallel testing!
```

## API Endpoints

### POST `/api/solutions/test`

Test multiple solutions from database in parallel.

**Request:**
```json
{
  "question_text": "How to fix this error?",
  "expected_behavior": "Code should run without errors",
  "language": "python",
  "max_solutions": 5
}
```

**Response:**
```json
{
  "success": true,
  "solution": {...},
  "all_results": [...],
  "message": "Found working solution in 0.23s"
}
```

### POST `/api/solutions/test-code`

Test a single code snippet (for debugging).

**Request:**
```json
{
  "code": "print('test')",
  "language": "python"
}
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MODAL_TOKEN_ID` | Modal API token ID | Required |
| `MODAL_TOKEN_SECRET` | Modal API token secret | Required |
| `API_BASE_URL` | Backend API URL for agents | `http://localhost:8000/api` |

### Modal Sandbox Settings

You can adjust these in [api/app/services/modal_sandbox.py](api/app/services/modal_sandbox.py):

```python
@stub.function(
    image=sandbox_image,
    timeout=30,  # Execution timeout (seconds)
    cpu=1.0,     # CPU cores
    memory=512,  # Memory in MB
)
```

### Solution Testing Settings

In [api/app/services/solution_tester.py](api/app/services/solution_tester.py):

```python
max_solutions: int = 5  # Number of solutions to test in parallel
```

## Troubleshooting

### "Modal credentials not configured"

**Problem:** Modal token not set in environment.

**Solution:**
1. Run `modal token new` to authenticate
2. Copy token from `~/.modal.toml` to `.env`
3. Restart the API server

### "No candidate solutions found in database"

**Problem:** No existing solutions with code blocks in the database.

**Solution:**
1. Add some answers with code blocks to your database
2. Ensure code is wrapped in markdown code blocks: \`\`\`python ... \`\`\`

### "Execution timeout"

**Problem:** Code takes longer than 30 seconds.

**Solution:**
Increase timeout in `modal_sandbox.py`:
```python
@stub.function(timeout=60)  # Increase to 60 seconds
```

### Sandbox Image Dependencies Missing

**Problem:** Code requires packages not in the sandbox image.

**Solution:**
Add packages to the image in `modal_sandbox.py`:
```python
sandbox_image = (
    modal.Image.debian_slim()
    .pip_install(
        "numpy",
        "pandas",
        "your-package-here",  # Add your package
    )
)
```

## Performance & Costs

### Modal Free Tier
- **$30/month** in free credits
- Sandbox execution is very cheap (~$0.0001 per execution)
- 5 parallel sandboxes per question = ~$0.0005 per question

### Expected Performance
- **Parallel execution:** ~0.2-0.5s for simple code
- **Sequential execution would be:** 1-2.5s for 5 solutions
- **Speedup:** 5-10x faster with parallel execution

## Next Steps

1. **Test the integration** with sample data
2. **Monitor logs** to see parallel testing in action
3. **Add more solutions** to the database for better coverage
4. **Customize** sandbox image for your specific use cases

## Example: Full Workflow

```bash
# 1. Start the API server
cd api
uvicorn app.main:app --reload

# 2. Start the Expert agent
cd fetch-agents
python agent_expert.py

# 3. Send a question through the agent system
# The Expert agent will now:
#    - Search database for 5 solutions
#    - Test all 5 in parallel Modal sandboxes
#    - Upvote working solutions, downvote failed ones
#    - Return the fastest successful solution
```

## Support

For issues or questions:
- Modal docs: https://modal.com/docs
- Check logs for detailed error messages
- Verify Modal credentials are set correctly
