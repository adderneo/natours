const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, message, statusCode, res) => {
  //Created JWT Token and added the parameters from config file.
  const token = signToken(user._id);

  //Remove the password from user -- Only for sign up
  user.password = undefined;

  //Send JWT via cookie //CookieOption Object
  const cookieOptions = {
    secure: false,
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN + 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  //Only in production secure option is true
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  //Set Cookie
  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
    message,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  //Using below we will store only those data which we need. not the additional data.
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createAndSendToken(newUser, 'User registered successfully', 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check email and password in req.body
  if (!email || !password) {
    //| return is very imp with to stop response twice
    return next(new AppError('Please provide email and password.', 400));
  }
  // 2. If email and password is exist then check password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }
  // 3. If everything is correct send the token to the client
  createAndSendToken(user, 'success', 200, res);
});

// Logout user
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

// A middleware to protect the router from unauthorized access
exports.protect = catchAsync(async (req, res, next) => {
  //1. Get the token from the request header if it exist by checking the header name and bearer both
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    //Store the token by splitting from bearer value using array method on the value
    token = req.headers.authorization.split(' ')[1];
    // Protect our route - read jwt from a cookie of the browser not Bearer
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  //Check if the header has token after bearer value
  if (!token) {
    return next(
      new AppError('you are not logged in. Please log in to get access.', 401)
    );
  }

  //2. Verification of the token - Node has a built in promisify function for asychronous jwt in the util library, topLine of code: by using destructuring we take only promisify
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3. Check if the user is still exist ??
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the this token does not exist.', 401)
    );
  }

  //4. Check if the user has changed the password after the token has issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed the password, Please login again',
        401
      )
    );
  }

  //Grant access to all the protected routes
  req.user = currentUser;
  //Locals for website
  res.locals.user = currentUser;
  next();
});

//To handle the menubar thing - just check the logged in status using the middleware
exports.loggedIn = async (req, res, next) => {
  //1. Get the token from the request header if it exist by checking the header name and bearer both

  if (req.cookies.jwt) {
    try {
      //2. Verification of the token - Node has a built in promisify function for asychronous jwt in the util library, topLine of code: by using destructuring we take only promisify
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //3. Check if the user is still exist ??
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      //4. Check if the user has changed the password after the token has issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //Grant access to all the protected routes - user is avilable to pug template
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array of user roles - very imp code !!!!!
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on posted email
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  //2. generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    //3. send email
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to registered email.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email.', 500));
  }
});

//Reset password functionlity with login
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. get the user based on the token useing req.param.token (token os defined in the router)
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2. If Token is valid, there is user and not expired then set the new password
  if (!user) {
    return next(
      new AppError('The user does not exist or Token is expired.', 400)
    );
  }

  //3. Remove the token and expires time.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //4. Log the user In (Send the JSON token to the client).
  createAndSendToken(user, 'Password Reset successfull', 201, res);
});

//Change password functionality for a logged in user //Always ask for the current Password for authentication.
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get user from the collection - The protect middleware has the object req.user.id
  const user = await User.findById(req.user.id).select('+password');

  //2. Check if posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Incorrect new password.', 401));
  }

  //3. if so, then update the password
  if (req.body.passwordCurrent !== req.body.password) {
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
  } else {
    return next(
      new AppError('Current password and new password cannot be same.', 401)
    );
  }

  await user.save();

  //4. Log user in send JWT
  createAndSendToken(user, 'Password changed.', 201, res);
});
