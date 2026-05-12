# 🏭 ERP Integration Platform

A backend API for ERP integration, ETL workflows, and manufacturing data processing — built with **Python**, **FastAPI**, and **PostgreSQL**.

---

## ⚙️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Modern Python web framework with auto-generated Swagger docs |
| **PostgreSQL 16** | Relational database, running in Docker |
| **SQLAlchemy** | ORM for database interactions |
| **Alembic** | Database schema migrations |
| **Pandas / NumPy** | ETL data processing and transformations |
| **Pydantic** | Request/response data validation |
| **Docker Compose** | Container orchestration for PostgreSQL |
| **Uvicorn** | ASGI server to run FastAPI |

---

## 🏗️ Architecture

The project follows the **Repository-Service Pattern** (Layered Architecture).

Each layer has a single responsibility, keeping the codebase testable, maintainable, and scalable.

```
HTTP Request
    │
    ▼
┌──────────┐
│   API    │   Routes & endpoints
├──────────┤
│ Schemas  │   Input/output validation (Pydantic)
├──────────┤
│ Services │   Business logic, ETL, rules
├──────────┤
│  Repos   │   Database queries (CRUD)
├──────────┤
│  Models  │   ORM table definitions
├──────────┤
│ Database │   PostgreSQL
└──────────┘
```

---

## 📁 Project Structure

```
erp-integration-platform/
├── backend/
│   ├── app/
│   │   ├── api/              # Route definitions (endpoints)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── repositories/     # Database access layer
│   │   ├── schemas/          # Pydantic validation models
│   │   ├── services/         # Business logic & ETL
│   │   ├── database.py       # DB engine, session & connection
│   │   └── main.py           # FastAPI app entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                  # (coming soon)
├── docker-compose.yml         # PostgreSQL container setup
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Docker & Docker Compose**

### 1. Clone the repository

```bash
git clone https://github.com/theloukili12/erp-integration-platform.git
cd erp-integration-platform
```

### 2. Start PostgreSQL via Docker

```bash
docker compose up -d
```

This spins up a PostgreSQL 16 container with:
- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `erp_platform`
- **Port:** `5432`

### 3. Set up the backend

```bash
cd backend
python -m venv venv

# Activate virtual environment
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_platform
```

### 5. Run the API

```bash
cd backend
uvicorn app.main:app --reload
```

### 6. Open in your browser

| URL | Description |
|-----|-------------|
| http://localhost:8000/health | Health check endpoint |
| http://localhost:8000/docs | Swagger UI (interactive API docs) |
| http://localhost:8000/redoc | ReDoc (alternative API docs) |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Returns service status |

---

## 🛣️ Roadmap

- [ ] Define database models (Products, Orders, Materials)
- [ ] Implement CRUD endpoints
- [ ] Add ETL pipeline for ERP data import
- [ ] Alembic database migrations
- [ ] Authentication & authorization
- [ ] Frontend dashboard

---

## 📄 License

MIT
