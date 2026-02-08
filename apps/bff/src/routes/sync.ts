import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { pgPool } from '../config/database';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { syncPatientToErpnext, syncPatientFromErpnext } from '../services/patientSync';

// =============================================================================
// Patient Sync Routes
// =============================================================================

export const syncRouter = Router();

// -----------------------------------------------------------------------------
// POST /patients/:patientId/to-erpnext — Push patient to ERPNext
// -----------------------------------------------------------------------------

syncRouter.post(
  '/patients/:patientId/to-erpnext',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const authReq = req as AuthenticatedRequest;

      logger.info(
        { patientId, userId: authReq.user!.id },
        'Manual sync to ERPNext requested'
      );

      const result = await syncPatientToErpnext(patientId);

      if (!result.success) {
        return next(createError(result.message, 500));
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// POST /webhook/erpnext/patient — Receive patient webhook from ERPNext
// -----------------------------------------------------------------------------

syncRouter.post(
  '/webhook/erpnext/patient',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate webhook secret
      const webhookSecret = req.headers['x-webhook-secret'] as string | undefined;

      if (!webhookSecret || webhookSecret !== config.frappe.webhookSecret) {
        logger.warn(
          { receivedSecret: webhookSecret ? '[REDACTED]' : 'missing' },
          'Invalid webhook secret for ERPNext patient webhook'
        );
        return next(createError('Unauthorized webhook request', 401));
      }

      const payload = req.body;

      if (!payload || !payload.name) {
        return next(createError('Invalid webhook payload: missing patient name', 400));
      }

      logger.info(
        { erpnextName: payload.name, patientName: payload.patient_name },
        'Received ERPNext patient webhook'
      );

      const result = await syncPatientFromErpnext(payload);

      if (!result.success) {
        logger.error({ result }, 'ERPNext webhook sync failed');
        // Return 200 to prevent ERPNext from retrying endlessly
        res.status(200).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Log but still return 200 to prevent webhook retry loops
      logger.error({ error }, 'Unexpected error processing ERPNext patient webhook');
      res.status(200).json({
        success: false,
        message: 'Internal error processing webhook',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /status/:patientId — Get patient sync status
// -----------------------------------------------------------------------------

syncRouter.get(
  '/status/:patientId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const result = await pgPool.query(
        `SELECT id, status, erpnext_patient_id, sync_source, last_synced_at
         FROM patients
         WHERE id = $1`,
        [patientId]
      );

      if (result.rows.length === 0) {
        return next(createError('Patient not found', 404));
      }

      const patient = result.rows[0];

      res.json({
        success: true,
        data: {
          patientId: patient.id,
          status: patient.status,
          erpnextPatientId: patient.erpnext_patient_id,
          syncSource: patient.sync_source,
          lastSyncedAt: patient.last_synced_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
