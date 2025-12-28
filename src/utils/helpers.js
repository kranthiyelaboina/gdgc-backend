// Generate 6-digit quiz code
export const generateQuizCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate quiz score
export const calculateScore = (questions, answers) => {
    let score = 0;
    
    questions.forEach((question, index) => {
        const userAnswer = answers[index];
        
        if (question.type === 'single') {
            if (userAnswer === question.correctAnswers[0]) {
                score++;
            }
        } else if (question.type === 'multiple') {
            const correct = question.correctAnswers.sort();
            const user = Array.isArray(userAnswer) ? userAnswer.sort() : [];
            if (JSON.stringify(correct) === JSON.stringify(user)) {
                score++;
            }
        }
    });
    
    return score;
};

// Shuffle array (for randomizing questions)
export const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Check if quiz is currently active based on time
export const isQuizActive = (quiz) => {
    const now = new Date();
    return quiz.isActive && now >= quiz.startTime && now <= quiz.endTime;
};

// Format date for display
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};