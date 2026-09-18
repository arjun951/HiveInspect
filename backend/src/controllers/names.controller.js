import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { insertName, getAllNames } from '../services/names.service.js';

export const addName = asyncHandler(async (req, res) => {
  const { name } = req.query;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Query param "name" is required and cannot be empty');
  }

  const data = await insertName(name.trim());

  res.status(201).json({ success: true, data });
});

export const getNames = asyncHandler(async (_req, res) => {
  const data = await getAllNames();

  res.json({ success: true, data });
});
