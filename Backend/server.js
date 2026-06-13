//run express app on local
//connects to aws RDS database using connection string from .env file
require('dotenv').config(); //load environment variables from .env file
console.log('DB_HOST:', process.env.DB_HOST);
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes'); //import auth routes
app.use(express.json()); //middleware to parse JSON request bodies
app.use('/api/auth', authRoutes); //mount auth routes at /api/auth
const PORT = process.env.PORT || 5000; //use port from environment variable or default to 5000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});