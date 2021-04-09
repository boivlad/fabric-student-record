'use strict';

const { Contract } = require('fabric-contract-api');
const { ClientIdentity } = require('fabric-shim');

class StudentRecordsStorage extends Contract {
  constructor() {
    super('org.fabric.studentRecordsStorage');
  }

  async createStudentRecord(ctx, email, fullName) {
    const identity = new ClientIdentity(ctx.stub);
    if (identity.cert.subject.organizationalUnitName === 'admin') {
      const byteRecord = await ctx.stub.getState(email);
      if (!(byteRecord && byteRecord.toString().length !== 0)) {
        const record = { fullName: fullName, semesters: [] }
        const newRecord = Buffer.from(JSON.stringify(record));
        await ctx.stub.putState(email, newRecord);
        return JSON.stringify(record, null, 2);
      } else {
        throw new Error("Given Email already exists!");
      }
    } else {
      throw new Error("Access denied!");
    }

  }
  async updateStudentRecord(ctx, email, record) {
    const addRecord = Buffer.from(JSON.stringify(record));
    await ctx.stub.putState(email, addRecord);
  }
  async getStudentRecord(ctx, email) {
    const identity = new ClientIdentity(ctx.stub);
    if (identity.cert.subject.organizationalUnitName === 'admin') {
      const bytesRecord = await ctx.stub.getState(email);
      if (!bytesRecord) {
        throw new Error("Given Email doesn`t exists!");
      } else if (bytesRecord.toString().length === 0) {
        throw new Error("Given Email doesn`t exists!");
      }
      return JSON.parse(bytesRecord.toString());
    } else {
      throw new Error("Access denied!");
    }
  }

  async addThemes(ctx, email, semester, subName) {
    const lectorMail = identity.cert.subject.commonName;
    const record = await this.getStudentRecord(ctx, email);
    if (record.semesters[semester]) {
    } else {
      record.semesters[semester] = {};
    }
    record.semesters[semester][subName] = { lector: lectorMail, themes: [] }
    await this.updateStudentRecord(ctx, email, record);
    return JSON.stringify(record, null, 2);
  }
  async getAllStudentGrades(ctx, email) {
    const record = await this.getStudentRecord(ctx, email);
    return JSON.stringify(record.semesters, null, 2);
  }
  async getGradesSemester(ctx, email, semNum) {
    const record = await this.getStudentRecord(ctx, email);
    return JSON.stringify([] || record.semesters[semNum], null, 2);
  }
  async addGrade(ctx, email, semester, subName, theme, grade) {
    const record = await this.getStudentRecord(ctx, email);
    record.semesters[semester][subName].themes.push([{title: theme, rating: grade, date: Date.now()}]);
    await this.updateStudentRecord(ctx, email, record);
    return JSON.stringify(record, null, 2);
  }




}

module.exports = StudentRecordsStorage;
