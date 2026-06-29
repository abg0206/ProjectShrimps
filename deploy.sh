#!/bin/bash
# =============================================================================
# Deploy locally script 
# Connects to local PostgreSQL servers only
#
# Hello to anyone else suffering this took way to long 
# =============================================================================

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
fail() { echo -e "${RED}[error]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$REPO_ROOT/Backend"
FRONTEND_DIR="$REPO_ROOT/Frontend/ats-frontend"

ENV_FILE="$BACKEND_DIR/.env"

# =============================================================================
# LOAD CONFIG FROM .env
# =============================================================================
[ -f "$ENV_FILE" ] || fail "No .env file found at $ENV_FILE — create one before running this script."

log "Loading config from Backend/.env..."

while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  export "$key=$value"
done < "$ENV_FILE"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:?".env is missing DB_USER"}"
DB_PASSWORD="${DB_PASSWORD:?".env is missing DB_PASSWORD"}"
BACKEND_PORT="${PORT:-8080}"

# =============================================================================
# PREREQUISITES
# =============================================================================
log "Checking prerequisites..."
command -v node >/dev/null 2>&1 || fail "Node.js not installed. Go here: https://nodejs.org"
command -v npm  >/dev/null 2>&1 || fail "npm not found. Go install it."
node -e "if(parseInt(process.version.slice(1))<18)process.exit(1)" \
  || fail "Node 18+ required. Current: $(node --version)"
log "Node $(node --version)"

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  fail "Python not found. Go install it: https://www.python.org/downloads/"
fi
log "Python found: $PYTHON_BIN"

"$PYTHON_BIN" -c "import psycopg2" 2>/dev/null \
  || { fail "Run: pip install psycopg2-binary"; }

# =============================================================================
# DATABASE CONNECTION CHECK
# =============================================================================
log "Checking local PostgreSQL connection ($DB_HOST:$DB_PORT, db=$DB_NAME, user=$DB_USER)..."

DB_CHECK_RESULT=$("$PYTHON_BIN" << PYEOF
import psycopg2, sys
try:
    conn = psycopg2.connect(host="$DB_HOST", port=$DB_PORT, dbname="$DB_NAME", user="$DB_USER", password="$DB_PASSWORD")
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(100));")
    conn.commit()
    cur.execute("SELECT current_database(), current_user;")
    db, user = cur.fetchone()
    cur.close(); conn.close()
    print(f"OK:{db}:{user}")
except Exception as e:
    print(f"FAIL:{e}"); sys.exit(1)
PYEOF
) || true

if [[ "$DB_CHECK_RESULT" == OK:* ]]; then
  IFS=':' read -r _ CONNECTED_DB CONNECTED_USER <<< "$DB_CHECK_RESULT"
  log "Local PostgreSQL is working! Connected to '$CONNECTED_DB' as '$CONNECTED_USER'"
else
  ERR_MSG="${DB_CHECK_RESULT#FAIL:}"
  fail "Local PostgreSQL failed. Error: $ERR_MSG"
fi

# =============================================================================
# UPDATE TABLES PROMPT
# =============================================================================
echo ""
read -p "$(echo -e "${YELLOW}[prompt]${NC} Update database tables? (y/N): ")" RECREATE_DB
RECREATE_DB="${RECREATE_DB:-N}"

if [[ "$RECREATE_DB" =~ ^[Yy]$ ]]; then
  log "Updating tables..."
  RUN_SCHEMA=true
else
  log "Skipping schema run. Existing tables (if any) will be left as-is."
  RUN_SCHEMA=false
fi

# =============================================================================
# BACKEND
# =============================================================================
log "Starting backend..."
cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
  log "Installing backend dependencies..."
  npm install
fi

if [ "$RUN_SCHEMA" = true ]; then
  log "Running Backend/sql/initDatabase.js..."
  node sql/initDatabase.js || warn "Some schema statements may have failed (often fine if tables/types already exist)."
fi

log "Starting backend on port $BACKEND_PORT..."
npx nodemon server.js &
BACKEND_PID=$!

cd "$REPO_ROOT"

# =============================================================================
# FRONTEND
# =============================================================================
log "Configuring frontend..."
cd "$FRONTEND_DIR"

cat > .env.local << EOF
VITE_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
EOF

if [ ! -d "node_modules" ]; then
  log "Installing frontend dependencies..."
  npm install
fi

# ---------------------------------------------------------------------------
# Resume upload deps (mammoth for .docx, pdfjs-dist for .pdf parsing)
# ---------------------------------------------------------------------------
NEED_RESUME_DEPS=false
[ -d "node_modules/mammoth" ] || NEED_RESUME_DEPS=true
[ -d "node_modules/pdfjs-dist" ] || NEED_RESUME_DEPS=true

if [ "$NEED_RESUME_DEPS" = true ]; then
  log "Installing resume upload dependencies (mammoth, pdfjs-dist)..."
  npm install mammoth pdfjs-dist
fi

# pdfjs needs its worker file served as a static asset from public/
PDF_WORKER_SRC="node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
PDF_WORKER_DEST="public/pdf.worker.min.mjs"

if [ -f "$PDF_WORKER_SRC" ]; then
  if [ ! -f "$PDF_WORKER_DEST" ] || [ "$PDF_WORKER_SRC" -nt "$PDF_WORKER_DEST" ]; then
    log "Copying pdf.worker.min.mjs into public/..."
    mkdir -p public
    cp "$PDF_WORKER_SRC" "$PDF_WORKER_DEST"
  fi
else
  warn "Could not find $PDF_WORKER_SRC — PDF resume upload may not work. Try reinstalling pdfjs-dist."
fi

log "Starting Vite dev server..."
npm run dev &
FRONTEND_PID=$!

cd "$REPO_ROOT"

# =============================================================================
# SUMMARY
# =============================================================================
sleep 2
echo ""
log "========================================"
log "  ProjectShrimps running fully locally"
log ""
log "  Frontend:  http://localhost:5173"
log "  Backend:   http://localhost:$BACKEND_PORT"
log "  Database:  $DB_HOST:$DB_PORT/$DB_NAME "
log "  Website: http://localhost:5173/"
log ""
log "  Press Ctrl+C to stop everything."
log "========================================"

trap "log 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID