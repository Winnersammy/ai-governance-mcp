// Centralized configuration management

const config = {
    app: {
        port: process.env.APP_PORT || 3000,
        env: process.env.NODE_ENV || 'development',
    },
    db: {
        uri: process.env.DB_URI || 'mongodb://localhost:27017/myapp',
    },
    // Add other configurations as needed
};

module.exports = config;
