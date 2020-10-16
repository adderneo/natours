// Multer is a middleware for handling multipart/form-data
const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get('/', authController.loggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.loggedIn, viewsController.getTour);
router.get('/login', authController.loggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get(
  '/my-tours',
  //bookingController.createBookingCheckout,
  authController.protect,
  viewsController.getMyTours
);

// A separate route for receving html form URL encoded data - Normal method to update the data
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
