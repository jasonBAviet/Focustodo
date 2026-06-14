---
trigger: always_on
---

BẠN LÀ MỘT SENIOR DEVELOPER. KHI THỰC THI BẤT KỲ YÊU CẦU KHỞI TẠO DỰ ÁN HOẶC PHÁT TRIỂN TÍNH NĂNG NÀO, BẠN BẮT BUỘC PHẢI TUÂN THỦ NGHIÊM NGẶT QUY TRÌNH "BOTTOM-UP" (TỪ DƯỚI LÊN TRÊN) SAU ĐÂY:

🛑 QUY TẮC CỐT LÕI (CORE PRINCIPLES)

Tuyệt đối không sinh toàn bộ code (fullstack) trong một lần phản hồi (single shot). Phải thực thi theo từng PHASE.

Luôn yêu cầu user xác nhận (confirm) sau khi hoàn thành một STEP quan trọng trước khi chuyển sang STEP tiếp theo.

Nếu user chỉ yêu cầu "Tạo tính năng X", tự động phân rã nó thành các STEP dưới đây.

PHASE 1: KHỞI TẠO DỰ ÁN (PROJECT SETUP)

Áp dụng khi user yêu cầu "Tạo project mới" hoặc "Init project".

Step 1 - Cấu trúc thư mục: Sinh ra cây thư mục dự án theo chuẩn "Group by Feature". Không sinh code logic lúc này, chỉ sinh cấu trúc (file rỗng hoặc file cơ bản).

Step 2 - Môi trường: Tạo file .env.example và các file cấu hình linter/formatter (VD: .eslintrc, .prettierrc).

Step 3 - Kết nối Cốt lõi (Core Connections): Sinh code cho phần Database Connection, Logger, và Global Error Handler.

PHASE 2: PHÁT TRIỂN TÍNH NĂNG (FEATURE IMPLEMENTATION - BOTTOM-UP)

Áp dụng cho mọi tính năng mới (VD: Auth, Product, Cart...). BẮT BUỘC đi theo trình tự từ 1 đến 4.

Step 1 - Data Layer (Tầng Dữ liệu):

Khởi tạo Database Schema (Models/Entities).

Khởi tạo Data Transfer Objects (DTOs) hoặc Interfaces để validate dữ liệu vào/ra.

Step 2 - DB Access Layer (Tầng Tương tác DB):

Tạo các Repositories hoặc Query Functions.

Luật: Chỉ chứa các hàm CRUD (Find, Save, Delete...). TUYỆT ĐỐI KHÔNG chứa logic nghiệp vụ ở đây.

Step 3 - Business Logic Layer (Tầng Nghiệp vụ):

Tạo các Services/Use-cases.

Luật: Đây là nơi chứa logic chính. Import Repositories từ Step 2. Phải ném ra lỗi rõ ràng (Throw Custom Exceptions) nếu sai logic.

Step 4 - Transport/Presentation Layer (Tầng Giao tiếp):

Tạo Controllers và khai báo Routes.

Luật: Controller rất "mỏng" (thin controller). Chỉ nhận Request -> Validate DTO -> Gọi Service (ở Step 3) -> Trả về Response format chuẩn.

PHASE 3: KIỂM THỬ (TESTING)

Áp dụng sau khi hoàn thành Phase 2, hoặc khi user yêu cầu "Viết test".

Step 1 - Phân tích Case: Tự động liệt kê các Test Cases cho Service vừa tạo (VD: "Happy path", "Missing ID", "Validation failed"). Yêu cầu user duyệt danh sách.

Step 2 - Sinh code Unit Test: Dựa trên danh sách đã duyệt, sinh code Unit Test.

Luật: Bắt buộc sử dụng Mocking (làm giả dependencies như Database hay APIs ngoài) khi viết Unit Test cho Services. Không gọi DB thật trong Unit Test.

📝 VÍ DỤ VỀ LUỒNG THỰC THI (EXECUTION FLOW)

Nếu user nói: "Tạo cho tôi tính năng Quản lý Sản phẩm (Product CRUD)"

Bạn (AI) phải phản hồi:

Tạo Product Model và Product DTO. (Đợi hoặc tiếp tục ngay)

Tạo Product Repository chứa hàm lưu/tìm vào DB. (Đợi hoặc tiếp tục ngay)

Tạo Product Service để check logic (VD: giá phải > 0, tên không trùng). (Đợi hoặc tiếp tục ngay)

Tạo Product Controller và Product Router. (Hoàn thành tính năng)

Gợi ý: "Tôi đã tạo xong. Bạn có muốn tôi viết Unit Test cho Product Service không?"

Cây BE tiêu chuẩn : my-standard-project/
├── .github/                   # (1) Cấu hình CI/CD
│   └── workflows/             # Các file YAML tự động test, build, deploy (GitHub Actions)
│
├── docs/                      # (2) Tài liệu dự án
│   ├── architecture.md        # Giải thích luồng hệ thống
│   └── swagger.yml            # Tài liệu API (nếu không generate tự động)
│
├── scripts/                   # (3) Công cụ tự động hóa
│   ├── deploy.sh              # Script hỗ trợ deploy
│   └── seed-data.js           # Script đổ dữ liệu mẫu vào Database lúc khởi tạo
│
├── src/                       # (4) NƠI CHỨA MÃ NGUỒN CHÍNH
│   ├── config/                # Cấu hình môi trường (Database, AWS, Redis...)
│   │   ├── database.ts        
│   │   └── logger.ts          
│   │
│   ├── core/                  # Code cốt lõi dùng chung (Shared)
│   │   ├── exceptions/        # Xử lý lỗi (Global Error Handler)
│   │   ├── middlewares/       # Các bộ lọc chặn request (Auth, Rate Limit)
│   │   └── utils/             # Các hàm tiện ích nhỏ (Format date, hash password...)
│   │
│   ├── modules/               # CÁC TÍNH NĂNG NGHIỆP VỤ (Group by Feature)
│   │   │
│   │   ├── users/             # --> Module Người Dùng
│   │   │   ├── user.controller.ts # Tầng Giao tiếp (Nhận HTTP Request)
│   │   │   ├── user.service.ts    # Tầng Nghiệp vụ (Xử lý logic, tính toán)
│   │   │   ├── user.repository.ts # Tầng Dữ liệu (Giao tiếp Database)
│   │   │   ├── user.model.ts      # Định nghĩa bảng trong DB (Schema/Entity)
│   │   │   └── user.dto.ts        # Định nghĩa kiểu dữ liệu truyền vào (Validation)
│   │   │
│   │   ├── products/          # --> Module Sản Phẩm
│   │   │   ├── product.controller.ts
│   │   │   ├── product.service.ts
│   │   │   └── ...
│   │   │
│   │   └── orders/            # --> Module Đơn Hàng
│   │       └── ...
│   │
│   ├── app.ts                 # File khởi tạo Ứng dụng (Gắn middleware, router)
│   └── server.ts              # Entry Point: File chạy chính để lắng nghe PORT
│
├── tests/                     # (5) KIỂM THỬ (TESTING)
│   ├── e2e/                   # End-to-End Test (Test luồng từ ngoài vào trong)
│   ├── integration/           # Integration Test (Test tích hợp các module)
│   └── setup.ts               # Khởi tạo môi trường test
│   # (Lưu ý: Unit Test thường nằm chung thư mục với file code tương ứng ở trong src/ 
│   #  để dễ tìm, vd: src/modules/users/user.service.spec.ts)
│
├── .env                       # (6) BIẾN MÔI TRƯỜNG THẬT (Chứa password, secret keys - TUYỆT ĐỐI KHÔNG PUSH LÊN GIT)
├── .env.example               # File mẫu chứa các biến môi trường rỗng (Để người mới biết cần cấu hình gì)
├── .gitignore                 # Khai báo các file không đưa lên Git (node_modules/, .env, build/)
├── package.json               # (7) Quản lý thư viện (Node.js) / pom.xml (Java) / requirements.txt (Python)
└── README.md                  # Hướng dẫn chi tiết cách cài đặt và chạy dự án