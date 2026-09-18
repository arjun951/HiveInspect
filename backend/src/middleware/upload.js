import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isExcelFile(file) {
  const name = (file.originalname || '').toLowerCase();
  const mime = file.mimetype;

  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/octet-stream'
  );
}

export const uploadXlsx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!isExcelFile(file)) {
      cb(new ApiError(400, 'Only .xlsx and .xls files are allowed'));
      return;
    }
    cb(null, true);
  },
});
