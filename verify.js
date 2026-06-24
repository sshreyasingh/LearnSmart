const qb = require('./server/src/services/interviewQuestionBank.service');
const svc = require('./server/src/services/interview.service');
const ctrl = require('./server/src/controllers/interview.controller');
const analysisCtrl = require('./server/src/controllers/analysis.controller');

const r = qb.generateQuestions({
  techStack: { 
    languages: ['JavaScript'], 
    frontend: [{name:'React',confidence:0.9}], 
    backend: [{name:'Express',confidence:0.9}], 
    database: [{name:'MongoDB',confidence:0.8}] 
  },
  externalLibraries: [{name:'axios'},{name:'zod'}]
}, { _id:'p1', userId:'u1', detectedTechStack:['React','Express','MongoDB'] });

console.log('QUESTIONS:', r.questions.length);
console.log('HAS_USERID:', r.questions[0]?.userId === 'u1');
console.log('HAS_PROJECTID:', r.questions[0]?.projectId === 'p1');
console.log('CATEGORIES:', Object.keys(r.stats.categories).join(', '));
console.log('SVC_AUTO:', typeof svc.autoGenerateQuestions);
console.log('SVC_REGENERATE:', typeof svc.regenerateQuestions);
console.log('CTRL_OK:', typeof ctrl.getQuestions === 'function');
console.log('ANALYSIS_CTRL_OK:', typeof analysisCtrl.analyzeProject === 'function');
console.log('ALL_OK');
