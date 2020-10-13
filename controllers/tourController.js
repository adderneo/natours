const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./factoryHandler');
const AppError = require('../utils/appError');

//Tour images update module
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
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

//For Single Image upload: req.file
//upload.single('image');
//For multiple images at once: req.files
//upload.array('images', 5);

// Imaze Resize
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  //Cover Image

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  //For rest images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );

  next();
});

//Top 5 Tour
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// Tour handlers
exports.createTour = factory.createOne(Tour);
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// catchAsync(async (req, res, next) => {
//   //2-Execute Query
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;
//   //Query will be like chain of select().sort().limit() etc....
//   res.status(200).json({
//     status: 'success',
//     result: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

//exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   //Tour.findOne( {_id: req.params.id });
//   //If no tour then return
//   if (!tour) {
//     return next(new AppError('No tour found with that id', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

//exports.updateTour = factory.updateOne(Tour);
//  = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   // console.log(tour);
//   // if (!tour) {
//   //   return next(
//   //     new AppError('No tour found with that id', 404)
//   //   );
//   // }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

//Replaced delete handler with handler factory
//exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   await Tour.findByIdAndDelete(req.params.id);

//   res.status(204).json({
//     status: 'success',
//     message: 'Tour Deleted',
//   });
// });

// tours-within?distance=30&centre=40,45&units=mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; //mongo takes distance in radius
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide the lattitude and longitude in the format of lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, //defined in lng lat
  });

  res.status(200).json({
    result: tours.length,
    status: 'success',
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide the lattitude and longitude in the format of lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    result: distances.length,
    data: {
      data: distances,
    },
  });
});

// End of tour handler

//Aggregation Pipeline
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: {
          $gte: 4.5,
        },
      },
    },
    {
      $group: {
        //Group by options
        //_id: null,
        _id: {
          $toUpper: '$difficulty',
        },
        //_id: '$ratingsAverage',
        numTours: {
          $sum: 1,
        },
        numRatings: {
          $sum: '$ratingsQuantity',
        },
        averageRating: {
          $avg: '$ratingsAverage',
        },
        averagePrice: {
          $avg: '$price',
        },
        minPrice: {
          $min: '$price',
        },
        maxPrice: {
          $max: '$price',
        },
      },
    },
    {
      $sort: {
        averagePrice: 1,
      },
    },
    // {
    //     $match: {
    //         _id: {
    //             $ne: 'EASY'
    //         }
    //     }
    // }
  ]);
  res.status(200).json({
    status: 'success',
    stats,
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          $month: '$startDates',
        },
        numTourStarts: {
          $sum: 1,
        },
        tour: {
          $push: '$name',
        },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: {
        numTourStarts: -1,
      },
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    plan,
  });
});

//--------------------------------------------------------//
//Write File fn
/*  fs.writeFile(
          `${__dirname}/dev-data/data/tours-simple.json`,
          JSON.stringify(tours),
          (err) => {
              res.status(201).json({
                  status: 'success',
                  data: {
                      tour: newTour,
                  },
              });
          }
      );
*/

//Read File fn
/*
const tours = JSON.parse(
    fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);
*/

/*
// Param-Middleware to check id parameter
exports.checkId = (req, res, next, val) => {
    console.log(`Tour id is: ${ val }`);
    console.log(req.params);
    if (req.params.id * 1 > tours.length) {
        return res.status(404).json({
            status: 'Fail',
            message: 'Invalid ID'
        });
    }
    next();
};
// End of param-middleware - called separetely in tourRoute
*/

/*
// Req.body middleware to check body params
exports.checkBody = (req, res, next) => {
    console.log(req.body);
    if (!req.body.name || !req.body.price) {
        return res.status(400).json({
            status: 'Fail',
            message: 'Missing name or price'
        });
    }
    next();
};
// End of req.body-middleware - this method is added in tourRoute '/' post method to execute
*/
/*
   //Read query string parameters from URL
        //console.log(req.query); //Returns an object
        //End
        //Simple way to query the database
        const tours = await Tour.find(req.query);
        //End
        //Smart way to query the database using mongoose
        // const tours = await Tour.find()
        //     .where('duration')
        //     .equals(5)
        //     .where('difficulty')
        //     .equals('easy');
        //END
*/

/*
exports.getAllTours = async (req, res) => {
    try {
        //Filtering
        // Create query object - ES6 Destructuring - We are storing it to the queryObj because we don't want to mutate the req.query object
        const queryObj = {
            ...req.query,
        };
        // Filter -1A Exclude other parameters from query object
        const excludeFields = [
            'page',
            'sort',
            'limit',
            'fields',
        ];
        //Loop through query object and delete all excludeFields
        excludeFields.forEach((el) => delete queryObj[el]);

        //Filter 1B - Advance filtering - using javascript stringify to convert the object
        let queryStr = JSON.stringify(queryObj);
        queryStr = JSON.parse(
            queryStr.replace(
                /\b(gte|gt|lte|lt)\b/g,
                (match) => `$${match}`
            )
        );

        //How query works in mongoose
        //1-First we build the query
        let query = Tour.find(queryStr);

        //Feature - 1. Sorting (If any sorting then filter by param (param1,param2 etc) else default sort by date.
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        //Feature - 2. Fields limiting //It is also called projection //In else we don't want to send __v because mongo use it internally
        if (req.query.fields) {
            const fields = req.query.fields.split(',').join(' ');
            query = query.select(fields);
        } else {
            // We can also exclude a field from the schema by setting the select property to false.
            query = query.select('-__v');
        }

        //Feature - 3. Pagination //page field and limit i.e. page limit
        const page = req.query.page * 1 || 1;
        const limit = req.query.limit * 1 || 5;
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);

        if (req.query.page) {
            const numTours = await Tour.countDocuments();
            //console.log(numTours);
            if (skip >= numTours)
                throw new Error('This page does not exist.');
        }

        //console.log(query);

        //2-Execute Query
        // const features = new APIFeatures(Tour.find(), req.query)
        //     .filter()
        //     .sort()
        //     .limitFields()
        //     .paginate();

        const tours = await Tour.find();
        //Query will be like chain of select().sort().limit() etc....
        res.status(200).json({
            status: 'success',
            result: tours.length,
            data: {
                tours,
            },
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Failed to read the document',
        });
    }
};
*/
