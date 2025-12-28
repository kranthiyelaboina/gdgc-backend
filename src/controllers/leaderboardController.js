import Leaderboard from '../models/Leaderboard.js';

class LeaderboardController {
    // Get leaderboard sorted by score
    async getLeaderboard(req, res) {
        try {
            const { limit = 50, page = 1 } = req.query;
            const skip = (page - 1) * limit;
            
            const leaderboard = await Leaderboard.find()
                .sort({ 
                    score: -1, 
                    percentage: -1, 
                    questionsCorrect: -1, 
                    submissionTime: 1 
                })
                .limit(parseInt(limit))
                .skip(skip)
                .populate('lastQuizId', 'title quiz_id category');
            
            const totalParticipants = await Leaderboard.countDocuments();
            
            const formattedLeaderboard = leaderboard.map((entry, index) => ({
                rank: skip + index + 1,
                rollNo: entry.rollNo,
                name: entry.name,
                photoURL: entry.photoURL || null,
                score: entry.score,
                percentage: entry.percentage,
                totalMarks: entry.totalMarks,
                questionsCorrect: entry.questionsCorrect,
                totalQuestions: entry.totalQuestions,
                quizTitle: entry.quizTitle,
                submissionTime: entry.submissionTime,
                lastQuiz: entry.lastQuizId ? {
                    title: entry.lastQuizId.title,
                    quiz_id: entry.lastQuizId.quiz_id,
                    category: entry.lastQuizId.category
                } : null
            }));
            
            res.status(200).json({
                success: true,
                data: formattedLeaderboard,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalParticipants / limit),
                    totalParticipants: totalParticipants,
                    hasNext: skip + leaderboard.length < totalParticipants,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: 'Error fetching leaderboard', 
                error: error.message 
            });
        }
    }

    // Add or update score for a roll number
    async addScore(req, res) {
        try {
            const { rollNo, name, score } = req.body;
            
            const existingEntry = await Leaderboard.findOne({ rollNo });
            
            if (existingEntry) {
                // Update existing entry
                existingEntry.score += score;
                existingEntry.name = name; // Update name if provided
                await existingEntry.save();
                res.status(200).json({ message: 'Score updated successfully', entry: existingEntry });
            } else {
                // Create new entry
                const newEntry = new Leaderboard({ rollNo, name, score });
                await newEntry.save();
                res.status(201).json({ message: 'Score added successfully', entry: newEntry });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error adding score', error: error.message });
        }
    }

    // Get score by roll number
    async getScoreByRollNo(req, res) {
        try {
            const { rollNo } = req.params;
            const entry = await Leaderboard.findOne({ rollNo });
            
            if (!entry) {
                return res.status(404).json({ message: 'Roll number not found' });
            }
            
            res.status(200).json(entry);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching score', error: error.message });
        }
    }

    // Admin function to manually set score
    async setScore(req, res) {
        try {
            const { rollNo, name, score } = req.body;
            
            const updatedEntry = await Leaderboard.findOneAndUpdate(
                { rollNo },
                { rollNo, name, score },
                { new: true, upsert: true }
            );
            
            res.status(200).json({ message: 'Score set successfully', entry: updatedEntry });
        } catch (error) {
            res.status(500).json({ message: 'Error setting score', error: error.message });
        }
    }
}

export default new LeaderboardController();