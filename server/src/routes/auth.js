import express from 'express';
import FabricCAServices from 'fabric-ca-client';
import {Gateway, InMemoryWallet, X509WalletMixin} from 'fabric-network';
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
const router = express.Router();


const registration = (affiliation) => async (req, res) => {
    const ca = new FabricCAServices("http://0.0.0.0:7054");

    console.log('begin registration');
    const {login, password} = req.body;
    const adminData = await ca.enroll({
        enrollmentID: 'admin',
        enrollmentSecret: 'password'
    });
    const identity =
        {
            label: 'client',
            certificate: adminData.certificate,
            key: adminData.key.toBytes(),
            mspId: 'NAUKMA'
        }
    const wallet = new InMemoryWallet();
    const mixin = X509WalletMixin.createIdentity(identity.mspId, identity.certificate, identity.key)
    await wallet.import(identity.label, mixin)
    const gateway = new Gateway();
    const connectionProfile = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, '../gateway/networkConnection.yaml'), 'utf8'));
    const connectionOptions = {
        identity: identity.label,
        wallet,
        discovery: {enabled: false, asLocalhost: true}
    }
    try {
        await gateway.connect(connectionProfile, connectionOptions);
      } catch (e) {
        res.status(500).json({
          message: e.message,
          error: "Gateway: failed to connect",
        });
        return;
      }
    const admin = gateway.getCurrentIdentity();
    try {
        await ca.register({
          enrollmentID: login,
          enrollmentSecret: password,
          role: 'peer',
          affiliation: affiliation,
          maxEnrollments: -1,
        }, admin);
      } catch (e) {
        res.status(500).json({
          message: e.message,
          error: "Registration failed",
        });
        return;
      }
   
      try {
        const userData = await ca.enroll({enrollmentID: login, enrollmentSecret: password});
    
        gateway.disconnect();
    
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

}

const studentRegistration = async (req, res) => {
    console.log('begin student registration')
    await registration('naukma.student')(req, res)
}

const teacherRegistration = async (req, res) => {
    console.log('begin teacher registration')
    await registration('naukma.teacher')(req, res)
}


router.post('/student', studentRegistration);
router.post('/teacher', teacherRegistration);
export default router;

