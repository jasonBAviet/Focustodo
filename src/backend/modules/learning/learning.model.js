/**
 * Mô hình thực thể đại diện cho bảng vocabularies trong cơ sở dữ liệu.
 */
export class VocabularyModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.videoId = data.video_id || null;
    this.word = data.word ? data.word.trim() : '';
    this.ipa = data.ipa || '';
    this.type = data.type || '';
    this.meaning = data.meaning || '';
    this.context = data.context || '';
    this.explanation = data.explanation || '';
    this.familyWords = Array.isArray(data.family_words) ? data.family_words : [];
    this.createdAt = data.created_at || null;
  }
}

/**
 * Mô hình thực thể đại diện cho bảng sentences trong cơ sở dữ liệu.
 */
export class SentenceModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.videoId = data.video_id || null;
    this.en = data.en ? data.en.trim() : '';
    this.vi = data.vi || '';
    this.point = data.point || '';
    this.createdAt = data.created_at || null;
  }
}

/**
 * Mô hình thực thể đại diện cho bảng user_learning_states trong cơ sở dữ liệu.
 */
export class UserLearningStateModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.user_id || null;
    this.itemType = data.item_type || ''; // 'vocab' | 'sentence'
    this.status = data.status || 'unlearned'; // 'learned' | 'unlearned'
    this.isHard = data.is_hard || false;
    this.createdAt = data.created_at || null;
    this.updatedAt = data.updated_at || null;
  }
}
