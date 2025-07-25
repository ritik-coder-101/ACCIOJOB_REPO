require('dotenv').config();

const express=require('express');
const cors=require('cors');
const mongoose = require('mongoose');
const authMiddleware=require('./middleware/authMiddleware');
const aiRoutes=require('./routes/aiRoutes')
const Auth=require('./routes/auth');
const sessionRoutes=require('./routes/sessionRoutes')

const app=express();
const PORT=process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const connectDb=async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected successfully!');
    } catch (err) {
        console.log('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

connectDb();

app.use('/api/auth', Auth);
app.use('/api/sessions',sessionRoutes)
app.use('/api',aiRoutes);

app.use('/api/test/protected',authMiddleware , (req,res) => { 
    res.json({
        msg : `Welcome , User ${req.user}! You have successfully access the protexted Route `,
        userId:req.user
    });
});

app.get('/', (req, res) => {
    res.send('Component Generator Backend API is active!');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});