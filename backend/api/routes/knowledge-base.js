const express = require('express');
const router = express.Router();
const knowledgeService = require('../services/knowledge.service');

/**
 * GET /api/knowledge-base
 * Get all knowledge base entries
 * Query params: limit, offset, active_only
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, active_only } = req.query;

    const options = {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      active_only: active_only !== 'false', // Default to true
    };

    const entries = await knowledgeService.getAllKnowledge(options);

    res.json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/knowledge-base/stats
 * Get knowledge base statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await knowledgeService.getKnowledgeStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/knowledge-base/search
 * Search knowledge base for an answer using multi-strategy matching
 * Query params:
 *   - q (question): Required. The customer question to search for
 *   - threshold: Optional. Minimum similarity score (default 0.3)
 *   - extracted_tags: Optional. Comma-separated semantic tags extracted from the question
 *                     (e.g., "location,address,directions")
 *   - limit: Optional. Maximum number of results to return (default 5, max 20)
 *
 * Returns: Array of matching entries, sorted by similarity score (descending)
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, threshold, extracted_tags, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    // Parse and validate limit
    let parsedLimit = parseInt(limit) || 5;
    parsedLimit = Math.min(Math.max(1, parsedLimit), 20); // Cap between 1 and 20

    // Parse extracted tags if provided
    const tagsArray = extracted_tags
      ? extracted_tags.split(',').map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)
      : null;

    const entries = await knowledgeService.searchKnowledgeBase(
      q,
      parseFloat(threshold) || 0.3,
      tagsArray,
      parsedLimit
    );

    // Always return array format
    if (entries.length === 0) {
      return res.json({
        success: true,
        found: false,
        count: 0,
        message: 'No matching answer found in knowledge base',
        data: [],
      });
    }

    res.json({
      success: true,
      found: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/knowledge-base/:id
 * Get a single knowledge base entry by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const entry = await knowledgeService.getKnowledgeById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base entry not found',
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/knowledge-base
 * Create a new knowledge base entry
 * Body: { question_pattern, answer, tags, confidence_threshold }
 */
router.post('/', async (req, res, next) => {
  try {
    const { question_pattern, answer, tags, confidence_threshold } = req.body;

    // Validate required fields
    if (!question_pattern || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question_pattern and answer',
      });
    }

    const entry = await knowledgeService.createKnowledgeEntry({
      question_pattern,
      answer,
      tags: tags || [],
      confidence_threshold: confidence_threshold || 0.8,
    });

    res.status(201).json({
      success: true,
      message: 'Knowledge base entry created successfully',
      data: entry,
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A knowledge base entry with this question pattern already exists',
      });
    }
    next(error);
  }
});

/**
 * PATCH /api/knowledge-base/:id
 * Update a knowledge base entry
 * Body: { question_pattern?, answer?, tags?, confidence_threshold?, is_active? }
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedEntry = await knowledgeService.updateKnowledgeEntry(id, updates);

    res.json({
      success: true,
      message: 'Knowledge base entry updated successfully',
      data: updatedEntry,
    });
  } catch (error) {
    if (error.message === 'Knowledge base entry not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === 'No valid fields to update') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * Delete (soft delete) a knowledge base entry
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedEntry = await knowledgeService.deleteKnowledgeEntry(id);

    res.json({
      success: true,
      message: 'Knowledge base entry deleted successfully',
      data: deletedEntry,
    });
  } catch (error) {
    if (error.message === 'Knowledge base entry not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

module.exports = router;
