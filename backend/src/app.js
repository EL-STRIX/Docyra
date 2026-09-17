const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const logger = require('./utils/logger');

// Middleware imports
const errorHandler = require('./middleware/errorHandler');
const { csrf, getCsrfToken } = require('./middleware/csrf');
const { generalLimiter } = require('./middleware/rateLimit');
const AppError = require('./utils/AppError');
const { ERROR_CODES } = require('./config/constants');

// Route imports
const healthRoutes = require('./routes/v1/health.routes');
const authRoutes = require('./routes/v1/auth.routes');
const clinicRoutes = require('./routes/v1/clinic.routes');
const doctorRoutes = require('./routes/v1/doctor.routes');
const specializationRoutes = require('./routes/v1/specialization.routes');
const clinicAdminRoutes = require('./routes/v1/clinicAdmin.routes');
const adminRoutes = require('./routes/v1/admin.routes');
const appointmentRoutes = require('./routes/v1/appointment.routes');
const dependentRoutes = require('./routes/v1/dependent.routes');
const reviewRoutes = require('./routes/v1/review.routes');
const waitlistRoutes = require('./routes/v1/waitlist.routes');
const userRoutes = require('./routes/v1/user.routes');

const app = express();

// Security: Helmet with explicit CSP per TRD Section 7
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*.amazonaws.com", "https://*.r2.cloudflarestorage.com"],
      connectSrc: ["'self'", "https://api.docyra.app", "https://*.sentry.io", "https://www.google.com/recaptcha/"],
      frameSrc: ["https://www.google.com/recaptcha/"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (env.ALLOWED_ORIGINS_ARRAY.includes(origin) || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    return callback(new AppError(ERROR_CODES.FORBIDDEN, 403, 'CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Body Parsing & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP Request Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: logger.stream
  }));
}

// Global General Rate Limiter & CSRF Protection
app.use('/api/v1', generalLimiter);
app.use('/api/v1', csrf);

// CSRF Token Retrieval Endpoint
app.get('/api/v1/auth/csrf-token', getCsrfToken);

// API v1 Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clinics', clinicRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/specializations', specializationRoutes);
app.use('/api/v1/clinic-admin', clinicAdminRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/dependents', dependentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/users', userRoutes);

// 404 Route Handler
app.use('*', (req, res, next) => {
  next(AppError.notFound(ERROR_CODES.NOT_FOUND, `Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
