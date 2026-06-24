const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function fixIndex() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const collection = db.collection('interviewquestions');

  // Check existing indexes
  const indexes = await collection.indexes();
  const projectIdIndex = indexes.find(i => i.name === 'projectId_1');
  
  if (projectIdIndex) {
    console.log('Current projectId_1 index:', JSON.stringify(projectIdIndex, null, 2));
    
    if (projectIdIndex.unique) {
      console.log('Found UNIQUE index — dropping it...');
      await collection.dropIndex('projectId_1');
      console.log('Dropped unique projectId_1 index.');
      
      // Create non-unique index (matching Mongoose schema: index: true)
      await collection.createIndex({ projectId: 1 }, { background: true });
      console.log('Created non-unique projectId_1 index.');
    } else {
      console.log('Index is already non-unique. No fix needed.');
    }
  } else {
    console.log('No projectId_1 index found. Creating non-unique index...');
    await collection.createIndex({ projectId: 1 }, { background: true });
    console.log('Created non-unique projectId_1 index.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

fixIndex().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
