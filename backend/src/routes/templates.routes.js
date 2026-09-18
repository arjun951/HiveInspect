import { Router } from 'express';
import { listTemplates, getTemplate, patchField, duplicateTemplate, deleteTemplate } from '../controllers/templates.controller.js';

const router = Router();

router.get('/', listTemplates);
router.get('/:id', getTemplate);
router.delete('/:id', deleteTemplate);
router.patch('/:templateId/field', patchField);
router.post('/:templateId/duplicate', duplicateTemplate);

export default router;
