# Quản lý Upload Hằng Ngày

Web app cá nhân để theo dõi số lượng design đã upload mỗi ngày cho từng tài khoản
Redbubble và TeePublic, với logic reset khác nhau theo từng nền tảng. Truy cập được
từ nhiều thiết bị (điện thoại, máy tính) vì dữ liệu nằm trên database chung (Neon),
không phải file local.

> **Đọc file này trước khi sửa bất cứ gì.** Nó là nguồn thông tin đầy đủ nhất về dự
> án — quyết định kỹ thuật, lý do đằng sau, lịch sử các lỗi đã sửa. Xem thêm rule bắt
> buộc ở cuối file.

## Repo & deploy hiện tại

- **GitHub**: https://github.com/lvquang98vp/quan-ly-upload-hang-ngay (branch `main`,
  push lên là Vercel tự deploy lại).
- **Hosting**: Vercel, 1 project duy nhất (đã từng bị tạo trùng 2 project do import
  GitHub 2 lần — đã xoá bớt, chỉ giữ 1).
- **Database**: Postgres trên **Neon** (free tier) — dùng chung 1 database cho cả
  local dev lẫn production (không có database riêng cho local), để dữ liệu nhất
  quán mọi lúc.

## Tech stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript.
- **Tailwind CSS v4**.
- **Prisma 6.19.3** + Postgres (Neon). Cố định version 6.x vì Prisma 7 (bản mới nhất
  lúc viết README này) đổi cách cấu hình datasource, không tương thích ngược — không
  nâng cấp lên Prisma 7 trừ khi có lý do rõ ràng và migrate schema cẩn thận.
- Không dùng thư viện timezone ngoài (date-fns-tz, luxon...) — Việt Nam có offset cố
  định UTC+7, không có DST, nên chỉ cần cộng/trừ mili-giây thủ công
  ([src/lib/timezone.ts](src/lib/timezone.ts)).

## Cấu trúc thư mục

```
prisma/schema.prisma          # Account, UploadEntry (2 bảng, xem bên dưới)
src/lib/
  types.ts                    # Platform, AccountWithCount, UploadEntryView
  timezone.ts                 # Tính boundary reset Redbubble / window TeePublic
  auth.ts                     # Hash password (Web Crypto, chạy được cả Edge lẫn Node)
  prisma.ts                   # Prisma client singleton
  format.ts                   # Format HH:MM:SS cho countdown
  extensionBridge.ts          # Gửi lệnh đồng bộ sang extension qua chrome.runtime
  storeLink.ts                # Tách username từ URL store (Redbubble/TeePublic)
src/proxy.ts                  # Middleware bảo vệ trang bằng APP_PASSWORD (Next 16
                               # đổi tên quy ước "middleware.ts" -> "proxy.ts")
src/app/
  page.tsx                    # Render UploadDashboard
  login/page.tsx              # Trang nhập mật khẩu
  api/accounts/route.ts       # GET (danh sách + tính toán), POST (tạo account)
  api/accounts/[id]/route.ts  # DELETE (xoá account), PATCH (sửa storeLink)
  api/uploads/confirm/route.ts# POST — tạo 1 UploadEntry mới (dùng cho cả 2 nền tảng)
  api/uploads/[id]/route.ts   # DELETE — xoá 1 entry cụ thể (dùng cho "Hoàn tác")
  api/login/route.ts          # POST — kiểm tra APP_PASSWORD, set cookie
  api/sync/designs/route.ts   # POST — lưu kết quả đồng bộ tổng design do extension gửi
src/components/
  UploadDashboard.tsx         # State chính, gọi API, optimistic update, nút Đồng bộ
  PlatformStats.tsx           # 2 stat tile đếm số tài khoản theo nền tảng
  AccountsTable.tsx           # UI chính — bảng (desktop) + card (mobile) song song
  StoreLinkCell.tsx           # Username/link store: click mở tab, double-click sửa
  SyncButton.tsx              # Icon đồng bộ (↻) dùng lại ở nhiều chỗ
  Countdown.tsx               # Đếm ngược HH:MM:SS, tick mỗi giây
  ui/Button.tsx                # Button dùng chung: variant × size
  ui/Badge.tsx                 # PlatformBadge dùng chung
extension/                    # Extension Chrome riêng (project tách biệt, xem bên dưới)
  manifest.json, background.js, README.md
```

## Mô hình dữ liệu

```prisma
model Account {
  id                   String        @id @default(cuid())
  code                 String        @unique   // vd "Red-1", "Tee-10"
  platform             String                  // "REDBUBBLE" | "TEEPUBLIC", validate ở app code
  storeLink            String?
  totalDesigns         Int?                    // tổng design lifetime, từ lần đồng bộ gần nhất
  totalDesignsSyncedAt DateTime?
  createdAt            DateTime      @default(now())
  entries              UploadEntry[]
}

model UploadEntry {
  id         String   @id @default(cuid())
  accountId  String
  quantity   Int
  uploadedAt DateTime @default(now())
}
```

`platform` là string thường (không phải enum Postgres) — quyết định này có từ lúc
schema còn dùng SQLite (không hỗ trợ enum) và giữ nguyên khi chuyển sang Postgres để
không phải sửa lại `isPlatform()` và toàn bộ code liên quan. Không cần đổi trừ khi có
lý do cụ thể.

## Logic nghiệp vụ — quan trọng, đừng sửa nhầm

### Redbubble — reset cố định 14:00 giờ VN

- Mốc reset gần nhất = 14:00 hôm nay nếu giờ hiện tại (VN) ≥ 14:00, ngược lại là
  14:00 hôm qua.
- Số lượng hiển thị = **tổng cộng dồn** tất cả `UploadEntry` của account đó có
  `uploadedAt >= mốc_reset_gần_nhất`. Mỗi lần bấm "Ghi" chỉ tạo 1 entry mới, UI gộp
  chúng lại thành 1 dòng duy nhất hiển thị tổng.
- Xem [getRedbubbleResetBoundary()](src/lib/timezone.ts).

### TeePublic — sliding window 24h theo từng lần upload

- **Không cộng dồn theo yêu cầu người dùng** — mỗi lần "Ghi" là 1 dòng riêng trong
  bảng, với đồng hồ đếm ngược 24h riêng (`dropAt = uploadedAt + 24h`). Khi hết hạn,
  dòng đó tự biến mất khỏi tính toán (không cần cron job — chỉ cần filter theo thời
  gian mỗi lần query).
- Việc UI hiển thị nhiều dòng cho 1 account là **cố ý**, không phải bug — xem
  `AccountsTable.tsx`, đoạn `rowSpan` cho cột Tài khoản/Link store/Nền tảng/Nhập
  upload mới/Xoá (dùng chung cho cả nhóm dòng), còn Số lượng/Đếm ngược/Hoàn tác là
  riêng từng dòng.

### Hoàn tác (Undo)

- Xoá đúng 1 `UploadEntry` cụ thể qua `DELETE /api/uploads/[id]`. Vì số liệu và
  countdown đều **tính lại từ dữ liệu còn trong DB** mỗi lần load (không lưu state
  trung gian), xoá 1 entry tự động làm đúng lại mọi con số liên quan — không cần
  logic "khôi phục" riêng.
- Có popup xác nhận "Có/Không" ngay dưới nút Hoàn tác (không dùng `window.confirm` vì
  không đẹp và không đồng bộ style) trước khi thực sự gọi API xoá.

### Dọn dữ liệu cũ

- Entry cũ hơn 48h không bao giờ được đọc bởi logic của 2 nền tảng (Redbubble nhìn
  lại tối đa ~24h, TeePublic nhìn lại đúng 24h) — dọn dẹp **không ảnh hưởng tính
  đúng**, chỉ là vệ sinh storage.
- Vì vậy cleanup **không** chạy trên `GET /api/accounts` (endpoint bị gọi nhiều nhất —
  mỗi lần load trang + poll 60s), mà chạy ngẫu nhiên (~5% số lần) trong
  `POST /api/uploads/confirm` — xem lịch sử sửa lỗi latency bên dưới.

## Hiệu năng — quyết định quan trọng, đừng revert

Neon nằm ở Mỹ (region us-east-2), mỗi round-trip từ Việt Nam tốn thật sự
400ms–1s+. Ban đầu bấm "Ghi" phải chờ hết round-trip (tạo entry → tải lại toàn bộ
danh sách) mới thấy số cập nhật — cảm giác delay rõ rệt, người dùng đã phàn nàn.

Đã sửa bằng **optimistic UI update** trong `UploadDashboard.tsx`
(`handleAddQuantity`, `handleUndo`): cập nhật state React ngay khi bấm nút, trước
khi gọi API — số nhảy lên tức thì, còn network request chạy nền phía sau để đồng bộ
thật với server. Nếu request lỗi thì mới gọi `load()` để rollback về đúng dữ liệu
server. **Đừng bỏ optimistic update này để "đơn giản hoá code"** — nó là fix trực
tiếp cho vấn đề UX đã được người dùng xác nhận.

## Auth

Bảo vệ bằng 1 password đơn giản qua biến `APP_PASSWORD`:

- Để trống → trang mở tự do, không cần đăng nhập.
- Có set → `src/proxy.ts` (chạy trên mọi request nhờ Next.js middleware/proxy
  convention) redirect về `/login` nếu cookie `app_auth` không khớp hash SHA-256 của
  password. Dùng Web Crypto (`crypto.subtle`) thay vì Node `crypto` module vì cần
  chạy được cả ở Edge runtime lẫn Node runtime.

## Giao diện

### Hệ thống UI dùng chung

`src/components/ui/` chứa các primitive tái sử dụng để đồng nhất style toàn app
(thay vì mỗi nơi tự viết className riêng):

- `Button.tsx` — 4 variant (`primary`/`secondary`/`danger`/`ghost`) × 3 size
  (`sm`/`md`/`icon`). Icon action (Xoá, đồng bộ...) dùng `variant="ghost" size="icon"`.
- `Badge.tsx` — `<PlatformBadge platform={...} />`, độ rộng cố định để 2 nền tảng
  luôn thẳng hàng.

Icon dùng [lucide-react](https://lucide.dev) (tree-shakeable, chỉ bundle icon nào
import) thay vì tự vẽ SVG hay dùng chữ — chuẩn phổ biến cho UI kiểu SaaS/dashboard.

### Responsive: bảng trên desktop, card trên mobile

`AccountsTable.tsx` render **2 layout song song trong cùng DOM**, ẩn/hiện bằng CSS
(`hidden md:block` cho bảng, `md:hidden` cho card — breakpoint `md` = 768px), không
phải 1 bảng cố gắng tự co giãn:

- **Desktop**: bảng như cũ nhưng gọn hơn — bỏ cột "Link store" và "Hoàn tác" riêng
  (gộp vào ô Tài khoản và ô Đếm ngược tương ứng), icon thay chữ cho các hành động.
- **Mobile**: mỗi account là 1 card xếp dọc, không cần cuộn ngang. Đây là fix cho
  vấn đề đã phát hiện từ bản đầu (bảng rộng ~745px trên màn hình 375px, phải cuộn
  ngang mới bấm được nút "Ghi" — đúng chỗ dùng nhiều nhất mỗi ngày).
- Lý do chọn "2 layout song song" thay vì 1 bảng reflow bằng CSS: bảng có
  `rowSpan` cho nhóm nhiều dòng TeePublic (xem mục sliding-window ở trên) — reflow
   `<table>` thành block bằng CSS mất hết ngữ nghĩa rowSpan, JS-free 2-layout đơn
  giản và chắc chắn hơn.
- Cả 2 layout dùng chung state/handler (`inputs`, `rowError`, `syncingId`,
  `confirmingEntryId`...) và chung các sub-component nội bộ (`StoreCell`,
  `UndoControl`, `QuantityForm`) định nghĩa ngay trong `AccountsTable.tsx` — không
  lặp code logic, chỉ khác phần JSX hiển thị.

### Các điểm khác

- 2 **stat tile** ở đầu trang ([PlatformStats.tsx](src/components/PlatformStats.tsx))
  hiện số lượng tài khoản theo từng nền tảng, đếm trực tiếp từ mảng `accounts` đã
  tải (không gọi API riêng).
- Sắp xếp theo bảng chữ cái (`orderBy: { code: "asc" }` ở API).
- Ô tìm kiếm lọc theo mã tài khoản (client-side, không gọi API).
- Username tách ra từ URL thay vì chữ "Link store" chung chung
  (`extractStoreUsername()` trong [src/lib/storeLink.ts](src/lib/storeLink.ts) —
  Redbubble lấy phần sau `/people/`, TeePublic lấy phần sau `/user/`; fallback về
  chữ "Link store" nếu URL không khớp pattern). Click mở tab mới, double-click sửa
  link — xử lý bằng mốc thời gian, không dùng `setTimeout` debounce (xem lịch sử
  lỗi bên dưới, từng có bug popup bị chặn ở đây).
- Cột/dòng "Đếm ngược": chỉ hiện giờ chạy trần (HH:MM:SS), trống hoàn toàn nếu
  chưa có upload nào trong cửa sổ hiện tại.
- Dòng cuối cùng dùng để thêm tài khoản mới (mã + link + chọn nền tảng).

## Chạy local

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Mở http://localhost:3000. `.env` đã trỏ thẳng vào Neon (cùng database với
production) — **cẩn thận khi test, dữ liệu bạn thêm/xoá local sẽ ảnh hưởng luôn tới
bản đang chạy thật.**

## Cấu hình / biến môi trường

- `.env` → `DATABASE_URL` (connection string Neon, có `-pooler` trong hostname —
  **đừng đổi sang non-pooled endpoint**, pooled connection cần thiết cho môi trường
  serverless của Vercel).
- `.env.local` → `APP_PASSWORD` (tuỳ chọn), `NEXT_PUBLIC_SYNC_EXTENSION_ID` (ID
  extension đồng bộ số design — xem mục "Đồng bộ tổng số design" ở trên).
- Trên Vercel: khai báo y hệt các biến trên trong Project Settings → Environment
  Variables → "Production and Preview".

`package.json` có `postinstall: prisma generate` và `build: prisma generate && next
build` — **bắt buộc phải có**, thiếu là build fail trên Vercel (mỗi lần deploy cài
`node_modules` mới hoàn toàn, cần lệnh này để tạo lại Prisma Client khớp schema).

## Lịch sử các lỗi đã gặp & đã sửa (đọc để không lặp lại)

- **Đường dẫn SQLite lồng nhau**: `DATABASE_URL="file:./prisma/dev.db"` khi
  schema.prisma nằm trong `prisma/` sẽ tạo ra `prisma/prisma/dev.db` (Prisma resolve
  path SQLite tương đối theo vị trí file schema, không phải theo cwd). Đã hết liên
  quan từ khi chuyển sang Postgres/Neon nhưng ghi lại phòng khi quay lại dùng SQLite.
- **Prisma 7 không tương thích**: bản mới nhất lúc cài lần đầu là 7.0.0-rc, đổi cách
  khai báo datasource (bỏ `url` trong schema, cần `prisma.config.ts` + driver
  adapter) — gây lỗi migrate. Đã pin về 6.19.3 (bản ổn định cuối của nhánh 6.x).
- **Next.js 16 đổi `middleware.ts` → `proxy.ts`**: file/export vẫn hoạt động với tên
  cũ nhưng bị deprecate, đã đổi tên file + export function thành `proxy` theo quy
  ước mới.
- **Cache `.next` cũ gây lỗi "Module not found"** sau khi xoá component: `next dev`
  đôi khi giữ cache tham chiếu tới file đã xoá. Fix: `rm -rf .next` trước khi chạy
  lại dev server sau khi xoá/đổi tên file lớn.
- **`window.open()` bị chặn popup**: bản đầu của `StoreLinkCell` dùng `setTimeout` để
  phân biệt click/double-click, khiến `window.open()` chạy ngoài user-gesture đồng
  bộ → bị trình duyệt chặn làm popup (ảnh hưởng cả người dùng thật, không chỉ môi
  trường test). Fix: mở link ngay trong handler `onClick` (đồng bộ), chỉ dùng mốc
  thời gian (`Date.now()` so sánh) để bỏ qua click thứ 2 của 1 double-click, không
  dùng `setTimeout` delay việc mở link.
- **Header bảng bị lệch ("nghiêng")**: text header viết hoa (`uppercase`) trong cột
  hẹp bị wrap 2 dòng ở điểm khác nhau giữa các cột → đường viền dưới header trông như
  bậc thang. Fix: `whitespace-nowrap` cho toàn bộ `<th>`.
- **Delay cảm nhận rõ giữa bấm "Ghi" và số cập nhật**: xem mục "Hiệu năng" ở trên.
- **`fetch()` Node.js bị Redbubble trả 403, `curl` cùng URL/header lại pass**: chặn ở
  tầng fingerprint TLS/HTTP, không phải User-Agent hay tần suất gọi. Test thêm cho
  thấy tỉ lệ pass/fail còn **không ổn định giữa các lần chạy** với cùng URL (giống
  chấm điểm xác suất của Cloudflare) — thêm delay giữa các request không giải quyết
  được, có lần còn tệ hơn (0/13 account thay vì 6/13). Kết luận: đây là giới hạn cứng
  của việc gọi từ server Node, không phải bug sửa được bằng code — xem mục "Đồng bộ
  tổng số design" ở trên để biết vì sao phải chuyển hẳn sang extension.

## Đồng bộ tổng số design (Redbubble + TeePublic)

`totalDesigns` là **tổng số design lifetime hiện có trên store** — khác hẳn bản chất
với "Số lượng" (quota upload theo ngày/24h) mà phần lớn README này mô tả. Hiển thị
như 1 dòng phụ nhỏ dưới ô Link store trong bảng (`"186 design"`), không phải cột
riêng, để không làm bảng rộng thêm.

### Vì sao lấy từ extension, không phải server

Đã thử và bỏ 2 cách trước khi tới giải pháp cuối:

1. **Server-side scrape trực tiếp**: cả Redbubble lẫn TeePublic đều server-render sẵn
   số lượng trong HTML thô (`"<n> items"` / `"Designs <n>"`) — tưởng như đơn giản.
   Nhưng test tay phát hiện **`fetch()` của Node.js bị Redbubble trả về 403** ngay cả
   với header giống hệt trình duyệt thật, trong khi `curl` và trình duyệt thật lại
   qua bình thường — tức bị chặn ở tầng fingerprint TLS/HTTP của client, **không sửa
   được bằng code phía server**. TeePublic cũng chặn tương tự, thậm chí nhạy hơn.
2. **Vercel Cron tự động 14:00 giờ VN cho riêng Redbubble**: từng được chốt làm
   phương án chính, đã code xong (route `/api/cron/sync-redbubble` + `vercel.json`),
   nhưng bị **xoá bỏ hoàn toàn** sau phát hiện ở mục 1 — vì chạy trên Vercel (cũng là
   Node.js) sẽ gặp đúng vấn đề 403 y hệt lúc test local, chỉ là muộn hơn. Không có ích
   gì để giữ lại code không dùng được.

**Giải pháp cuối**: extension Chrome riêng tư ([extension/](extension/)) chạy trong
chính trình duyệt thật của người dùng — trình duyệt thật không bị chặn (đã verify:
cả `curl` lẫn navigate thật đều nhận HTTP 200 bình thường).

### Luồng hoạt động

```
Bấm "Đồng bộ" trên web (UploadDashboard.tsx)
  → web gửi {mã acc, link store, nền tảng} của MỌI account có storeLink
    cho extension qua chrome.runtime.sendMessage (externally_connectable)
  → extension mở lần lượt từng link trong tab ẩn (nghỉ 1.5s giữa các lần)
  → đọc số theo đúng pattern của từng nền tảng, đóng tab
  → trả kết quả về cho trang web
  → web POST /api/sync/designs để lưu vào DB (dùng session đăng nhập sẵn có,
    không cần token/mật khẩu riêng cho extension)
```

**Không có gì tự động chạy nền** — đúng như quyết định của người dùng: chỉ đồng bộ
khi chủ động bấm nút, tần suất do người dùng tự kiểm soát (tránh giống hành vi bot
lặp lại liên tục, dù là từ trình duyệt thật).

**Dừng giữa chừng**: nút "Dừng" chỉ hiện khi đang đồng bộ, gửi tin nhắn `STOP_SYNC`
riêng cho extension (`stopSyncViaExtension()`). Extension đặt cờ `cancelRequested`,
kiểm tra cờ này giữa mỗi lần poll và giữa mỗi account — dừng lại trong khoảng 1-2s,
đóng tab đang mở, rồi trả về kết quả **đã đồng bộ được tới lúc đó** (không mất dữ
liệu của các account đã xong trước khi dừng).

**Đồng bộ riêng từng account**: mỗi dòng có link store đều có nút "Đồng bộ" nhỏ
riêng (dùng chung hàm `syncStores()` trong `UploadDashboard.tsx`, chỉ khác mảng
`stores` truyền vào có 1 hay nhiều phần tử) — hữu ích để test/gỡ lỗi 1 account mà
không phải chờ hết cả lượt ~20 account.

### Setup (chỉ cần làm 1 lần, xem chi tiết ở [extension/README.md](extension/README.md))

1. Load unpacked extension từ thư mục `extension/` vào Chrome (Developer mode).
2. Sửa domain thật vào `extension/manifest.json` (`externally_connectable.matches`).
3. Copy ID extension Chrome cấp, set vào biến `NEXT_PUBLIC_SYNC_EXTENSION_ID`
   (`.env.local` + Vercel Environment Variables).

### Bug đã gặp: extension timeout hàng loạt ("Tải trang quá lâu")

Hai lỗi liên tiếp trên cùng 1 cơ chế chờ tab tải xong trong
`extension/background.js`:

1. **Race condition** (đã fix): `waitForTabComplete()` bản đầu chỉ lắng nghe sự kiện
   `chrome.tabs.onUpdated`. Nếu trang tải nhanh/có cache, tab có thể đã đạt
   `"complete"` **trước khi** listener kịp gắn vào (vì `chrome.tabs.create` là async) —
   timeout sau 15s, trả `null` cho mọi account dù extension chạy đúng cơ chế.
2. **Chrome throttle tab nền** (nguyên nhân chính, đã fix bằng cách đổi hẳn chiến
   lược chờ): dù đã fix race condition ở trên, test tay thực tế vẫn timeout **100%**
   với TeePublic và ~40% với Redbubble. Log console cho thấy hầu hết lỗi là
   `"Tải trang quá lâu."` — tức sự kiện `"complete"` **không bao giờ fire** trong
   15s cho phần lớn tab. Nguyên nhân: Chrome tự động **throttle** (ghìm tốc độ) các
   tab nền (`active: false`) khi cửa sổ không ở foreground, khiến việc tải trang
   chậm hẳn so với bình thường — không liên quan gì tới bị chặn bot.

   **Fix**: bỏ hẳn việc chờ sự kiện `"complete"`, thay bằng **poll chủ động**
   (`pollForDesignCount()`) — cứ mỗi giây thử chạy `executeScript` đọc nội dung tab
   1 lần, tới khi nào thấy số thì dừng ngay (không cần quan tâm trang đã "tải xong"
   theo nghĩa đầy đủ hay chưa, vì số cần đọc đã render sẵn trong HTML từ đầu). Vừa
   nhanh hơn ở trường hợp bình thường (không phải chờ đủ 15s), vừa bền hơn ở trường
   hợp bị throttle (tự động chờ lâu hơn, tối đa ~25s, thay vì bỏ cuộc sớm).

## Quy tắc bắt buộc cho mọi thay đổi

Xem [CLAUDE.md](CLAUDE.md) — mọi session/AI làm việc trên project này phải cập nhật
lại README.md này ngay khi có thay đổi, không được để README lạc hậu so với code.
