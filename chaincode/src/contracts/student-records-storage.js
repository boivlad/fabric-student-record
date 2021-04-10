'use strict';

const { Contract } = require('fabric-contract-api');
const { ClientIdentity } = require('fabric-shim');

class StudentRecordsStorage extends Contract {
  constructor() {
    super('org.fabric.studentRecordsStorage');
  }
  checkIsTeacher(ctx){
	const identity = new ClientIdentity(ctx.stub);
    if (identity.cert.subject.organizationalUnitName !== 'teacher') {
      throw new Error('Current subject is not have access to this function');
    }
  }
  checkStudentExists(recordAsBytes){
	if(!recordAsBytes || recordAsBytes.toString().length === 0){
      throw new Error('Student with current email does not exist');
    }
  }
  checkStudentNotExists(recordAsBytes){
	if(recordAsBytes || recordAsBytes.toString().length !== 0){
       throw new Error('Student with the current email already exist');
    }
  }
  uParser(recordAsBytes){
	 return JSON.parse(recordAsBytes.toString());
  }
  async createStudentRecord(ctx, studentEmail, fullName) {
    this.checkIsTeacher(ctx);
    const recordAsBytes = await ctx.stub.getState(studentEmail);
    this.checkStudentNotExists(recordAsBytes);
    const recordExample = {
      fullName: fullName,
      semesters: []
    };
    const newRecordInBytes = Buffer.from(JSON.stringify(recordExample));
    await ctx.stub.putState(studentEmail, newRecordInBytes);
    return JSON.stringify(recordExample, null, 2);
  }

  async addSubject(ctx, studentEmail, semester, subject) {
    this.checkIsTeacher(ctx);
    const recordAsBytes = await ctx.stub.getState(studentEmail);
	this.checkStudentExists(recordAsBytes);
	const identity = new ClientIdentity(ctx.stub);
    const tmp = this.uParser(recordAsBytes);
    tmp.semesters[semester][subject] = {
      lector: identity.cert.subject.commonName,
      themes: []
    };
    const changes = Buffer.from(JSON.stringify(tmp));
    await ctx.stub.putState(studentEmail, changes);
    return JSON.stringify(tmp);
  }
  async addGrade(ctx, studentEmail, semester, subject, theme, grade){
    this.checkIsTeacher(ctx);
	const recordAsBytes = await ctx.stub.getState(studentEmail);
    this.checkStudentExists(recordAsBytes);
	const tmp = this.uParser(recordAsBytes);
    if(!tmp.semesters[semester]){
      throw new Error('Semester not found');
    }
    else if(!tmp.semesters[semester][subject]){
      throw new Error('No subject in semester');
    }
    tmp.semesters[semester][subject].themes.push({
        title: theme,
        rating: grade,
        date: Date.now()
      });
	const changes = Buffer.from(JSON.stringify(tmp));
	await ctx.stub.putState(studentEmail, changes);
    return JSON.stringify(tmp);
  }
  
  async getGrades(ctx, studentEmail) {
    const recordAsBytes = await ctx.stub.getState(studentEmail);
    this.checkStudentExists(recordAsBytes);
    return JSON.stringify(this.uParser(recordAsBytes).semesters || {});
  }

  async getGradesSemester(ctx, studentEmail, semester) {
    const recordAsBytes = await ctx.stub.getState(studentEmail);
    this.checkStudentExists(recordAsBytes);
    return JSON.stringify(this.uParser(recordAsBytes).semesters[semester] || {});
  } 
}

module.exports = StudentRecordsStorage;
