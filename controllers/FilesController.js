import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

async function postUpload(req, res) {
  const token = req.headers['x-token'];
  const {
    name, type, data, parentId = 0, isPublic = false,
  } = req.body;
  const allowedTypes = ['folder', 'file', 'image'];
  const filesColl = dbClient.client.db().collection('files');

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.json({ error: 'Unauthorized' }).status(401);
  if (!name) return res.json({ error: 'Missing name' }).status(400);
  if (!type || !(allowedTypes.includes(type))) {
    return res.json({ error: 'Missing type' }).status(400);
  }
  if (!data && type !== 'folder') {
    return res.json({ error: 'Missing data' }).status(400);
  }
  if (parentId) {
    const parentFolder = await filesColl.findOne({
      _id: new ObjectId(parentId),
    });
    if (!parentFolder) {
      return res.json({ error: 'Parent not found' }).status(400);
    }
    if (parentFolder.type !== 'folder') {
      return res.json({ error: 'Parent is not a folder' }).status(400);
    }
  }
  const doc = {
    userId,
    name,
    type,
    isPublic,
    parentId,
  };
  if (type === 'folder') {
    const savedDoc = await filesColl.insertOne(doc);
    return res.json(savedDoc.ops[0]).status(201);
  }
  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  const fileName = uuidv4();
  const filePath = path.resolve(folderPath, fileName);
  const fileContent = Buffer.from(data, 'base64').toString('utf-8');
  fs.mkdir(folderPath, { recursive: true }, (err) => (
    err ? res.json({ error: 'unable to save file' }) : {}
  ));
  fs.writeFile(filePath, fileContent, (err) => (
    err ? res.json({ error: 'unable to save file' }) : {}
  ));
  const savedDoc = await filesColl.insertOne({ ...doc, localPath: filePath });
  const result = savedDoc.ops[0];
  delete result.localPath;
  return res.json(result).status(201);
}

export default { postUpload };
