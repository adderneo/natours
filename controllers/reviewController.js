const Review = require('../models/reviewModel');
const factory = require('./factoryHandler');

exports.setTourUserIds = (req, res, next) => {
  //Allow nested routes in predefined route
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

//Review handlers
exports.createReview = factory.createOne(Review);
exports.getReview = factory.getOne(Review);
exports.getAllReviews = factory.getAll(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);

// catchAsync(async (req, res, next) => {
//   const review = await Review.findById(req.params.id);
//   //Tour.findOne( {_id: req.params.id });
//   //If no tour then return
//   if (!review) {
//     return next(new AppError('No review found with that id', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       review,
//     },
//   });
// });

//exports.getAllReviews = factory.getAll(Review);

// catchAsync(async (req, res, next) => {
//   //Handle the request of all reviews for a specific tour using filter object, mergeParams & handler
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   //2-Execute Query
//   const features = new APIFeatures(Review.find(filter), req.query)
//     .sort()
//     .limitFields()
//     .paginate();

//   const reviews = await features.query;
//   //Query will be like chain of select().sort().limit() etc....
//   res.status(200).json({
//     status: 'success',
//     result: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });
