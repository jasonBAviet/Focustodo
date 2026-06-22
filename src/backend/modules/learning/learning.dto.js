/**
 * Đối tượng chuyển giao dữ liệu xác thực cho yêu cầu cập nhật trạng thái học tập.
 */
export class MarkItemDto {
  constructor(data = {}) {
    this.itemId = data.itemId;
    this.itemType = data.itemType;
    this.status = data.status;
  }

  /**
   * Kiểm tra tính hợp lệ của dữ liệu truyền vào.
   * Ném ra lỗi tương ứng nếu dữ liệu không hợp lệ.
   */
  validate() {
    if (!this.itemId || typeof this.itemId !== 'string' || this.itemId.trim() === '') {
      throw new Error('Thiếu ID của phần tử học tập hoặc ID không hợp lệ.');
    }
    if (this.itemType !== 'vocab' && this.itemType !== 'sentence') {
      throw new Error('Loại phần tử học tập không hợp lệ. Phải là vocab hoặc sentence.');
    }
    if (this.status !== 'learned' && this.status !== 'unlearned') {
      throw new Error('Trạng thái học tập không hợp lệ. Phải là learned hoặc unlearned.');
    }
  }
}

/**
 * Đối tượng chuyển giao dữ liệu xác thực cho yêu cầu cập nhật trạng thái độ khó cao.
 */
export class ToggleHardDto {
  constructor(data = {}) {
    this.itemId = data.itemId;
    this.itemType = data.itemType;
    this.isHard = data.isHard;
  }

  /**
   * Kiểm tra tính hợp lệ của dữ liệu truyền vào.
   */
  validate() {
    if (!this.itemId || typeof this.itemId !== 'string' || this.itemId.trim() === '') {
      throw new Error('Thiếu ID của phần tử học tập hoặc ID không hợp lệ.');
    }
    if (this.itemType !== 'vocab' && this.itemType !== 'sentence') {
      throw new Error('Loại phần tử học tập không hợp lệ. Phải là vocab hoặc sentence.');
    }
    if (typeof this.isHard !== 'boolean') {
      throw new Error('Trạng thái độ khó phải là kiểu boolean.');
    }
  }
}
