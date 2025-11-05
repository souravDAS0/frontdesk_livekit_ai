const { query, getClient } = require('../../db/config');

/**
 * Help Request Service
 * Business logic for managing help requests lifecycle
 */

/**
 * Create a new help request
 * @param {Object} requestData - { customer_phone, question, call_id, agent_confidence }
 * @returns {Promise<Object>} Created help request
 */
async function createHelpRequest({ customer_phone, question, call_id, agent_confidence = null }) {
  // Validate input
  if (!customer_phone || !question) {
    throw new Error('customer_phone and question are required');
  }

  // Calculate timeout timestamp (30 minutes from now by default)
  const timeoutMinutes = parseInt(process.env.REQUEST_TIMEOUT_MINUTES) || 30;

  const result = await query(
    `INSERT INTO help_requests
     (customer_phone, question, status, call_id, agent_confidence, timeout_at)
     VALUES ($1, $2, 'pending', $3, $4, NOW() + INTERVAL '${timeoutMinutes} minutes')
     RETURNING *`,
    [customer_phone, question, call_id, agent_confidence]
  );

  const helpRequest = result.rows[0];

  // Simulate notifying supervisor (in production, this would send SMS/webhook)
  console.log('\n📱 [SIMULATED] Texting supervisor:');
  console.log(`   "Hey, I need help answering: ${question}"`);
  console.log(`   Request ID: ${helpRequest.id}`);
  console.log(`   Customer: ${customer_phone}\n`);

  return helpRequest;
}

/**
 * Get all help requests with optional filtering
 * @param {Object} filters - { status, limit, offset }
 * @returns {Promise<Array>} List of help requests
 */
async function getHelpRequests({ status = null, limit = 50, offset = 0 } = {}) {
  let sqlQuery = 'SELECT * FROM help_requests';
  const params = [];

  if (status) {
    sqlQuery += ' WHERE status = $1';
    params.push(status);
  }

  sqlQuery += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  const result = await query(sqlQuery, params);
  return result.rows;
}

/**
 * Get a single help request by ID
 * @param {string} id - Help request UUID
 * @returns {Promise<Object>} Help request or null
 */
async function getHelpRequestById(id) {
  const result = await query(
    'SELECT * FROM help_requests WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Respond to a help request (supervisor provides answer)
 * @param {string} id - Help request UUID
 * @param {string} answer - Supervisor's answer
 * @returns {Promise<Object>} Updated help request
 */
async function respondToHelpRequest(id, answer) {
  if (!answer || answer.trim().length === 0) {
    throw new Error('Answer cannot be empty');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get the help request
    const requestResult = await client.query(
      'SELECT * FROM help_requests WHERE id = $1',
      [id]
    );

    const helpRequest = requestResult.rows[0];

    if (!helpRequest) {
      throw new Error('Help request not found');
    }

    if (helpRequest.status !== 'pending') {
      throw new Error(`Cannot respond to request with status: ${helpRequest.status}`);
    }

    // Check if request has timed out
    if (helpRequest.timeout_at) {
      const now = new Date();
      const timeoutAt = new Date(helpRequest.timeout_at);

      if (now > timeoutAt) {
        // Update status to unresolved if not already
        if (helpRequest.status !== 'unresolved') {
          await client.query(
            `UPDATE help_requests
             SET status = 'unresolved'
             WHERE id = $1`,
            [id]
          );
        }

        await client.query('ROLLBACK');
        throw new Error('Request has already timed out and cannot be answered');
      }
    }

    // Update help request to resolved
    const updateResult = await client.query(
      `UPDATE help_requests
       SET status = 'resolved',
           supervisor_response = $1,
           resolved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [answer, id]
    );

    const updatedRequest = updateResult.rows[0];

    // Add to knowledge base
    await client.query(
      `INSERT INTO knowledge_base (question_pattern, answer, learned_from_request_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (question_pattern)
       DO UPDATE SET
         answer = EXCLUDED.answer,
         updated_at = NOW(),
         learned_from_request_id = EXCLUDED.learned_from_request_id`,
      [helpRequest.question, answer, id]
    );

    await client.query('COMMIT');

    // Simulate calling the customer back
    console.log('\n📞 [SIMULATED] Calling customer back:');
    console.log(`   Phone: ${helpRequest.customer_phone}`);
    console.log(`   Message: "${answer}"`);
    console.log(`   Original question: "${helpRequest.question}"\n`);

    return updatedRequest;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Mark timed-out help requests as unresolved
 * Called periodically by a background job
 * @returns {Promise<Array>} List of timed-out request IDs
 */
async function processTimeouts() {
  const result = await query(
    `UPDATE help_requests
     SET status = 'unresolved'
     WHERE status = 'pending'
     AND timeout_at < NOW()
     RETURNING id, customer_phone, question`,
  );

  const timedOutRequests = result.rows;

  if (timedOutRequests.length > 0) {
    console.log(`\n⏰ Processed ${timedOutRequests.length} timed-out request(s) - marked as unresolved:`);
    timedOutRequests.forEach(req => {
      console.log(`   - Request ${req.id} from ${req.customer_phone}`);
    });
    console.log();
  }

  return timedOutRequests;
}

/**
 * Get request statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getStatistics() {
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
      COUNT(*) FILTER (WHERE status = 'unresolved') as timeout_count,
      COUNT(*) as total_count,
      AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) FILTER (WHERE status = 'resolved') as avg_resolution_time_minutes
    FROM help_requests
  `);

  return result.rows[0];
}

module.exports = {
  createHelpRequest,
  getHelpRequests,
  getHelpRequestById,
  respondToHelpRequest,
  processTimeouts,
  getStatistics,
};
