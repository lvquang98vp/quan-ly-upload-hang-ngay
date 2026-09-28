# Hướng dẫn cho AI làm việc trên project này

## Đọc trước

**Đọc [README.md](README.md) trước khi làm bất cứ việc gì.** File đó chứa toàn bộ
kiến trúc, logic nghiệp vụ, các quyết định kỹ thuật kèm lý do, lịch sử lỗi đã sửa, và
danh sách ý tưởng đã bàn nhưng chưa code. Đừng suy đoán lại từ đầu những gì đã ghi ở
đó.

## Quy tắc bắt buộc: luôn đồng bộ README.md

**Bất kỳ thay đổi nào sau đây đều phải cập nhật lại README.md trong cùng phiên làm
việc, trước khi coi task là xong:**

- Thêm/sửa/xoá tính năng, thay đổi hành vi UI hoặc logic nghiệp vụ.
- Đổi kiến trúc, đổi thư viện, đổi phiên bản package quan trọng (Next.js, Prisma...).
- Đổi cấu trúc database (schema Prisma), thêm/sửa API endpoint.
- Đổi cấu hình deploy, biến môi trường, hoặc quy trình build.
- Sửa 1 bug đủ "ngầm" để người sau dễ mắc lại (thêm vào mục "Lịch sử các lỗi đã gặp").
- Thảo luận ra 1 ý tưởng/kiến trúc mới nhưng chưa code (thêm vào mục "Ý tưởng đã bàn
  nhưng CHƯA implement" — để AI sau không tưởng nhầm là đã có, hoặc không đề xuất lại
  y hệt từ đầu).

**Không đúng đâu là để README "tự động đúng" vì code đã đúng** — nếu không chủ động
sửa README thì nó sẽ lạc hậu. Coi việc cập nhật README là một phần của task, không
phải việc phụ có thể bỏ qua khi hết thời gian.

Ngoại lệ: sửa lỗi chính tả, đổi tên biến nội bộ không ảnh hưởng hành vi, hoặc các
thay đổi thuần refactor không đổi kiến trúc/API/UI thì không bắt buộc phải ghi vào
README.

## Ngôn ngữ

Người dùng giao tiếp bằng tiếng Việt. Giữ README bằng tiếng Việt để nhất quán.
