import { Router } from 'express';
import { addName, getNames } from '../controllers/names.controller.js';

const router = Router();

// POST /api/names?name=Alice  → insert into arjunTest
router.post('/', addName);

// GET /api/names              → get all rows from arjunTest
router.get('/', getNames);

export default router;
