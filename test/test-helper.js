import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);

const request = chai.request(app).keepOpen();
const expect = chai.expect;
const assert = chai.assert;

export { request, expect, assert };
