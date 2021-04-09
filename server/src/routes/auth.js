import express from 'express';
import FabricCAServices from 'fabric-ca-client';
import {Gateway, InMemoryWallet, X509WalletMixin} from 'fabric-network'
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const router = express.Router();
let userData;
const studentRegistration = async (req, res) => {
 /* let caInfo = yaml.safeLoad(fs.readFileSync('../gateway/fabric-ca-client-config.yaml', 'utf8'));
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);*/
  return signup('student')(req, res);
};

const teacherRegistration = async (req, res) => {
  /* let caInfo = yaml.safeLoad(fs.readFileSync('../gateway/fabric-ca-client-config.yaml', 'utf8'));
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);*/
  return signup('teacher')(req, res);
};

const signup = (type) => {
  return async (req, res) => {
    const {login, password} = req.body;
    const ca = new FabricCAServices('http://0.0.0.0:7054');
    let adminData;
    try {
      adminData = await ca.enroll({enrollmentId: 'admin', enrollmentSecret: 'password'});
    } catch (e) {
      await res.status(404).json({
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
    } catch (connErr) {
      //console.error('Failed to connect to gateway: ' + connErr);
      res.status(500).send('Connection failed: ' + connErr);
      return;
    }
    const admin = gateWay.getCurrentIdentity();

    try {
      await ca.register({
        enrollmentID: login,
        enrollmentSecret: password,
        affiliation: `NAUKMA.${type}`,
        role: 'peer',
        maxEnrollments: -1,
      }, admin);
    } catch (registerErr) {
      res.status(500).send('Failed to register user: ' + registerErr);
      return;
    }


    try {
      userData = await ca.enroll({enrollmentID: login, enrollmentSecret: password});
    } catch (enrollmentErr) {
      console.error('Failed to enroll user: ' + enrollmentErr);
      res.status(500).send('Failed to enroll user: ' + enrollmentErr);
    }
    gateWay.disconnect();

    await res.status(201).json({
      login: login,
      certificate: userData.certificate,
      privateKey: userData.key.toBytes(),
    });
  };
};

router.post('/teacher', teacherRegistration);

router.post('/student', studentRegistration);

export default router;