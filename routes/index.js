import express from 'express';
import AppController from '../controllers/AppController';
import UserController from '../controllers/UserController';

const routes = express.Router();

routes.get('/status', AppController.getStatus);
routes.get('/stats', AppController.getStats);
routes.post('/users', UserController.postNew);

export default routes;
