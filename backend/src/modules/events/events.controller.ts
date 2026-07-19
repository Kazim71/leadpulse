import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { internal } from '../../lib/errors.js';
import { eventsService } from './events.service.js';

export const eventsRouter = Router();

/**
 * POST /api/events
 *
 * Thin by design: read the request, call the service, shape the response.
 * No validation, no database access, no branching on payload contents.
 */
eventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
      // Unreachable while resolveOrg is mounted ahead of this router.
      // Guarding anyway: a middleware reorder should fail loudly here, not
      // silently write rows with an undefined organization_id.
      throw internal('Organization was not resolved for this request');
    }

    const { eventId } = await eventsService.ingest(organizationId, req.body);

    // 202, not 201: the row is committed, but downstream enrichment
    // (identity linking, geo, scoring) has not run. The snippet is
    // fire-and-forget and must never wait on any of it.
    res.status(202).json({ received: true, event_id: eventId });
  }),
);
