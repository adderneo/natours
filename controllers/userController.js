const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./factoryHandler');

// To use multer we need to create a multerstorage and a multer filter.
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     console.log(file.mimetype);
//     //Unique file name : user-id-timeStamp.ext
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

//above code is modified for resize and upload
const multerStorage = multer.memoryStorage();

// Check the file type
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload an image.', 404), false);
  }
};
//Multer upload upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
// This is final middleware
exports.uploadUserPhoto = upload.single('photo');

// Imaze Resize
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

// Users Handlers
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
//Don't update password with this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.createUser = (req, res) => {
  res.status(201).json({
    status: 'success',
    data: {
      message: 'This route is not defined, Please use sign up instead.',
    },
  });
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//Logged in user update data
exports.updateMe = catchAsync(async (req, res, next) => {
  //1. Create error if user post password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not allowed for password update, Please use /updatePassword',
        400
      )
    );
  }

  //2. If not then go on - We will create a filter for body so that unauthorized data can not be changed.
  const filterBody = filterObj(req.body, 'name', 'email');
  //Attach photo to the filter body so
  if (req.file) filterBody.photo = req.file.filename;
  //Update the user
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

//User want to Delete himself - soft delete
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
// End of user handler
