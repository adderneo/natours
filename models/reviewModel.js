const mongoose = require('mongoose');
const Tour = require('./tourModel');

//Schema creation for the tour collection
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: [1, 'Ratings must be above 0.'],
      max: [5, 'Ratings must be less than or equal to 5.'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to an user.'],
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

//One user One Tour One Review
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//Parent referencing example
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'tour',
    select: '-guides name',
  }).populate({
    path: 'user',
    select: '_id, name',
  });
  next();
});

//Calculate the rating each time a review is saved/updated - use statics function
reviewSchema.statics.calcAverageRating = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//Write a middleware to save the avg in the same in tour document
reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.tour);
});

//Update the tour avg using middleware: findByAndUpdate and findByIdAndDelete - We use findOneAnd
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});
//Now get the tour id from above function and updtae the average review using post
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRating(this.r.tour._id);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
