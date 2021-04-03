import express from 'express';
import FabricCAServices from 'fabric-ca-client';
import {Gateway, InMemoryWallet, X509WalletMixin} from 'fabric-network';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const router = express.Router();
const memberRegistration = async (req, res, teacherRole) => {
  const {login, password} = req.body;

  const ca = new FabricCAServices('http://0.0.0.0:7054');
  try{
    const adminData = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'password'
    });
    const identity = {
      label: 'client',
      certificate: adminData.certificate,
      privateKey: adminData.key.toBytes(),
      mspId: 'NAUKMA'
    };
    const wallet = new InMemoryWallet();
    const mixin = X509WalletMixin.createIdentity(identity.mspId, identity.certificate, identity.privateKey);
    try{
      await wallet.import(identity.label, mixin);
    }
    catch(err){
      res.status(400).json({ message: 'Error while importing wallet', error: err.message });
    }
    const gateway = new Gateway();
    const connectionProfile = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname,'../gateway/networkConnection.yaml'), 'utf8'));
    const connectionOptions = {
      identity: identity.label,
      wallet: wallet,
      discovery: {enable: false, asLocalhost: true}
    };
    try{
      await gateway.connect(connectionProfile, connectionOptions);
    }
    catch(err){
      res.status(400).json({ message: 'Error while connecting to gateway', error: err.message });
    }
    const admin = gateway.getCurrentIdentity();
    try{
      await ca.register({
        enrollmentID: login,
        enrollmentSecret: password,
        role: 'peer',
        affiliation: teacherRole ? 'naukma.teacher' : 'naukma.student',
        maxEnrollments: -1
      }, admin);
    }
    catch(err){
      res.status(400).json({ message: 'Error when attempt to register', error: err.message });
    }
    try{
      const userData = await ca.enroll({
        enrollmentID: login,
        enrollmentSecret: password
      });
      gateway.disconnect();
      res.status(201).json(
          {
            login: login,
            certificate: userData.certificate,
            privateKey: userData.key.toBytes()
          }
      );
    }
    catch(err){
      res.status(400).json({ message: 'Error when attempt to get user data' , error: err.message });
    }
  }
  catch(err){
    res.status(400).json({ message: `Error while enrolling ${teacherRole ? 'teacher' : 'student'}`, error: err.message });
  }
};

router.post('/student', (res, req) => memberRegistration(res, req, false));

router.get('/student', (req, res, next) => {
  res.status(200).json({
    message: 'Handling GET student request'
  });
});

router.post('/teacher', (res, req) => memberRegistration(res, req, true));

router.get('/teacher', (req, res, next) => {
  res.status(200).json({
    message: 'Handling GET teacher request'
  });
});

export default router;
