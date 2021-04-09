'use strict'

const { Contract } =require('fabric-contract-api')
const { ClientIdentity } = require('fabric-shim')

class StudentContract extends Contract {
  constructor() {
    super('org.fabric.studentContract');
  }

  async createStudent(ctx, studentEmail, fullName) {
    const identity = new ClientIdentity(ctx.stub);
    if(identity.cert.subject.organizationalUnitName !== "admin"){
      throw new Error("Current subject is not have access to this function");
    }

    const recordAsBytes = await ctx.stub.getState(studentEmail);

    if(recordAsBytes.toString().length !== 0){
      throw new Error("Student with the current email already exist");
    }

    const recordExample = {
        fullName: fullName,
        semesters: [],
    };
    const newRecordInBytes = Buffer.from(JSON.stringify(recordExample));
    await ctx.stub.putState(studentEmail, newRecordInBytes);
    return JSON.stringify(recordExample, null, 2);
  }

  async addStudentSubject(ctx, studentEmail, semesterNumber, subjectName) {
    const identity = new ClientIdentity(ctx.stub);

    if(identity.cert.subject.organizationalUnitName !== "admin"){
      throw new Error("Subject doesn\'t have access to this function");
    }

    const recordAsBytes = await ctx.stub.getState(studentEmail);

    if(recordAsBytes.toString().length === 0){
      throw new Error("Student with such email doesn\'t exist");
    }

    const recordAsObject = JSON.parse(recordAsBytes);

    if(!recordAsObject.semesters[semesterNumber]){
      recordAsObject.semesters[semesterNumber] = {}; 
    }

    recordAsObject.semesters[semesterNumber][subjectName]={ 
      lector: identity.cert.subject.commonName, 
      themes: []
    }


    let recordExample  = {
        semesterNumber,
        subjectName,
        lector:  identity.cert.subject.commonName, 

    }  
    const newRecordInBytes = Buffer.from(JSON.stringify(recordAsObject));
    await ctx.stub.putState(studentEmail, newRecordInBytes);

    return JSON.stringify(recordExample, null, 2);
  }

  async setStudentMarkForSubject(ctx, studentEmail, semesterNumber, subjectName, title, rating){
    const identity = new ClientIdentity(ctx.stub);
    const validationMap = [
        {condition: () => identity.cert.subject.organizationalUnitName !== "admin"
        &&identity.cert.subject.organizationalUnitName !=="teacher", 
        error: new Error("Access denied")},
        {condition: async () => {
            const recordAsBytes = await ctx.stub.getState(studentEmail);
            return recordAsBytes.toString().length === 0
        }, 
        error: new Error("Student such email doesn\'t exist")},
        {condition: () => {
            const recordAsObject = JSON.parse(recordAsBytes);
            return !recordAsObject.semesters[semesterNumber]
        }, 
        error: new Error("This semester doesn't exist")},
        {condition: () => {
            const recordAsObject = JSON.parse(recordAsBytes);
            return !recordAsObject.semesters[semesterNumber][subjectName]
        }, 
        error: new Error("There is no such subject")},
        {condition: () => rating<0, 
        error: new Error("Rating can\'t be negative number")}
    ]

    validationMap.forEach((item) => {
        if(item.condition()) throw item.error
    })

    const recordExample = {
      rating,
      title,
      date: new Date(),
    };
    recordAsObject.semesters[semesterNumber][subjectName].themes.push(recordExample);

    const newRecordInBytes = Buffer.from(JSON.stringify(recordAsObject));
    await ctx.stub.putState(studentEmail, newRecordInBytes);

    return JSON.stringify(recordExample, null, 2);    

  }

    async getStudentMarks(ctx, studentEmail){
      const recordAsBytes = await ctx.stub.getState(studentEmail);

      if(recordAsBytes.toString().length === 0){
          throw new Error("Student with such email doesn\'t exist");
      }

      const recordAsObject = JSON.parse(recordAsBytes);

      return JSON.stringify(recordAsObject, null, 2);   
  }
  async getStudentMarksDuringSemester(ctx, studentEmail, semesterNumber){
    const recordAsBytes = await ctx.stub.getState(studentEmail);

    if(recordAsBytes.toString().length === 0){
      throw new Error("Student with such email doesn\'t exist");
    }

    const recordAsObject = JSON.parse(recordAsBytes);
    const result = recordAsObject.semesters[semesterNumber]||[];

    return JSON.stringify(result, null, 2);   
}

}



module.exports = studentContract;