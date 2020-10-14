const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
//NPM package to parse the cookie
const cookieParser = require('cookie-parser');
//NPM package to compless content-type
const compression = require('compression');

// Routes
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

//Global - Middleware---- Start express app
const app = express();

//Enable proxy especially for heroku
app.enable('trust proxy');

//Setting up the view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//Middleware for securing http headers
//serving static files using express //We don't need public folder in URL, If there is no route is defined it automatically look for root.
app.use(express.static(path.join(__dirname, 'public')));

//Set security http headers
app.use(helmet());

// Logger middleware each req details in development env
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Rate Limit middleware - how many request per IP (Handle Brute Force attack & DDoS)
const limeter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //Time in ms
  message: 'Too many requests from this IP, Please try again in an hour',
});

app.use('/api', limeter);

//Body Parser middleware - Reading data from the body of the request into req.body
app.use(express.json({ limit: '10kb' }));
//Express middleware - body parser for URL encoded values only i.e. Submit HTML using action method, extended true - allow some complex data using url encoding
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Call the cookie parser
app.use(cookieParser());

//Data Sanitazation middleware - NoSQL, Query Injection
app.use(mongoSanitize());

//Data Sanitazation middleware - XSS
app.use(xssClean());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

//Test Middleware
app.use((req, res, next) => {
  //console.log('Hello from the middleware  👋👋👋');
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);
  //console.log(req.cookies); // Log to cookies to console on each request
  next();
});

//End of Global Middleware.

//Mount Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Error handling of unspecified routes using express - Middleware
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

// Middleware for
// app.use((req, res, next) => {
//     console.log('Hello from the middleware  👋👋👋')
//     req.requestTime = new Date().toISOString();
//     next();
// });
//End Middleware----

//Error express middleware
// app.use((err, req, res, next) => {
//     err.statusCode = err.statusCode || 500;
//     err.status = err.status || 'error';

//     res.status(err.statusCode).json({
//       status: err.status,
//       message: err.message,
//     });
//   });

//Simple Error handling middleware for all URL
// app.all('*', (req, res, next) => {
//   res.status(404).json({
//     status: 'fail',
//     message: `Can't find ${req.originalUrl} on this server.`,
//   });

//   next(err);
// });
