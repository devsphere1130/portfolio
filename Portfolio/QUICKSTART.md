# Quick Start

Full guide: [docs/SETUP.md](docs/SETUP.md).

## With Docker (recommended)

```bash
cd Portfolio
docker compose up -d                 # starts db, backend and frontend
```

- Site: http://localhost:5173
- Dashboard: http://localhost:5173/admin
- First time only: `docker compose exec backend python manage.py seed_content`, then
  `docker compose exec backend python manage.py bootstrap_admin`
- Stop: `docker compose stop` (data is kept). Avoid `docker compose down -v`: it deletes the database.

## Without Docker for the app (database still in Docker)

```bash
docker compose up -d db

cd backend
.\venv\Scripts\Activate.ps1          # Windows PowerShell
python manage.py migrate
python manage.py runserver           # http://127.0.0.1:8000

cd ..\frontend
npm run dev                          # http://localhost:5173
```

Both servers must be running for the contact form and dashboard to work. On Windows keep
`127.0.0.1` (not `localhost`) in `DATABASE_URL` in `backend/.env`.
