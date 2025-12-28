const socket = io();

// Function to handle quiz submission
function submitQuiz(quizData) {
    socket.emit('submitQuiz', quizData);
}

// Function to update leaderboard
function updateLeaderboard() {
    socket.emit('getLeaderboard');
}

// Function to display leaderboard
socket.on('leaderboardData', (data) => {
    const leaderboardElement = document.getElementById('leaderboard');
    leaderboardElement.innerHTML = '';
    data.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.username}: ${entry.score}`;
        leaderboardElement.appendChild(li);
    });
});

// Function to handle contact form submission
document.getElementById('contactForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const contactData = Object.fromEntries(formData);
    socket.emit('submitContact', contactData);
});

// Function to fetch team info
function fetchTeamInfo() {
    socket.emit('getTeamInfo');
}

// Function to display team info
socket.on('teamInfo', (data) => {
    const teamElement = document.getElementById('teamInfo');
    teamElement.innerHTML = '';
    data.forEach((member) => {
        const li = document.createElement('li');
        li.textContent = `${member.name} - ${member.role}`;
        teamElement.appendChild(li);
    });
});

// Function to fetch calendar events
function fetchCalendarEvents() {
    socket.emit('getCalendarEvents');
}

// Function to display calendar events
socket.on('calendarEvents', (events) => {
    const calendarElement = document.getElementById('calendar');
    calendarElement.innerHTML = '';
    events.forEach((event) => {
        const li = document.createElement('li');
        li.textContent = `${event.date}: ${event.title}`;
        calendarElement.appendChild(li);
    });
});

// Function to fetch blog posts
function fetchBlogPosts() {
    socket.emit('getBlogPosts');
}

// Function to display blog posts
socket.on('blogPosts', (posts) => {
    const blogElement = document.getElementById('blog');
    blogElement.innerHTML = '';
    posts.forEach((post) => {
        const li = document.createElement('li');
        li.textContent = post.title;
        blogElement.appendChild(li);
    });
});