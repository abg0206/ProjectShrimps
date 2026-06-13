# backend
## enviornment variables
this project uses enviornment variables for configuration.
1. copy 'env.example' and rename it to '.env'
2. fill in your local values 
3. never commit '.env' it's gitignored and contains secrets
Required variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL (AWS RDS) connection
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` — Clerk authentication keys
- `PORT` — server port (default 5000)
- `NODE_ENV` — environment mode


## Folder Structure
- `config/db.js` — PostgreSQL connection pool (reads DB credentials from `.env`)
- `models/User.js` — database queries (find/create users, profiles)
- `controllers/authController.js` — request handling logic for auth routes
- `routes/authRoutes.js` — defines `/api/auth/*` endpoints
- `middleware/sanitValidation.js` — validates and sanitizes registration input
- `middleware/requireAuth.js` — (in progress) verifies Clerk session tokens for protected routes
- `server.js` — Express app entry point



### running locally
```bash
npm install
node server.js
```