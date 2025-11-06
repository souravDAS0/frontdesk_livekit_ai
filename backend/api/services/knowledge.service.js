const { query } = require("../../db/config");

/**
 * Knowledge Base Service
 * Business logic for managing the knowledge base
 */

/**
 * Search knowledge base for an answer
 * Uses multi-strategy approach:
 * 1. Exact match (case-insensitive)
 * 2. Trigram similarity matching (fuzzy)
 * 3. Full-text search
 * 4. Normalized question matching
 * 5. Semantic tag matching (if extracted_tags provided)
 *
 * @param {string} question - The question to search for
 * @param {number} threshold - Minimum similarity threshold (0-1), default 0.3
 * @param {Array<string>|null} extractedTags - Optional semantic tags extracted from question
 * @param {number} limit - Maximum number of results to return, default 5
 * @returns {Promise<Array>} Array of matching knowledge base entries with similarity_score (empty array if no match)
 */
async function searchKnowledgeBase(
  question,
  threshold = 0.3,
  extractedTags = null,
  limit = 5
) {
  if (!question || question.trim().length === 0) {
    return [];
  }

  // Validate and cap limit to prevent excessive queries
  const cappedLimit = Math.min(Math.max(1, limit), 20);

  const trimmedQuestion = question.trim();

  // Strategy 1: Exact match (highest confidence)
  let result = await query(
    `SELECT *, 1.0::numeric as similarity_score
     FROM knowledge_base
     WHERE is_active = true
     AND LOWER(question_pattern) = LOWER($1)
     LIMIT $2`,
    [trimmedQuestion, cappedLimit]
  );

  if (result.rows.length > 0) {
    // Only increment usage count for the first/best match to avoid skewing statistics
    await incrementUsageCount(result.rows[0].id);
    return result.rows;
  }

  // Strategy 2 & 3 & 4 & 5: Combined fuzzy matching with multiple signals
  // Uses trigram similarity, full-text search, normalized matching, and tag matching
  // If extracted tags are provided, prioritize semantic tag overlap

  // Build dynamic query based on whether extracted tags are provided
  const hasExtractedTags = extractedTags && extractedTags.length > 0;

  let queryText = `SELECT *,
       -- Trigram similarity on original question
       similarity(question_pattern, $1) as sim_original,

       -- Trigram similarity on normalized question (if available)
       COALESCE(similarity(normalized_question, normalize_question($1)), 0) as sim_normalized,

       -- Full-text search rank
       ts_rank(to_tsvector('english', question_pattern), plainto_tsquery('english', $1)) as fts_rank,

       -- Check for exact tag match in any word of the query
       EXISTS (
         SELECT 1
         FROM unnest(tags) AS tag,
              unnest(string_to_array(LOWER($1), ' ')) AS word
         WHERE LOWER(tag) = word
       ) as exact_tag_match,

       -- Check for fuzzy tag match in any word
       (
         SELECT MAX(similarity(tag, word))
         FROM unnest(tags) AS tag,
              unnest(string_to_array($1, ' ')) AS word
       ) as tag_similarity,`;

  // Add extracted tag overlap calculation if tags provided
  if (hasExtractedTags) {
    queryText += `

       -- Count how many extracted tags match KB entry tags (exact match)
       (
         SELECT COUNT(*)
         FROM unnest(tags) AS kb_tag,
              unnest($3::text[]) AS extracted_tag
         WHERE LOWER(kb_tag) = LOWER(extracted_tag)
       ) as extracted_tag_overlap_count,

       -- Check if ANY extracted tag matches KB entry tags
       EXISTS (
         SELECT 1
         FROM unnest(tags) AS kb_tag,
              unnest($3::text[]) AS extracted_tag
         WHERE LOWER(kb_tag) = LOWER(extracted_tag)
       ) as has_extracted_tag_match,`;
  }

  queryText += `

       -- Combined score (weighted average with tag boost)
       CASE`;

  // If extracted tags provided, give them highest priority
  if (hasExtractedTags) {
    queryText += `
         -- HIGHEST PRIORITY: If extracted tags match KB tags (semantic match), give very high confidence
         WHEN EXISTS (
           SELECT 1
           FROM unnest(tags) AS kb_tag,
                unnest($3::text[]) AS extracted_tag
           WHERE LOWER(kb_tag) = LOWER(extracted_tag)
         ) THEN LEAST(0.90, 0.70 + (
           SELECT COUNT(*) * 0.05
           FROM unnest(tags) AS kb_tag,
                unnest($3::text[]) AS extracted_tag
           WHERE LOWER(kb_tag) = LOWER(extracted_tag)
         ))`;
  }

  queryText += `
         -- If exact tag match in any word, give high confidence score
         WHEN EXISTS (
           SELECT 1
           FROM unnest(tags) AS tag,
                unnest(string_to_array(LOWER($1), ' ')) AS word
           WHERE LOWER(tag) = word
         ) THEN 0.85
         -- If fuzzy tag match in any word (similarity > 0.7), give good confidence
         WHEN (
           SELECT MAX(similarity(tag, word))
           FROM unnest(tags) AS tag,
                unnest(string_to_array($1, ' ')) AS word
         ) > 0.7 THEN 0.75
         -- Otherwise use existing weighted calculation
         ELSE (
           similarity(question_pattern, $1) * 0.5 +
           COALESCE(similarity(normalized_question, normalize_question($1)), 0) * 0.3 +
           ts_rank(to_tsvector('english', question_pattern), plainto_tsquery('english', $1)) * 0.2
         )
       END as similarity_score

     FROM knowledge_base
     WHERE is_active = true
     AND (`;

  // Add extracted tag matching condition if tags provided
  if (hasExtractedTags) {
    queryText += `
       -- Match if any extracted tag overlaps with KB entry tags
       EXISTS (
         SELECT 1
         FROM unnest(tags) AS kb_tag,
              unnest($3::text[]) AS extracted_tag
         WHERE LOWER(kb_tag) = LOWER(extracted_tag)
       )
       OR`;
  }

  queryText += `
       -- Match if trigram similarity exceeds threshold
       similarity(question_pattern, $1) > $2
       -- OR normalized question similarity exceeds threshold
       OR COALESCE(similarity(normalized_question, normalize_question($1)), 0) > $2
       -- OR full-text search matches
       OR to_tsvector('english', question_pattern) @@ plainto_tsquery('english', $1)
       -- OR exact tag match in any word of query
       OR EXISTS (
         SELECT 1
         FROM unnest(tags) AS tag,
              unnest(string_to_array(LOWER($1), ' ')) AS word
         WHERE LOWER(tag) = word
       )
       -- OR fuzzy tag match in any word
       OR EXISTS (
         SELECT 1
         FROM unnest(tags) AS tag,
              unnest(string_to_array($1, ' ')) AS word
         WHERE similarity(tag, word) > 0.7
       )
     )
     ORDER BY similarity_score DESC, times_used DESC
     LIMIT $${hasExtractedTags ? 4 : 3}`;

  const params = hasExtractedTags
    ? [trimmedQuestion, threshold, extractedTags, cappedLimit]
    : [trimmedQuestion, threshold, cappedLimit];

  result = await query(queryText, params);

  if (result.rows.length > 0) {
    const matches = result.rows;
    const topMatch = matches[0];

    // Log the match details for debugging
    let matchType = "QUESTION MATCH";

    if (hasExtractedTags && topMatch.has_extracted_tag_match) {
      matchType = `SEMANTIC TAG MATCH (${topMatch.extracted_tag_overlap_count} tags overlap)`;
    } else if (topMatch.exact_tag_match) {
      matchType = "TAG MATCH (exact)";
    } else if (topMatch.tag_similarity > 0.6) {
      matchType = `TAG MATCH (fuzzy: ${topMatch.tag_similarity.toFixed(3)})`;
    }

    let logMessage = `[Knowledge Base] ${
      matches.length
    } match(es) found (Top: ${matchType}):
      Query: "${trimmedQuestion}"
      Top Match: "${topMatch.question_pattern}"
      Tags: [${topMatch.tags ? topMatch.tags.join(", ") : "none"}]
      Similarity Score: ${topMatch.similarity_score.toFixed(3)}
      Original Sim: ${topMatch.sim_original.toFixed(3)}
      Normalized Sim: ${topMatch.sim_normalized.toFixed(3)}
      FTS Rank: ${topMatch.fts_rank.toFixed(3)}`;

    if (hasExtractedTags) {
      logMessage += `
      Extracted Tags: [${extractedTags.join(", ")}]
      Tag Overlap Count: ${topMatch.extracted_tag_overlap_count || 0}`;
    }

    if (matches.length > 1) {
      logMessage += `\n      Other matches: ${matches
        .slice(1)
        .map(
          (m) => `"${m.question_pattern}" (${m.similarity_score.toFixed(3)})`
        )
        .join(", ")}`;
    }

    // console.log(logMessage);

    // Only increment usage count for the first/best match to avoid skewing statistics
    await incrementUsageCount(topMatch.id);
    return matches;
  }

  console.log(
    `[Knowledge Base] No match found for: "${trimmedQuestion}" (threshold: ${threshold})`
  );
  return [];
}

/**
 * Get all knowledge base entries
 * @param {Object} options - { limit, offset, active_only }
 * @returns {Promise<Array>} List of knowledge base entries with populated help_request data
 */
async function getAllKnowledge({
  limit = 100,
  offset = 0,
  active_only = true,
} = {}) {
  let sqlQuery = `
    SELECT
      kb.*,
      CASE
        WHEN kb.learned_from_request_id IS NOT NULL THEN
          json_build_object(
            'id', hr.id,
            'customer_phone', hr.customer_phone,
            'question', hr.question,
            'status', hr.status,
            'created_at', hr.created_at,
            'resolved_at', hr.resolved_at,
            'timeout_at', hr.timeout_at,
            'supervisor_response', hr.supervisor_response,
            'call_id', hr.call_id
          )
        ELSE NULL
      END as learned_from_request
    FROM knowledge_base kb
    LEFT JOIN help_requests hr ON kb.learned_from_request_id = hr.id
  `;
  const params = [];

  if (active_only) {
    sqlQuery += " WHERE kb.is_active = true";
  }

  sqlQuery +=
    " ORDER BY kb.times_used DESC, kb.created_at DESC LIMIT $1 OFFSET $2";
  params.push(limit, offset);

  const result = await query(sqlQuery, params);
  return result.rows;
}

/**
 * Get a single knowledge base entry by ID
 * @param {string} id - Knowledge base entry UUID
 * @returns {Promise<Object|null>} Knowledge base entry or null
 */
async function getKnowledgeById(id) {
  const result = await query("SELECT * FROM knowledge_base WHERE id = $1", [
    id,
  ]);

  return result.rows[0] || null;
}

/**
 * Create a new knowledge base entry
 * @param {Object} data - { question_pattern, answer, tags }
 * @returns {Promise<Object>} Created knowledge base entry
 */
async function createKnowledgeEntry({ question_pattern, answer, tags = [] }) {
  if (!question_pattern || !answer) {
    throw new Error("question_pattern and answer are required");
  }

  const result = await query(
    `INSERT INTO knowledge_base (question_pattern, answer, tags)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [question_pattern.trim(), answer.trim(), tags]
  );

  return result.rows[0];
}

/**
 * Update a knowledge base entry
 * @param {string} id - Knowledge base entry UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated knowledge base entry
 */
async function updateKnowledgeEntry(id, updates) {
  const allowedFields = ["question_pattern", "answer", "tags", "is_active"];
  const setClauses = [];
  const params = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      setClauses.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  }

  if (setClauses.length === 0) {
    throw new Error("No valid fields to update");
  }

  params.push(id);

  const result = await query(
    `UPDATE knowledge_base
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${paramCount}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error("Knowledge base entry not found");
  }

  return result.rows[0];
}

/**
 * Delete a knowledge base entry (soft delete by setting is_active = false)
 * @param {string} id - Knowledge base entry UUID
 * @returns {Promise<Object>} Updated knowledge base entry
 */
async function deleteKnowledgeEntry(id) {
  const result = await query(
    `UPDATE knowledge_base
     SET is_active = false, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Knowledge base entry not found");
  }

  return result.rows[0];
}

/**
 * Increment the usage counter for a knowledge base entry
 * @param {string} id - Knowledge base entry UUID
 * @returns {Promise<void>}
 */
async function incrementUsageCount(id) {
  await query(
    "UPDATE knowledge_base SET times_used = times_used + 1 WHERE id = $1",
    [id]
  );
}

/**
 * Get knowledge base statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getKnowledgeStatistics() {
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE is_active = true) as active_count,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE learned_from_request_id IS NULL AND is_active = true) as seeded_data_count,
      COUNT(*) FILTER (WHERE learned_from_request_id IS NOT NULL AND is_active = true) as learned_data_count,
      SUM(times_used) as total_uses,
      AVG(times_used) as avg_uses_per_entry,
      (
        SELECT json_build_object(
          'question_pattern', question_pattern,
          'answer', answer,
          'times_used', times_used
        )
        FROM knowledge_base
        WHERE is_active = true
        ORDER BY times_used DESC
        LIMIT 1
      ) as most_used
    FROM knowledge_base
  `);

  return result.rows[0];
}

module.exports = {
  searchKnowledgeBase,
  getAllKnowledge,
  getKnowledgeById,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  incrementUsageCount,
  getKnowledgeStatistics,
};
