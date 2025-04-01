import express from 'express';
import { getValidations } from './queries';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

router.get('/validations', async (req, res) => {
  getValidations().then((data) => {
    res.json(data);
  });
});

// router.get('/supplier/:id', async (req, res) => {
//   getSupplier(req.params.id).then((data) => {
//     res.json(data);
//   });
// });


// Mutations
// router.post('/create-product', async (req, res) => {
//   createProduct(req.body).then((data) => {
//     res.json(data);
//   });
// });

