"""
Modal Sandbox Service for parallel code execution and testing.
Executes code snippets in isolated Modal sandboxes and validates results.
"""
import asyncio
import os
from typing import Any

import modal
from pydantic import BaseModel


class SandboxResult(BaseModel):
    """Result from a sandbox execution."""
    success: bool
    output: str | None = None
    error: str | None = None
    execution_time: float = 0.0
    solution_id: str | None = None


# Initialize Modal app
stub = modal.App("hackoverflow-sandbox")

# Define sandbox image with common dependencies
sandbox_image = (
    modal.Image.debian_slim()
    .pip_install(
        "numpy",
        "pandas",
        "requests",
        "flask",
        "fastapi",
        "sqlalchemy",
        "pytest",
    )
)


@stub.function(
    image=sandbox_image,
    timeout=30,  # 30 second timeout per execution
    cpu=1.0,
    memory=512,  # 512 MB
)
def execute_code(code: str, language: str = "python") -> dict[str, Any]:
    """
    Execute code in an isolated Modal sandbox.

    Args:
        code: The code to execute
        language: Programming language (currently supports 'python')

    Returns:
        Dictionary with success status, output, and error information
    """
    import sys
    import time
    import traceback
    from io import StringIO

    start_time = time.time()

    if language.lower() not in ["python", "py"]:
        return {
            "success": False,
            "output": None,
            "error": f"Unsupported language: {language}. Currently only Python is supported.",
            "execution_time": 0.0,
        }

    # Capture stdout/stderr
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    stdout_buffer = StringIO()
    stderr_buffer = StringIO()

    try:
        sys.stdout = stdout_buffer
        sys.stderr = stderr_buffer

        # Execute the code in a restricted namespace
        namespace = {
            "__builtins__": __builtins__,
            "__name__": "__main__",
        }

        exec(code, namespace)

        # Get output
        output = stdout_buffer.getvalue()
        stderr_output = stderr_buffer.getvalue()

        execution_time = time.time() - start_time

        # If there's stderr but no exception, it's a warning (still success)
        if stderr_output and not output:
            output = stderr_output

        return {
            "success": True,
            "output": output or "Code executed successfully with no output.",
            "error": None,
            "execution_time": execution_time,
        }

    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"

        return {
            "success": False,
            "output": stdout_buffer.getvalue() or None,
            "error": error_msg,
            "execution_time": execution_time,
        }

    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr


class ModalSandboxService:
    """Service for executing code in Modal sandboxes with parallel support."""

    def __init__(self):
        """Initialize the Modal sandbox service."""
        # Check if Modal token is configured
        self.modal_token = os.getenv("MODAL_TOKEN_ID") and os.getenv("MODAL_TOKEN_SECRET")
        if not self.modal_token:
            print("WARNING: Modal credentials not configured. Set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET.")

    async def execute_single(
        self,
        code: str,
        language: str = "python",
        solution_id: str | None = None,
    ) -> SandboxResult:
        """
        Execute a single code snippet in a Modal sandbox.

        Args:
            code: The code to execute
            language: Programming language (default: python)
            solution_id: Optional ID to track which solution this came from

        Returns:
            SandboxResult with execution details
        """
        if not self.modal_token:
            return SandboxResult(
                success=False,
                error="Modal credentials not configured",
                solution_id=solution_id,
            )

        try:
            # Execute remotely on Modal
            with stub.run():
                result = execute_code.remote(code, language)

            return SandboxResult(
                success=result["success"],
                output=result.get("output"),
                error=result.get("error"),
                execution_time=result.get("execution_time", 0.0),
                solution_id=solution_id,
            )

        except Exception as e:
            return SandboxResult(
                success=False,
                error=f"Modal execution error: {str(e)}",
                solution_id=solution_id,
            )

    async def execute_parallel(
        self,
        solutions: list[dict[str, Any]],
        language: str = "python",
    ) -> list[SandboxResult]:
        """
        Execute multiple code snippets in parallel across Modal sandboxes.

        Args:
            solutions: List of dicts with 'code' and 'id' keys
            language: Programming language (default: python)

        Returns:
            List of SandboxResults, ordered by completion time (fastest first)
        """
        if not self.modal_token:
            return [
                SandboxResult(
                    success=False,
                    error="Modal credentials not configured",
                    solution_id=sol.get("id"),
                )
                for sol in solutions
            ]

        if not solutions:
            return []

        # Create tasks for parallel execution
        tasks = [
            self.execute_single(
                code=sol["code"],
                language=language,
                solution_id=sol.get("id"),
            )
            for sol in solutions
        ]

        # Execute all in parallel and gather results
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to error results
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                final_results.append(
                    SandboxResult(
                        success=False,
                        error=f"Execution exception: {str(result)}",
                        solution_id=solutions[i].get("id"),
                    )
                )
            else:
                final_results.append(result)

        # Sort by execution time (successful ones first, then by speed)
        final_results.sort(
            key=lambda r: (not r.success, r.execution_time)
        )

        return final_results

    async def validate_solution(
        self,
        code: str,
        expected_behavior: str,
        language: str = "python",
    ) -> tuple[bool, str]:
        """
        Execute code and validate if it matches expected behavior.

        Args:
            code: Code to execute
            expected_behavior: Description of what the code should do
            language: Programming language

        Returns:
            Tuple of (is_valid, reason)
        """
        result = await self.execute_single(code, language)

        if not result.success:
            return False, f"Code failed to execute: {result.error}"

        # For now, we consider it valid if it executes without errors
        # TODO: Use LLM to validate if output matches expected_behavior
        return True, f"Code executed successfully. Output: {result.output[:200]}"


# Singleton instance
_sandbox_service: ModalSandboxService | None = None


def get_sandbox_service() -> ModalSandboxService:
    """Get the singleton Modal sandbox service instance."""
    global _sandbox_service
    if _sandbox_service is None:
        _sandbox_service = ModalSandboxService()
    return _sandbox_service
