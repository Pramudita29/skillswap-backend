require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User'); // Adjust path as needed
const Message = require('./models/Message'); // Add Message model import
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const authRoutes = require('./routes/authRoutes');
const skillRoutes = require('./routes/skillRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const swapRoutes = require('./routes/swapRequestRoutes');
const userRoutes = require('./routes/userRoutes');
const statsRoutes = require('./routes/statsRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions',
});

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET, // Add to .env
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
app.use('/api/auth', limiter); // Apply to auth routes
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/message', messageRoutes);

// Catch-all for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error('Mongo connection error:', err));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', async (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit('userStatus', { userId, isOnline: true });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  });

  socket.on('sendMessage', async (message) => {
    try {
      const savedMessage = new Message(message);
      await savedMessage.save();
      await savedMessage.populate('from to', 'name');
      console.log('Saved message:', savedMessage);
      io.to(message.to).emit('newMessage', savedMessage);
      io.to(message.from).emit('newMessage', savedMessage);
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  });

  socket.on('typing', ({ userId, to }) => {
    io.to(to).emit('typing', { userId });
  });

  socket.on('stopTyping', ({ userId, to }) => {
    io.to(to).emit('stopTyping', { userId });
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    try {
      const user = await User.findOneAndUpdate(
        { sockets: socket.id },
        { isOnline: false },
        { new: true }
      );
      if (user) {
        io.emit('userStatus', { userId: user._id, isOnline: false });
      }
    } catch (error) {
      console.error('Error updating offline status:', error);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));