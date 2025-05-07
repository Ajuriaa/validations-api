import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import { router as validationRouter } from './api/validations.api';

const app = express();

// ✅ Configura JSON y URL-encoded con límite desde express
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Habilita CORS
app.use(cors());
app.options('*', cors());

// ✅ Tus rutas
app.use('/api', validationRouter);

// ✅ HTTPS options
const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH || ''),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH || '')
};

const port = 5702;

https.createServer(app).listen(port, () => {
  console.log(`El api de validaciones está corriendo en el puerto ${port}`);
});
