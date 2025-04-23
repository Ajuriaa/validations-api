import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import { router as validationRouter } from './api/validations.api';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api', validationRouter);
app.use(express.json());

const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH || ''),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH || '')
};

const port = 5702;

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`El api de validaciones está corriendo en el puerto ${port}`);
});
