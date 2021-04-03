import path from 'path';
import * as fs from 'fs';

import yaml from 'js-yaml';
import express from 'express';
import FabricCAService from 'fabric-ca-client';
import {
  Gateway,
  InMemoryWallet,
  X509WalletMixin
} from 'fabric-network';

const FABRIC_CA_URL = `http://0.0.0.0:7054`;
const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'password'

const router = express.Router();

const ca = new FabricCAService(FABRIC_CA_URL);

const createAdminGateway = async () => {
  const adminData = await ca.enroll({ enrollmentID: ADMIN_LOGIN, enrollmentSecret: ADMIN_PASSWORD });
  const admin_id = {
    label: 'client',
    certificate: adminData.certificate,
    privateKey: adminData.key.toBytes(),
    mspId: 'NAUKMA',
  };
  const wallet = new InMemoryWallet();
  const mixin = X509WalletMixin.createIdentity(admin_id.mspId, admin_id.certificate, admin_id.privateKey);
  await wallet.import(admin_id.label, mixin);
  const gateway = new Gateway();
  const connectionProfile = yaml.safeLoad(
    fs.readFileSync(path.resolve(__dirname, '../gateway/networkConnection.yaml'), 'utf8'),
  );
  await gateway.connect(connectionProfile, {
    identity: admin_id.label,
    wallet,
    discovery: { enabled: false, asLocalhost: true },
  });

  return gateway;
}

const registrationHandler = async (res, login, password, affiliation) => {
  if (!login || !password) {
    res.status(400).send({ error: 'Must provide login and password' })
    return
  }

  let gateway;
  try {
    gateway = await createAdminGateway();
  } catch (e) {
    res.status(400).send({ error: 'Could not connect to gateway' })
    return
  }
  const admin = await gateway.getCurrentIdentity();

  const secret = await ca.register({
    enrollmentID: login,
    enrollmentSecret: password,
    role: 'peer',
    affiliation: affiliation,
    maxEnrollments: -1,
  }, admin);

  let userData;
  try {
    userData = await ca.enroll({
      enrollmentID: login,
      enrollmentSecret: secret,
    });
  } catch (e) {
    res.status(400).send({ error: 'Invalid credentials, possibly the login is already taken' })
    gateway.disconnect();
    return
  }

  gateway.disconnect();
  res.status(201).json({
    login,
    certificate: userData.certificate,
    privateKey: userData.key.toBytes(),
  });
};

router.post('/student', (req, res) => registrationHandler(
  res,
  req.body.login,
  req.body.password,
  'naukma.student'
));

router.post('/teacher', (req, res) => registrationHandler(
  res,
  req.body.login,
  req.body.password,
  'naukma.teacher'
));

export default router;
