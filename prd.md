# HomeEase: MERN Implementation Blueprint (v2)

HomeEase is a full-stack **home-service broker marketplace** for one city (Bengaluru). Independent
professionals list services from the platform catalog at their own prices, the platform matches
customers to an available professional automatically, and administrators run the marketplace.

HomeEase is a broker, not an employer. It does not supply professionals; it connects customers with
independent professionals, enforces fair and safe booking, and records simulated payments.

### What changed from v1

| Area | v1 | v2 |
|---|---|---|
| Business model | Platform supplies professionals | Broker marketplace of independent professionals |
| Code style | ES5, `var`, callbacks, CommonJS | Modern JS, ES modules, `async/await` |
| React | No JSX | Still no JSX, but function components + hooks |
| Pricing | Fixed price per service | Admin sets a min to max range, each professional sets their own price |
| Booking | Booked and confirmed instantly | Engine holds a slot, customer reviews professional and price, then confirms |
| Professional signup | Customer applies, role converts | Separate professional signup, one role per account |
| Professional hours | Unspecified | Three presets, fully customisable |
| Decline | Not possible | Professional can decline, engine reassigns automatically |
| Scope | Included complaints, invoices, earnings, analytics | Core flow only; those are deferred |
| Database | Local or Atlas | Docker Compose MongoDB replica set |

## 1. Project configuration

| Decision | Choice |
|---|---|
| Frontend | React (function components + hooks) via `React.createElement`, no JSX |
| Routing and UI | React Router, Bootstrap |
| Build tool | Vite |
| Language | JavaScript, ES modules (`import` / `export`) everywhere |
| Backend | Node.js (current LTS) + Express 5 |
| Database | MongoDB replica set (Docker Compose) + Mongoose |
| Auth | bcrypt-hashed (salted) passwords, JWT stored in an HttpOnly cookie |
| Roles | Customer, Professional, Admin (exactly one per account) |
| Matching | Automatic assignment with slot hold, then customer confirmation |
| Payments | Simulated (cash or mock online) behind a pluggable provider interface |
| Coverage | Bengaluru, by PIN code |
| Architecture | Modular monolith, three modules (Identity, Catalog, Booking) |
| API | REST + JSON under `/api/v1` |
| Validation and tests | Hand-written validators, manual testing with Postman (no libraries in v1) |

## 2. Coding conventions

- **ES modules only.** `"type": "module"` in both `package.json` files. Use `import` / `export`,
  never `require()` or `module.exports`.
- **Relative imports include the extension:** `import app from "./app.js"`.
- **`async/await` for all I/O** (MongoDB, bcrypt, JWT). Callbacks only where the API is built on
  them: Express middleware `(req, res, next)`, event handlers, array methods, timers. Never mix
  promise chains, callbacks and `await` inside one function.
- **Express 5** forwards errors thrown in async handlers to the error middleware, so no
  `try/catch` wrapper is needed in every route.
- **React without JSX:** `const e = React.createElement;`, function components, hooks
  (`useState`, `useEffect`, `useContext`, `useNavigate`). Files are plain `.js`.
- `const` / `let`, arrow functions, destructuring and template literals are all allowed.
- Layering: **routes -> controllers -> services -> models**. Controllers parse and validate the
  request and shape the response; services hold business logic; models hold schema only.
- Validation is hand-written, one `validators.js` per module, returning a list of field errors.

## 3. Roles

| Role | How the account is created | Main abilities |
|---|---|---|
| Customer | `Register` page | Browse services, manage addresses, book, confirm, cancel, pay (mock), review |
| Professional | `Join as professional` page; account is `pending` until an admin approves | Choose services and set prices, set hours and PIN codes, manage jobs, decline jobs |
| Admin | Seed script only | Approve or reject professionals, suspend professionals, manage catalog and service areas, view and reassign bookings |

An account holds exactly one role. A customer cannot become a professional on the same account;
a professional who also wants to book services registers a separate customer account.

The client never sends a role. Each signup endpoint fixes the role on the server.

## 4. Workflows

### Customer
1. Registers or logs in.
2. Browses categories and services (sees each service's price range).
3. Picks a service, a saved address, a date, and one of the offered start times.
4. Engine assigns a professional and **holds** the slot for 5 minutes.
5. Customer sees the professional's name, rating and price, then **confirms** (or lets it expire).
6. Professional starts and completes the job.
7. Customer pays (cash to the professional, or mock online) and can leave one review.

### Professional
1. Signs up via "Join as professional" with experience details. Account status: `pending`.
2. While pending, can log in, pick an hours preset, edit hours, choose PIN codes and add offerings,
   but receives no bookings.
3. Admin approves (now eligible for assignment) or rejects with a reason.
4. Sees assigned jobs, marks them `in_progress` then `completed`, records cash when paid in cash.
5. Can decline a confirmed job up to 2 hours before it starts; the engine reassigns it.

### Admin
1. Reviews pending professionals; approves or rejects.
2. Manages categories, services (with price ranges) and serviceable PIN codes.
3. Views all bookings, reassigns a booking, suspends a professional (their upcoming bookings are
   reassigned automatically).
4. Sees basic dashboard counts.

## 5. Scope

**In v1:** customer and professional signup, login, roles, professional approval, catalog,
service areas, professional offerings and pricing, working hours with presets, availability
search, automatic assignment with hold and confirm, cancellation, professional decline, admin
reassign and suspend, simulated payments, reviews and ratings, basic admin dashboard counts.

**Deferred:** complaints and disputes, invoices, professional earnings and platform commission,
analytics charts, real payment gateway, refunds, chat, live tracking, notifications, document
uploads, recommendations, dynamic pricing, multiple cities.

## 6. Data model

All collections use ObjectId references, `timestamps: true`, and Mongoose schema validation.
**`professionalId` always refers to `professionals._id`** (the profile), never to `users._id`.

### `users` (Identity)

| Field | Type | Rule |
|---|---|---|
| `name` | String | Required |
| `email` | String | Required, unique, lowercase, trimmed |
| `passwordHash` | String | Required, `select: false`, never returned |
| `phone` | String | Required, 10 digits |
| `role` | String | `customer`, `professional`, `admin` |
| `isActive` | Boolean | Default `true`; `false` blocks login |
| `addresses` | [Address] | Customers only, embedded |

Address sub-document: `_id`, `label`, `line1`, `line2`, `landmark`, `city`, `pincode`, `isDefault`.

### `professionals` (Identity owns approval; Catalog owns hours and PIN codes)

| Field | Type | Rule |
|---|---|---|
| `userId` | ObjectId -> users | Required, unique |
| `approvalStatus` | String | `pending`, `approved`, `rejected` |
| `rejectionReason` | String | Set on rejection |
| `reviewedBy`, `reviewedAt` | ObjectId, Date | Admin who decided, when |
| `experienceYears` | Number | Required, min 0 |
| `bio` | String | Optional |
| `servicePincodes` | [String] | Each must exist in `serviceAreas` and be active |
| `workingHours` | Object | One entry per weekday, see below |
| `isActive` | Boolean | Default `true`; admin suspension sets `false` |
| `ratingSum`, `ratingCount` | Number | Default 0; average = sum / count |

`workingHours` shape (times are IST, `HH:mm`, on the 30-minute grid):

```json
{
  "mon": { "isWorking": true,  "start": "09:00", "end": "18:00" },
  "tue": { "isWorking": true,  "start": "09:00", "end": "18:00" },
  "wed": { "isWorking": true,  "start": "09:00", "end": "18:00" },
  "thu": { "isWorking": true,  "start": "09:00", "end": "18:00" },
  "fri": { "isWorking": true,  "start": "09:00", "end": "18:00" },
  "sat": { "isWorking": false, "start": "09:00", "end": "18:00" },
  "sun": { "isWorking": false, "start": "09:00", "end": "18:00" }
}
```

Presets (applied by copying into `workingHours`, then freely editable):

| Preset | Days | Hours |
|---|---|---|
| `weekdays` | Mon to Fri | 09:00 to 18:00 |
| `all_week` | Mon to Sun | 09:00 to 18:00 |
| `weekends` | Sat, Sun | 09:00 to 18:00 |

Changing hours affects only future assignments; existing bookings are kept.

### `categories` (Catalog)

`name`, `slug` (unique), `description`, `imageUrl`, `isActive`.

Six initial categories: AC servicing, cleaning, painting, plumbing, electrical, appliance repair.

### `services` (Catalog)

| Field | Type | Rule |
|---|---|---|
| `categoryId` | ObjectId -> categories | Required |
| `name`, `slug` | String | Required, slug unique |
| `description`, `imageUrl` | String | Optional |
| `durationMinutes` | Number | Required, multiple of 30 |
| `minPrice`, `maxPrice` | Number | Required, `0 < minPrice <= maxPrice` (rupees) |
| `isActive` | Boolean | Default `true` |

### `offerings` (Catalog)

Which services a professional provides, and at what price.

| Field | Type | Rule |
|---|---|---|
| `professionalId` | ObjectId -> professionals | Required |
| `serviceId` | ObjectId -> services | Required |
| `price` | Number | Required, within the service's `minPrice` to `maxPrice` |
| `isActive` | Boolean | Default `true` |

If an admin narrows a service's price range, offerings outside it are set `isActive: false` until
the professional updates their price.

### `serviceAreas` (Catalog)

`city` (default `Bengaluru`), `pincode` (unique, 6 digits), `isActive`.

### `bookings` (Booking)

| Field | Type | Purpose |
|---|---|---|
| `customerId` | ObjectId -> users | Owner |
| `professionalId` | ObjectId -> professionals | Currently assigned professional |
| `serviceId`, `offeringId` | ObjectId | What was booked, from whom |
| `serviceSnapshot` | Object | `name`, `durationMinutes` at booking time |
| `price` | Number | Agreed price, copied from the offering |
| `addressSnapshot` | Object | Full address copied from the customer's saved address |
| `pincode` | String | Service PIN code |
| `startAt`, `endAt` | Date (UTC) | Reserved interval |
| `status` | String | See section 9 |
| `holdExpiresAt` | Date | Set while `held` |
| `declinedBy` | [ObjectId] | Professionals who declined; excluded from reassignment |
| `cancelledBy` | String | `customer`, `system`, `admin` |
| `cancellationReason` | String | Optional |
| `confirmedAt`, `startedAt`, `completedAt` | Date | Lifecycle timestamps |
| `paymentMethod` | String | `cash` or `mock_online`, set when paid |
| `paymentStatus` | String | `unpaid`, `paid` |

### `slotReservations` (Booking)

One document per 30-minute unit a professional is reserved for. A 90-minute booking writes three.

| Field | Type | Purpose |
|---|---|---|
| `bookingId` | ObjectId -> bookings | Owner |
| `professionalId` | ObjectId -> professionals | Who is reserved |
| `slotStart` | Date (UTC) | Start of the 30-minute unit |
| `expiresAt` | Date or null | Hold expiry; `null` once confirmed |

### `payments` (Booking)

`bookingId`, `amount`, `method` (`cash`, `mock_online`), `provider` (`mock`), `status` (`success`,
`failed`), `providerTransactionId`, `paidAt`.

### `reviews` (Booking)

`bookingId` (unique), `customerId`, `professionalId`, `rating` (integer 1 to 5), `comment`.

### Indexes

| Collection | Index | Why |
|---|---|---|
| `users` | `{ email: 1 }` unique | One account per email |
| `categories`, `services` | `{ slug: 1 }` unique | Clean URLs |
| `serviceAreas` | `{ pincode: 1 }` unique | One row per PIN code |
| `professionals` | `{ userId: 1 }` unique | One profile per user |
| `professionals` | `{ approvalStatus: 1, isActive: 1, servicePincodes: 1 }` | Candidate filtering |
| `offerings` | `{ professionalId: 1, serviceId: 1 }` unique | One price per pro per service |
| `offerings` | `{ serviceId: 1, isActive: 1 }` | Candidate filtering |
| `slotReservations` | `{ professionalId: 1, slotStart: 1 }` **unique** | **Prevents double booking** |
| `slotReservations` | `{ bookingId: 1 }` | Release on cancel or reassign |
| `bookings` | `{ customerId: 1, startAt: -1 }` | Customer history |
| `bookings` | `{ professionalId: 1, startAt: 1 }` | Pro schedule and workload |
| `bookings` | `{ status: 1, holdExpiresAt: 1 }` | Hold sweeper |
| `payments` | `{ bookingId: 1 }` unique, partial on `status: "success"` | At most one successful payment |
| `reviews` | `{ bookingId: 1 }` unique | One review per booking |

## 7. REST API

### Response envelope

Success:

```json
{ "success": true, "data": {}, "message": "Booking confirmed" }
```

Paginated lists put `items`, `page`, `limit`, `total` inside `data`.

Error:

```json
{ "success": false, "error": { "code": "SLOT_UNAVAILABLE", "message": "No professional is available for this slot" } }
```

Validation errors add `"fields": { "email": "Email is required" }` inside `error`.

| HTTP | When | Example codes |
|---|---|---|
| 200 / 201 | Success / created | |
| 400 | Invalid input | `VALIDATION_ERROR`, `PRICE_OUT_OF_RANGE`, `INVALID_SLOT` |
| 401 | Not logged in | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | Wrong role or not allowed | `FORBIDDEN`, `ACCOUNT_PENDING`, `ACCOUNT_INACTIVE` |
| 404 | Missing record | `NOT_FOUND` |
| 409 | Conflict with current state | `EMAIL_TAKEN`, `SLOT_UNAVAILABLE`, `HOLD_EXPIRED`, `INVALID_STATUS_TRANSITION`, `ALREADY_PAID`, `ALREADY_REVIEWED`, `ACTIVE_HOLD_EXISTS`, `CUTOFF_PASSED` |
| 422 | Area not served | `AREA_NOT_SERVICEABLE` |
| 500 | Unexpected | `INTERNAL_ERROR` |

### Identity module (Member 1)

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create customer account |
| POST | `/api/v1/auth/register/professional` | Public | Create professional account + `pending` profile |
| POST | `/api/v1/auth/login` | Public | Set JWT cookie |
| POST | `/api/v1/auth/logout` | Authenticated | Clear JWT cookie |
| GET | `/api/v1/auth/me` | Authenticated | Current user (and pro approval status) |
| PATCH | `/api/v1/users/me` | Authenticated | Update name, phone |
| GET | `/api/v1/users/me/addresses` | Customer | List addresses |
| POST | `/api/v1/users/me/addresses` | Customer | Add address |
| PATCH | `/api/v1/users/me/addresses/:addressId` | Customer | Edit address |
| DELETE | `/api/v1/users/me/addresses/:addressId` | Customer | Remove address |
| GET | `/api/v1/admin/professionals?status=pending` | Admin | List professionals by status |
| PATCH | `/api/v1/admin/professionals/:id/approval` | Admin | `{ "status": "approved" }` or `{ "status": "rejected", "rejectionReason": "..." }` |
| PATCH | `/api/v1/admin/professionals/:id/status` | Admin | `{ "isActive": false }` suspends and triggers reassignment |

Customer registration request:

```json
{ "name": "Rahul", "email": "rahul@example.com", "password": "ExamplePassword123!", "phone": "9876543210" }
```

Professional registration adds `experienceYears` and optional `bio`.

### Catalog module (Member 2)

| Method | Endpoint | Access | Function |
|---|---|---|---|
| GET | `/api/v1/categories` | Public | Active categories |
| GET | `/api/v1/services?category=&search=&page=&limit=` | Public | Search services |
| GET | `/api/v1/services/:id` | Public | Details, price range, number of active pros |
| GET | `/api/v1/areas/:pincode` | Public | Is this PIN code served |
| GET | `/api/v1/professional/offerings` | Professional | My offerings |
| POST | `/api/v1/professional/offerings` | Professional | `{ "serviceId", "price" }` |
| PATCH | `/api/v1/professional/offerings/:id` | Professional | Change price or deactivate |
| GET | `/api/v1/professional/hours/presets` | Professional | The three presets |
| GET | `/api/v1/professional/hours` | Professional | My working hours |
| PUT | `/api/v1/professional/hours` | Professional | `{ "preset": "weekdays" }` or a full `workingHours` object |
| PUT | `/api/v1/professional/pincodes` | Professional | `{ "servicePincodes": ["560001", "560034"] }` |
| POST / PATCH | `/api/v1/admin/categories`, `/api/v1/admin/categories/:id` | Admin | Create, edit, deactivate |
| POST / PATCH | `/api/v1/admin/services`, `/api/v1/admin/services/:id` | Admin | Create, edit (incl. price range), deactivate |
| GET / POST / PATCH | `/api/v1/admin/areas`, `/api/v1/admin/areas/:id` | Admin | Manage PIN codes |

### Booking module (Member 3)

| Method | Endpoint | Access | Function |
|---|---|---|---|
| GET | `/api/v1/availability?serviceId=&date=&pincode=` | Customer | Start times with at least one eligible pro |
| POST | `/api/v1/bookings` | Customer | Run engine, create a `held` booking |
| POST | `/api/v1/bookings/:id/confirm` | Customer | Confirm a hold before it expires |
| GET | `/api/v1/bookings/me` | Customer | My bookings |
| GET | `/api/v1/bookings/:id` | Owner, assigned pro, admin | Details |
| PATCH | `/api/v1/bookings/:id/cancel` | Customer | Cancel a hold or a confirmed booking |
| POST | `/api/v1/bookings/:id/payments` | Customer | Mock online payment |
| POST | `/api/v1/bookings/:id/review` | Customer | `{ "rating": 5, "comment": "..." }` |
| GET | `/api/v1/professional/jobs?status=` | Approved professional | Assigned jobs |
| PATCH | `/api/v1/professional/jobs/:id/status` | Approved professional | `{ "status": "in_progress" }` or `"completed"` |
| POST | `/api/v1/professional/jobs/:id/decline` | Approved professional | Decline, engine reassigns |
| POST | `/api/v1/professional/jobs/:id/cash-received` | Approved professional | Record cash payment |
| GET | `/api/v1/admin/bookings?status=&date=` | Admin | All bookings |
| PATCH | `/api/v1/admin/bookings/:id/reassign` | Admin | Re-run engine excluding current pro |
| GET | `/api/v1/admin/dashboard` | Admin | Counts: users, pros by status, bookings by status, paid total |

Booking request:

```json
{ "serviceId": "SERVICE_ID", "date": "2026-11-15", "startTime": "10:00", "addressId": "ADDRESS_ID" }
```

The server resolves the address (must belong to the customer), takes the PIN code from it, and
derives `endAt` from the service duration.

Held booking response:

```json
{
  "success": true,
  "data": {
    "bookingId": "BOOKING_ID",
    "status": "held",
    "holdExpiresAt": "2026-11-10T06:35:00.000Z",
    "professional": { "name": "Ramesh", "rating": 4.7, "ratingCount": 23 },
    "service": "AC General Service",
    "date": "2026-11-15",
    "startTime": "10:00",
    "endTime": "11:30",
    "price": 849,
    "paymentStatus": "unpaid"
  },
  "message": "Professional found. Confirm within 5 minutes."
}
```

Mock online payment request (the test checkout page picks the outcome):

```json
{ "simulateResult": "success" }
```

## 8. Booking engine

The booking engine is the project's main engineering feature. It must never double-book a
professional, even when two customers book the same slot at the same moment.

### Slot rules
- All start times are on the 30-minute grid (`:00` or `:30`, IST). Others are rejected (`INVALID_SLOT`).
- `durationMinutes` is a multiple of 30, so a booking covers `duration / 30` whole units.
- Start must be at least 2 hours from now and at most 14 days ahead.
- No travel buffer in v1.

### Candidate filter
A professional is eligible for a slot when all of these hold:
1. `approvalStatus: "approved"` and `isActive: true`, and their user account is active.
2. Has an active offering for the service (price within the current range).
3. The booking PIN code is in `servicePincodes`.
4. Is working for the entire interval on that IST weekday.
5. Has no live reservation for any unit in the interval.
6. Is not in the booking's `declinedBy` list.

### Ranking (workload first)
1. Fewest bookings (`held`, `confirmed`, `in_progress`) on that IST day.
2. Fewest total booked minutes from now onwards.
3. Lowest `_id` (deterministic tie-breaker).

### Hold, then confirm

```
customer requests slot
  -> validate service, address, PIN code, slot rules
  -> customer already has an active hold?  -> 409 ACTIVE_HOLD_EXISTS
  -> list and rank candidates
  -> for each candidate (best first):
       release that candidate's expired holds
       transaction:
         insert booking { status: "held", holdExpiresAt: now + 5 min, price: offering.price }
         insert one slotReservation per unit { expiresAt: holdExpiresAt }
       duplicate key error on (professionalId, slotStart)? -> try next candidate
       success -> return held booking
  -> no candidate left -> 409 SLOT_UNAVAILABLE

customer confirms
  -> transaction:
       booking: held -> confirmed, only if holdExpiresAt > now
       slotReservations for this booking: expiresAt -> null
  -> hold already expired -> 409 HOLD_EXPIRED
```

Notes:
- `session.withTransaction()` may re-run its callback on transient errors, so the callback must
  be safe to run more than once (no side effects outside the session).
- A duplicate key error is **not** transient; catch it outside the transaction and move to the
  next candidate.
- One active hold per customer stops a customer from blocking many professionals at once.

### Hold expiry
Expired holds still have reservation rows that would block the unique index, so they are cleaned up
in two places:
1. **Sweeper:** `setInterval` every 60 seconds in `server.js`. For each `held` booking with
   `holdExpiresAt < now`: transaction sets `status: "expired"` (only if still `held`) and deletes
   its reservation rows.
2. **On demand:** before trying a candidate, the engine runs the same release for that
   candidate's expired holds, so a stale hold never blocks a real booking.

Availability queries ignore reservation rows whose `expiresAt` is in the past.

### Decline and reassign
Triggered by a professional's decline (up to 2 hours before start), an admin reassign, or an admin
suspending a professional (applied to each of their upcoming confirmed bookings).

1. Add the current professional to `declinedBy` (decline and admin reassign).
2. Find candidates for the **same slot** whose offering price is **not above** the booking's agreed
   price, so the customer never pays more.
3. For each candidate, transaction: delete the old reservation rows, insert new ones
   (`expiresAt: null`), update `professionalId`, `offeringId`, `price` (new pro's price).
4. If no candidate succeeds, transaction: `status: "cancelled"`, `cancelledBy: "system"`, delete
   the reservation rows.

### Customer cancellation
- `held`: cancel any time, reservation rows deleted.
- `confirmed`: allowed up to 2 hours before start (`CUTOFF_PASSED` after that).
- Status change and reservation release happen in one transaction.

## 9. State machines

### Booking status

| From | To | Who / trigger |
|---|---|---|
| `held` | `confirmed` | Customer confirms before expiry |
| `held` | `expired` | Sweeper or on-demand release |
| `held` | `cancelled` | Customer |
| `confirmed` | `confirmed` (new pro) | Decline, admin reassign, admin suspension |
| `confirmed` | `cancelled` | Customer (before cutoff) or system (no replacement) |
| `confirmed` | `in_progress` | Assigned professional, on the booking day |
| `in_progress` | `completed` | Assigned professional |

`completed`, `cancelled` and `expired` are terminal. Every status update uses a conditional
update (`findOneAndUpdate({ _id, status: "<expected>" }, ...)`) so two concurrent requests cannot
both apply a transition; the loser gets `INVALID_STATUS_TRANSITION`.

### Payment status
`unpaid` -> `paid`, only when the booking is `completed`.
- **Cash:** the assigned professional calls `cash-received`.
- **Mock online:** the customer pays on the test checkout page; `failed` attempts are stored in
  `payments` and the booking stays `unpaid` so they can retry.
- The partial unique index on `payments` guarantees at most one successful payment per booking;
  a repeat attempt returns `ALREADY_PAID`.

Because payment only happens after completion, cancellations never need refunds.

### Professional approval
`pending` -> `approved` or `rejected` (admin). An admin may also move `rejected` -> `approved`.
Only `approved` and active professionals receive bookings.

## 10. Payments: pluggable provider

All payment logic goes through `paymentService`, which calls a provider module with a fixed
contract. v1 has only the mock provider; a real gateway later implements the same function and is
selected by an environment variable, with no changes to controllers or the booking flow.

```js
// backend/src/modules/booking/payments/mock.provider.js
export async function charge({ bookingId, amount, simulateResult }) {
  const success = simulateResult === "success";
  return {
    success,
    providerTransactionId: "MOCK-" + bookingId + "-" + Date.now()
  };
}
```

Never label a simulated payment as real gateway processing in the UI.

## 11. Authentication design

- **Passwords:** `bcrypt.hash(password, 10)`. bcrypt generates and embeds a unique salt per
  password; compare with `bcrypt.compare`. (If `bcrypt` fails to install on Windows, use the
  drop-in `bcryptjs`.)
- **Token:** on login, sign a JWT `{ sub: userId, role }` with `JWT_SECRET`, `expiresIn: "1d"`.
- **Cookie:** `res.cookie("token", jwt, { httpOnly: true, sameSite: "lax", secure: NODE_ENV === "production", maxAge: 86400000 })`.
  Logout clears it. The token is never stored in `localStorage`.
- **`authenticate` middleware:** reads the cookie, verifies the JWT, then **loads the user from the
  database** so role and `isActive` are always current, and sets `req.user`.
- **`authorize(...roles)` middleware:** rejects other roles with 403.
- **`requireApprovedProfessional` middleware:** job endpoints reject pending or rejected
  professionals with `ACCOUNT_PENDING`.
- **Login errors are generic** ("Invalid email or password") so they do not reveal which emails exist.
- **Same origin in development:** the Vite dev server proxies `/api` to `http://localhost:5000`,
  so the cookie works without CORS. The frontend sends requests with `credentials: "include"`.

## 12. Time handling

- All dates are stored in UTC. Working hours and the booking UI use `Asia/Kolkata` (IST, UTC+05:30,
  no daylight saving).
- Convert with a small shared helper in `common/time.js` (IST is a fixed offset, so no library is
  needed): `istToUtc("2026-11-15", "10:00")`, `utcToIstParts(date)`, `istWeekday(date)`.
- "Same day" for workload ranking means the same IST calendar day.

## 13. Code organisation

Organised by module so each team member owns one folder end to end.

```
FSAD-PBL-Service-Marketplace-/
├── docker-compose.yml
├── prd.md
├── README.md
├── backend/
│   ├── package.json            "type": "module"
│   ├── .env.example
│   └── src/
│       ├── server.js           connect DB, start sweeper, listen
│       ├── app.js              express app, middleware, mount module routers
│       ├── config/
│       │   └── database.js
│       ├── common/
│       │   ├── errors.js       AppError(status, code, message)
│       │   ├── respond.js      ok(res, data, message), created(...)
│       │   ├── time.js         IST <-> UTC helpers
│       │   └── middleware/
│       │       ├── authenticate.js
│       │       ├── authorize.js
│       │       └── errorHandler.js
│       ├── modules/
│       │   ├── identity/       Member 1
│       │   │   ├── user.model.js
│       │   │   ├── professional.model.js
│       │   │   ├── auth.routes.js / auth.controller.js / auth.service.js
│       │   │   ├── users.routes.js / users.controller.js
│       │   │   ├── adminProfessionals.routes.js / .controller.js
│       │   │   └── validators.js
│       │   ├── catalog/        Member 2
│       │   │   ├── category.model.js / service.model.js
│       │   │   ├── offering.model.js / serviceArea.model.js
│       │   │   ├── catalog.routes.js / catalog.controller.js / catalog.service.js
│       │   │   ├── professionalSetup.routes.js / .controller.js   (offerings, hours, pincodes)
│       │   │   ├── hoursPresets.js
│       │   │   └── validators.js
│       │   └── booking/        Member 3
│       │       ├── booking.model.js / slotReservation.model.js
│       │       ├── payment.model.js / review.model.js
│       │       ├── assignment.service.js   candidates, ranking, reserve
│       │       ├── booking.service.js      hold, confirm, cancel, decline, reassign
│       │       ├── holdSweeper.js
│       │       ├── payments/
│       │       │   ├── payment.service.js
│       │       │   └── mock.provider.js
│       │       ├── bookings.routes.js / jobs.routes.js / adminBookings.routes.js
│       │       └── validators.js
│       └── scripts/
│           └── seed.js         admin, categories, services, areas, sample pros
└── frontend/
    ├── package.json            "type": "module"
    ├── index.html
    ├── vite.config.js          /api proxy
    └── src/
        ├── main.js
        ├── App.js              routes
        ├── api/client.js       fetch wrapper, credentials: "include", envelope handling
        ├── context/AuthContext.js
        ├── components/         Navbar, ProtectedRoute, shared UI
        └── features/
            ├── identity/       Member 1: Login, Register, JoinAsPro, Profile, Addresses, AdminApprovals
            ├── catalog/        Member 2: Categories, ServiceList, ServiceDetail, ProOfferings, ProHours, AdminCatalog
            └── booking/        Member 3: BookService, HoldConfirm, MyBookings, ProJobs, MockCheckout, AdminBookings
```

`professional.model.js` lives in Identity (approval fields). The Catalog module edits only
`workingHours` and `servicePincodes` on it, through its own service functions.

## 14. Team ownership

Each member owns one module end to end (models, services, routes, pages) and can explain it.

| | Member 1: Identity & Access | Member 2: Marketplace & Catalog | Member 3: Booking Engine |
|---|---|---|---|
| Backend | Signup (customer, pro), login, logout, bcrypt, JWT cookie, `authenticate` / `authorize`, addresses, pro approval and suspension, admin seed | Categories, services and price ranges, service areas, offerings and pricing, working hours and presets, PIN codes | Availability, assignment and ranking, hold and confirm transactions, sweeper, cancel, decline, reassign, mock payments, reviews and ratings |
| Frontend | Login, Register, Join as pro, Profile, Addresses, Admin approvals, `AuthContext`, `ProtectedRoute` | Category and service browsing, service detail, pro offerings, pro hours, admin catalog and areas | Booking form, hold and confirm screen, my bookings, pro jobs, mock checkout, admin bookings, dashboard |
| Key concept to explain | Hashing with salt, stateless JWT in HttpOnly cookies, role-based authorisation | Marketplace data modelling, price ranges, schedule presets | Transactions, unique-index concurrency control, state machines |

Shared by all: `common/`, `app.js`, `docker-compose.yml`, seed data, this PRD.

## 15. Git workflow

- `main` is always runnable. Nobody commits directly to `main`.
- Branch per feature: `feat/identity-auth`, `feat/catalog-offerings`, `feat/booking-engine`,
  `fix/...`, `docs/...`.
- Open a pull request into `main` on the team repo; at least one other member reviews before
  merge.
- Pull `main` before starting a branch and before opening a PR.
- Never commit `.env` or `node_modules/`. Commit `.env.example`.

## 16. Milestones

| # | Milestone | Member 1 | Member 2 | Member 3 | Done when |
|---|---|---|---|---|---|
| 1 | Foundation (together) | Express 5 app, error envelope | Vite + React (no JSX) + Router + Bootstrap | Docker replica set, DB connection | React page shows the result of `/api/v1/health`, which pings MongoDB |
| 2 | Core data | Auth, roles, admin seed | Categories, services, areas (admin CRUD + browse) | Booking models, indexes, `time.js`, slot helpers | Admin can log in and publish a service; a customer can find it |
| 3 | Marketplace setup | Pro signup and approval | Offerings, hours presets, PIN codes | Availability search | An approved pro with an offering appears in availability |
| 4 | Booking engine | Addresses | Pro setup pages polish | Hold, confirm, sweeper, cancel | Two simultaneous bookings for one pro and slot: only one succeeds |
| 5 | Operations | Admin suspend | Price range changes deactivate offerings | Pro jobs, decline, reassign | A declined job moves to another pro or is cancelled cleanly |
| 6 | Payments and reviews | Profile pages | Service detail with ratings | Mock payments, cash, reviews, dashboard | A completed booking has one payment and an optional review |
| 7 | Testing and deployment | Manual test plan for Identity | for Catalog | for Booking | A test customer books end to end on the deployed app |

## 17. Setup

### Docker Compose (MongoDB replica set)

```yaml
services:
  mongo:
    image: mongo:7
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] }).ok }"]
      interval: 5s
      timeout: 10s
      retries: 10

volumes:
  mongo-data:
```

The health check initialises the replica set on first start. The backend runs on the host
machine and connects to `localhost:27017`.

```
docker compose up -d
```

### Backend

```
cd backend
npm init -y
npm pkg set type=module
npm pkg set scripts.start="node src/server.js"
npm pkg set scripts.dev="node --watch src/server.js"
npm pkg set scripts.seed="node src/scripts/seed.js"
npm install express@5 mongoose dotenv bcrypt jsonwebtoken cookie-parser helmet
```

`backend/.env.example`:

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/homeease?replicaSet=rs0
JWT_SECRET=replace_with_a_long_random_string
HOLD_MINUTES=5
PAYMENT_PROVIDER=mock
```

`backend/src/config/database.js`:

```js
import mongoose from "mongoose";

export async function connectDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
}
```

`backend/src/app.js`:

```js
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { errorHandler } from "./common/middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/v1/health", async (req, res) => {
  await mongoose.connection.db.admin().ping();
  res.status(200).json({ success: true, data: { db: "up" }, message: "HomeEase API running" });
});

// app.use("/api/v1", identityRouter); catalogRouter; bookingRouter;

app.use(errorHandler);

export default app;
```

`backend/src/server.js`:

```js
import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = process.env.PORT || 5000;

try {
  await connectDatabase();
  app.listen(port, () => console.log("Server running on port " + port));
} catch (error) {
  console.error("Startup failed:", error.message);
  process.exit(1);
}
```

`import "dotenv/config"` must be the first import: ES modules load every import before any code
runs, so calling `dotenv.config()` later would be too late.

Model convention, `backend/src/modules/catalog/category.model.js`:

```js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
```

### Frontend

```
npm create vite@latest frontend -- --template vanilla
cd frontend
npm install react react-dom react-router-dom bootstrap
```

`frontend/vite.config.js`:

```js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: { "/api": "http://localhost:5000" }
  }
});
```

`frontend/src/main.js`:

```js
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App.js";

const e = React.createElement;

createRoot(document.getElementById("root")).render(
  e(BrowserRouter, null, e(App))
);
```

Component convention (function component + hooks, no JSX),
`frontend/src/features/catalog/ServiceList.js`:

```js
import React, { useEffect, useState } from "react";
import { api } from "../../api/client.js";

const e = React.createElement;

export default function ServiceList({ categorySlug, onSelect }) {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/v1/services?category=" + categorySlug)
      .then((data) => setServices(data.items))
      .catch((err) => setError(err.message));
  }, [categorySlug]);

  if (error) return e("div", { className: "alert alert-danger" }, error);

  return e(
    "div",
    { className: "row g-3" },
    services.map((service) =>
      e(
        "div",
        { className: "col-md-4", key: service._id },
        e(
          "div",
          { className: "card h-100 p-3" },
          e("h5", null, service.name),
          e("p", null, "Rs. " + service.minPrice + " to " + service.maxPrice),
          e("button", { className: "btn btn-primary", onClick: () => onSelect(service) }, "Book")
        )
      )
    )
  );
}
```

`index.html` needs `<div id="root"></div>` and `<script type="module" src="/src/main.js"></script>`.

## 18. Manual test plan (Postman + browser)

| # | Scenario | Expected |
|---|---|---|
| 1 | Register with an existing email | 409 `EMAIL_TAKEN` |
| 2 | Register request includes `"role": "admin"` | Ignored; account is a customer |
| 3 | Wrong password | 401, generic message |
| 4 | Customer calls an admin endpoint | 403 `FORBIDDEN` |
| 5 | Pending professional calls jobs endpoint | 403 `ACCOUNT_PENDING` |
| 6 | Rejected professional | Never appears in availability |
| 7 | Offering price outside service range | 400 `PRICE_OUT_OF_RANGE` |
| 8 | Booking for an unserved PIN code | 422 `AREA_NOT_SERVICEABLE` |
| 9 | Start time 10:15 | 400 `INVALID_SLOT` |
| 10 | No pro offers the service in that PIN code | 409 `SLOT_UNAVAILABLE` |
| 11 | Two customers book the same only-available pro and slot at once | One `held`, the other 409 |
| 12 | Customer creates a second hold while one is active | 409 `ACTIVE_HOLD_EXISTS` |
| 13 | Confirm after 5 minutes | 409 `HOLD_EXPIRED`; slot becomes available again |
| 14 | Customer cancels within 2 hours of start | 409 `CUTOFF_PASSED` |
| 15 | Customer cancels a confirmed booking | Reservation rows deleted, slot available |
| 16 | Pro declines, another pro is free at same or lower price | Booking moves to the new pro |
| 17 | Pro declines, nobody else is free | Booking `cancelled`, `cancelledBy: "system"` |
| 18 | Admin suspends a pro with upcoming bookings | Each booking reassigned or cancelled |
| 19 | Pro updates someone else's job | 403 |
| 20 | Request body contains a modified price | Ignored; price comes from the offering |
| 21 | Pay before completion | 409 `INVALID_STATUS_TRANSITION` |
| 22 | Repeat a successful mock payment | 409 `ALREADY_PAID` |
| 23 | Review an unfinished booking, or review twice | Rejected (409) |

## 19. Definition of done

All three journeys work without editing the database by hand:

- **Customer:** register -> add address -> browse -> pick slot -> see held pro and price ->
  confirm -> track -> pay (mock) -> review.
- **Professional:** join as pro -> pick hours preset -> choose PIN codes -> add offerings ->
  approved -> receive job -> start -> complete -> record cash (or see online payment) -> decline
  a future job.
- **Admin:** approve a pro -> publish a service with a price range -> add PIN codes -> monitor
  bookings -> reassign -> suspend a pro.

## 20. Defaults

| Setting | Value |
|---|---|
| City | Bengaluru |
| Slot unit | 30 minutes |
| Hold duration | 5 minutes (`HOLD_MINUTES`) |
| Sweeper interval | 60 seconds |
| Minimum lead time | 2 hours before start |
| Booking horizon | 14 days ahead |
| Customer cancel cutoff | 2 hours before start |
| Professional decline cutoff | 2 hours before start |
| Active holds per customer | 1 |
| Travel buffer | None |
| bcrypt cost | 10 |
| JWT and cookie lifetime | 1 day |
| Currency | INR, whole rupees |
