import express from 'express';
import { getRoutes, getValidations, getVehicles } from './queries';
import { createVehicle, updateVehicle } from './mutations';

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
  try {
    const data = await getVehicles(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error in vehicles route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
router.post('/create-vehicle', async (req, res) => {
  try {
    const data = await createVehicle(req.body);
    res.json(data);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

router.post('/update-vehicle', async (req, res) => {
  updateVehicle(req.body.id, req.body.data).then((data) => {
    res.json(data);
  });
});

