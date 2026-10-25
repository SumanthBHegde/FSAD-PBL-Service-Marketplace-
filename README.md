# HomeEase

A home-service broker marketplace for Bengaluru. Customers book a service, and the platform
**automatically assigns** an available professional. Built with MongoDB, Express, React and Node.

The full design is in [prd.md](./prd.md).

## Requirements

- Node.js 20 or newer
- Docker Desktop (for MongoDB), or a local MongoDB install

## Run it

```bash
# 1. Start MongoDB
docker compose up -d

# 2. Backend (http://localhost:5000)
cd backend
npm install
cp .env.example .env
npm run seed        # creates the admin account and 6 services
npm run dev

# 3. Frontend (http://localhost:5173), in a second terminal
cd frontend
npm install
npm run dev
```

The home page shows "API ok, database connected" when everything is running.

Admin login (after seeding): the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values in `backend/.env`.

## Project structure

```
backend/
  server.js            Express app, routes, error handler
  seed.js              admin + starter services
  config/db.js         MongoDB connection
  middleware/auth.js   protect, allow(...roles)
  models/              User, Service, Booking
  controllers/         authController, serviceController, bookingController
  routes/              authRoutes, serviceRoutes, bookingRoutes
  utils/assign.js      auto-assignment
frontend/
  src/main.js          entry point
  src/App.js           navbar + routes
  src/api.js           fetch wrapper
  src/AuthContext.js   logged-in user
  src/pages/           one file per page
```

Every API route is already wired up. Unfinished controllers answer `501 TODO: ...`, and
unfinished pages show "Coming soon". Replace them with real code in your feature branch.

## Who owns what

| Member | Area | Files |
|---|---|---|
| 1 | Auth & users | `models/User.js`, `middleware/auth.js`, `authController.js`, `authRoutes.js`, `AuthContext.js`, `Login.js`, `Register.js`, `AdminPros.js` |
| 2 | Services & profiles | `models/Service.js`, `serviceController.js`, `serviceRoutes.js`, `Services.js`, `ProProfile.js`, `AdminServices.js` |
| 3 | Bookings & auto-assign | `models/Booking.js`, `utils/assign.js`, `bookingController.js`, `bookingRoutes.js`, `BookService.js`, `MyBookings.js`, `ProJobs.js`, `AdminBookings.js` |

Member 1 should finish `middleware/auth.js` first; until then protected routes let every
request through.

## Code style

- ES modules (`import` / `export`), `async/await`.
- React function components and hooks, no JSX: `const e = React.createElement;`.
- MVC: routes call controllers, controllers use models.
- Errors: `res.status(code).json({ message })`.

## Git workflow

```bash
git checkout main
git pull
git checkout -b feat/auth          # feat/services, feat/booking, ...
# work and commit
git push -u origin feat/auth
```

Then open a pull request into `main`. One teammate reviews before merging. Never commit `.env`
or `node_modules/`.
