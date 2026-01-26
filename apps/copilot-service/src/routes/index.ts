import { Router } from 'express';
import healthRouter from './health';

const router = Router();

router.use('/', healthRouter);
// TODO: Add copilot routes in Phase 2

export default router;
