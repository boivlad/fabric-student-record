'use strict';

const { Contract } = require('fabric-contract-api');
const { ClientIdentity } = require('fabric-shim');

class StudentRecordsStorage extends Contract {
  constructor() {
    super('org.fabric.studentRecordsStorage');
  }

  async createStudentRecord(ctx, studentEmail, fullName) {
    const identity = new ClientIdentity(ctx.stub);
    if (identity.cert.subject.organizationalUnitName !== 'teacher') {
      throw new Error('Current subject does not have access to this function');
    }
    const recordAsBytes = await ctx.stub.getState(studentEmail);
    if(!recordAsBytes || recordAsBytes.toString().length !== 0){
      throw new Error('Student with the current email already exist');
    }
    const recordExample = {
      fullName: fullName,
      semesters: []
    }
    const newRecordInBytes = Buffer.from(JSON.stringify(recordExample));
    await ctx.stub.putState(studentEmail, newRecordInBytes);
    return JSON.stringify(recordExample, null, 2);
  }

  async getStudentRecord(ctx, studentEmail) {
    const identity = new ClientIdentity(ctx.stub);
    if (identity.cert.subject.organizationalUnitName !== 'teacher') {
      throw new Error('Current subject does not have access to this function');
    }
    const recordAsBytes = await ctx.stub.getState(studentEmail);
    if(!recordAsBytes || recordAsBytes.toString().length !== 0){
      throw new Error('Student with the current email does not exist');
    }
    return JSON.parse(recordAsBytes.toString());

  }

  async updateStudentRecord(ctx, studentEmail, record) {
    const newRecordInBytes = Buffer.from(JSON.stringify(record));
    await ctx.stub.putState(studentEmail, newRecordInBytes);
  }

  async addSubjectToStudentRecord(ctx, studentEmail, semesterNumber, subjectName) {
    const identity = new ClientIdentity(ctx.stub);
    if (identity.cert.subject.organizationalUnitName !== 'teacher') {
      throw new Error('Current subject is not have access to this function');
    }
    const recordAsBytes = await ctx.stub.getState(studentEmail);
    const recordAsObject = JSON.parse(recordAsBytes.toString());
    recordAsObject.semesters[semesterNumber][subjectName] = {
      lector: identity.cert.subject.commonName,
      themes: []
    }
    const newRecordInBytes = Buffer.from(JSON.stringify(recordAsObject));
    await ctx.stub.putState(studentEmail, newRecordInBytes);
    return JSON.stringify(recordAsObject, null, 2);
  }

  async addGradeToStudentRecord(ctx, studentEmail, semester, subjectName, title, grade) {
    const record = await this.getStudentRecord(ctx, studentEmail);
    if (!record.semesters[semester]?.[subjectName]) {
      throw new Error("This subject in this semester does not exist!");
    }

    record.semesters[semester][subjectName].themes.push([
      {
        title,
        grade,
        date: Date.now()
      }
    ]);


    await this.updateStudentRecord(ctx, studentEmail, record);
    return JSON.stringify(record, null, 2);
  }

  async getAllStudentGrades(ctx, studentEmail) {
    const record = await this.getStudentRecord(ctx, studentEmail);

    return JSON.stringify(record.semesters, null, 2);
  }

  async getStudentGradesBySemester(ctx, studentEmail, semester) {
    const record = await this.getStudentRecord(ctx, studentEmail);

    return JSON.stringify(record.semesters[semester] || [], null, 2);
  }
}

module.exports = StudentRecordsStorage;
