# NEET Previous Year Question (PYQ) Practice Platform

A complete, production-ready, high-fidelity exam simulation and practice platform designed for NEET aspirants. It is engineered with strict timing boundaries, real-time search filters, saved bookmarks, and in-depth question explanations.

This platform operates in two modes:
1. **Live Preview/Deployment Mode (Fullstack Node.js + React)**: Automatically runs in the container, querying your real Supabase instance if keys are configured, otherwise falling back to a robust in-memory NEET question database so you can evaluate the UX instantly.
2. **Standalone Production Mode (FastAPI + React SPA)**: A modular python service structure located in `/backend` paired with the modern React frontend.

---

## Architecture Diagram

```
                 +-----------------------------------------+
                 |            React Router / Vite          |
                 |      (UI Canvas: Inter / Mono Fonts)    |
                 +--------------------+--------------------+
                                      |
                                      v (HTTPS / Rest API)
               +----------------------+----------------------+
               |                                             |
               v                                             v
+------------------------------+             +------------------------------+
|     Active Fallback Server   |             |   Standalone Python Service  |
|    (Node.js / Express.ts)    |             |       (FastAPI / Uvicorn)    |
+--------------+---------------+             +--------------+---------------+
               |                                            |
               v (Direct Database RPC & Querying)           v (Official Python SDK)
+------------------------------+             +--------------+---------------+
|     Supabase Connection      |             |     Supabase PostgreSQL      |
|  (users, questions, tables)  |             |  (users, questions, tables)  |
+------------------------------+             +------------------------------+
```

---

## Project Folder Structure

```
neet-platform/
│
├── backend/                       # Standalone Python Backend
│   ├── app/
│   │   ├── routers/               # auth.py, questions.py, bookmarks.py
│   │   ├── schemas/               # pydantic validation schemas
│   │   ├── security/              # JWT tokens, password crypt context
│   │   ├── config.py              # pydantic settings module
│   │   └── main.py                # uvicorn API entry point
│   ├── requirements.txt           # Python backend dependencies
│   └── .env.example
│
├── database/                      # SQL Database blueprints
│   ├── schema.sql                 # tables, schemas, constraints
│   ├── policies.sql               # Row Level Security (RLS) rules
│   └── indexes.sql                # high performance indexing schema
│
├── src/                           # Live Frontend Application
│   ├── components/                # ProtectedRoute, Navbar, Toast
│   ├── context/                   # AuthContext state manager
│   ├── pages/                     # Dashboard, Login, Signup, PracticeTest, Result, Profile
│   ├── App.tsx                    # main react router paths
│   ├── index.css                  # global styling & typography imports
│   ├── main.tsx
│   └── types.ts                   # share TypeScript types
│
├── server.ts                      # Full-stack Node API proxy server
├── package.json
└── README.md
```

---

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL="/api"
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```

### Backend (.env)
```env
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
JWT_SECRET="your-jwt-access-secret-32-chars-long"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-32-chars-long"
ENV="production"
DEBUG=false
TURNSTILE_SECRET_KEY="your-cloudflare-turnstile-secret"
```

---

## Installation & Running Commands

### Option A: Running the Active Fullstack Node container (Default)
This is pre-configured and starts automatically in the AI Studio environment.

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Launch dev environment**:
   ```bash
   npm run dev
   ```
3. **Compile production build**:
   ```bash
   npm run build
   ```

### Option B: Running Standalone Python Service
1. **Configure virtual environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```
2. **Install requirements**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Launch Python Server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## Database Configuration (Supabase)

To enable live querying for your actual question sheet data:
1. Log in to your **Supabase Dashboard**.
2. Go to the **SQL Editor** tab.
3. Copy and execute the contents of `database/schema.sql`.
4. Copy and execute `database/policies.sql` to activate Row Level Security boundaries.
5. Execute `database/indexes.sql` to index primary search/filter queries for optimal pagination performance.

---

## API Documentation

### Authentication Endpoints
* **`POST /api/signup`**: Registers a new student candidate with minimum 8-character hashed passwords.
* **`POST /api/login`**: Validates credentials and responds with JWT Access Token & sets HTTPOnly cookie for Refresh Token.
* **`POST /api/refresh`**: Utilizes the secure cookie to rotate and distribute a fresh Access Token.
* **`POST /api/logout`**: Standard logout clearing security cookies.

### Question Retrieval Endpoints
* **`GET /api/questions`**: Returns paginated list. Filter by `year`, `subject`, `chapter`, or keyword text search.
* **`GET /api/questions/{year}`**: Efficiently retrieves all 180 questions for an official yearly paper.
* **`GET /api/random-test`**: Aggregates and returns exactly 180 questions randomly across all years without duplicate IDs.

### Bookmarking Endpoints
* **`GET /api/bookmarks`**: Lists question IDs saved by the currently authenticated user.
* **`POST /api/bookmark/{id}`**: Saves a reference to the question.
* **`DELETE /api/bookmark/{id}`**: Deletes the bookmarked reference.

---

## Security Features & Compliance

* **Password Hashing**: Uses robust `bcryptjs` hashing. No plaintext credentials touch logs or storage databases.
* **Cloudflare Turnstile Ready**: Signup and Login forms contain turnstile checkbox elements ready to protect endpoints from automated bots.
* **Cookie Isolation**: Refresh tokens reside entirely in HTTPOnly, secure, same-site strict cookies.
* **Rate Limiting**: Integrated custom rate limiters prevent dictionary attacks:
  * Auth (Login/Signup): Limit of 5 requests per minute.
  * Practice sheets loading: 60 requests per minute.
* **Security Headers**: Activates defensive headers including strict Content Security Policies, Frame denial, and XSS protectors.
