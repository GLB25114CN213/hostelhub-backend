const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger = require('./utils/logger');
const { errorConverter, errorHandler } = require('./middleware/errorHandler');

const routes = {
  auth: require('./routes/authRoutes'),
  students: require('./routes/studentRoutes'),
  hostels: require('./routes/hostelRoutes'),
  rooms: require('./routes/roomRoutes'),
  attendance: require('./routes/attendanceRoutes'),
  leaves: require('./routes/leaveRoutes'),
  visitors: require('./routes/visitorRoutes'),
  complaints: require('./routes/complaintRoutes'),
  fees: require('./routes/feeRoutes'),
  inventory: require('./routes/inventoryRoutes'),
  notices: require('./routes/noticeRoutes'),
  emergency: require('./routes/emergencyRoutes'),
};

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use(
  '/api',
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'HostelHub AI API', version: '1.0.0', description: 'REST API for HostelHub AI' },
    servers: [{ url: '/api/v1' }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './hostelhub-backend/src/routes/*.js'],
};

const swaggerCss = `
  body { background-color: #080b13 !important; font-family: 'Outfit', sans-serif !important; color: #f3f4f6 !important; }
  .swagger-ui { background: #080b13; color: #f3f4f6; }
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info { background: rgba(18, 24, 38, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); padding: 24px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  .swagger-ui .info .title { color: #f3f4f6 !important; font-size: 28px; }
  .swagger-ui .scheme-container { background: rgba(18, 24, 38, 0.6) !important; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  .swagger-ui .opblock { background: rgba(15, 21, 33, 0.6) !important; backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.4); margin-bottom: 16px; }
  .swagger-ui .opblock .opblock-summary { border-radius: 12px; }
  .swagger-ui .opblock-tag { color: #f3f4f6 !important; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .swagger-ui .btn.authorize { background: linear-gradient(135deg, #6366f1, #ec4899) !important; color: #fff !important; border: none !important; border-radius: 10px; box-shadow: 0 0 15px rgba(99,102,241,0.4); }
  .swagger-ui input[type=text], .swagger-ui textarea { background: rgba(0,0,0,0.4) !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 8px !important; }
  .swagger-ui .btn.execute { background: linear-gradient(135deg, #06b6d4, #10b981) !important; border: none !important; color: #fff !important; border-radius: 8px; font-weight: 600; }
`;

app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(swaggerJsdoc(swaggerOptions), { customCss: swaggerCss, customSiteTitle: 'HostelHub AI - Glassmorphism Docs' })(req, res, next);
});

const v1 = express.Router();
Object.entries(routes).forEach(([path, router]) => v1.use(`/${path}`, router));
app.use('/api/v1', v1);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
