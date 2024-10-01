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

async function getShow(req, res) {
  const token = req.headers['x-token'];
  const fileId = req.params.id;
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const filesColl = dbClient.client.db().collection('files');
  const file = await filesColl.findOne({ _id: new ObjectId(fileId) });
  if (!file) return res.status(404).json({ error: 'Not found' });
  if (file.userId !== userId) {
    return res.status(404).json({ error: 'Not found' });
  }
  delete file.localPath;
  const id  = file._id;
  delete file._id;
  return res.status(200).json({ id, ...file });
}

async function getIndex(req, res) {
  const token = req.headers['x-token'];
  const parentId = req.query.parentId || 0;
  const page = req.query.page || 0;
  const ITEMS_PER_PAGE = 1;
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const filter = { parentId };
  const filesColl = dbClient.client.db().collection('files');
  const files = await filesColl.aggregate([
    { $match: filter },
    { $sort: { _id: -1 } },
    { $skip: page * ITEMS_PER_PAGE },
    { $limit: ITEMS_PER_PAGE },
    {
      $project: {
        _id: 0,
        id: '$_id',
        userId: '$userId',
        name: '$name',
        type: '$type',
        isPublic: '$isPublic',
        parentId: '$parentId',
      },
    },
  ]).toArray();
  return res.status(200).json(files);
}

async function putPublish(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const fileId = req.params.id;
  const filesColl = dbClient.client.db().collection('files');
  const file = await filesColl.findOne({ _id: new ObjectId(fileId) });
  if (!file || file.userId !== userId) {
    return res.status(404).json({ error: 'Not found' });
  }
  const updatedFile = await filesColl.findOneAndUpdate(
    { _id: new ObjectId(fileId) },
    { $set: { isPublic: true } },
    { returnOriginal: false },
  );
  delete updatedFile.value.localPath;
  const id = updatedFile.value._id;
  delete updatedFile.value._id;
  const returnFile = { id, ...updatedFile.value };
  return res.status(200).json(returnFile);
}

async function putUnpublish(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const fileId = req.params.id;
  const filesColl = dbClient.client.db().collection('files');
  const file = await filesColl.findOne({ _id: new ObjectId(fileId) });
  if (!file || file.userId !== userId) {
    return res.status(404).json({ error: 'Not found' });
  }
  const updatedFile = await filesColl.findOneAndUpdate(
    { _id: new ObjectId(fileId) },
    { $set: { isPublic: false } },
    { returnOriginal: false },
  );
  delete updatedFile.value.localPath;
  const id = updatedFile.value._id;
  delete updatedFile.value._id;
  const returnFile = { id, ...updatedFile.value };
  return res.status(200).json(returnFile);
}

export default {
  postUpload, getShow, getIndex, putPublish, putUnpublish,
};
