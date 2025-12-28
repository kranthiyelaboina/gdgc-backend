const socketHandlers = (io) => {
    io.on('connection', (socket) => {
        socket.on('disconnect', () => {
            // Handle disconnection
        });

        socket.on('joinQuiz', (quizId) => {
            socket.join(quizId);
        });

        socket.on('submitAnswer', (data) => {
            const { quizId, answer } = data;
            // Handle answer submission logic here
            // Emit event to update other users in the quiz room
            io.to(quizId).emit('newAnswer', { userId: socket.id, answer });
        });

        socket.on('requestLeaderboard', (quizId) => {
            // Handle leaderboard request logic here
            // Emit event with leaderboard data
            const leaderboardData = {}; // Fetch or calculate leaderboard data
            io.to(quizId).emit('updateLeaderboard', leaderboardData);
        });
    });
};

export default socketHandlers;