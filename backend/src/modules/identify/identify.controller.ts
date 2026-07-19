import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { internal } from '../../lib/errors.js';
import { identifyService } from './identify.service.js';

export const identifyRouter = Router();

/** POST /api/identify */
identifyRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw internal('Organization was not resolved for this request');
    }

    const { contactId, linkedEvents } = await identifyService.identify(
      organizationId,
      req.body,
    );

    // 200, not 202: unlike /events this is synchronous and the caller acts
    // on the result — the contact exists and the backfill has committed by
    // the time this returns.
    res.status(200).json({ contact_id: contactId, linked_events: linkedEvents });
  }),
);
