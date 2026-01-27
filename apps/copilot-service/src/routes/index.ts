import { Router } from 'express';
import healthRouter from './health';
import copilotRouter from './copilot';

const router = Router();

router.use('/', healthRouter);
router.use('/copilot', copilotRouter);

export default router;
