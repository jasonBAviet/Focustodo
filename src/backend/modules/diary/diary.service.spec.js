/**
 * @file diary.service.spec.js
 * @description File kiểm thử đơn vị (Unit Test) cho DiaryService, kiểm tra các nghiệp vụ chính
 * của nhật ký công việc bao gồm: tạo mới nhật ký (với template mặc định khi note rỗng),
 * cập nhật nhật ký, xóa mềm nhật ký (logical delete), và kiểm tra các ràng buộc dữ liệu (như validation priority, title).
 */

import test, { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { diaryService, VALID_PRIORITIES, DEFAULT_DIARY_TEMPLATE } from './diary.service.js';
import { diaryRepository } from './diary.repository.js';
import { webhookService } from '../webhooks/webhook.service.js';

describe('DiaryService Unit Tests', () => {
  const mockUserId = 'user-123-abc';

  beforeEach(() => {
    // Reset all mocks before each test to ensure test isolation
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('createDiary', () => {
    it('should throw an error if title is missing, empty or not a string', async () => {
      const invalidTitles = [null, undefined, '', '   ', 123, {}];

      for (const title of invalidTitles) {
        await assert.rejects(
          diaryService.createDiary(mockUserId, { title }),
          /Truong "title" la bat buoc va khong duoc rong\./,
          `Expected error when title is ${JSON.stringify(title)}`
        );
      }
    });

    it('should throw an error if priority is invalid', async () => {
      await assert.rejects(
        diaryService.createDiary(mockUserId, { title: 'Hop le', priority: 'invalid-priority' }),
        /priority phai la mot trong: high, medium, low, none/,
        'Expected error when priority is invalid'
      );
    });

    it('should throw an error if projectId is provided but project does not exist', async () => {
      // Mock getProjectById to return null (project not found)
      mock.method(diaryRepository, 'getProjectById', async () => null);

      await assert.rejects(
        diaryService.createDiary(mockUserId, { title: 'Hop le', projectId: 'proj-999' }),
        /Project "proj-999" khong ton tai hoac khong thuoc quyen so huu\./,
        'Expected error when project does not exist'
      );
    });

    it('should fall back to DEFAULT_DIARY_TEMPLATE if note is empty or not provided', async () => {
      const fakeInsertedRow = {
        id: 'diary-1',
        title: 'Daily Reflection',
        note: DEFAULT_DIARY_TEMPLATE,
        priority: 'none',
        created_at: new Date().toISOString()
      };

      // Mock insertDiary and triggerWebhook
      mock.method(diaryRepository, 'insertDiary', async (input) => {
        assert.strictEqual(input.note, DEFAULT_DIARY_TEMPLATE);
        return fakeInsertedRow;
      });
      mock.method(webhookService, 'dispatchToAll', () => {});

      const result = await diaryService.createDiary(mockUserId, { title: 'Daily Reflection' });
      assert.strictEqual(result.data.note, DEFAULT_DIARY_TEMPLATE);
    });

    it('should create diary with input note if note is provided', async () => {
      const inputNote = 'Custom diary content today.';
      const fakeInsertedRow = {
        id: 'diary-1',
        title: 'Daily Reflection',
        note: inputNote,
        priority: 'medium',
        created_at: new Date().toISOString()
      };

      mock.method(diaryRepository, 'insertDiary', async (input) => {
        assert.strictEqual(input.note, inputNote);
        return fakeInsertedRow;
      });
      mock.method(webhookService, 'dispatchToAll', () => {});

      const result = await diaryService.createDiary(mockUserId, {
        title: 'Daily Reflection',
        note: inputNote,
        priority: 'medium'
      });
      assert.strictEqual(result.data.note, inputNote);
    });
  });

  describe('getDiaries', () => {
    it('should throw an error if filter priority is invalid', async () => {
      await assert.rejects(
        diaryService.getDiaries(mockUserId, { priority: 'invalid' }),
        /priority phai la mot trong/
      );
    });

    it('should return mapped diaries and count info', async () => {
      const fakeRows = [
        { id: '1', title: 'Diary 1', priority: 'high', created_at: new Date().toISOString() },
        { id: '2', title: 'Diary 2', priority: 'none', created_at: new Date().toISOString() }
      ];

      mock.method(diaryRepository, 'getDiaries', async () => {
        return {
          rows: fakeRows,
          total: 2,
          limit: 50,
          offset: 0
        };
      });

      const result = await diaryService.getDiaries(mockUserId, {});
      assert.strictEqual(result.data.length, 2);
      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.data[0].priority, 'high');
      assert.strictEqual(result.data[1].priority, 'none');
    });
  });

  describe('getDiaryById', () => {
    it('should throw error when diary is not found', async () => {
      mock.method(diaryRepository, 'getDiaryById', async () => null);

      await assert.rejects(
        diaryService.getDiaryById('non-existent', mockUserId),
        /Nhat ky khong tim thay/
      );
    });

    it('should return mapped diary data when found', async () => {
      const fakeRow = { id: 'diary-1', title: 'Found Diary', note: 'Notes' };
      mock.method(diaryRepository, 'getDiaryById', async () => fakeRow);

      const result = await diaryService.getDiaryById('diary-1', mockUserId);
      assert.strictEqual(result.data.title, 'Found Diary');
      assert.strictEqual(result.data.note, 'Notes');
    });
  });

  describe('updateDiary', () => {
    it('should throw an error if priority is invalid', async () => {
      await assert.rejects(
        diaryService.updateDiary('diary-1', mockUserId, { priority: 'bad' }),
        /priority phai la mot trong/
      );
    });

    it('should throw error if diary to update does not exist', async () => {
      mock.method(diaryRepository, 'getDiaryById', async () => null);

      await assert.rejects(
        diaryService.updateDiary('diary-999', mockUserId, { title: 'New title' }),
        /Nhat ky khong tim thay/
      );
    });

    it('should merge original and updated fields correctly', async () => {
      const originalRow = {
        id: 'diary-1',
        title: 'Original Title',
        note: 'Original Note',
        priority: 'none',
        subtasks: '[]',
        tags: '[]',
        completed: false
      };

      mock.method(diaryRepository, 'getDiaryById', async () => originalRow);
      mock.method(diaryRepository, 'updateDiary', async (id, userId, updated) => {
        // Assert merge logic in service
        assert.strictEqual(updated.title, 'Updated Title');
        assert.strictEqual(updated.note, 'Original Note'); // preserved
        assert.strictEqual(updated.priority, 'none'); // preserved
        return {
          ...originalRow,
          title: updated.title,
          updated_at: updated.updated_at
        };
      });
      mock.method(webhookService, 'dispatchToAll', () => {});

      const result = await diaryService.updateDiary('diary-1', mockUserId, { title: 'Updated Title' });
      assert.strictEqual(result.data.title, 'Updated Title');
    });
  });

  describe('deleteDiary', () => {
    it('should throw error if diary does not exist', async () => {
      mock.method(diaryRepository, 'deleteDiary', async () => null);

      await assert.rejects(
        diaryService.deleteDiary('diary-123', mockUserId),
        /Nhat ky khong tim thay/
      );
    });

    it('should soft delete and trigger webhook', async () => {
      const deletedRow = {
        id: 'diary-1',
        title: 'To Be Deleted',
        is_deleted: true,
        updated_at: new Date().toISOString()
      };

      mock.method(diaryRepository, 'deleteDiary', async () => deletedRow);
      mock.method(webhookService, 'dispatchToAll', () => {});

      const result = await diaryService.deleteDiary('diary-1', mockUserId);
      assert.strictEqual(result.data.id, 'diary-1');
      assert.strictEqual(result.message, 'Da xoa nhat ky thanh cong.');
    });
  });
});
