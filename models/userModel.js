const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// const validateEmail = function (email) {
//   const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
//   return re.test(email);
// };

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'The name is required'],
    trim: true,
    maxLength: [40, 'Name can have maximum 40 characters'],
    minlength: [5, 'Name can have maximum 5 characters'],
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: [true, 'The email address is required'],
    trim: true,
    maxLength: [40, 'email can have maximum 20 characters'],
    validate: [validator.isEmail, 'Please fill a valid email address'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Provide a password'],
    minLength: [8, 'Password must be longer than 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Provide confirm your password'],
    validate: {
      // This validation works only on create and save!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Password and confirm password should be same',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});
//Password encryption after receving and before saving database using middleware - create & update both due to save
userSchema.pre('save', async function (next) {
  //only run if password is modified
  if (!this.isModified('password')) return next();

  // bcryptjs npm - for password hashing uses a salt that no two password hash can be same
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

// A middleware to check if password is modified in reset password module then update the passwordChangedAt property
userSchema.pre('save', function (next) {
  //isNew is checks if document created for the first time.
  if (!this.isModified('password') || this.isNew) return next();
  // We are checkinh this property in login process if user has changes the password and passwordChangedAt is not in the future.
  // We put it back in a seconds in the past.
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

//Instance methods - That is available to all the documents of certain collection:
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    //console.log(JWTTimeStamp, changedTimeStamp);
    return JWTTimeStamp < changedTimeStamp; //comparing time in seconds
  }
  // false means NOT changed
  return false;
};

//Generate password reset token to reset password
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256', resetToken)
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

//Inctive users handling
userSchema.pre(/^find/, function (next) {
  //this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
