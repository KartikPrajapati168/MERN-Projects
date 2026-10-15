const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Use a more robust connection string
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wasteexchange';
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`📊 Connection State: ${conn.connection.readyState}`);
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('💡 Make sure MongoDB is running:');
    console.log('   - Run "mongod" in terminal');
    console.log('   - Or use MongoDB Atlas with proper connection string');
    
    // Don't exit process, let the app try to reconnect
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

module.exports = connectDB;