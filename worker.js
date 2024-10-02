import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { writeFile } from 'fs';
import { ObjectId } from 'mongodb';
import imgThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const writeFileAsync = promisify(writeFile);

const fileQueue = new Queue('thumbnail maker');

const generateThumbnail = async (filePath, size) => {
  console.log(filePath, size);
  const buffer = await imgThumbnail(filePath, { width: size });
  console.log(`Generating file: ${filePath}, size: ${size}`);
  return writeFileAsync(`${filePath}_${size}`, buffer);
};

fileQueue.process(async (job, done) => {
  const fileId = job.data.fileId || null;
  const userId = job.data.userId || null;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }
  console.log('Processing', job.data.name || '');
  const filesColl = dbClient.client.db().collection('files');
  const file = await filesColl.findOne({
    _id: new ObjectId(fileId),
    userId,
  });
  if (!file) {
    throw new Error('File not found');
  }
  const sizes = [500, 250, 100];
  Promise.all(sizes.map((size) => generateThumbnail(file.localPath, size)))
    .then(() => {
      done();
    });
});
