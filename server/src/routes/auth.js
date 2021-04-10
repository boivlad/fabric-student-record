import express from 'express';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {Gateway, InMemoryWallet, X509WalletMixin} from 'fabric-network';

const router = express.Router();

const studentRegistration = async (req, res) => {
  var caInfo = yaml.safeLoad(fs.readFileSync('../gateway/fabric-ca-client-config.yaml', 'utf8'));
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
};
var wallet;
var identity;
const teacherRegistration = async (req, res) => {
  {login, pass} = req.body;
  var ca = new FabricCAServices('http://0.0.0.0:7054');
  try {
    var admin = await ca.enroll({
      enrollmentID: "admin",
      enrollmentSecret: "password"
    });

	identity = {
	   label: 'client',
	   certificate: admin.certificate,
	   privateKey: admin.key.toBytes(),
	   mspId: 'NAUKMA'
	};

	wallet = new InMemoryWallet();
	const mixin = X509WalletMixin.createIdentity(identity.mspId, identity.certificate, identity.privateKey);
    await wallet.import(identity.label, mixin);
  } catch (err) {
    res.status(500).send('Preenrolment error ' + err);
    return;
  }

  const gateway = new Gateway();
  const connectionProfile = yaml.safeLoad(
      fs.readFileSync(__dirname + '/../gateway/networkConnection.yaml', 'utf8')
  );
  const connectionOptions = {
    identity: identity.label,
    wallet: wallet,
    discovery: {
      enabled: false,
      asLocalhost: true
    },
  };

  try {
    await gateway.connect(connectionProfile, connectionOptions);
  } catch(err) {
    res.status(500).send('Gateaway error ' + err);
    return;
  }

  

  try {
	var adminI = gateway.getCurrentIdentity();
    await ca.register({
      enrollmentID: login,
      enrollmentSecret: pass,
      role: 'peer',
      affiliation: 'naukma.teacher',
      maxEnrollments: -1
    }, adminI);
  } catch (err) {
    res.status(500).send('User registration error ' + err);
    return;
  }

  
  try {
    var user = await ca.enroll({enrollmentID: login, enrollmentSecret: pass});
	res.status(201).json({
		login: login,
		pk: user.key.toBytes(),
		certificate: user.certificate,
		password:pass
	});
  
  } catch (err) {
    res.status(500).send('Enrollment error ' + err);
  }
  gateway.disconnect();

  

};
router.post('/student', studentRegistration);
router.post('/teacher', teacherRegistration);
export default router;

