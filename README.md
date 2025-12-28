# GDGC Platform Backend

## 🎯 Overview
A comprehensive backend system for GDGC (Google Developer Groups on Campus) platform featuring quiz management, user authentication, leaderboards, and real-time features.

## 🚀 Features
- **Quiz Management**: Create, manage, and take interactive quizzes
- **Authentication**: Secure admin login with JWT tokens
- **Leaderboards**: Real-time scoring and rankings
- **Duplicate Prevention**: One attempt per user per quiz
- **Real-time Updates**: WebSocket support for live features
- **Admin Dashboard**: Complete quiz and user management

## 📋 Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd GDGCPlatformBackend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create `.env` file with:
```env
MONGODB_URI=your_mongodb_connection_string
ADMIN_SECRET_KEY=your_admin_secret_key
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
PORT=5000
NODE_ENV=production
```

4. **Start the server**
```bash
# Production
npm start

# Development
npm run dev
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Admin registration
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout

### Quiz Management (Admin)
- `POST /api/quiz/create` - Create new quiz
- `GET /api/quiz/admin/all` - Get all quizzes
- `PATCH /api/quiz/:id/toggle` - Toggle quiz status
- `GET /api/quiz/admin/attempts` - Get all quiz attempts
- `GET /api/quiz/admin/user/:user_id/history` - Get user quiz history

### Quiz Taking (Users)
- `POST /api/quiz/start` - Start quiz with code
- `POST /api/quiz/submit` - Submit quiz answers

### Leaderboard
- `GET /api/leaderboard` - Get rankings

## 🏗️ Project Structure
```
src/
├── app.js              # Main application file
├── config/             # Database configuration
├── controllers/        # Request handlers
├── middleware/         # Auth & validation middleware
├── models/            # MongoDB schemas
├── routes/            # API routes
├── socket/            # WebSocket handlers
└── utils/             # Helper functions

public/                # Static files & testing interface
```

## 🔒 Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting ready
- Environment variable protection

## 📊 Database Schema
- **Quiz**: Quiz data with questions and options
- **QuizAttempt**: Individual user attempts
- **Leaderboard**: User rankings and scores
- **Admin**: Admin user accounts

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong_random_key
SESSION_SECRET=strong_random_key
ADMIN_SECRET_KEY=registration_key
```

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Use strong, unique secrets
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Configure reverse proxy (nginx)
- [ ] Set up SSL/TLS certificates
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Enable rate limiting

## 🧪 Testing
Access the testing interface at: `http://localhost:5000/quiz-tester.html`

## 📈 Monitoring & Logs
- Server status logs to console
- MongoDB connection status
- Error tracking ready for integration

## 🤝 Contributing
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📜 License
MIT License

## 🆘 Support
For issues and questions, contact the development team.
