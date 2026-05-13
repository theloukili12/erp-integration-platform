# 🏭 ERP Integration Platform

A modern manufacturing integration platform for ERP data processing, ETL workflows, REST APIs, and KPI dashboard visualization.

Built with **FastAPI**, **PostgreSQL**, **Next.js**, and **Docker**.

---

# ⚙️ Tech Stack

| Technology         | Purpose                            |
| ------------------ | ---------------------------------- |
| **FastAPI**        | Modern Python backend framework    |
| **PostgreSQL 16**  | Relational database                |
| **SQLAlchemy**     | ORM for database access            |
| **Pydantic**       | Validation & DTO schemas           |
| **Pandas / NumPy** | ETL workflows & data processing    |
| **Docker Compose** | PostgreSQL container orchestration |
| **Uvicorn**        | ASGI application server            |
| **Next.js 15**     | Frontend dashboard                 |
| **TypeScript**     | Type-safe frontend development     |
| **Tailwind CSS**   | Dashboard UI styling               |

---

# 🏗️ Architecture

The project follows a layered architecture / repository-service pattern.

Each layer has a clear responsibility, making the platform scalable, maintainable, and enterprise-ready.

```text
HTTP Request
      ↓
┌─────────────┐
│ API Layer   │  FastAPI routes & endpoints
├─────────────┤
│ Schemas     │  Pydantic validation models
├─────────────┤
│ Services    │  Business logic & ETL workflows
├─────────────┤
│ Repositories│  Database access layer
├─────────────┤
│ Models      │  SQLAlchemy ORM models
├─────────────┤
│ PostgreSQL  │  Relational database
└─────────────┘
```

---

# 🔄 ERP Data Flow

```text
ERP System Export (CSV)
        ↓
ETL Import Workflow
        ↓
Validation Layer
        ↓
PostgreSQL Database
        ↓
FastAPI REST APIs
        ↓
Next.js KPI Dashboard
```

---

# 📁 Project Structure

```text
erp-integration-platform/
│
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI route definitions
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── repositories/     # Database access layer
│   │   ├── schemas/          # Pydantic DTO schemas
│   │   ├── services/         # Business logic & ETL workflows
│   │   ├── database.py       # Database engine & sessions
│   │   └── main.py           # FastAPI application entry point
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── lib/                  # API communication layer
│   └── package.json
│
├── data/                     # ERP CSV export files
├── docs/                     # Project screenshots
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# 🚀 Features

## Backend

* REST API development with FastAPI
* PostgreSQL integration
* SQLAlchemy ORM
* Pydantic validation schemas
* Production order CRUD APIs
* Filtering & pagination
* Health check endpoint
* Swagger/OpenAPI documentation

---

## ETL Workflow

* ERP CSV import pipeline
* Validation layer
* Duplicate order handling
* Data transformation
* PostgreSQL persistence

---

## Frontend Dashboard

* Manufacturing KPI dashboard
* Production order visualization
* Responsive layout
* FastAPI integration
* KPI cards
* Production order table

---

# 🚀 Getting Started

## Prerequisites

* Python 3.10+
* Node.js 20+
* Docker & Docker Compose

---

# 1️⃣ Clone Repository

```bash
git clone https://github.com/theloukili12/erp-integration-platform.git
cd erp-integration-platform
```

---

# 2️⃣ Start PostgreSQL Container

```bash
docker compose up -d
```

PostgreSQL container configuration:

| Setting  | Value        |
| -------- | ------------ |
| User     | postgres     |
| Password | postgres     |
| Database | erp_platform |
| Port     | 5432         |

---

# 3️⃣ Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
# source venv/bin/activate

pip install -r requirements.txt
```

---

# 4️⃣ Configure Environment Variables

Create:

```text
backend/.env
```

Add:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_platform
```

---

# 5️⃣ Run FastAPI Backend

```bash
cd backend
uvicorn app.main:app --reload
```

Backend available at:

| URL                          | Description  |
| ---------------------------- | ------------ |
| http://localhost:8000/docs   | Swagger UI   |
| http://localhost:8000/redoc  | ReDoc        |
| http://localhost:8000/health | Health check |

---

# 6️⃣ Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend available at:

```text
http://localhost:3000
```

---

# 📡 API Endpoints

| Method | Endpoint       | Description                |
| ------ | -------------- | -------------------------- |
| GET    | `/health`      | Service health check       |
| POST   | `/etl/import`  | Import ERP CSV data        |
| GET    | `/orders`      | List production orders     |
| GET    | `/orders/{id}` | Get production order by ID |
| POST   | `/orders`      | Create production order    |

---

# 🧠 Engineering Concepts Demonstrated

* ERP integration architecture
* ETL workflows
* Layered backend architecture
* Repository-service pattern
* REST API design
* DTO validation
* Frontend/backend separation
* Containerized infrastructure
* Dashboard KPI visualization
* Manufacturing systems integration

---

# 🛣️ Roadmap

* [x] PostgreSQL integration
* [x] Production order REST APIs
* [x] ERP CSV ETL workflow
* [x] Validation layer
* [x] Next.js KPI dashboard
* [ ] Advanced ETL logging
* [ ] Authentication & authorization
* [ ] Dockerize frontend/backend
* [ ] Kubernetes deployment manifests
* [ ] CI/CD with GitHub Actions
* [ ] Power BI integration

---

# 📄 License

MIT
