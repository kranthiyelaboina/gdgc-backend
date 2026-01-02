// --- Core Node.js and Express Imports ---
import http from 'http';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';

// --- Third-Party Middleware Imports ---
import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session';
import { Server } from 'socket.io';

// --- Application-Specific Imports ---
import { connectToDatabase } from './config/database.js';
import './config/firebase.js'; // Initialize Firebase Admin SDK
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import leaderboardRoutes from './routes/leaderboard.js';
import quizRoutes from './routes/quiz.js';
import adminStudyJamsRoutes from './routes/adminStudyJams.js';
import firebaseUsersRoutes from './routes/firebaseUsers.js';
import { setupLeaderboardChangeStream } from './socket/leaderboardStream.js';
import { setupQuizSessionHandlers } from './socket/quizSessionHandlers.js';

// Load environment variables from .env file
dotenv.config();

// --- Application Initialization ---
const app = express();
const server = http.createServer(app);
// Get Socket.IO allowed origins from environment or use defaults
const getSocketOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
        // Strip trailing slashes from origins to ensure proper matching
        return envOrigins.split(',').map(origin => origin.trim().replace(/\/$/, ''));
    }
    return [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5173',
        'https://www.gdgciare.tech',
        'https://gdgciare.tech',
        'https://gdgc-platform-frontend.vercel.app',
        'https://gdgcplatformbackend.onrender.com'
    ];
};

const io = new Server(server, {
    cors: {
        origin: getSocketOrigins(),
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
    }
});

// --- Security and Proxy Configuration ---
// Trust the first proxy, essential for production environments (e.g., Heroku, Vercel)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// --- CORS Configuration ---
// Define allowed origins for Cross-Origin Resource Sharing
// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
        // Strip trailing slashes from origins to ensure proper matching
        return envOrigins.split(',').map(origin => origin.trim().replace(/\/$/, ''));
    }
    return [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5173',
        'https://www.gdgciare.tech',
        'https://gdgciare.tech',
        'https://gdgc-platform-frontend.vercel.app',
        'https://gdgcplatformbackend.onrender.com'
    ];
};

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        
        // Allow requests with no origin (e.g., mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200 // For legacy browser support
};

// Enable CORS with the specified options
app.use(cors(corsOptions));

// --- Core Middleware ---

// Logging middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url} - Origin: ${req.get('origin') || 'No origin'}`);
    next();
});

// Parse incoming request bodies in JSON format
app.use(bodyParser.json());
// Parse incoming request bodies with URL-encoded payloads
app.use(bodyParser.urlencoded({ extended: true }));

// Session management middleware
app.use(session({
    secret: process.env.SESSION_SECRET, // Secret used to sign the session ID cookie
    resave: false, // Do not save session if unmodified
    saveUninitialized: false, // Do not create session until something stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        httpOnly: true, // Prevent client-side JS from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000, // Cookie expiration time (24 hours)
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Required for cross-origin cookie sharing
    }
}));

// Serve static assets from the 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));

// --- Database Connection ---
connectToDatabase();

// --- Application Routes ---

// Base route for server health check
app.get('/', (req, res) => {
  res.send('Server is working');
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminStudyJamsRoutes); 
app.use('/api/firebase', firebaseUsersRoutes); 

// Debug endpoint to verify routes are working
app.get('/api/admin/test-route', (req, res) => {
    res.json({ success: true, message: 'Admin routes are working!' });
});

console.log('✅ All routes mounted successfully');
console.log('   - /api/auth');
console.log('   - /api/events');
console.log('   - /api/leaderboard');
console.log('   - /api/quiz');
console.log('   - /api/admin');
console.log('   - /api/firebase');

// --- Error Handling Middleware ---

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        // Provide a generic message in production
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
});

// 404 Not Found handler (must be the last route)
app.use('*', (req, res) => {
    console.log('404 Not Found:', req.method, req.originalUrl);
    console.log('   Origin:', req.get('origin'));
    const availableRoutes = ['/api/auth', '/api/events', '/api/leaderboard', '/api/quiz', '/api/admin', '/api/firebase'];
    console.log('   Available base routes:', availableRoutes.join(', '));
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestedUrl: req.originalUrl,
        method: req.method,
        availableRoutes: availableRoutes
    });
});

// --- Socket.io Connection Handler ---
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // Join admin room for leaderboard updates
    socket.on('join-admin', () => {
        socket.join('admin-room');
        console.log('👤 Admin joined:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Setup Quiz Session handlers (uses /quiz namespace)
setupQuizSessionHandlers(io);

// Setup MongoDB Change Stream for real-time leaderboard updates
setupLeaderboardChangeStream(io);

// --- Server Startup ---
const PORT = process.env.PORT || 5000;

// Handle server errors gracefully
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.log(`   Please either:`);
        console.log(`   1. Stop the other process using port ${PORT}`);
        console.log(`   2. Use a different port by setting PORT environment variable`);
        console.log(`\n   To find and kill the process using port ${PORT}:`);
        console.log(`   Windows: netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F`);
        console.log(`   Linux/Mac: lsof -i :${PORT} then kill -9 <PID>`);
        // Exit gracefully instead of crashing
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Log but don't crash for non-critical errors
    if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        console.log('   Connection was reset by client - continuing...');
    } else {
        // For critical errors, exit gracefully
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't crash
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

