const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// To read the config file by dotenv varible
dotenv.config({
  path: './config.env',
});

//Connection string and password from config.env
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
//Database connection using mongoose
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    //console.log(con.connections);
    console.log('DB Connection Successfull');
  });

//Read file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf8')
);

// Data Import from file to database
const importData = async () => {
  try {
    await Tour.create(tours, { validateBeforeSave: false });
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data Import Successfull');
    //console.log(result);
    process.exit();
  } catch (err) {
    //console.log(err);
  }
  process.exit();
};

// Delete all data
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    //console.log('Data Deleted');
    //console.log(result);
  } catch (err) {
    //console.log(err);
  }
  process.exit();
};

//Use process.argv array to import or delete data based on arguement in the script.
// Script to import and delete data using command line: node dev-data/data/import-dev-data.js --import / --delete
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

//console.log(process.argv);
