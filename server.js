import express from 'express';
import routes from './routes';

const app = express();

app.use(express.json());
app.use('/', routes);

app.listen(process.env.PORT || 5000,
  () => console.log('Server running on port 5000'));

export default app;
