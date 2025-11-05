const express = require('express');
const router = express.Router();
const helpRequestService = require('../services/helpRequest.service');

/**
 * GET /api/help-requests
 * Get all help requests with optional filtering
 * Query params: status (pending|resolved|timeout), limit, offset
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;

    const filters = {
      status: status || null,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    };

    const requests = await helpRequestService.getHelpRequests(filters);

    res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/help-requests/stats
 * Get help request statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await helpRequestService.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/help-requests/:id
 * Get a single help request by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const helpRequest = await helpRequestService.getHelpRequestById(id);

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        error: 'Help request not found',
      });
    }

    res.json({
      success: true,
      data: helpRequest,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/help-requests
 * Create a new help request (called by the AI agent)
 * Body: { customer_phone, question, call_id, agent_confidence }
 */
router.post('/', async (req, res, next) => {
  try {
    const { customer_phone, question, call_id, agent_confidence } = req.body;

    // Validate required fields
    if (!customer_phone || !question) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_phone and question',
      });
    }

    const helpRequest = await helpRequestService.createHelpRequest({
      customer_phone,
      question,
      call_id,
      agent_confidence,
    });

    res.status(201).json({
      success: true,
      message: 'Help request created successfully',
      data: helpRequest,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/help-requests/:id/respond
 * Respond to a help request (supervisor provides answer)
 * Body: { answer }
 */
router.post('/:id/respond', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    // Validate required fields
    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Answer is required',
      });
    }

    const updatedRequest = await helpRequestService.respondToHelpRequest(id, answer);

    res.json({
      success: true,
      message: 'Response submitted successfully. Customer will be notified.',
      data: updatedRequest,
    });
  } catch (error) {
    if (error.message === 'Help request not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === 'Request has already timed out and cannot be answered') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Cannot respond to request')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
});

/**
 * POST /api/help-requests/process-timeouts
 * Process timed-out requests (called by cron job or manually)
 */
router.post('/process-timeouts', async (req, res, next) => {
  try {
    const timedOutRequests = await helpRequestService.processTimeouts();

    res.json({
      success: true,
      message: `Processed ${timedOutRequests.length} timed-out request(s)`,
      data: timedOutRequests,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
