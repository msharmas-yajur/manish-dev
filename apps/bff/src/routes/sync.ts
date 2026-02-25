import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { pgPool } from '../config/database';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { syncPatientToErpnext, syncPatientFromErpnext } from '../services/patientSync';

// =============================================================================
// Patient Sync Routes
// =============================================================================

export const syncRouter: RouterType = Router();

/**
 * @swagger
 * tags:
 *   - name: Sync
 *     description: Patient synchronization between Caladrius and ERPNext
 */

/**
 * @swagger
 * /api/sync/patients/{patientId}/to-erpnext:
 *   post:
 *     summary: Push patient to ERPNext
 *     description: |
 *       Manually triggers synchronization of a patient record from Caladrius to ERPNext.
 *       Creates or updates the corresponding Patient doctype in ERPNext.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The Caladrius patient ID to sync
 *     responses:
 *       200:
 *         description: Patient synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     erpnextPatientId:
 *                       type: string
 *                       description: ERPNext Patient document name
 *                     action:
 *                       type: string
 *                       enum: [created, updated]
 *                     message:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Sync failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/sync/webhook/erpnext/patient:
 *   post:
 *     summary: Receive patient webhook from ERPNext
 *     description: |
 *       Webhook endpoint that receives patient updates from ERPNext.
 *       Called automatically when a Patient doctype is created or updated in ERPNext.
 *       Requires X-Webhook-Secret header for authentication.
 *
 *       **Note:** Always returns 200 to prevent ERPNext retry loops, even on internal errors.
 *     tags: [Sync]
 *     parameters:
 *       - in: header
 *         name: X-Webhook-Secret
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook authentication secret
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: ERPNext Patient document name
 *               patient_name:
 *                 type: string
 *                 description: Full patient name
 *               sex:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               dob:
 *                 type: string
 *                 format: date
 *               blood_group:
 *                 type: string
 *               mobile:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               custom_caladrius_id:
 *                 type: string
 *                 format: uuid
 *                 description: Linked Caladrius patient ID (if exists)
 *     responses:
 *       200:
 *         description: Webhook processed (check success field for actual result)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     action:
 *                       type: string
 *                       enum: [created, updated, skipped]
 *       401:
 *         description: Invalid or missing webhook secret
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid webhook payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/sync/status/{patientId}:
 *   get:
 *     summary: Get patient sync status
 *     description: Returns the synchronization status of a patient between Caladrius and ERPNext.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The Caladrius patient ID
 *     responses:
 *       200:
 *         description: Patient sync status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [active, inactive, pending]
 *                       description: Patient record status
 *                     erpnextPatientId:
 *                       type: string
 *                       nullable: true
 *                       description: Linked ERPNext Patient document name
 *                     syncSource:
 *                       type: string
 *                       enum: [caladrius, erpnext]
 *                       nullable: true
 *                       description: System where patient was originally created
 *                     lastSyncedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Last successful sync timestamp
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
