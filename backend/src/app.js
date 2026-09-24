import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { morganStream } from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { NotFoundError } from './utils/AppError.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { csrfProtection } from './middleware/csrf.js';

// Route imports
import healthRoutes from './routes/v1/health.routes.js';
import authRoutes from './routes/v1/auth.routes.js';
import clinicsRoutes from './routes/v1/clinics.routes.js';
import doctorsRoutes from './routes/v1/doctors.routes.js';
import specializationsRoutes from './routes/v1/specializations.routes.js';
import clinicAdminRoutes from './routes/v1/clinicAdmin.routes.js';
import adminRoutes from './routes/v1/admin.routes.js';
import appointmentsRoutes from './routes/v1/appointments.routes.js';
import dependentsRoutes from './routes/v1/dependents.routes.js';
import reviewsRoutes from './routes/v1/reviews.routes.js';
import waitlistsRoutes from './routes/v1/waitlists.routes.js';
import usersRoutes from './routes/v1/users.routes.js';

const app = express();


// Security headers with CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", ...env.ALLOWED_ORIGINS, 'https://www.google.com/recaptcha/'],
        frameSrc: ["'self'", 'https://www.google.com/recaptcha/'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
  })
);

// Static uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting (general)
app.use(generalLimiter);

// CSRF double-submit protection
app.use(csrfProtection);

// Request logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: morganStream }));
}

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clinics', clinicsRoutes);
app.use('/api/v1/doctors', doctorsRoutes);
app.use('/api/v1/specializations', specializationsRoutes);
app.use('/api/v1/clinic-admin', clinicAdminRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/dependents', dependentsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/waitlists', waitlistsRoutes);
app.use('/api/v1/users', usersRoutes);

// 404 Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Central Error Handler
app.use(errorHandler);

export default app;
