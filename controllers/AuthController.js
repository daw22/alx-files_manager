import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

async function getConnect(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ error: 'Authorization header missing' }).status(401);
  }
  const [authType, encodedCredentials] = authHeader.split(' ');
  if (authType !== 'Basic') {
    return res.json({ error: 'Authorization type error' }).status(401);
  }
  const decodedCredentials = Buffer.from(encodedCredentials, 'base64')
    .toString('utf-8');
  const [email, password] = decodedCredentials.split(':');
  const userColl = dbClient.client.db().collection('users');
  const user = await userColl.findOne({ email });
  if (!user) {
    return res.json({ error: 'Unauthorized' }).status(401);
  }
  const encodedPassword = sha1(password);
  if (encodedPassword === user.password) {
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    res.json({ token }).status(200);
  } else {
    return res.json({ error: 'Unauthorized' }).status(401);
  }
}

async function getDisconnect(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.json({ error: 'Unauthorized' }).status(401);
  }
  const userColl = dbClient.client.db().collection('users');
  const user = await userColl.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.json({ error: 'Unauthorized' }).status(401);
  }
  await redisClient.del(`auth_${token}`);
  return res.status(204).send();
}

export default { getConnect, getDisconnect };
