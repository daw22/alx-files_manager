import dbClient from '../utils/db';
import redisClient from '../utils/redis';

function getStatus(req, res) {
  return res.json({
    redis: redisClient.isAlive(),
    db: dbClient.isAlive(),
  }).status(200);
}

async function getStats(req, res) {
  return res.json({
    users: await dbClient.nbUsers(),
    files: await dbClient.nbFiles(),
  }).status(200);
}

export default { getStatus, getStats };
