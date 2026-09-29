# Extension đồng bộ số design (Redbubble + TeePublic)

Extension riêng tư (không public lên Chrome Web Store) — chỉ đọc số design trên
các trang store công khai đã lưu trong app (cả Redbubble lẫn TeePublic), khi được
app yêu cầu qua nút "Đồng bộ". Xem lý do kiến trúc ở [README.md](../README.md) gốc.

**Vì sao cả 2 nền tảng đều dùng extension**: ban đầu định để Redbubble chạy tự
động qua server (cron), nhưng test tay phát hiện `fetch()` của Node.js bị Redbubble
trả về 403 ngay cả với header y hệt trình duyệt thật — trong khi `curl` và trình
duyệt thật lại qua được bình thường. Đây là chặn ở tầng fingerprint TLS/HTTP của
client, không sửa được bằng code phía server. TeePublic cũng chặn tương tự (thậm
chí còn dễ chặn hơn với browser thật lặp lại nhiều lần). Nên **cả 2 nền tảng đều
bắt buộc phải đọc từ trình duyệt thật** — không có cách nào tự động 100% từ server.

## Cài đặt (làm 1 lần)

1. Mở `chrome://extensions` trong Chrome.
2. Bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked**, chọn đúng thư mục `extension/` này.
4. Chrome sẽ cấp cho extension 1 **ID** (chuỗi ký tự dài) — copy lại, hiện ngay
   dưới tên extension trong danh sách.

## Cấu hình

1. **Domain của app**: mở [manifest.json](manifest.json), sửa dòng
   `"https://REPLACE-WITH-YOUR-VERCEL-DOMAIN/*"` thành đúng domain Vercel thật của
   bạn (vd `"https://quan-ly-upload-hang-ngay.vercel.app/*"`). Sau khi sửa, quay lại
   `chrome://extensions` bấm nút **reload** (biểu tượng vòng tròn) trên card
   extension để áp dụng.
2. **ID extension vào app**: thêm biến môi trường `NEXT_PUBLIC_SYNC_EXTENSION_ID`
   = ID vừa copy ở bước cài đặt, vào cả `.env.local` (local dev) và Environment
   Variables trên Vercel (production), rồi deploy lại.

## Cách hoạt động

- Bấm nút "Đồng bộ" trên app → trang web gửi tin nhắn tới extension kèm danh sách
  `{mã acc, link store, nền tảng}` của **mọi** account có sẵn link store (cả
  Redbubble lẫn TeePublic).
- Extension mở lần lượt từng link trong **tab ẩn** (không nổi lên màn hình, không
  làm gián đoạn bạn), đọc đúng số theo từng nền tảng (Redbubble: `"X items"`,
  TeePublic: `"Designs X"`), đóng tab, rồi mới sang link tiếp theo (nghỉ 1.5s giữa
  các lần — tránh giống hành vi bot).
- Kết quả trả về cho trang web, trang web tự lưu vào database qua API sẵn có của
  app (không cần token/mật khẩu riêng cho extension — vì đây là app đang đăng nhập
  sẵn của chính bạn gọi API, không phải extension gọi thẳng).

## Vì sao không tự động chạy nền 24/7

Cả 2 nền tảng đều nhạy với truy cập tự động lặp lại. Cách an toàn nhất là chỉ chạy
khi **bạn chủ động bấm "Đồng bộ"**, giữ tần suất thấp và có chủ đích — không có
cách nào chạy nền âm thầm suốt ngày mà không tăng rủi ro bị chặn.

## Gỡ lỗi

- Nếu bấm "Đồng bộ" mà không có gì cập nhật: mở `chrome://extensions`, bấm
  **Errors** (nếu có) hoặc **service worker** (link "Inspect views") trên card
  extension để xem console log.
- Extension chỉ hoạt động khi trang app đang mở đúng domain đã khai báo trong
  `externally_connectable.matches` của `manifest.json`.
