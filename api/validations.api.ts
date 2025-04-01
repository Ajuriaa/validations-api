import express from 'express';
import { getRoutes, getValidations, getVehicles } from './queries';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

router.get('/validations', async (req, res) => {
  getValidations(req.params).then((data) => {
    res.json(data);
  });
});

router.get('/vehicles', async (req, res) => {
  getVehicles().then((data) => {
    res.json(data);
  });
});

router.get('/routes', async (req, res) => {
  getRoutes().then((data) => {
    res.json(data);
  });
});

// Mutations
// router.post('/create-product', async (req, res) => {
//   createProduct(req.body).then((data) => {
//     res.json(data);
//   });
// });

