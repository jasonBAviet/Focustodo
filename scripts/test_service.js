import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { learningService } from '../src/backend/modules/learning/learning.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  try {
    // Gọi với userId bất kỳ để xem dữ liệu trả về
    const data = await learningService.getLearningData('1');
    const matched = data.vocabulary.filter(v => v.word.toLowerCase().includes('air gap'));
    console.log('CÁC TỪ VỰNG AIR GAP TRẢ VỀ TỪ SERVICE BACKEND:');
    console.log(JSON.stringify(matched, null, 2));
  } catch (err) {
    console.error('Lỗi khi gọi service:', err);
  }
}

test();
