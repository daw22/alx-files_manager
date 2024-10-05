import { request, expect } from '../test-helper';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';

describe('FilesConroller', () => {
  let filesColl, usersColl, fileId, userId;
  before(async () => {
    filesColl = dbClient.client.db().collection('files');
    usersColl = dbClient.client.db().collection('users');
    let user = await usersColl.insertOne(
      { email: 'test@user.com', password: 'test123' }
    );
    user = user.ops[0];
    userId = user._id;
    await redisClient.set('auth_faketoken', user._id.toString(), 60);
    await filesColl.deleteMany({});
  });

  after(async () => {
    await filesColl.deleteMany({});
    await usersColl.deleteMany({});
    await redisClient.del('auth_faketoken');
  });

  describe('POST /files', () => {
    it('posts a file of type file', (done) => {
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
          done();
	});
    });
  });
});
