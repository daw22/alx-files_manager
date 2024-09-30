import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Missing password' });
  }
  const db = dbClient.client;
  const collection = db.db().collection('users');
  const userExist = await collection.findOne({ email });
  if (userExist) {
    return res.status(400).json({ error: 'Already exist' });
  }
  const hashedPassword = sha1(password);
  const newUser = await collection.insertOne({
    email,
    password: hashedPassword,
  });
  return res.status(201).json({ id: newUser.insertedId, email });
}

async function getMe(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userColl = dbClient.client.db().collection('users');
  const user = await userColl.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.status(401).json({ error: 'Unauthirized' });
  }
  return res.json({ id: user._id, email: user.email });
}

export default { postNew, getMe };
