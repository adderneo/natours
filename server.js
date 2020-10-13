const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Uncaught exception
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log(
    'Uncaught exception: 🚀🚀🚀🚀🚀Shutting down the application.'
  );
  process.exit(1);
});

// To read the config file by dotenv varible
dotenv.config({
  path: './config.env',
});

const app = require('./app.js');

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

/*
//This env varible is set by the express
console.log(app.get('env'));
//This env varible is set by the Node
console.log(process.env);
*/

//Server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on ${port}....`);
});

//Unhandled rejection -Process object emit unhadled rejection
process.on('unhandledRejection', (err) => {
  console.log(`${err.name}, ${err.message}`);
  console.log(
    'Unhandled rejection: 🚀🚀🚀🚀🚀Shutting down the application.'
  );
  //Shut down the application -0 success, -1 uncalled exception - We user server.close to complete the pending task and close the process softly
  server.close(() => {
    process.exit(1);
  });
});
