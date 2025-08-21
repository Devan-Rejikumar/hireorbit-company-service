import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import companyRoutes from './routes/CompanyRoutes'

dotenv.config();

const app = express();

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());




app.get('/health', (req, res) => {
  res.json({ message: 'Company Service is running!' });
});

app.use('/api/company',companyRoutes);

export default app; 