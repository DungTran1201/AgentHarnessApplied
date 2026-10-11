# Đặc Tả Trải Nghiệm Giao Diện Anime Minimalism & Tích Hợp 3D VRM Companion

## 1. Tổng Quan & Mục Tiêu Trải Nghiệm (Executive Overview)
Hệ thống **AI-Chan Assistant Platform** được nâng cấp toàn diện giao diện theo ngôn ngữ **Anime Minimalism × Technical AI Workspace × 3D VRM Companion**, mang lại cảm giác trợ lý ảo thông minh của tương lai với nét văn hóa anime Nhật Bản tinh tế, hiện đại và tính ứng dụng cao.

- **Mã Yêu Cầu Liên Quan**: `FR-048`, `FR-049`, `FR-050`, `FR-051`, `FR-052`, `FR-053`.
- **Mã Quy Chuẩn UX**: `UX-010`, `UX-002`, `UX-003`, `UX-004`.
- **Mã Máy Trạng Thái**: `STATE-003`.

---

## 2. Hệ Thống Design Tokens & Bảng Màu (Design System Tokens)
Theo yêu cầu `FR-051`, hệ thống chuẩn hóa bộ biến CSS tại `src/app/globals.css`:

| Token CSS | Mã Màu HEX / RGBA | Vai Trò & Ứng Dụng |
| :--- | :--- | :--- |
| `--bg-primary` | `#0E0F1B` | Nền tối sâu bao phủ toàn bộ cửa sổ ứng dụng desktop. |
| `--bg-surface` | `#171821` | Bề mặt nền cho sidebar, cards, khung soạn thảo tin nhắn. |
| `--bg-elevated` | `#1F1B2B` | Bề mặt nâng cao cho modal, dropdown, header panels. |
| `--primary` | `#A78BFA` | Lavender nhận diện thương hiệu, viền focus, nút chính. |
| `--secondary` | `#8B5CF6` | Violet đậm tạo chiều sâu và gradient chuyển tiếp. |
| `--accent` | `#C4B5FD` | Lavender sáng dùng cho highlight, badges, nhãn nổi bật. |
| `--accent-cyan` | `#38BDF8` | Cyan kỹ thuật dùng cho số liệu telemetry, sparkline token. |
| `--text-primary` | `#F3F1FF` | Chữ trắng ngà có độ tương phản cao, chống mỏi mắt. |
| `--text-secondary` | `#A1A1AA` | Chữ phụ, thông tin ngày giờ, chú thích. |
| `--text-muted` | `#71717A` | Placeholder, đường kẻ phân cách, icon không kích hoạt. |

---

## 3. Kiến Trúc Chế Độ Kép: Workspace Mode & Companion Mode (`FR-048`)

### 3.1. Chế Độ Workspace Mode (Mặc Định)
Tập trung vào hiệu suất làm việc của người dùng:
1. **Global Desktop Header**: Chứa logo AI-Chan, bộ nút chuyển đổi dạng pill `✦ Workspace Mode` / `◉ Companion Mode`, chuông thông báo, chế độ tối và avatar người dùng.
2. **Left Sidebar**: Nút "+ New Chat" rực rỡ, thanh tìm kiếm hội thoại nhanh, điều hướng chức năng, danh sách hội thoại gần đây phân loại `Pinned` và `Today`, cùng thẻ thông điệp khích lệ đáng yêu từ AI-Chan.
3. **Central Chat Workspace**: Khung chào mừng "Good evening, Dũng! ✨" kèm 4 action cards khởi động ("Viết code", "Phân tích dữ liệu", "Tạo nội dung", "Học & nghiên cứu"), luồng hội thoại phân cấp rõ rệt, hỗ trợ Markdown, tô màu mã nguồn và nút sao chép.
4. **Integrated VRM Area (Bên Phải)**: Nhân vật 3D VRM đứng tự nhiên trong vùng ánh sáng anime ấm áp, bong bóng thoại tương tác ("Anything you want to know? 💜") và panel `AI-Chan Status` (`FR-052`) hiển thị trạng thái Online, model hiện tại, temperature, token sparkline và 4 công cụ nhanh (Code, Image, File, Web).

### 3.2. Chế Độ Companion Mode (`FR-053`)
Tập trung vào trải nghiệm tương tác với nhân vật 3D:
1. Nhân vật 3D VRM chiếm vị trí trung tâm màn hình trong sân khấu 3D toàn cảnh.
2. Khu vực hội thoại thu gọn thành panel nổi bán trong suốt bên trái, có thể ẩn/hiện chỉ với một thao tác.
3. Thanh công cụ biểu cảm 3D cho phép kích hoạt nhanh các biểu cảm: Vui vẻ (Happy), Dịu dàng (Relaxed), Bất ngờ (Surprised), Nháy mắt (Blink).
4. Khung soạn thảo tin nhắn nổi ở cạnh đáy cho phép trao đổi liên tục mà không che khuất nhân vật.
5. **Zero State Loss**: Việc chuyển đổi qua lại giữa hai chế độ giữ nguyên 100% ID cuộc trò chuyện, lịch sử tin nhắn, nội dung đang nhập dở dang và model đang chọn mà không gây tải lại trang hoặc tạo lại canvas Three.js.

---

## 4. Công Nghệ Render 3D VRM & Máy Trạng Thái Animation (`FR-049`, `FR-050`, `STATE-003`)

### 4.1. Công Nghệ 3D WebGL
- Thư viện cốt lõi: `Three.js` (r170+) kết hợp plugin chính thức `@pixiv/three-vrm` (v2.1+).
- Mô hình mặc định: File chuẩn VRM `ai-chan.vrm` được tải tĩnh từ `/models/ai-chan.vrm`.
- Hệ thống chiếu sáng:
  - `AmbientLight` màu tím sẫm (`#383454`, cường độ 1.8) lấp đầy các vùng tối.
  - `Key DirectionalLight` màu trắng ấm (`#FFF7FD`, cường độ 2.0) chiếu từ góc trước-trên.
  - `Fill DirectionalLight` màu lavender (`#A78BFA`, cường độ 1.4) giảm độ gắt của bóng đổ.
  - `Rim DirectionalLight` màu cyan-violet (`#818CF8`, cường độ 2.2) từ phía sau tạo đường viền phát sáng đặc trưng anime.

### 4.2. Máy Trạng Thái Hoạt Họa (Animation State Machine — `STATE-003`)
Avatar tự động chuyển đổi trạng thái dựa trên luồng sự kiện AI:

```
[idle] (Thở nhẹ, chớp mắt tự nhiên 3.5s)
   │
   ├─► User gửi tin nhắn ──────────────► [thinking] (Ánh mắt hơi ngước, biểu cảm thư thái)
   │                                          │
   │                                          ├─► Nhận token SSE đầu tiên
   │                                          ▼
   ├─► Hoàn thành câu trả lời ◄─────── [speaking] (Khẩu hình môi dao động theo tần số âm tiết)
   │        │
   │        ▼
   └─► [success] (Mỉm cười tươi vui 2.5s) ──► [idle]
            │
            ▼ (Nếu gặp lỗi)
       [error] (Biểu cảm lo âu/bất ngờ 3s) ──► [idle]
```

- Tư thế nghỉ tự nhiên (Natural Resting Pose): Xương cánh tay được điều chỉnh góc xoay mềm mại dọc theo thân người, loại bỏ hoàn toàn hiện tượng T-pose cứng nhắc.
- Dọn dẹp tài nguyên GPU: Khi component unmount, `VRMUtils.deepDispose()` và `renderer.dispose()` được kích hoạt tự động để giải phóng bộ nhớ WebGL.

---

## 5. Hệ Thống Hoạt Họa Hành Vi Thông Minh & Biên Đạo Cử Chỉ Không Lặp Lại (`FR-054`, `FR-055`, `FR-056`, `UX-012`)

Nhằm nâng cấp nhân vật từ hoạt họa đơn giản thành người bạn đồng hành sống động:

### 5.1. Động Cơ Hoạt Họa Nghỉ Tự Nhiên (`IdleBehaviorEngine`)
- **Thở đa khớp (Multi-Bone Breathing)**: Dao động nhịp nhàng lồng ngực (`chest`), cột sống (`spine`) và vai (`shoulders`), kết hợp nhấp nhô nhẹ của hông (`hips.y = 0.003m`).
- **Chớp mắt ngẫu nhiên có chặn (Randomized Bounded Blinking)**: Khoảng thời gian giữa 2 lần chớp mắt là 2.8s đến 5.5s, thời gian nhắm mở mắt cực nhanh (150ms) theo hàm sin mịn.
- **Vi dao động đầu & Ánh mắt trôi nhẹ (Head Wandering & Gaze Drift)**: Đầu liên tục chuyển động vi mô (yaw, pitch, roll < 0.08 rad), điểm nhìn LookAt trôi nhẹ trong nón góc nhìn hẹp (gaze cone) và định kỳ quay về camera.
- **Tư thế tay nghỉ tự nhiên (Natural Resting Arm Pose)**: Giữ cánh tay xuôi tự nhiên dọc thân mình (`leftUpperArm.z = -1.22`, `rightUpperArm.z = 1.22`), loại bỏ tư thế chữ T/A đơ cứng.
- **Biến thiên Idle định kỳ (Idle Variations)**: Sau mỗi 10-25s rảnh rỗi, tự động thực hiện một hành động nhẹ nhàng: nghiêng đầu tò mò (`curious_tilt`), gật đầu (`gentle_nod`), hít sâu (`deep_breath`), chuyển trọng tâm (`weight_shift`).

### 5.2. Biên Đạo Cử Chỉ Ngữ Cảnh Phản Hồi AI (`ResponseBehaviorPlanner`)
- Phân loại ngữ cảnh cục bộ zero-latency thành 10 ý định: `greeting` (vẫy tay), `explanation` (mở hai tay giải thích), `confirmation` (gật đầu), `question` (nghiêng đầu thắc mắc), `celebration` (nâng hai tay vui mừng), `apology` (cúi chào xin lỗi), `comfort` (đặt tay lên ngực), `warning` (giơ tay cảnh báo), `error` (lo âu), `neutral` (gật đầu nhẹ).
- Cơ chế làm mềm (Envelope): Blend-in (300ms) -> Hold -> Blend-out (400ms) đưa xương trở về resting pose êm dịu, không giật cục.

### 5.3. Động Cơ Biến Thiên Chống Lặp (`VariationEngine`)
- Bộ đệm lịch sử 5 hành động gần nhất.
- Phạt lặp: giảm trọng số hành động vừa chạy xuống `0.15x`, hành động trong cửa sổ lịch sử xuống `0.3x`.
- Cooldown 8s ngăn việc kích hoạt cùng một cử chỉ liên tiếp.
- Kiểm tra năng lực xương/biểu cảm của mô hình để loại bỏ cử chỉ không hỗ trợ.
- Tự động hạ biên độ chuyển động khi người dùng kích hoạt `prefers-reduced-motion`.

