import express from 'express';
import { getRoutes, getValidations, getVehicles } from './queries';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

router.get('/validations', async (req, res) => {
  try {
    const data = await getValidations(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error in validations route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/vehicles', async (req, res) => {
  getVehicles().then((data) => {
    res.json(data);
  });
});

router.get('/routes', async (req, res) => {
  try {
    const data = await getRoutes(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error in routes route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mutations
// router.post('/create-product', async (req, res) => {
//   createProduct(req.body).then((data) => {
//     res.json(data);
//   });
// });

