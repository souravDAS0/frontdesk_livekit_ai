import logging
import httpx
import os
import json
from livekit import api
from livekit.agents import function_tool, RunContext, get_job_context

logger = logging.getLogger("priya-salon-assistant")

# API configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def extract_query_tags(question: str) -> list[str]:
    """
    Extract semantic tags from a customer question using LLM.
    Returns a list of tags representing the intent/entities in the question.

    Examples:
    - "where is the salon" -> ["location", "address", "place", "directions"]
    - "how much for a haircut" -> ["pricing", "cost", "haircut", "services"]
    - "what time do you open" -> ["hours", "schedule", "timing", "open"]
    """
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not configured, skipping tag extraction")
        return []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "developer",
                            "content": """You are a semantic tag extractor for a salon/spa business knowledge base.
Extract semantic tags from customer questions that represent the intent and entities.

Common tag categories:
- Location: location, address, directions, place, where
- Pricing: pricing, cost, price, rates, how much
- Services: services, haircut, manicure, facial, treatments, offerings
- Hours: hours, schedule, timing, open, closed, time
- Appointments: appointments, booking, walk-ins, schedule, reservation
- Staff: staff, stylist, technician, team, who
- Policies: policies, cancellation, payment, tips, rules
- Products: products, retail, brands, buy

Return ONLY a JSON array of lowercase tags (3-6 tags), no explanation.
Example: ["location", "address", "directions", "place"]"""
                        },
                        {
                            "role": "user",
                            "content": f"Extract tags from: {question}"
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 50
                }
            )

        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "[]")

            # Parse the JSON array from the response
            tags = json.loads(content.strip())

            if isinstance(tags, list):
                logger.info(f"Extracted tags for '{question}': {tags}")
                return [str(tag).lower() for tag in tags]
            else:
                logger.warning(f"Invalid tag format from OpenAI: {content}")
                return []
        else:
            logger.warning(f"OpenAI API error: {response.status_code}")
            return []

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse tags from OpenAI response: {e}")
        return []
    except Exception as e:
        logger.error(f"Tag extraction failed: {e}")
        return []


@function_tool
async def check_knowledge_base(question: str) -> str:
    """
    Search the knowledge base for answers to customer questions using two-tier matching:
    1. First attempt: Direct question matching (fast)
    2. Second attempt: Semantic tag-based matching (if first attempt fails)

    Returns the answer if found, or "not_found" if no matching answer exists.
    Use this BEFORE answering any question about services, pricing, hours, or policies.
    """
    try:
        # First attempt: Direct question matching
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{API_BASE_URL}/api/knowledge-base/search",
                params={"q": question}
            )

        if response.status_code == 200:
            data = response.json()

            # Check if we have results with good confidence
            # API now returns array of results, return top 5 for LLM to analyze
            if data.get("success") and data.get("found") and data.get("data") and len(data.get("data", [])) > 0:
                results = data["data"][:5]  # Get top 5 results
                top_score = float(results[0].get("similarity_score", 0))

                # Determine confidence tier based on top score
                if top_score >= 0.7:
                    tier = "high"
                    threshold = 0.7
                elif top_score >= 0.4:
                    tier = "medium"
                    threshold = 0.4
                else:
                    tier = "low"
                    threshold = 0.3

                # Format results for LLM with relevant metadata
                formatted_results = []
                for r in results:
                    score = float(r.get("similarity_score", 0))
                    if score >= threshold:
                        formatted_results.append({
                            "question": r.get("question_pattern", ""),
                            "answer": r.get("answer", ""),
                            "similarity_score": round(score, 2),
                            "has_tags": r.get("tags") is not None and len(r.get("tags", [])) > 0,
                            "exact_tag_match": r.get("exact_tag_match", False)
                        })

                # Return structured JSON if we have qualifying results
                if formatted_results:
                    response = {
                        "found": True,
                        "count": len(formatted_results),
                        "results": formatted_results,
                        "confidence_tier": tier
                    }
                    logger.info(f"[Tier 1] Returning {len(formatted_results)} results (tier: {tier}, top score: {top_score:.3f})")
                    return json.dumps(response)
                else:
                    logger.info(f"[Tier 1] Knowledge base match but low confidence: {top_score:.3f}, trying semantic tag matching...")
            else:
                logger.info(f"[Tier 1] No knowledge base match for: {question}, trying semantic tag matching...")

            # Second attempt: Semantic tag-based matching
            extracted_tags = await extract_query_tags(question)

            if extracted_tags:
                logger.info(f"[Tier 2] Retrying with extracted tags: {extracted_tags}")

                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(
                        f"{API_BASE_URL}/api/knowledge-base/search",
                        params={
                            "q": question,
                            "extracted_tags": ",".join(extracted_tags)
                        }
                    )

                if response.status_code == 200:
                    data = response.json()

                    # API now returns array of results, return top 5 for LLM to analyze
                    if data.get("success") and data.get("found") and data.get("data") and len(data.get("data", [])) > 0:
                        results = data["data"][:5]  # Get top 5 results
                        top_score = float(results[0].get("similarity_score", 0))

                        # Determine confidence tier based on top score (lower thresholds for tag-based)
                        if top_score >= 0.7:
                            tier = "high"
                            threshold = 0.7
                        elif top_score >= 0.4:
                            tier = "medium"
                            threshold = 0.4
                        else:
                            tier = "low"
                            threshold = 0.3

                        # Format results for LLM with relevant metadata
                        formatted_results = []
                        for r in results:
                            score = float(r.get("similarity_score", 0))
                            if score >= threshold:
                                formatted_results.append({
                                    "question": r.get("question_pattern", ""),
                                    "answer": r.get("answer", ""),
                                    "similarity_score": round(score, 2),
                                    "has_tags": r.get("tags") is not None and len(r.get("tags", [])) > 0,
                                    "exact_tag_match": r.get("exact_tag_match", False)
                                })

                        # Return structured JSON if we have qualifying results
                        if formatted_results:
                            response = {
                                "found": True,
                                "count": len(formatted_results),
                                "results": formatted_results,
                                "confidence_tier": tier
                            }
                            logger.info(f"[Tier 2] Returning {len(formatted_results)} results via tags (tier: {tier}, top score: {top_score:.3f})")
                            return json.dumps(response)
                        else:
                            logger.info(f"[Tier 2] Tag-based match but low confidence: {top_score:.3f}")
                    else:
                        logger.info(f"[Tier 2] No tag-based match found")
            else:
                logger.info(f"[Tier 2] No tags extracted, skipping semantic matching")

            return "not_found"
        else:
            logger.warning(f"Knowledge base API error: {response.status_code}")
            return "not_found"

    except Exception as e:
        logger.error(f"Knowledge base search failed: {e}")
        return "not_found"


@function_tool
async def create_help_request(question: str) -> str:
    """
    Create a help request to escalate customer question to supervisor.
    Use this when you cannot find an answer in the knowledge base.
    This function extracts caller info automatically and creates the request.
    """
    try:
        job_ctx = get_job_context()
        if job_ctx is None:
            logger.error("Failed to get job context for help request")
            return "error"

        # Extract customer phone from SIP participant
        customer_phone = "unknown"
        call_id = job_ctx.room.name

        for participant in job_ctx.room.remote_participants.values():
            if hasattr(participant, 'identity') and participant.identity.startswith("sip_"):
                # Try to extract phone from identity or metadata
                customer_phone = participant.identity.replace("sip_", "") or "unknown"
                logger.info(f"Extracted customer phone from SIP participant: {customer_phone}")
                break

        # Create help request via API
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{API_BASE_URL}/api/help-requests",
                json={
                    "customer_phone": customer_phone,
                    "question": question,
                    "call_id": call_id
                },
                headers={"Content-Type": "application/json"}
            )

        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            request_id = data.get("data", {}).get("id", "unknown")
            logger.info(f"Help request created successfully. ID: {request_id}, Question: {question[:50]}")
            return f"created: {request_id}"
        else:
            logger.error(f"Failed to create help request: {response.status_code} - {response.text}")
            return "error"

    except Exception as e:
        logger.error(f"Create help request failed: {e}")
        return "error"


@function_tool
async def end_call(_ctx: RunContext) -> str:
    """
    End the current call gracefully.
    Use this after escalating to supervisor (help request created) or if customer is not interested.
    """
    logger_instance = logging.getLogger("priya-salon-assistant")

    job_ctx = get_job_context()
    if job_ctx is None:
        logger_instance.error("Failed to get job context for end_call")
        return "error"

    logger_instance.info(f"Ending call for room {job_ctx.room.name}")

    try:
        await job_ctx.api.room.delete_room(
            api.DeleteRoomRequest(
                room=job_ctx.room.name,
            )
        )
        logger_instance.info(f"Successfully ended call for room {job_ctx.room.name}")
        return "ended"
    except Exception as e:
        logger_instance.error(f"Failed to end call: {e}", exc_info=True)
        return "error"
