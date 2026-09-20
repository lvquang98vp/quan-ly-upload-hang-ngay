## Quản lý Upload Hằng Ngày

Theo dõi số lượng design đã upload mỗi ngày cho từng tài khoản Redbubble và TeePublic:

- **Redbubble**: đếm reset về 0 lúc **14:00 giờ Việt Nam** mỗi ngày.
- **TeePublic**: mỗi lần upload có cửa sổ trượt **24 giờ** riêng, tự động rơi ra khỏi tổng khi hết hạn.

### Chạy local

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Mở http://localhost:3000.

### Cấu hình

- `.env` chứa `DATABASE_URL` cho Prisma — trỏ tới database Postgres trên **Neon** (free tier), dùng chung cho cả local dev lẫn production, để dữ liệu nhất quán ở mọi nơi.
- `.env.local` chứa `APP_PASSWORD` — đặt một mật khẩu bất kỳ để bảo vệ trang bằng cookie; để trống thì trang mở tự do (không cần đăng nhập).

### Deploy lên Vercel

Database đã sẵn sàng cho production (Postgres/Neon, không phải SQLite file), nên chỉ cần:

1. Đẩy code lên GitHub.
2. Import repo vào Vercel.
3. Trong Vercel project → Settings → Environment Variables, khai báo `DATABASE_URL` (copy nguyên giá trị từ `.env` local) và `APP_PASSWORD` nếu muốn bảo vệ trang.
4. Deploy — mọi thiết bị truy cập vào link Vercel đều đọc/ghi chung một database trên Neon.

Không cần chạy lại `prisma migrate` khi deploy vì bảng đã được tạo sẵn trên Neon từ máy local.

### Giao diện

Một bảng duy nhất (kiểu Excel) liệt kê tất cả tài khoản, sắp xếp theo bảng chữ cái, có tag phân biệt Redbubble/TeePublic:

- Ô tìm kiếm ở đầu bảng để lọc nhanh theo mã tài khoản.
- Mỗi dòng có ô nhập số lượng riêng — gõ số design vừa upload rồi bấm "Ghi" (hoặc Enter) để **cộng dồn** vào tổng hiện tại.
- Dòng cuối bảng dùng để thêm tài khoản mới (mã + chọn nền tảng).
- Nút "Xoá" ở cuối mỗi dòng để xoá tài khoản và toàn bộ dữ liệu upload liên quan.
