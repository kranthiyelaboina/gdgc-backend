import express from 'express';
import eventController from '../controllers/eventController.js';
import { hybridAuthMiddleware, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes - no authentication needed
// Get all events
router.get('/', eventController.getAllEvents);

// Get events by status (past/upcoming)
router.get('/status/:status', eventController.getEventsByStatus);

// Get single event by ID
router.get('/:id', eventController.getEventById);

// Protected routes - require admin authentication
// Create new event
router.post('/', hybridAuthMiddleware, isAdmin, eventController.createEvent);

// Update event by ID
router.put('/:id', hybridAuthMiddleware, isAdmin, eventController.updateEvent);

// Delete event by ID
router.delete('/:id', hybridAuthMiddleware, isAdmin, eventController.deleteEvent);

export default router;