import { learningService } from './learning.service.js';
import { MarkItemDto, ToggleHardDto } from './learning.dto.js';

export class LearningController {
  /**
   * Lấy toàn bộ danh sách từ vựng và mẫu câu của người dùng.
   */
  async getLearningData(req, res) {
    try {
      const userId = req.user.id;
      const data = await learningService.getLearningData(userId);
      res.json(data);
    } catch (err) {
      console.error('[Learning API] Lỗi lấy dữ liệu học tập:', err);
      res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy dữ liệu học tập.' });
    }
  }

  /**
   * Đánh dấu trạng thái học tập của một từ vựng hoặc mẫu câu.
   */
  async markItem(req, res) {
    try {
      const userId = req.user.id;
      const dto = new MarkItemDto(req.body);
      dto.validate();

      const result = await learningService.markItem(userId, dto);
      res.json({
        message: 'Cập nhật trạng thái thành công.',
        data: result
      });
    } catch (err) {
      console.error('[Learning API] Lỗi cập nhật trạng thái:', err);
      res.status(400).json({ error: err.message || 'Cập nhật trạng thái thất bại.' });
    }
  }

  /**
   * Đánh dấu/bỏ đánh dấu độ khó cao cho một từ vựng hoặc mẫu câu.
   */
  async toggleHard(req, res) {
    try {
      const userId = req.user.id;
      const dto = new ToggleHardDto(req.body);
      dto.validate();

      const result = await learningService.toggleHard(userId, dto);
      res.json({
        message: 'Cập nhật độ khó thành công.',
        data: result
      });
    } catch (err) {
      console.error('[Learning API] Lỗi cập nhật độ khó:', err);
      res.status(400).json({ error: err.message || 'Cập nhật độ khó thất bại.' });
    }
  }
}

export const learningController = new LearningController();
