# HomeEase — Finalized MERN Implementation Blueprint

&#x20;Project scope finalized

HomeEase will be a full-stack home-service marketplace where customers book household services, approved professionals are automatically assigned to bookings, and administrators manage marketplace operations.

## 1. Final project configuration

| Decision                | Final choice                                    |
| ----------------------- | ----------------------------------------------- |
| Frontend                | React without JSX                               |
| Programming language    | JavaScript with ES5-style application code      |
| Backend                 | Node.js + Express                               |
| Database                | MongoDB + Mongoose                              |
| User roles              | Customer, Professional, Admin                   |
| Assignment              | Automatic professional assignment               |
| Payment                 | Cash or simulated online payment                |
| Service coverage        | One city, initially Bengaluru                   |
| Professional onboarding | Application followed by admin approval          |
| Architecture            | Modular monolith                                |
| API style               | REST with JSON                                  |
| Authentication          | JWT, password hashing, role-based authorization |

### Coding restrictions

We will consistently use `var`, traditional functions, callbacks, `require()` and `module.exports`. There will be no `let`, `const`, arrow functions, destructuring, template literals, `async/await`, TypeScript, or JSX in application code.

React can render components using `React.createElement()` without JSX, and Node.js supports CommonJS modules.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://react.dev\&sz=32)

React

+1



One distinction: ES5-style source code does not mean modern React and Node.js dependencies themselves run on an ES5-only runtime. We will use maintained runtime versions and select compatible package versions.

## 2. Confirmed business workflow

## Customer booking journey

1. Customer registers or logs in.
2. Customer selects a category, for example AC Services.
3. Customer chooses a fixed-price service package.
4. Customer enters their address and selects a date and time slot.
5. Backend checks whether the PIN code is supported and searches for an available, approved professional with the required skill.
6. Backend atomically reserves a professional and confirms the booking.
7. Professional sees the assigned job and updates its progress.
8. After completion, payment is recorded and the customer can leave a review.

For version 1, customers cannot manually choose a professional. Professionals are assigned automatically without needing to accept every booking. An admin can reassign a booking if necessary.

### Professional onboarding

Applied

Under Review

Approved

Admin can also reject an application. Only approved and active professionals can receive bookings.

## 3. Scope of the first version

Include six service categories: AC servicing, cleaning, painting, plumbing, electrical services, and appliance repair. Each category can contain multiple fixed-price services, such as AC general service and AC deep cleaning.

The MVP will include registration, authentication, service discovery, addresses, scheduling, automatic assignment, booking tracking, professional application, admin approval, mock payments, reviews, and administration.

Defer real payment processing, live tracking, chat, AI recommendations, and dynamic pricing until the basic end-to-end application is stable.

## 4. Detailed MongoDB schema

Use MongoDB ObjectId references, timestamps, indexes, and Mongoose validation. The following is the initial database contract.

### A. `users`

One common authentication collection for all three roles.

| Field                    | Type     | Rule                                |
| ------------------------ | -------- | ----------------------------------- |
| `_id`                    | ObjectId | Primary key                         |
| `name`                   | String   | Required                            |
| `email`                  | String   | Required, unique, lowercase         |
| `passwordHash`           | String   | Required, never returned            |
| `phone`                  | String   | Required                            |
| `role`                   | String   | `customer`, `professional`, `admin` |
| `isActive`               | Boolean  | Default true                        |
| `createdAt`, `updatedAt` | Date     | Automatic                           |

Customers initially register with role `customer`. A professional applicant can receive the `professional` role when their application is approved. Never allow the client to supply an arbitrary role during registration.

### B. `categories` and `services`

| Collection   | Fields                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `categories` | name, slug, description, imageUrl, isActive                                                        |
| `services`   | categoryId, name, slug, description, basePrice, durationMinutes, requiredSkill, imageUrl, isActive |

Example service document:

```

{
  "name": "AC General Service",
  "slug": "ac-general-service",
  "categoryId": "OBJECT_ID_HERE",
  "basePrice": 799,
  "durationMinutes": 90,
  "requiredSkill": "ac_service",
  "isActive": true
}

```

The illustrative ID above must become a MongoDB ObjectId in actual database records.

### C. `professionalApplications` and `professionals`

Separate application data from an approved professional's operational profile.

| Collection                 | Fields                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `professionalApplications` | applicantId, phone, skills, requestedPincodes, experienceYears, documentReferences, status, reviewedBy, reviewedAt, rejectionReason |
| `professionals`            | userId, skills, servicePincodes, availability, isActive, approvalDate, ratingAverage, ratingCount, assignmentCount                  |

Application statuses: `applied`, `under_review`, `approved`, `rejected`.

The approved profile will contain fixed working hours for each weekday and an availability override for holidays or leave.

### D. `bookings`

This is the central business entity.

| Field                    | Type     | Purpose                                  |
| ------------------------ | -------- | ---------------------------------------- |
| `customerId`             | ObjectId | Booking owner                            |
| `professionalId`         | ObjectId | Assigned professional profile            |
| `serviceId`              | ObjectId | Selected service                         |
| `serviceSnapshot`        | Object   | Name, price and duration at booking time |
| `addressSnapshot`        | Object   | Full service address                     |
| `startAt`, `endAt`       | Date     | Exact reservation interval               |
| `status`                 | String   | Booking lifecycle                        |
| `totalAmount`            | Number   | Server-calculated amount                 |
| `paymentStatus`          | String   | Payment state                            |
| `createdAt`, `updatedAt` | Date     | Auditing                                 |

Store booking dates in UTC and convert between UTC and `Asia/Kolkata` when displaying schedules. Prices must be computed by the backend, never trusted from a customer's request.

### E. Supporting collections

| Collection         | Important fields                                                  |
| ------------------ | ----------------------------------------------------------------- |
| `slotReservations` | bookingId, professionalId, slotStart, slotEnd                     |
| `payments`         | bookingId, amount, method, status, mockTransactionId, paidAt      |
| `reviews`          | bookingId, customerId, professionalId, rating, comment, createdAt |
| `complaints`       | bookingId, customerId, description, status, resolution            |
| `serviceAreas`     | city, pincode, active                                             |

Use embedded addresses in `users` for saved addresses, and copy the selected address into the booking to preserve history.

### Key indexes and constraints

- Unique indexes on user emails, service/category slugs, and review booking IDs.
- Index professionals by active status, skills, and service PIN codes.
- Index customer bookings by `customerId` and `startAt`.
- Prevent duplicate active reservations for each professional and time slot.
- Index booking status and dates to support admin dashboard queries.

For assignment, I recommend fixed 30-minute reservation units in the MVP. A 90-minute booking claims three consecutive units. Use a unique compound index on `(professionalId, slotStart)` and a transaction to insert those units together with the booking. This makes overlapping reservations easier to prevent than relying on an ordinary availability query.

## 5. REST API contracts

Every response will follow one consistent format.

Successful response:

```

{
  "success": true,
  "data": {},
  "message": "Operation successful"
}

```

Error response:

```

{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "No professional is available for this slot"
  }
}

```

Use appropriate HTTP status codes: `200` for success, `201` for creation, `400` for invalid requests, `401` for unauthenticated access, `403` for forbidden actions, `404` for missing records, `409` for booking conflicts, and `500` for unexpected server errors.

### Authentication APIs

| Method | Endpoint                | Access        |
| ------ | ----------------------- | ------------- |
| POST   | `/api/v1/auth/register` | Public        |
| POST   | `/api/v1/auth/login`    | Public        |
| GET    | `/api/v1/auth/me`       | Authenticated |
| PATCH  | `/api/v1/users/me`      | Authenticated |
| POST   | `/api/v1/auth/logout`   | Authenticated |

Registration request:

```

{
  "name": "Rahul",
  "email": "rahul@example.com",
  "password": "ExamplePassword123!",
  "phone": "9876543210"
}

```

The registration endpoint always creates a customer. The server hashes the password and never sends it back.

For authentication, use short-lived JWT access tokens. Prefer Secure, HttpOnly cookies for refresh-session handling; for the initial same-origin deployment, a secure cookie-based authentication design is also acceptable. Add login rate limiting and generic login error messages.

### Customer APIs

| Method | Endpoint                             | Function                  |
| ------ | ------------------------------------ | ------------------------- |
| GET    | `/api/v1/categories`                 | List active categories    |
| GET    | `/api/v1/services`                   | Search/filter services    |
| GET    | `/api/v1/services/:id`               | Get service details       |
| GET    | `/api/v1/areas/:pincode`             | Check serviceability      |
| GET    | `/api/v1/availability`               | Get available start times |
| POST   | `/api/v1/bookings`                   | Create a booking          |
| GET    | `/api/v1/bookings/me`                | Booking history           |
| GET    | `/api/v1/bookings/:id`               | Booking details           |
| PATCH  | `/api/v1/bookings/:id/cancel`        | Cancel booking            |
| POST   | `/api/v1/bookings/:id/payments/mock` | Simulate payment          |
| POST   | `/api/v1/bookings/:id/review`        | Submit review             |

Example service search:

```
GET /api/v1/services?category=ac-service&search=cleaning&page=1&limit=10
```

Example availability search:

```
GET /api/v1/availability?serviceId=SERVICE_ID&date=2026-11-15&pincode=560001
```

The server returns start times for which at least one eligible professional has an available reservation window.

Booking request:

```

{
  "serviceId": "SERVICE_OBJECT_ID",
  "scheduledDate": "2026-11-15",
  "startTime": "10:00",
  "pincode": "560001",
  "addressId": "ADDRESS_ID"
}

```

Here the address ID refers to a saved customer address. The backend resolves it, checks ownership, verifies the PIN code, and derives the end time from the service duration.

Example booking response:

```

{
  "success": true,
  "data": {
    "bookingId": "BOOKING_OBJECT_ID",
    "status": "confirmed",
    "professional": {
      "name": "Ramesh",
      "rating": 4.7
    },
    "scheduledDate": "2026-11-15",
    "startTime": "10:00",
    "endTime": "11:30",
    "totalAmount": 799,
    "paymentStatus": "pending"
  }
}

```

### Professional APIs

| Method | Endpoint                               | Function                     |
| ------ | -------------------------------------- | ---------------------------- |
| POST   | `/api/v1/professional-applications`    | Apply to become professional |
| GET    | `/api/v1/professional-applications/me` | Track application            |
| GET    | `/api/v1/professional/jobs`            | Assigned bookings            |
| PATCH  | `/api/v1/professional/jobs/:id/status` | Update job status            |
| GET    | `/api/v1/professional/availability`    | View working schedule        |
| PUT    | `/api/v1/professional/availability`    | Set working schedule         |
| GET    | `/api/v1/professional/earnings`        | Earnings summary             |

A professional can only update jobs assigned to their own account.

### Admin APIs

| Method | Endpoint                                 | Function               |
| ------ | ---------------------------------------- | ---------------------- |
| GET    | `/api/v1/admin/dashboard`                | Dashboard metrics      |
| GET    | `/api/v1/admin/applications`             | Pending applications   |
| PATCH  | `/api/v1/admin/applications/:id`         | Approve/reject         |
| GET    | `/api/v1/admin/professionals`            | Professional directory |
| PATCH  | `/api/v1/admin/professionals/:id/status` | Activate/suspend       |
| POST   | `/api/v1/admin/categories`               | Create category        |
| POST   | `/api/v1/admin/services`                 | Create service         |
| PATCH  | `/api/v1/admin/services/:id`             | Update service         |
| GET    | `/api/v1/admin/bookings`                 | All bookings           |
| PATCH  | `/api/v1/admin/bookings/:id/reassign`    | Reassign booking       |
| GET    | `/api/v1/admin/analytics`                | Aggregated metrics     |

Service/category editing and soft-deactivation should be provided through authenticated admin endpoints.

## 6. Automatic professional assignment algorithm

This is the most important backend algorithm.

### Assignment decision flow

Customer requests booking

Validate service, date and PIN code

Filter approved professionals by skill, PIN code and work schedule

Exclude professionals with conflicting reservations

Rank candidates by workload

Candidate available

Reserve slots and confirm booking

No candidate

Return slot unavailable

### Initial candidate-ranking policy

Filter for active professionals who have the skill, operate in the PIN code, and are working during the entire appointment (including a configurable travel buffer).

Rank eligible candidates using:

1. Lowest number of assignments that day.
2. Lowest upcoming booked minutes.
3. A deterministic ID tie-breaker.

This is simple, testable and fair enough for an academic project. Professional ratings may later contribute to ranking.

### Preventing race conditions

A normal sequence of "check availability, then insert booking" can double-book a professional.

Instead:

1. Generate the required 30-minute reservation units.
2. Try reserving all units for the highest-ranked candidate.
3. Create the booking and reservations in one database transaction.
4. Rely on a unique compound index to reject conflicting reservations.
5. On conflict, retry with another professional.
6. If no candidate can be reserved, return HTTP `409`.

MongoDB supports compound unique indexes and multi-document transactions for this approach.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.mongodb.com\&sz=32)

MongoDB Docs

+1



Use MongoDB Atlas or a local replica set rather than a standalone MongoDB instance when testing transactions. On cancellation or successful reassignment, release or replace the reservation units in the same transaction as the status change.

## 7. Booking and payment state machines

Keep booking and payment states separate.

| Booking status | Meaning                      | Allowed next status          |
| -------------- | ---------------------------- | ---------------------------- |
| `confirmed`    | Assigned and reserved        | `in_progress`, `cancelled`   |
| `in_progress`  | Professional started work    | `completed`, `disputed`      |
| `completed`    | Work finished                | Terminal for normal workflow |
| `cancelled`    | Cancelled before work begins | Terminal                     |
| `disputed`     | Requires admin resolution    | Admin-controlled resolution  |

For initial development, restrict customer cancellations to confirmed bookings before the appointment begins.

Mock payment methods:

- `cash`: Customer pays after service, professional or admin records receipt.
- `mock_online`: User selects a simulated payment result from a test checkout page, and the backend records success or failure.

Never label a simulated payment as real Razorpay processing. A completed service and a paid booking are not necessarily the same thing.

## 8. Code organization

```

homeease/
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.js
│       ├── App.js
│       ├── components/
│       │   ├── Navbar.js
│       │   ├── ServiceCard.js
│       │   ├── BookingForm.js
│       │   └── ProtectedRoute.js
│       ├── pages/
│       │   ├── auth/
│       │   ├── customer/
│       │   ├── professional/
│       │   └── admin/
│       ├── api/
│       │   ├── authApi.js
│       │   ├── serviceApi.js
│       │   └── bookingApi.js
│       └── styles/
│           └── main.css
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── database.js
│       ├── models/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       │   ├── assignmentService.js
│       │   ├── bookingService.js
│       │   └── paymentService.js
│       ├── middleware/
│       │   ├── authenticate.js
│       │   ├── authorize.js
│       │   └── errorHandler.js
│       ├── validators/
│       └── scripts/
│           └── seed.js
├── docs/
│   └── api-contract.md
├── tests/
├── docker-compose.yml
└── README.md

```

The key architectural rule is that routes map to controllers, controllers validate and orchestrate requests, and service modules contain reusable business logic.

## 9. Build sequence — eight milestones

Do not build all three dashboards simultaneously. Build the backend capabilities and connect them to the frontend one feature at a time.

Milestone 1 — Project foundation

Set up Git, the Express server, React without JSX, MongoDB connectivity, environment variables, health-check endpoint and global error handling.

Done when: React loads successfully and Express can query MongoDB.

Milestone 2 — Authentication and roles

Create user schema, register/login, hashed passwords, JWT authentication, protected routes, and an admin seed script.

Done when: Customers and admins can log in and cannot access each other's protected endpoints.

Milestone 3 — Service catalog

Create category and service models, admin CRUD APIs, seed data, React service cards, search, filters, and service details.

Done when: An admin can publish a service and a customer can discover it.

Milestone 4 — Professional onboarding

Implement applications, admin review, approved professional profiles, PIN-code service coverage, and working schedules.

Done when: Approved professionals become eligible for assignment; rejected applicants do not.

Milestone 5 — Booking engine

Implement availability queries, automatic assignment, reservation transactions, booking creation, cancellation, and booking history.

Done when: Concurrent requests cannot double-book a professional.

Milestone 6 — Professional operations

Build the assigned-jobs dashboard, job progress updates, schedule management, and completion workflow.

Done when: A complete booking can progress from confirmation to service completion.

Milestone 7 — Payments, reviews and admin

Add mock checkout, cash collection records, invoice generation, customer reviews, revenue summaries and complaint management.

Done when: A completed booking has a consistent payment record and optional review.

Milestone 8 — Testing and deployment

Test API validation, role security, overlapping reservations, cancellation, responsive UI, Docker configuration and hosted deployment.

Done when: A test customer can book a service end to end on the deployed application.

## 10. First implementation steps

These are the initial commands and source files for the backend. Use a supported current Node.js LTS release.

### Step 1 — Initialize the project

```

mkdir homeease
cd homeease

git init

mkdir backend frontend docs tests

cd backend
npm init -y

npm pkg set type=commonjs
npm pkg set scripts.start="node src/server.js"
npm pkg set scripts.dev="nodemon src/server.js"

npm install express mongoose dotenv cors helmet bcrypt jsonwebtoken cookie-parser express-rate-limit
npm install --save-dev nodemon

mkdir -p src/config src/models src/routes src/controllers src/services src/middleware src/validators src/scripts

```

Add `.env` and `node_modules/` to `.gitignore`.

### Step 2 — Configure environment variables

Create `backend/.env`:

```

PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/homeease?replicaSet=rs0

JWT_SECRET=replace_with_secure_random_secret

CLIENT_URL=http://localhost:5173

```

The MongoDB URI assumes a local single-node replica set named `rs0`. Use the corresponding Atlas connection URI if working with MongoDB Atlas.

### Step 3 — Build the database connection

`backend/src/config/database.js`

```

var mongoose = require("mongoose");

function connectDatabase(callback) {
    mongoose.connect(process.env.MONGO_URI)
        .then(function () {
            console.log("MongoDB connected");
            callback(null);
        })
        .catch(function (error) {
            console.error("MongoDB error:", error.message);
            callback(error);
        });
}

module.exports = connectDatabase;

```

### Step 4 — Create the Express application

`backend/src/app.js`

```

var express = require("express");
var cors = require("cors");
var helmet = require("helmet");
var cookieParser = require("cookie-parser");

var app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/v1/health", function (req, res) {
    res.status(200).json({
        success: true,
        message: "HomeEase API running"
    });
});

module.exports = app;

```

`backend/src/server.js`

```

require("dotenv").config();

var app = require("./app");
var connectDatabase =
    require("./config/database");

var port = process.env.PORT || 5000;

connectDatabase(function (error) {
    if (error) {
        process.exit(1);
    }

    app.listen(port, function () {
        console.log(
            "Server running on port " + port
        );
    });
});

```

Run it:

```
npm run dev
```

Test:

```
curl http://localhost:5000/api/v1/health
```

This initial server is deliberately small. Add schema validation, centralized error handling, authentication, and rate limiting in the next milestone.

### Step 5 — Create your first Mongoose model

`backend/src/models/Category.js`

```

var mongoose = require("mongoose");

var categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    imageUrl: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model(
    "Category",
    categorySchema
);

```

This establishes the code convention we will use for every database model.

### Step 6 — Initialize the React frontend

Install a React frontend using a bundler configured for ordinary `.js` source files. React components will use `React.createElement()` instead of JSX.

Example `ServiceCard.js`:

```

var React = require("react");
var e = React.createElement;

function ServiceCard(props) {
    return e(
        "div",
        { className: "card p-3" },

        e("h4", null, props.name),

        e(
            "p",
            null,
            "Price: Rs. " + props.price
        ),

        e(
            "button",
            {
                className: "btn btn-primary",
                onClick: props.onBook
            },
            "Book Service"
        )
    );
}

module.exports = ServiceCard;

```

For compatibility with strict CommonJS-style authoring, configure the frontend build process to bundle CommonJS source rather than relying on the default ES module entry convention. Keep any tool-specific configuration isolated from the application source.

## 11. Testing plan

The highest-value tests should cover the application's business rules, not merely whether endpoints return HTTP 200.

| Test scenario                                 | Expected result                           |
| --------------------------------------------- | ----------------------------------------- |
| Duplicate email registration                  | Rejected                                  |
| Customer calls admin endpoint                 | HTTP 403                                  |
| Application rejected by admin                 | Applicant not assignable                  |
| Customer selects unsupported PIN code         | Booking rejected                          |
| No professional has required skill            | Slot unavailable                          |
| Two customers book same professional and slot | Only one reservation succeeds             |
| Customer cancels booking                      | Slots released                            |
| Two requests cancel the same booking          | No duplicate refund or inconsistent state |
| Customer reviews an unfinished booking        | Rejected                                  |
| Customer reviews booking twice                | Rejected                                  |
| Customer submits a modified price             | Backend uses stored service price         |
| Mock payment request repeated                 | No duplicate successful payment           |
| Professional updates someone else's job       | HTTP 403                                  |

For automated testing, use a Node-compatible testing framework and HTTP API testing library; Postman can be used for manual verification.

## 12. Definition of project completion

The project will be considered functionally complete when all three workflows operate without manually editing the database:

- Customer: Register → browse → choose address and slot → book → track → pay → review.
- Professional: Apply → receive approval → view assigned job → start → complete.
- Admin: Review application → publish services → monitor bookings → reassign or handle cancellations → review analytics.

My recommendation is to develop the backend and database before the dashboards, connecting a small React interface after each API module is functional. The automatic assignment and concurrency-safe booking engine are the strongest engineering features of this project and deserve the most development and testing attention.

The immediate target is to complete Milestones 1 and 2, then seed categories and approved professionals so the booking algorithm can be developed against realistic data.
