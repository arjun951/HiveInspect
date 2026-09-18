import { Router } from 'express';
import express from 'express';
import { uploadXlsx } from '../middleware/upload.js';
import { parseXlsx, confirmImport } from '../controllers/import.controller.js';

const router = Router();

// POST /api/import/parse   — multipart file upload, nothing saved
router.post('/parse', uploadXlsx.single('file'), parseXlsx);

// POST /api/import/confirm — JSON body, saves to Supabase
router.post('/confirm', express.json(), confirmImport);

export default router;
