import express from 'express';
import FabricCAServices from 'fabric-ca-client';
import {Gateway, InMemoryWallet, X509WalletMixin} from 'fabric-network';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const router = express.Router();

const studentRegistration = async (req, res) => {
  return makeRegistration('student')(req, res);
};

const teacherRegistration = async (req, res) => {
  return makeRegistration('teacher')(req, res);
};

const makeRegistration = (type) => async (req, res) => {
  const {login, password} = req.body;
  const ca = new FabricCAServices('http://0.0.0.0:7054');
  let adminData;
  try {
    adminData = await ca.enroll({enrollmentId: 'admin', enrollmentSecret: 'password'});
  } catch (e) {
    res.status(404).json({
      message: e.message,
      error: "Failed to enroll admin",
    });
    return;
  }
  const identity = {
    label: 'client',
    certificate: adminData.certificate,
    privateKey: adminData.key.toBytes(),
    mspId: 'NAUKMA',
  };

  const wallet = new InMemoryWallet();
  const mixin = X509WalletMixin.createIdentity(identity.mspId, identity.certificate, identity.privateKey);
  await wallet.import(identity.label, mixin);
  const gateWay = new Gateway();
  const connectionProfile = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, '../gateway/networkConnection.yaml'), 'utf8'));
  const connectionOptions = {
    identity: identity.label,
    wallet,
    discovery: {enabled: false, asLocalhost: true},
  };

  try {
    await gateWay.connect(connectionProfile, connectionOptions);
  } catch (e) {
    res.status(500).json({
      message: e.message,
      error: "Failed to connect",
    });
    return;
  }
  const admin = gateWay.getCurrentIdentity();

  try {
    await ca.register({
      enrollmentID: login,
      enrollmentSecret: password,
      role: 'peer',
      affiliation: `naukma.${type}`,
      maxEnrollments: -1,
    }, admin);
  } catch (e) {
    res.status(500).json({
      message: e.message,
      error: "Failed to register",
    });
    return;
  }

  try {
    const userData = await ca.enroll({enrollmentID: login, enrollmentSecret: password});

    gateWay.disconnect();

    res.status(201).json({
      login: login,
      certificate: userData.certificate,
      privateKey: userData.key.toBytes(),
    });
  } catch (e) {
    res.status(404).json({
      message: e.message,
      error: "Failed to get user",
    });
  }
};

router.post('/teacher', teacherRegistration);

router.post('/student', studentRegistration);

export default router;
