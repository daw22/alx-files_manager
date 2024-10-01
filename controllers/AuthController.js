import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

async function getConnect(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  const [authType, encodedCredentials] = authHeader.split(' ');
  if (authType !== 'Basic') {
    return res.status(401).json({ error: 'Authorization type error' });
  }
  const decodedCredentials = Buffer.from(encodedCredentials, 'base64')
    .toString('utf-8');
  const [email, password] = decodedCredentials.split(':');
  const userColl = dbClient.client.db().collection('users');
  const user = await userColl.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const encodedPassword = sha1(password);
  if (encodedPassword === user.password) {
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    return res.status(200).json({ token });
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

async function getDisconnect(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userColl = dbClient.client.db().collection('users');
  const user = await userColl.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await redisClient.del(`auth_${token}`);
  return res.status(204).send();
}

export default { getConnect, getDisconnect };
