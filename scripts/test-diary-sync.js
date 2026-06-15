/**
 * @file test-diary-sync.js
 * @description Script kiểm thử tích hợp (Integration Test) cho luồng đồng bộ hóa Nhật ký (Diary Sync).
 * Kịch bản:
 * 1. Đăng nhập qua tài khoản bypass phát triển (default@focustodo.local) để lấy token.
 * 2. Lấy trạng thái hiện tại (GET /api/state).
 * 3. Tạo một nhật ký công việc mới có tag task và gửi lên server (POST /api/state).
 * 4. Lấy lại trạng thái để xác nhận nhật ký mới đã lưu vào DB.
 * 5. Truy vấn delta changes (GET /api/changes) để xác nhận hệ thống đồng bộ nhận diện được thay đổi.
 * 6. Thực hiện xóa mềm nhật ký và xác minh lại.
 */

import assert from 'assert';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:4000';
const TEST_EMAIL = 'default@focustodo.local';

async function runTest() {
  console.log('=== KHỞI ĐẦU KIỂM THỬ TÍCH HỢP DIARY SYNC ===\n');

  // Step 1: Login via bypass email to get JWT token
  console.log('1. Đăng nhập lấy JWT token...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: 'devbypass_password' })
  });

  if (!loginRes.ok) {
    throw new Error(`Đăng nhập thất bại: ${loginRes.status} ${await loginRes.text()}`);
  }

  const { token, user } = await loginRes.json();
  console.log(`✓ Đăng nhập thành công. User ID: ${user.id}\n`);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Step 2: Fetch current state to see if diaries array is returned
  console.log('2. Lấy trạng thái hiện tại (GET /api/state)...');
  const stateRes = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders });
  if (!stateRes.ok) {
    throw new Error(`Lấy state thất bại: ${stateRes.status}`);
  }
  const { state: initialState } = await stateRes.json();
  assert.ok(Array.isArray(initialState.diaries), 'Diaries must be an array');
  console.log(`✓ Lấy trạng thái thành công. Số nhật ký hiện tại: ${initialState.diaries.length}\n`);

  // Step 3: Create a new diary object locally and push to server
  const testDiaryId = crypto.randomUUID();
  const testTitle = `Diary Integration Test - ${new Date().toLocaleDateString()}`;
  const testNote = `### 🏆 Thành quả đạt được\n- Hoàn thành integration test sync!\n\n[Hoàn thành task test](task://test-task-123)`;

  const newDiary = {
    id: testDiaryId,
    title: testTitle,
    projectId: null,
    priority: 'high',
    dueDate: null,
    reminder: null,
    repeat: 'none',
    repeatCustom: null,
    note: testNote,
    subtasks: [],
    pomodoroEstimate: 2,
    pomodoroCompleted: 0,
    totalFocusTime: 0,
    completed: false,
    flagged: false,
    tags: ['integration-test'],
    position: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: new Date().toISOString()
  };

  console.log('3. Gửi đồng bộ hóa nhật ký mới lên server (POST /api/state)...');
  const syncRes = await fetch(`${BASE_URL}/api/state`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      state: {
        diaries: [newDiary]
      }
    })
  });

  if (!syncRes.ok) {
    throw new Error(`Gửi state thất bại: ${syncRes.status}`);
  }
  console.log('✓ Đồng bộ hóa lên server thành công.\n');

  // Step 4: Verify diary is in database
  console.log('4. Xác nhận nhật ký mới đã nằm trong DB (GET /api/state)...');
  const verifyRes = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders });
  const { state: updatedState } = await verifyRes.json();
  const savedDiary = updatedState.diaries.find(d => d.id === testDiaryId);
  
  assert.ok(savedDiary, 'Nhật ký mới phải tồn tại trong danh sách remote');
  assert.strictEqual(savedDiary.title, testTitle, 'Tiêu đề nhật ký phải chính xác');
  assert.strictEqual(savedDiary.note, testNote, 'Nội dung nhật ký phải chứa link task://');
  assert.strictEqual(savedDiary.priority, 'high', 'Độ ưu tiên phải là high');
  console.log('✓ Xác nhận chính xác dữ liệu trong DB.\n');

  // Step 5: Check changes endpoint
  console.log('5. Kiểm tra thay đổi delta sync (GET /api/changes)...');
  const sinceTime = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
  const changesRes = await fetch(`${BASE_URL}/api/changes?since=${encodeURIComponent(sinceTime)}`, {
    headers: authHeaders
  });
  if (!changesRes.ok) {
    throw new Error(`Lấy changes thất bại: ${changesRes.status}`);
  }
  const changesData = await changesRes.json();
  const changedDiaries = changesData.changes?.diaries || [];
  const foundChange = changedDiaries.find(d => d.id === testDiaryId);

  assert.ok(foundChange, 'Delta changes phải chứa nhật ký vừa được cập nhật');
  console.log('✓ Xác nhận thay đổi delta thành công.\n');

  // Step 6: Soft delete the test diary
  console.log('6. Thực hiện xóa mềm nhật ký (POST /api/state)...');
  const deleteRes = await fetch(`${BASE_URL}/api/state`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      state: {
        deletedIds: {
          diaries: [testDiaryId]
        }
      }
    })
  });

  if (!deleteRes.ok) {
    throw new Error(`Xóa mềm thất bại: ${deleteRes.status}`);
  }

  // Verify deletion in GET /api/state
  const postDeleteRes = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders });
  const { state: finalState } = await postDeleteRes.json();
  const deletedDiaryCheck = finalState.diaries.find(d => d.id === testDiaryId);

  assert.ok(!deletedDiaryCheck, 'Nhật ký đã bị xóa mềm không được xuất hiện trong state hoạt động');
  console.log('✓ Xác nhận xóa mềm thành công.\n');

  console.log('=== KẾT THÚC KIỂM THỬ TÍCH HỢP: TẤT CẢ ĐỀU THÀNH CÔNG ===');
}

runTest().catch(err => {
  console.error('❌ Kiểm thử tích hợp thất bại:', err);
  process.exit(1);
});
