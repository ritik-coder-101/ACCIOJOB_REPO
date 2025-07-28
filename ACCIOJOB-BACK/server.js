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

const allowedOrigins = [
  'http://localhost:3000', // frontend
  'http://localhost:5000', // backend
  
];

const corsOptions = {
  origin: function (origin, callback) {
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({limit: '50mb'}));

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected successfully!');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};
connectDB();

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