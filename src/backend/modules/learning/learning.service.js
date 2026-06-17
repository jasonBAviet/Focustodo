import crypto from 'crypto';
import { learningRepository } from './learning.repository.js';
import { VocabularyModel, SentenceModel } from './learning.model.js';

/**
 * Hàm băm chuỗi ký tự thành mã hex ngắn để tạo ID định danh duy nhất cho mẫu câu.
 */
function getShortHash(str) {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 12);
}

export class LearningService {
  /**
   * Lấy toàn bộ danh sách từ vựng và mẫu câu kèm theo trạng thái học tập cá nhân hóa của người dùng.
   */
  async getLearningData(userId) {
    const [vocabs, sentences, userStates] = await Promise.all([
      learningRepository.getVocabularies(),
      learningRepository.getSentences(),
      learningRepository.getUserLearningStates(userId)
    ]);

    // Tạo Map tra cứu nhanh trạng thái học tập cục bộ của user
    const stateMap = new Map();
    for (const state of userStates) {
      stateMap.set(state.id, state.status);
    }

    const vocabularyList = [];
    const sentencesList = [];

    // 1. Xử lý từ vựng đã được deduplicate từ DB
    for (const item of vocabs) {
      const videoId = item.video_id || 'null';
      const cleanWord = item.word.trim();
      const itemId = `${videoId}:v_${cleanWord.toLowerCase()}`;
      const status = stateMap.get(itemId) || 'unlearned';

      const model = new VocabularyModel(item);
      model.id = itemId;
      model.status = status;
      model.videoUrl = item.video_url || '';
      model.topic = item.topic || '';
      model.domain = item.domain || '';

      vocabularyList.push(model);
    }

    // 2. Xử lý mẫu câu đã được deduplicate từ DB
    for (const item of sentences) {
      const videoId = item.video_id || 'null';
      const cleanEn = item.en.trim();
      const sentenceHash = getShortHash(cleanEn);
      const itemId = `${videoId}:s_${sentenceHash}`;
      const status = stateMap.get(itemId) || 'unlearned';

      const model = new SentenceModel(item);
      model.id = itemId;
      model.status = status;
      model.videoUrl = item.video_url || '';
      model.topic = item.topic || '';
      model.domain = item.domain || '';

      sentencesList.push(model);
    }

    return {
      vocabulary: vocabularyList,
      sentences: sentencesList
    };
  }

  /**
   * Đánh dấu trạng thái học tập của một từ vựng hoặc mẫu câu.
   */
  async markItem(userId, dto) {
    dto.validate();
    return await learningRepository.markLearningState(userId, dto.itemId, dto.itemType, dto.status);
  }
}

export const learningService = new LearningService();
