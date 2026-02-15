"""
Solution Testing API endpoints.
Provides endpoints for testing solutions in Modal sandboxes.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import get_es
from app.services.solution_tester import get_solution_tester

router = APIRouter(prefix="/solutions", tags=["solutions"])


class TestSolutionsRequest(BaseModel):
    """Request to test solutions for a question."""
    question_text: str = Field(..., min_length=10, description="The question/problem description")
    expected_behavior: str = Field(..., min_length=10, description="What the solution should accomplish")
    language: str = Field(default="python", description="Programming language")
    max_solutions: int = Field(default=5, ge=1, le=10, description="Maximum solutions to test in parallel")


class SolutionResult(BaseModel):
    """Result from testing a single solution."""
    solution_id: str | None
    success: bool
    output: str | None
    error: str | None
    execution_time: float


class TestSolutionsResponse(BaseModel):
    """Response from testing multiple solutions."""
    success: bool
    solution: dict | None
    all_results: list[SolutionResult]
    message: str


class TestCodeRequest(BaseModel):
    """Request to test a single code snippet."""
    code: str = Field(..., min_length=1, description="Code to execute")
    language: str = Field(default="python", description="Programming language")


@router.post("/test", response_model=TestSolutionsResponse)
async def test_solutions(body: TestSolutionsRequest):
    """
    Test multiple solutions from the database in parallel Modal sandboxes.

    This endpoint:
    1. Searches the database for potential solutions matching the question
    2. Extracts code from up to 5 answers
    3. Tests all solutions in parallel in isolated Modal sandboxes
    4. Upvotes successful solutions, downvotes failed ones
    5. Returns the fastest successful solution

    Example request:
    ```json
    {
        "question_text": "How do I reverse a list in Python?",
        "expected_behavior": "The list should be reversed in place",
        "language": "python",
        "max_solutions": 5
    }
    ```
    """
    es = get_es()
    tester = get_solution_tester(es)

    try:
        result = await tester.test_and_rank_solutions(
            question_text=body.question_text,
            expected_behavior=body.expected_behavior,
            language=body.language,
            max_solutions=body.max_solutions,
        )

        # Convert to response format
        return TestSolutionsResponse(
            success=result["success"],
            solution=result["solution"],
            all_results=[
                SolutionResult(
                    solution_id=r["solution_id"],
                    success=r["success"],
                    output=r["output"],
                    error=r["error"],
                    execution_time=r["execution_time"],
                )
                for r in result["all_results"]
            ],
            message=result["message"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error testing solutions: {str(e)}",
        )


@router.post("/test-code")
async def test_code_snippet(body: TestCodeRequest):
    """
    Test a single code snippet in a Modal sandbox (for debugging/testing).

    Example request:
    ```json
    {
        "code": "print('Hello, World!')",
        "language": "python"
    }
    ```
    """
    from app.services.modal_sandbox import get_sandbox_service

    sandbox = get_sandbox_service()

    try:
        result = await sandbox.execute_single(code=body.code, language=body.language)

        return {
            "success": result.success,
            "output": result.output,
            "error": result.error,
            "execution_time": result.execution_time,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error executing code: {str(e)}",
        )
