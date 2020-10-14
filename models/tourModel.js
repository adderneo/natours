const mongoose = require('mongoose');
const slugify = require('slugify');
//const validator = require('validator'); - Third party validator

//Schema creation for the tour collection
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: [true, 'A tour must have a unique name'],
      trim: true,
      maxlength: [40, 'A tour name can have maximum 40 character'],
      minlength: [10, 'A tour name must have minimum 10 character'],
      //   validate: [
      //     validator.isAlpha,
      //     'Tour name must contain character',
      //   ],
    },
    slug: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maxGroupSize'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be one of "easy", "medium", "difficult"',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Ratings must be above 0'],
      max: [5, 'Ratings must be less than or equal to 5'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      //Custom validator
      type: Number,
      validate: {
        //this only points current doc on New document creation
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price: {VALUE} should be less the retail price.',
      },
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have an imageCover'],
    },
    images: [],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
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

//Create indexing
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dshphere' });

//Virtual properties -- called above in schema
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate for parent referencing for reviews
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//mongoose document middleware, runs before - .save() and .create
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, {
    lower: true,
  });
  next();
});
//Embedding code
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(
//     async (id) => await User.findById(id)
//   );
//   this.guides = await Promise.all(guidesPromises);
// });

//Referencing document
//--Check mongoose scheme -- Inguide

// tourSchema.pre('save', function (next) {
//   console.log('willing to save');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//mongoose Query middleware //using regex it's for all type of find
tourSchema.pre(/^find/, function (next) {
  this.find({
    secretTour: {
      $ne: true,
    },
  });
  //time taken by query to execute
  this.start = Date.now();
  next();
});

//Populate middleware for reference documents
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

//Console log for query exceution time
// tourSchema.post(/^find/, function (docs, next) {
//   //console.log(docs);
//   console.log(`Query took ${Date.now() - this.start} millisecond`);
//   next();
// });

////Aggregation middleware -------------
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({
//     $match: {
//       secretTour: {
//         $ne: true,
//       },
//     },
//   });
//   next();
// });

//Model for the tour schema
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;

/*
//This is a new document created on Tour model
const testTour = new Tour({
    name: 'The Forest Hike',
    price: 699,
});
//To save a document to the collection use save() method
testTour
    .save()
    .then((doc) => {
        console.log(doc);
    })
    .catch((err) => {
        console.log(err);
    });
*/
