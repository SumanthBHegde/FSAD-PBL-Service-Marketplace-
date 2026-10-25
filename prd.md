# HomeEase: MERN Project Blueprint (v3, lean)

HomeEase is a **home-service broker marketplace** for one city (Bengaluru). Independent
professionals offer services from the platform catalog at their own prices. When a customer books,
the platform **automatically assigns** an available professional. Admins approve professionals and
manage the catalog.

This is a learning project for a team of three. The design keeps the code small: basic MVC,
three models, about 28 short source files. **Automatic assignment is the main feature**;
everything else is a simple, standard version of the feature.

### What changed from v2

| v2 | v3 |
|---|---|
| 8 collections | 3 models: `User`, `Service`, `Booking` |
| 30-minute units, transactions, replica set | 4 fixed daily slots + one unique index |
| Hold, confirm, expiry sweeper | Booking is confirmed immediately |
| UTC / IST conversion | Dates and slots stored as plain strings |
| Hour presets, per-day times | Professional ticks working days |
| Saved addresses, service areas, offerings, payments, reviews collections | Fields embedded in `User` and `Booking` |
| Routes, controllers, services, validators per module | Basic MVC: models, controllers, routes, one middleware |
| Error code envelope | `{ message }` with the right HTTP status |
| Admin reassign, suspend cascade | Only professional decline, which reuses auto-assign |

## 1. Stack

| Part | Choice |
|---|---|
| Frontend | React (function components + hooks), no JSX (`React.createElement`), React Router, Bootstrap, Vite |
| Backend | Node.js + Express 5, MVC |
| Database | MongoDB (single Docker container or local install) + Mongoose |
| Auth | bcrypt (salted hash) + JWT in an HttpOnly cookie |
| Language | JavaScript, ES modules (`import` / `export`), `async/await` |
| Validation / tests | Mongoose schema validation + a few `if` checks; manual testing with Postman |

## 2. Coding conventions

- ES modules only (`"type": "module"`), relative imports include `.js`.
- `async/await` for database and bcrypt calls. Express 5 passes thrown errors to the error handler.
- React: `const e = React.createElement;`, function components, hooks. Plain `.js` files.
- MVC: **routes** map URLs to **controllers**; controllers use **models** and send the response.
- Errors: `res.status(code).json({ message })`. Success: `res.json(data)`.

## 3. Roles

| Role | Created by | Can do |
|---|---|---|
| Customer | Register page | Browse, book, cancel, pay (simulated), review |
| Professional | Register page, "Join as professional"; `pending` until approved | Set services + prices, PIN codes, working days; view jobs, update status, decline |
| Admin | Seed script | Approve / reject professionals, manage services, view all bookings |

One role per account. The server sets the role; the client never sends it.

## 4. Main flows

**Customer:** register -> browse services -> pick service, date, slot, enter address and PIN code
-> system auto-assigns a professional -> booking shows professional and price -> job done -> pay
-> review. Can cancel before the booking day.

**Professional:** join as professional -> set services and prices, PIN codes, working days ->
admin approves -> sees assigned jobs -> start -> complete -> mark cash received (if cash). Can
decline a job before the booking day; the system auto-assigns someone else.

**Admin:** approve or reject professionals -> add and edit services -> view all bookings.

## 5. Models

### `User`

| Field | Type | Notes |
|---|---|---|
| `name`, `phone` | String | Required |
| `email` | String | Required, unique, lowercase |
| `password` | String | bcrypt hash, `select: false` |
| `role` | String | `customer`, `professional`, `admin` |
| **Professional only** | | |
| `approvalStatus` | String | `pending`, `approved`, `rejected` |
| `experienceYears` | Number | |
| `services` | [{ `service`: ObjectId -> Service, `price`: Number }] | Price must be within the service's range |
| `pincodes` | [String] | PIN codes the professional covers |
| `workingDays` | [Number] | 0 = Sunday ... 6 = Saturday |
| `ratingSum`, `ratingCount` | Number | Default 0; rating = sum / count |

### `Service`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `category` | String | One of: `ac`, `cleaning`, `painting`, `plumbing`, `electrical`, `appliance` |
| `description` | String | |
| `minPrice`, `maxPrice` | Number | Range professionals must price within |
| `isActive` | Boolean | Default `true` |

### `Booking`

| Field | Type | Notes |
|---|---|---|
| `customer` | ObjectId -> User | |
| `professional` | ObjectId -> User | Assigned automatically |
| `service` | ObjectId -> Service | |
| `date` | String | `"2026-11-15"` |
| `slot` | String | `"09-11"`, `"11-13"`, `"14-16"`, `"16-18"` |
| `address`, `pincode` | String | Typed in the booking form |
| `price` | Number | Copied from the assigned professional's price |
| `status` | String | `confirmed`, `in_progress`, `completed`, `cancelled` |
| `active` | Boolean | `true` until cancelled; used by the unique index |
| `declinedBy` | [ObjectId] | Professionals who declined this booking |
| `paymentStatus` | String | `unpaid`, `paid` |
| `paymentMethod` | String | `cash`, `online` (simulated) |
| `rating`, `review` | Number, String | Set once after completion |

**The key index** (prevents double booking):

```js
bookingSchema.index(
  { professional: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
```

A professional can have only one active booking per date and slot. If two customers are assigned
the same professional at the same moment, MongoDB rejects the second insert with a duplicate key
error (`11000`), and the system tries the next professional. Cancelling sets `active: false`,
which frees the slot.

## 6. Auto-assignment (main feature)

Input: service, date, slot, PIN code, and professionals to exclude.

1. **Filter:** approved professionals who offer the service, cover the PIN code, and work on that
   weekday, excluding anyone in `exclude`.
2. **Remove busy:** drop professionals who already have an active booking in that date and slot.
3. **Rank (fair workload):** fewest active bookings on that date first; ties broken by `_id`.
4. **Reserve:** try to create the booking with the first candidate. On duplicate key error
   (someone else just took them), try the next. If none succeed: `409 No professional available
   for this slot`.

`backend/utils/assign.js`:

```js
import User from "../models/User.js";
import Booking from "../models/Booking.js";

export async function findCandidates({ serviceId, date, slot, pincode, exclude = [] }) {
  const weekday = new Date(date).getUTCDay();

  const pros = await User.find({
    role: "professional",
    approvalStatus: "approved",
    "services.service": serviceId,
    pincodes: pincode,
    workingDays: weekday,
    _id: { $nin: exclude }
  });

  const busy = await Booking.find({ date, slot, active: true }).distinct("professional");
  const free = pros.filter((p) => !busy.some((id) => id.equals(p._id)));

  const loads = await Booking.aggregate([
    { $match: { date, active: true } },
    { $group: { _id: "$professional", count: { $sum: 1 } } }
  ]);
  const loadOf = (p) => loads.find((l) => l._id.equals(p._id))?.count || 0;

  return free.sort((a, b) => loadOf(a) - loadOf(b) || String(a._id).localeCompare(String(b._id)));
}

export function priceOf(pro, serviceId) {
  return pro.services.find((s) => s.service.equals(serviceId)).price;
}
```

Booking creation in `bookingController.js`:

```js
const candidates = await findCandidates({ serviceId, date, slot, pincode });

for (const pro of candidates) {
  try {
    const booking = await Booking.create({
      customer: req.user._id, professional: pro._id, service: serviceId,
      date, slot, address, pincode, price: priceOf(pro, serviceId)
    });
    return res.status(201).json(booking);
  } catch (err) {
    if (err.code !== 11000) throw err;   // someone else took this pro; try the next one
  }
}
res.status(409).json({ message: "No professional available for this slot" });
```

**Decline** reuses the same functions: add the professional to `declinedBy`, find candidates
excluding everyone in `declinedBy`, and update the booking's `professional` and `price` with the
first one that saves without a duplicate key error. If nobody is free, the booking becomes
`cancelled` with `active: false`.

## 7. Booking rules

| Rule | Check |
|---|---|
| Date | Must be after today (IST): `date > new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })` |
| Slot | One of the 4 fixed slots |
| Price | Always from the professional's price, never from the request |
| Cancel | Customer, only while `confirmed` and before the booking date |
| Decline | Assigned professional, only while `confirmed` and before the booking date |
| Status | `confirmed` -> `in_progress` -> `completed` (assigned professional only) |
| Pay | Only when `completed` and `unpaid`; one conditional update so it can't happen twice |
| Review | Only by the customer, only when `completed`, only once |

Status changes and payment use a conditional update, for example:

```js
Booking.findOneAndUpdate(
  { _id: id, customer: req.user._id, status: "completed", paymentStatus: "unpaid" },
  { paymentStatus: "paid", paymentMethod: "online" },
  { new: true }
);
```

If it returns `null`, respond `409` (already paid or not completed).

## 8. Authentication

- Register: `bcrypt.hash(password, 10)`; bcrypt adds a random salt to every hash.
- Login: `bcrypt.compare`; on success sign `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" })`
  and send it as a cookie: `res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 86400000 })`.
- Logout: `res.clearCookie("token")`.
- Wrong email or password: same message, "Invalid email or password".

`backend/middleware/auth.js`:

```js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) throw new Error();
    next();
  } catch {
    res.status(401).json({ message: "Please log in" });
  }
}

export function allow(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Not allowed" });
}
```

Job endpoints also check `req.user.approvalStatus === "approved"`.

## 9. API

All routes are under `/api`. Owner shown per group.

### Member 1: Auth and users (`authController.js`, `authRoutes.js`)

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register customer |
| POST | `/api/auth/register-pro` | Public | Register professional (`pending`) |
| POST | `/api/auth/login` | Public | Log in, set cookie |
| POST | `/api/auth/logout` | Logged in | Clear cookie |
| GET | `/api/auth/me` | Logged in | Current user |
| GET | `/api/admin/pros?status=pending` | Admin | List professionals |
| PATCH | `/api/admin/pros/:id` | Admin | `{ "approvalStatus": "approved" }` or `"rejected"` |

### Member 2: Services and professional profile (`serviceController.js`, `serviceRoutes.js`)

| Method | Endpoint | Access | Function |
|---|---|---|---|
| GET | `/api/services?category=` | Public | List active services |
| GET | `/api/services/:id` | Public | Service details |
| POST | `/api/services` | Admin | Create service |
| PATCH | `/api/services/:id` | Admin | Edit or deactivate |
| PUT | `/api/pro/profile` | Professional | `{ services: [{ service, price }], pincodes, workingDays }` |

### Member 3: Bookings and jobs (`bookingController.js`, `bookingRoutes.js`)

| Method | Endpoint | Access | Function |
|---|---|---|---|
| POST | `/api/bookings` | Customer | `{ serviceId, date, slot, address, pincode }`, auto-assigns |
| GET | `/api/bookings/mine` | Customer | My bookings |
| PATCH | `/api/bookings/:id/cancel` | Customer | Cancel |
| PATCH | `/api/bookings/:id/pay` | Customer | Simulated online payment |
| PATCH | `/api/bookings/:id/review` | Customer | `{ rating, review }` |
| GET | `/api/jobs` | Approved pro | My assigned jobs |
| PATCH | `/api/jobs/:id/status` | Approved pro | `{ status: "in_progress" }` or `"completed"` |
| PATCH | `/api/jobs/:id/decline` | Approved pro | Decline, auto-reassign |
| PATCH | `/api/jobs/:id/cash` | Approved pro | Mark cash received |
| GET | `/api/admin/bookings` | Admin | All bookings |

## 10. Files

```
FSAD-PBL-Service-Marketplace-/
├── prd.md
├── README.md
├── docker-compose.yml
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js                     app setup, routes, error handler, listen
│   ├── seed.js                       admin, services, sample professionals
│   ├── config/db.js
│   ├── middleware/auth.js            protect, allow(...roles)
│   ├── models/
│   │   ├── User.js                   Member 1
│   │   ├── Service.js                Member 2
│   │   └── Booking.js                Member 3
│   ├── controllers/
│   │   ├── authController.js         Member 1
│   │   ├── serviceController.js      Member 2
│   │   └── bookingController.js      Member 3
│   ├── routes/
│   │   ├── authRoutes.js             Member 1
│   │   ├── serviceRoutes.js          Member 2
│   │   └── bookingRoutes.js          Member 3
│   └── utils/assign.js               Member 3 (auto-assignment)
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js                /api proxy to backend
    └── src/
        ├── main.js
        ├── App.js                    routes + navbar
        ├── api.js                    fetch wrapper (credentials: "include")
        ├── AuthContext.js            Member 1
        └── pages/
            ├── Login.js              Member 1
            ├── Register.js           Member 1 (customer or professional)
            ├── AdminPros.js          Member 1
            ├── Services.js           Member 2 (browse)
            ├── ProProfile.js         Member 2 (services, prices, PIN codes, days)
            ├── AdminServices.js      Member 2
            ├── BookService.js        Member 3
            ├── MyBookings.js         Member 3 (cancel, pay, review)
            ├── ProJobs.js            Member 3 (status, decline, cash)
            └── AdminBookings.js      Member 3
```

About 28 source files, roughly 9 per member.

## 11. Team ownership

| | Member 1: Auth & Users | Member 2: Services & Profiles | Member 3: Bookings & Auto-assign |
|---|---|---|---|
| Model | `User` | `Service` | `Booking` |
| Backend | Register, login, logout, JWT cookie, `protect` / `allow`, approve professionals | Service CRUD, professional profile (services + prices, PIN codes, days) | Auto-assign, booking, cancel, decline, status, pay, review |
| Frontend | `AuthContext`, Login, Register, AdminPros | Services, ProProfile, AdminServices | BookService, MyBookings, ProJobs, AdminBookings |
| Explains | Password hashing with salt, JWT in cookies, role-based access | Schema design, embedded arrays, price range validation | Assignment algorithm, unique index preventing double booking |

Shared by all: `server.js`, `db.js`, `App.js`, `api.js`, `seed.js`.

## 12. Setup

`docker-compose.yml`:

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
volumes:
  mongo-data:
```

Run with `docker compose up -d` (or use a local MongoDB install).

Backend:

```
cd backend
npm init -y
npm pkg set type=module scripts.dev="node --watch server.js" scripts.seed="node seed.js"
npm install express@5 mongoose dotenv bcrypt jsonwebtoken cookie-parser
```

`backend/.env.example`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/homeease
JWT_SECRET=replace_with_a_long_random_string
```

`backend/server.js`:

```js
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/api", serviceRoutes);
app.use("/api", bookingRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === "ValidationError" ? 400 : 500).json({ message: err.message });
});

await connectDB();
app.listen(process.env.PORT, () => console.log("Server on port " + process.env.PORT));
```

Route file pattern, `backend/routes/serviceRoutes.js`:

```js
import { Router } from "express";
import { protect, allow } from "../middleware/auth.js";
import * as ctrl from "../controllers/serviceController.js";

const router = Router();
router.get("/services", ctrl.listServices);
router.get("/services/:id", ctrl.getService);
router.post("/services", protect, allow("admin"), ctrl.createService);
router.patch("/services/:id", protect, allow("admin"), ctrl.updateService);
router.put("/pro/profile", protect, allow("professional"), ctrl.updateProfile);

export default router;
```

Frontend:

```
npm create vite@latest frontend -- --template vanilla
cd frontend
npm install react react-dom react-router-dom bootstrap
```

`frontend/vite.config.js`:

```js
import { defineConfig } from "vite";
export default defineConfig({ server: { proxy: { "/api": "http://localhost:5000" } } });
```

Component pattern (hooks, no JSX), `frontend/src/pages/Services.js`:

```js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const e = React.createElement;

export default function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    api("/api/services").then(setServices);
  }, []);

  return e("div", { className: "row g-3" },
    services.map((s) =>
      e("div", { className: "col-md-4", key: s._id },
        e("div", { className: "card p-3" },
          e("h5", null, s.name),
          e("p", null, "Rs. " + s.minPrice + " to " + s.maxPrice),
          e(Link, { className: "btn btn-primary", to: "/book/" + s._id }, "Book")
        )
      )
    )
  );
}
```

## 13. Milestones

| # | Goal | Done when |
|---|---|---|
| 1 | Setup (together): Mongo, Express, Vite + React + Router + Bootstrap, seed script | Frontend shows data from `/api/services` |
| 2 | Each member builds their model, controller and routes | All endpoints work in Postman |
| 3 | Each member builds their pages | All three flows work in the browser |
| 4 | Test, fix, deploy | Manual test plan passes on the deployed app |

## 14. Manual test plan

| # | Scenario | Expected |
|---|---|---|
| 1 | Register with an existing email | 409 |
| 2 | Wrong password | 401, "Invalid email or password" |
| 3 | Customer calls an admin endpoint | 403 |
| 4 | Pending professional opens jobs | 403 |
| 5 | Professional sets a price outside the service range | 400 |
| 6 | Book when no professional covers the PIN code | 409 |
| 7 | Two customers book the only free professional for the same slot | One succeeds, the other gets 409 (or the next professional) |
| 8 | Workload: two free professionals, one already has a job that day | The other one is assigned |
| 9 | Cancel, then book the same slot again | Same professional can be assigned again |
| 10 | Professional declines | Booking moves to another free professional, or is cancelled |
| 11 | Pay before completion, or pay twice | 409 |
| 12 | Review twice | 409 |

## 15. Git workflow

- One branch per feature (`feat/auth`, `feat/services`, `feat/booking`), pull request into `main`,
  one teammate reviews.
- Pull `main` before starting work and before opening a pull request.
- Never commit `.env` or `node_modules/`.

## 16. Not in this version

Hold-and-confirm, transactions, admin reassign and suspend, saved addresses, separate payment and
review collections, real payments, refunds, complaints, invoices, earnings, analytics, chat,
notifications, multiple cities.
