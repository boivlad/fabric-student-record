import express from 'express'
// import './models';
import { auth } from './routes';

const app = express();
app.use(express.urlencoded());

app.use(express.json());
app.use(express.static(__dirname + '/views'))

app.use('/api/v1/', auth);
app.get('/api/v1/', (req, res) => res.sendFile(__dirname +'/views/dashboard.html'));
app.get('/api/v1/signup-teacher', (req, res) => res.sendFile(__dirname +'/views/student-registration.html'));
app.get('/api/v1/signup-student', (req, res) => res.sendFile(__dirname +'/views/teacher-registration.html'));

const appPort = 3000;
app.listen(
    appPort,
    () => console.log(`Listening on port ${appPort}...`),
);
