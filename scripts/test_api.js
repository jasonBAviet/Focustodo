import { learningService } from '../src/backend/modules/learning/learning.service.js';

async function main() {
  try {
    console.log('Testing learningService.getLearningData with default_user...');
    const data = await learningService.getLearningData('default_user');
    console.log('Success! Data retrieved:');
    console.log('Vocabulary count:', data.vocabulary.length);
    console.log('Sentences count:', data.sentences.length);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

main();
