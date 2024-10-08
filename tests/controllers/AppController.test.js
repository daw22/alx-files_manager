import { request, expect, assert } from '../test-helper';
import dbClient from '../../utils/db';

describe('AppController', () => {
  before((done) => {
    const usersColl = dbClient.client.db().collection('users');
    const filesColl = dbClient.client.db().collection('files');
    Promise.all([usersColl.deleteMany({}), filesColl.deleteMany({})])
      .then((res) => {
        done();
      });
  });

  describe('App status', () => {
    it('GET /status', (done) => {
      request.get('/status')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.deep.eql({ redis: true, db: true });
          done();
        });
    });
  });

  describe('App stats', () => {
    it('GET /stats', (done) => {
      request.get('/stats')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.deep.eql({ users: 0, files: 0 });
          done();
	});
    });
    it('GET /stats afert adding user and file', (done) => {
      const usersColl = dbClient.client.db().collection('users');
      const filesColl = dbClient.client.db().collection('files');
      Promise.all([
        usersColl.insertOne({ email: 'john@mail.com' }),
        filesColl.insertMany([
          { name: 'foo.txt', type: 'file' },
          { name: 'bar.png', type: 'image' },
        ])
      ])
      .then(() => {
        request.get('/stats')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.deep.eql({ users: 1, files: 2 });
          done();
	});
      });
    });
  });
});
