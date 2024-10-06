import { request, expect } from '../test-helper';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';
import { ObjectId } from 'mongodb';
import sha1 from 'sha1';

describe('FilesController', () => {
  let filesColl, usersColl, fileId, userId;
  before(async () => {
    filesColl = dbClient.client.db().collection('files');
    usersColl = dbClient.client.db().collection('users');
    await usersColl.deleteMany({});
    await filesColl.deleteMany({});
    const hashPwd = sha1('test123');
    let user = await usersColl.insertOne(
      { email: 'test@user.com', password: hashPwd }
    );
    user = user.ops[0];
    userId = user._id;
    await redisClient.set('auth_faketoken', userId.toString(), 60);
  });

  after(async () => {
    await filesColl.deleteMany({});
    await usersColl.deleteMany({});
    await redisClient.del('auth_faketoken');
  });

  describe('POST /files', () => {
    it('posts a file', (done) => {
      const fileContent = Buffer.from('file content').toString('base64');
      request.post('/files')
        .set('x-token', 'faketoken')
        .set('Content-Type', 'application/json')
        .send({ "name": "myText.txt",
		"type": "file",
		"data": fileContent })
        .end((err, res) => {
          expect(err).to.be.null;
	  expect(res).to.have.status(201);
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('name');
          expect(res.body).to.have.property('type');
          expect(res.body).to.have.property('userId');
          expect(res.body).to.have.property('isPublic');
          expect(res.body).to.have.property('parentId');
	  expect(res.body.userId).to.equal(`${userId}`);
          expect(res.body.isPublic).to.equal(false);
          expect(res.body.parentId).to.equal(0);
	  fileId = res.body.id;
          done();
	});
    });
  });

  describe('GET /files/:id', () => {
    it('get file by id', (done) => {
       request.get(`/files/${fileId}`)
        .set('Content-Type', 'application/json')
        .set('X-Token', 'faketoken')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('name');
          expect(res.body).to.have.property('type');
          expect(res.body).to.have.property('userId');
          expect(res.body).to.have.property('isPublic');
          expect(res.body).to.have.property('parentId');
	  expect(res.body.userId).to.equal(`${userId}`);
          expect(res.body.isPublic).to.equal(false);
          expect(res.body.parentId).to.equal(0);
          done();
	});
    });
  });

  describe('GET /files', () => {
    it('gets a list of files', (done) => {
      request.get('/files')
        .set('Content-Type', 'application/json')
        .set('X-Token', 'faketoken')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.lengthOf(1);
	  done();
	});
    });

    it('get a list of files with pagination - page 0', (done) => {
      request.get('/files?page=0')
        .set('Content-Type', 'application/json')
        .set('X-Token', 'faketoken')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.be.lengthOf(1);
	  done();
	});
    });

    it('get a list of files with pagination - page 1', (done) => {
      request.get('/files?page=1')
        .set('Content-Type', 'application/json')
        .set('X-Token', 'faketoken')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.be.lengthOf(0);
	  done();
	});
    });

  });

  describe('PUT files/:id/publish and unpublish files', () => {
    it('publishes a file', (done) => {
      request.put(`/files/${fileId}/publish`)
      .set('Content-Type', 'application/json')
      .set('X-Token', 'faketoken')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('isPublic');
        expect(res.body.isPublic).to.equal(true);
        done();
      });
    });

    it('unpublishes a file', (done) => {
      request.put(`/files/${fileId}/unpublish`)
        .set('Content-Type', 'application/json')
        .set('X-Token', 'faketoken')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.isPublic).to.equal(false);
          done();
	});
    });
  });

  describe('GET /files/:id/data', () => {
    it('get file content', (done) => {
      request.get(`/files/${fileId}/data`)
        .set('Content-Type', 'application/json')
        .set('X-Token', 'faketoken')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.equal('file content');
          done();
	});
    });

    it('gets published file without token/authorization', async () => {
      await filesColl.updateOne(
        { _id: new ObjectId(fileId) },
        { $set: { isPublic: true } },
      );
      request.get(`/files/${fileId}/data`)
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.equal('file content');
	});
    });

    it('tries to get unpublished file without token', async () => {
      await filesColl.updateOne(
        { _id: new ObjectId(fileId) },
        { $set: { isPublic: false } },
      );
      request.get(`/files/${fileId}/data`)
        .set('Content-Type', 'application/json')
        .then((res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.deep.equal({ error: 'Not found' });
	});
    });

    it('tries to get unpublished file without being the owner', async () => {
      await filesColl.updateOne(
        { _id: new ObjectId(fileId) },
        { $set: { isPublic: false } },
      );
      const hashPwd = sha1('new123');
      const newUser = await usersColl.insertOne(
        { email: 'new@user.com', password: hashPwd }
      );
      await redisClient.set('newfaketoken', newUser._id, 60);
      request.get(`/files/${fileId}/data`)
        .set('Content-Type', 'application/json')
        .set('X-Token', 'newfaketoken')
        .then((res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.deep.equal({ error: 'Not found' });
	});
    });
  });
});
