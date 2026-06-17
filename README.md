# Focus To-Do Application

Ứng dụng Focus To-Do là một hệ thống quản lý công việc và học tập toàn diện, kết hợp phương pháp quả cà chua Pomodoro, nhật ký ghi chép cá nhân, quản lý kiến thức dạng đồ thị liên kết, và mô-đun Học tiếng Anh qua phụ đề video.

## Tính năng chính

### 1. Quản lý công việc (Tasks & Projects)
- Sắp xếp và lên lịch công việc theo ngày: Hôm nay, Ngày mai, Tuần này.
- Phân nhóm công việc theo dự án và nhãn tùy biến.
- Thiết lập mức độ ưu tiên: Cao, Trung bình, Thấp.

### 2. Phương pháp Pomodoro
- Đồng hồ đếm ngược tập trung Pomodoro tích hợp cấu hình thời gian nghỉ linh hoạt.
- Thống kê chi tiết thời gian tập trung và lịch sử các phiên hoàn thành.

### 3. Nhật ký và Kiến thức (Diary & Knowledge Base)
- Viết nhật ký cá nhân và lưu trữ ghi chép quan trọng.
- Biểu diễn mối quan hệ giữa các công việc, ghi chép và nhật ký qua giao diện Đồ thị tri thức (Knowledge Graph) tương tác trực quan.

### 4. Học tiếng Anh qua Video (Learning English)
- Đồng bộ hóa dữ liệu từ vựng và mẫu câu giao tiếp trực tiếp từ phụ đề video.
- Chế độ học tập chi tiết bao gồm giải thích từ vựng, phiên âm chuẩn quốc tế (IPA) và ngữ cảnh sử dụng thực tế.
- Chế độ ôn tập Flashcard (lật thẻ) giúp người học ghi nhớ nhanh nghĩa từ vựng và câu.
- **Từ gia đình (Word Family)**: Hiển thị danh sách các từ liên quan (Danh từ, Động từ, Tính từ, Trạng từ) giúp người học mở rộng vốn từ vựng một cách có hệ thống.

---

## Kiến trúc dự án

Dự án tuân thủ mô hình phân tầng chuẩn mực và được tổ chức theo tính năng:

- **Tầng Giao diện (Frontend)**: React, TypeScript, và Vite. Các thành phần giao diện được tổ chức gọn gàng trong thư mục `src/features/`.
- **Tầng API & Nghiệp vụ (Backend)**: Express.js, được tổ chức theo cấu trúc Repository - Service - Controller trong thư mục `src/backend/modules/`.
- **Cơ sở dữ liệu (Database)**: 
  - Cơ sở dữ liệu nội bộ (`focustodo`) quản lý thông tin người dùng, công việc, nhật ký và trạng thái học tập.
  - Cơ sở dữ liệu phụ đề (`youtube_subtitle`) lưu trữ lịch sử dịch thuật, từ vựng và mẫu câu phục vụ mô-đun Học tiếng Anh.

---

## Yêu cầu hệ thống

- Node.js phiên bản 18 trở lên.
- PostgreSQL chạy cục bộ hoặc máy chủ từ xa.

---

## Cấu hình môi trường

Sao chép tệp mẫu để tạo tệp cấu hình thực tế:
```bash
cp .env.example .env
```

Điền đầy đủ thông tin kết nối cơ sở dữ liệu nội bộ và cơ sở dữ liệu phụ đề video vào tệp `.env`.

---

## Hướng dẫn khởi chạy

### 1. Đồng bộ và cài đặt thư viện
```bash
npm install
```

### 2. Di chuyển cơ sở dữ liệu (Migration)
Để đồng bộ hóa từ vựng và mẫu câu từ lịch sử dịch thuật video vào cơ sở dữ liệu học tập:
```bash
node scripts/migrate_youtube_db.js
```
*Lưu ý: Kịch bản di chuyển dữ liệu đã được tối ưu hóa bằng phương pháp chèn hàng loạt (bulk insert) giúp quá trình di chuyển hoàn tất trong vài giây.*

### 3. Chạy ứng dụng trong môi trường phát triển
Khởi chạy song song máy chủ backend và frontend:
```bash
npm run dev:full
```

- Máy chủ API chạy tại: http://localhost:4000
- Giao diện Client chạy tại: http://localhost:5173

### 4. Biên dịch mã nguồn dự án
```bash
npm run build
```
