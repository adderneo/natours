const AppError = require('../utils/appError');

// handle JSON web token error
const handleJsonWebTokenError = () =>
  new AppError('Invalid token, Please log in again', 401);

// handle expired token error
const handleTokenExpiredError = () =>
  new AppError(
    'Token has Expired, Please log in again',
    401
  );

//Handle db errors - i.e cast, duplicate
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}.`;
  return new AppError(message, 404);
};
const handleDuplicateErrorDB = (err) => {
  //Match a db error string using regex.
  // const value = err.errmsg.match(
  //   /(["'])(?:(?=(\\?))\2.)*?\1/
  // );
  const message = `Duplicate tour name: '${err.keyValue.name}', Please use another name.`;
  return new AppError(message, 404);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(
    (el) => el.message
  );
  const message = `Invalid input data: ${errors.join(
    ', '
  )}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  //A For API in Development mode
  if(req.originalUrl.startsWith('/api')){
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //B Rendered Website development mode
  console.error('Error 🧨💥💥💥💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  //API in production
  if(req.originalUrl.startsWith('/api')){
    //Oprational error, trusted error: send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //Programming  error, send generic message to the client
    // Log error
    console.error('Error 🧨💥💥💥💥', err);
    //Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong.',
    });
  }

  // B for website in production
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Error',
      msg: err.message,
    });
  }
  //Programming  error, send generic message to the client
  //Log error
  console.log('Error 🧨💥💥💥💥', err);
  //Send generic message
  return res.status(err.statusCode).render('error', {
  title: 'Error',
  msg: 'Please try again later!',
  });
};

//Error handler

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError')
      error = handleCastErrorDB(error);

    if (error.code === 11000)
      error = handleDuplicateErrorDB(error);

    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    if (error.name === 'JsonWebTokenError')
      error = handleJsonWebTokenError();

    if (error.name === 'TokenExpiredError')
      error = handleTokenExpiredError();

    sendErrorProd(error, req, res);
  }
};
