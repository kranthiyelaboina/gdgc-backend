import mongoose from 'mongoose';
import Leaderboard from '../models/Leaderboard.js';

let changeStream = null;

/**
 * Fetches the current leaderboard data
 * @returns {Promise<Array>} Formatted leaderboard data
 */
const fetchLeaderboardData = async () => {
    try {
        const leaderboard = await Leaderboard.find()
            .sort({ 
                score: -1, 
                percentage: -1, 
                questionsCorrect: -1, 
                submissionTime: 1 
            })
            .limit(50)
            .populate('lastQuizId', 'title quiz_id category');
        
        return leaderboard.map((entry, index) => ({
            rank: index + 1,
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
    } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        return [];
    }
};

/**
 * Sets up MongoDB Change Stream to watch leaderboard collection
 * and emit real-time updates via Socket.io
 * @param {Server} io - Socket.io server instance
 */
export const setupLeaderboardChangeStream = (io) => {
    // Wait for MongoDB connection to be ready
    mongoose.connection.once('open', async () => {
        console.log('📡 Setting up leaderboard change stream...');
        
        try {
            // Create change stream on the leaderboard collection
            // Note: This requires MongoDB to be a Replica Set (MongoDB Atlas supports this)
            changeStream = Leaderboard.watch([], { fullDocument: 'updateLookup' });
            
            changeStream.on('change', async (change) => {
                console.log('📊 Leaderboard change detected:', change.operationType);
                
                // Only emit on insert, update, or replace operations
                if (['insert', 'update', 'replace', 'delete'].includes(change.operationType)) {
                    try {
                        const leaderboard = await fetchLeaderboardData();
                        
                        // Get the number of clients in admin-room
                        const adminRoom = io.sockets.adapter.rooms.get('admin-room');
                        const clientCount = adminRoom ? adminRoom.size : 0;
                        console.log(`📡 Admin room has ${clientCount} connected client(s)`);
                        
                        console.log('🚀 Emitting leaderboard update to admin-room...', leaderboard.length, 'entries');
                        io.to('admin-room').emit('leaderboard-update', leaderboard);
                        console.log('✅ Emit completed');
                    } catch (error) {
                        console.error('Error emitting leaderboard update:', error);
                    }
                }
            });

            changeStream.on('error', (error) => {
                console.error('❌ Change stream error:', error);
                // Attempt to reconnect after error
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect change stream...');
                    setupLeaderboardChangeStream(io);
                }, 5000);
            });

            changeStream.on('close', () => {
                console.log('🔌 Change stream closed');
            });

            console.log('✅ Leaderboard change stream is active');
        } catch (error) {
            console.error('❌ Failed to setup change stream:', error.message);
            // If change streams aren't supported (not a replica set), log a warning
            if (error.message.includes('replica set')) {
                console.log('⚠️ Change streams require MongoDB Replica Set. Real-time updates will not work.');
                console.log('💡 MongoDB Atlas free tier supports replica sets.');
            }
        }
    });

    // Also handle already open connection
    if (mongoose.connection.readyState === 1) {
        mongoose.connection.emit('open');
    }
};

/**
 * Closes the change stream (for cleanup)
 */
export const closeLeaderboardChangeStream = async () => {
    if (changeStream) {
        await changeStream.close();
        console.log('🔌 Leaderboard change stream closed');
    }
};

export default { setupLeaderboardChangeStream, closeLeaderboardChangeStream };
