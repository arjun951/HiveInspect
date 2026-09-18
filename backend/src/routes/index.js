import { Router } from 'express';
import importRouter from './import.routes.js';
import templatesRouter from './templates.routes.js';

const router = Router();

router.use('/import', importRouter);
router.use('/templates', templatesRouter);

export default router;
