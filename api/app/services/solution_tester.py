"""
Solution Tester Service.
Searches for potential solutions from database, tests them in parallel in Modal sandboxes,
and upvotes/downvotes based on success.
"""
import asyncio
import re
from typing import Any

from elasticsearch import AsyncElasticsearch

from app.services.modal_sandbox import SandboxResult, get_sandbox_service


class SolutionTesterService:
    """Service for testing solutions from the database in parallel sandboxes."""

    def __init__(self, es_client: AsyncElasticsearch):
        """
        Initialize the solution tester.

        Args:
            es_client: Elasticsearch client for searching and voting
        """
        self.es = es_client
        self.sandbox = get_sandbox_service()

    def _extract_code_from_answer(self, answer_body: str) -> str | None:
        """
        Extract code snippet from answer body (assumes markdown code blocks).

        Args:
            answer_body: The answer body text

        Returns:
            Extracted code or None if no code block found
        """
        # Look for code blocks: ```python ... ``` or ``` ... ```
        pattern = r"```(?:python|py)?\s*\n(.*?)\n```"
        matches = re.findall(pattern, answer_body, re.DOTALL)

        if matches:
            # Return the first code block found
            return matches[0].strip()

        # Fallback: if answer is mostly code-like (has indentation), use whole thing
        lines = answer_body.split("\n")
        indented_lines = [l for l in lines if l.startswith("    ") or l.startswith("\t")]
        if len(indented_lines) > len(lines) * 0.5:  # More than 50% indented
            return answer_body.strip()

        return None

    async def search_solutions(
        self,
        question_text: str,
        language: str = "python",
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """
        Search for potential solutions from the database.

        Args:
            question_text: The question to find solutions for
            language: Programming language filter
            limit: Maximum number of solutions to return

        Returns:
            List of solution dicts with 'id', 'code', 'body', 'score' keys
        """
        try:
            # Use hybrid search (similar to questions endpoint)
            # Search in answers index for relevant solutions
            result = await self.es.search(
                index="answers",
                query={
                    "multi_match": {
                        "query": question_text,
                        "fields": ["body"],
                    }
                },
                sort=[
                    {"score": {"order": "desc"}},
                    {"upvote_count": {"order": "desc"}},
                ],
                size=limit * 2,  # Get more than needed to filter for code
            )

            solutions = []
            for hit in result["hits"]["hits"]:
                answer_id = hit["_id"]
                answer_body = hit["_source"]["body"]
                answer_score = hit["_source"].get("score", 0)

                # Extract code from the answer
                code = self._extract_code_from_answer(answer_body)
                if code:
                    solutions.append({
                        "id": answer_id,
                        "code": code,
                        "body": answer_body,
                        "score": answer_score,
                    })

                if len(solutions) >= limit:
                    break

            return solutions

        except Exception as e:
            print(f"Error searching solutions: {e}")
            return []

    async def vote_on_solution(
        self,
        solution_id: str,
        vote_type: str,
        user_id: str = "agent",
    ) -> bool:
        """
        Upvote or downvote a solution in the database.

        Args:
            solution_id: The answer ID to vote on
            vote_type: "upvote" or "downvote"
            user_id: ID of the voter (default: "agent")

        Returns:
            True if vote was successful
        """
        try:
            # Check if solution exists
            await self.es.get(index="answers", id=solution_id)

            # Create or update vote document
            vote_id = f"vote_{user_id}_{solution_id}"
            vote_doc = {
                "target_id": solution_id,
                "target_type": "answer",
                "user_id": user_id,
                "vote_type": vote_type,
                "created_at": "2026-02-15T00:00:00Z",  # Current timestamp
            }

            # Check if vote already exists
            existing_vote = None
            try:
                existing_doc = await self.es.get(index="votes", id=vote_id)
                existing_vote = existing_doc["_source"]["vote_type"]
            except Exception:
                pass

            # Update vote
            await self.es.index(
                index="votes",
                id=vote_id,
                document=vote_doc,
                refresh="wait_for",
            )

            # Update answer counts using Painless script
            if existing_vote == vote_type:
                # Same vote, no change needed
                return True

            # Calculate the delta for each count
            upvote_delta = 0
            downvote_delta = 0
            score_delta = 0

            if existing_vote == "upvote" and vote_type == "downvote":
                # Changed from upvote to downvote
                upvote_delta = -1
                downvote_delta = 1
                score_delta = -2
            elif existing_vote == "downvote" and vote_type == "upvote":
                # Changed from downvote to upvote
                upvote_delta = 1
                downvote_delta = -1
                score_delta = 2
            elif existing_vote is None and vote_type == "upvote":
                # New upvote
                upvote_delta = 1
                score_delta = 1
            elif existing_vote is None and vote_type == "downvote":
                # New downvote
                downvote_delta = 1
                score_delta = -1

            # Update answer document
            await self.es.update(
                index="answers",
                id=solution_id,
                script={
                    "source": """
                        ctx._source.upvote_count += params.upvote_delta;
                        ctx._source.downvote_count += params.downvote_delta;
                        ctx._source.score += params.score_delta;
                    """,
                    "params": {
                        "upvote_delta": upvote_delta,
                        "downvote_delta": downvote_delta,
                        "score_delta": score_delta,
                    },
                },
                refresh="wait_for",
            )

            return True

        except Exception as e:
            print(f"Error voting on solution {solution_id}: {e}")
            return False

    async def test_and_rank_solutions(
        self,
        question_text: str,
        expected_behavior: str,
        language: str = "python",
        max_solutions: int = 5,
    ) -> dict[str, Any]:
        """
        Search for solutions, test them in parallel, vote on them, and return the best one.

        This is the main entry point for the solution testing workflow:
        1. Search database for potential solutions
        2. Test all solutions in parallel in Modal sandboxes
        3. Upvote successful solutions, downvote failed ones
        4. Return the fastest successful solution

        Args:
            question_text: The question/problem description
            expected_behavior: What the solution should accomplish
            language: Programming language
            max_solutions: Maximum number of solutions to test (default: 5)

        Returns:
            Dict with:
                - success: Whether a working solution was found
                - solution: The best solution (if found)
                - all_results: All test results
                - message: Status message
        """
        # Step 1: Search for candidate solutions
        solutions = await self.search_solutions(
            question_text=question_text,
            language=language,
            limit=max_solutions,
        )

        if not solutions:
            return {
                "success": False,
                "solution": None,
                "all_results": [],
                "message": "No candidate solutions found in database",
            }

        # Step 2: Test all solutions in parallel
        results = await self.sandbox.execute_parallel(
            solutions=solutions,
            language=language,
        )

        # Step 3: Vote on solutions based on results
        vote_tasks = []
        for result in results:
            if result.solution_id:
                vote_type = "upvote" if result.success else "downvote"
                vote_tasks.append(
                    self.vote_on_solution(
                        solution_id=result.solution_id,
                        vote_type=vote_type,
                    )
                )

        # Execute votes in parallel (fire and forget)
        if vote_tasks:
            await asyncio.gather(*vote_tasks, return_exceptions=True)

        # Step 4: Find the best successful solution
        successful_results = [r for r in results if r.success]

        if successful_results:
            best_result = successful_results[0]  # Already sorted by execution time
            best_solution = next(
                (s for s in solutions if s["id"] == best_result.solution_id),
                None,
            )

            return {
                "success": True,
                "solution": {
                    "id": best_result.solution_id,
                    "code": best_solution["code"] if best_solution else None,
                    "output": best_result.output,
                    "execution_time": best_result.execution_time,
                },
                "all_results": [
                    {
                        "solution_id": r.solution_id,
                        "success": r.success,
                        "output": r.output,
                        "error": r.error,
                        "execution_time": r.execution_time,
                    }
                    for r in results
                ],
                "message": f"Found working solution in {best_result.execution_time:.2f}s. Tested {len(results)} solutions in parallel.",
            }
        else:
            return {
                "success": False,
                "solution": None,
                "all_results": [
                    {
                        "solution_id": r.solution_id,
                        "success": r.success,
                        "output": r.output,
                        "error": r.error,
                        "execution_time": r.execution_time,
                    }
                    for r in results
                ],
                "message": f"No working solution found. Tested {len(results)} solutions, all failed.",
            }


def get_solution_tester(es_client: AsyncElasticsearch) -> SolutionTesterService:
    """
    Get a solution tester service instance.

    Args:
        es_client: Elasticsearch client

    Returns:
        SolutionTesterService instance
    """
    return SolutionTesterService(es_client)
