# Hướng dẫn: Task Reminder Slack Webhook

## Tổng quan
Tính năng này cho phép Focus To-Do gửi thông báo về Slack khi bạn có task cần thực hiện (reminder).

## Cách sử dụng

### 1. Chuẩn bị Slack Webhook
Bạn cần có một Slack Webhook URL. URL này đã được cấu hình sẵn trong file `.env`:
```
https://hooks.slack.com/services/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
```

### 2. Bật Webhook trong ứng dụng
1. Mở ứng dụng Focus To-Do
2. Nhấp vào biểu tượng ⚙️ (Settings) ở góc trên phải
3. Chuyển đến tab **"Webhook & API"**
4. Bật toggle **"Enable Webhook"**
5. Dán Slack Webhook URL vào trường **"Webhook URL"**:
   ```
   https://hooks.slack.com/services/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
   ```
6. Nhấp **Save** để lưu cấu hình

### 3. Thêm Reminder cho Task
1. Chọn hoặc tạo một task
2. Nhấp vào trường **"Reminder"** trong chi tiết task
3. Chọn ngày và giờ bạn muốn được nhắc nhở
4. Task sẽ gửi thông báo về Slack vào đúng thời gian được chỉ định

### 4. Xem Webhook Events
Trong tab **"Webhook & API"** > mục **"Webhook Events Log"**, bạn có thể xem:
- Danh sách tất cả sự kiện đã gửi
- Trạng thái (Success/Error)
- Thời gian gửi
- Chi tiết lỗi (nếu có)

## Tính năng Slack Message

Khi task được reminder, Slack sẽ nhận được thông báo với định dạng đẹp bao gồm:
- 🔔 **Tiêu đề Task**
- **Ưu tiên** (Cao/Trung bình/Thấp)
- **Hạn chót** (Due date)
- **Thời gian** nhắc nhở
- **Ghi chú** (nếu có)

## Kiểm tra hoạt động

### Kiểm tra trong ứng dụng
1. Mở Settings > Webhook & API
2. Nhấp nút **"Test Webhook"** để gửi thử
3. Kiểm tra Slack để xem thông báo test

### Kiểm tra Webhook Events Log
- Mỗi lần task được reminder, một event sẽ được ghi lại trong log
- Nếu status = "success", Slack đã nhận được thông báo
- Nếu status = "error", hãy kiểm tra URL webhook hoặc kết nối mạng

## Ghi chú

- Ứng dụng kiểm tra reminder **mỗi 30 giây**
- Mỗi task chỉ gửi reminder **một lần** (khi thời gian đến)
- Nếu bạn tắt webhook hoặc đóng ứng dụng trước khi reminder tới, thông báo sẽ không được gửi
- Webhook URL phải hợp lệ và Slack channel phải được cấu hình đúng

## Xử lý sự cố

**Không nhận được thông báo Slack?**
1. Kiểm tra Webhook URL trong Settings có chính xác không
2. Kiểm tra toggle "Enable Webhook" có bật không
3. Xem Webhook Events Log để kiểm tra status
4. Kiểm tra kết nối mạng
5. Thử nhấp nút "Test Webhook" để gửi thử

**Webhook Events Log có lỗi?**
1. Kiểm tra URL webhook có chứa typo không
2. Chắc chắn URL là Slack webhook (chứa `hooks.slack.com`)
3. Kiểm tra Slack channel có được cấu hình để nhận incoming webhooks không

## Mã nguồn liên quan
- `src/hooks/useWebhook.ts` - Logic webhook
- `src/hooks/useReminderCheck.ts` - Logic kiểm tra reminder
- `src/App.tsx` - Tích hợp reminder checker
- `.env` - Cấu hình webhook URL
