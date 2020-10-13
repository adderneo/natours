/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51Hb9S0DwBpAeFUH1Jt7YmJyxODZoYDniaL7ONVzROCkAYZEBxkdTPAJefLbcE3GHzihfzDHX9lYTR2vuIch5e48P00gJhwWNkC'
);

export const bookTour = async (tourId) => {
  try {
    //1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:8000/api/v1/bookings/checkout-session/${tourId}`
    );
    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    //console.log(err);
    showAlert('error', err);
  }
};
