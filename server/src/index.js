const express = require('express')

 import { auth } from './routes';
import { index } from './routes'

const app = express();
app.use(express.urlencoded());

app.use(express.json());
app.use('/api/v1/', auth);

const appPort = 3000;
app.listen(
    appPort,
    () => console.log(`Listening on port ${appPort}...`),
);
