import express from 'express';
import leaderboardController from '../controllers/leaderboardController.js';

const router = express.Router();

// Get leaderboard
router.get('/', leaderboardController.getLeaderboard);

// Add/update score
router.post('/add', leaderboardController.addScore);

// Get score by roll number
router.get('/rollno/:rollNo', leaderboardController.getScoreByRollNo);



// Admin: Set score manually
router.post('/set', leaderboardController.setScore);

export default router;