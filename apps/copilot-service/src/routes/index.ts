import { Router } from 'express';
import healthRouter from './health';
import copilotRouter from './copilot';
import agentsRouter from './agents';

const router = Router();

router.use('/', healthRouter);
router.use('/copilot', copilotRouter);
router.use('/api/agents', agentsRouter);

export default router;
