import { Router } from 'express';
import { publishDocument } from '../services/documentService';
import { validatePublishRequest } from '../utils/validation';

const router = Router();

router.post('/publish', async (req, res, next) => {
  try {
    const validatedData = validatePublishRequest(req.body);
    const result = await publishDocument(validatedData);
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export { router as publishRouter };