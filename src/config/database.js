import mongoose from 'mongoose';

// Set mongoose configuration for Mongoose 7.x
mongoose.set('strictQuery', false);

const connectToDatabase = async () => {
    try {
        // Connect to MongoDB with Mongoose 7.x compatible options
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('MongoDB connected successfully');
        
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
    }
});

export { connectToDatabase };

