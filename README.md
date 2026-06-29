# 🏭 ERP Integration Platform

A modern manufacturing integration platform for ERP data processing, ETL workflows, REST APIs, role-based access control (RBAC), and KPI dashboard visualization.

Built with **FastAPI**, **PostgreSQL**, **Next.js**, **Docker**, and a full **RBAC admin panel**.

---

# ⚙️ Tech Stack

| Technology         | Purpose                            |
| ------------------ | ---------------------------------- |
| **FastAPI**        | Modern Python backend framework    |
| **PostgreSQL 16**  | Relational database                |
| **SQLAlchemy**     | ORM for database access            |
| **Pydantic**       | Validation & DTO schemas           |
| **Pandas / NumPy** | ETL workflows & data processing    |
| **Docker Compose** | Full-stack container orchestration  |
| **Uvicorn**        | ASGI application server            |
| **Next.js 16**     | Frontend dashboard & admin panel   |
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
│ Auth/RBAC   │  Permission middleware (require_permission)
├─────────────┤
│ Schemas     │  Pydantic validation models
├─────────────┤
│ Services    │  Business logic & ETL workflows
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
│   │   │   ├── admin.py      # RBAC admin panel API (CRUD for all entities)
│   │   │   ├── etl.py        # ETL import endpoint
│   │   │   └── orders.py     # Production order endpoints
│   │   ├── models/
│   │   │   ├── rbac.py       # Department, User, Role, Feature, RolePermission, UserRole
│   │   │   └── production_order.py
│   │   ├── schemas/
│   │   │   ├── rbac.py       # Pydantic schemas for RBAC
│   │   │   └── production_order.py
│   │   ├── services/
│   │   │   ├── auth.py       # Permission middleware (require_permission)
│   │   │   ├── seed.py       # Default roles, features & permission matrix
│   │   │   ├── etl_service.py
│   │   │   └── validators.py
│   │   ├── database.py       # Database engine & sessions
│   │   └── main.py           # FastAPI application entry point
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── admin/page.tsx    # Admin panel (5 tabs)
│   │   ├── page.tsx          # KPI dashboard
│   │   └── layout.tsx
│   ├── lib/api.ts            # API communication layer
│   ├── Dockerfile
│   └── package.json
│
├── data/                     # ERP CSV export files
├── docs/                     # Project documentation
├── docker-compose.yml        # Full-stack orchestration
└── README.md
```

---

# 🚀 Features

## Backend

* REST API with FastAPI
* PostgreSQL integration
* SQLAlchemy ORM
* Pydantic validation schemas
* Production order CRUD APIs
* Filtering & pagination
* Health check endpoint
* Swagger/OpenAPI documentation
* CORS middleware

---

## RBAC (Role-Based Access Control)

* **Departments** — organizational units (Produktion, Logistik, IT, etc.)
* **Users** — employees with department assignment
* **Roles** — permission bundles (Administrator, Manager, Mitarbeiter, Viewer + custom)
* **Features** — platform modules with granular actions
* **Permission Matrix** — configurable per role: view, create, edit, delete, export
* **User-Role Assignment** — global or department-scoped
* **Permission Middleware** — `require_permission("feature", "action")` decorator
* **Seed Data** — pre-configured default roles & feature permissions

---

## ETL Workflow

* ERP CSV import pipeline
* Validation layer
* Duplicate order handling
* Data transformation
* PostgreSQL persistence

---

## Frontend

* Manufacturing KPI dashboard
* Production order visualization
* **Admin Panel** with 5 tabs:
  * Abteilungen (Departments)
  * Benutzer (Users)
  * Rollen (Roles)
  * Berechtigungsmatrix (Permission Matrix)
  * Rollenzuweisung (Role Assignment)
* Responsive layout with Tailwind CSS

---

# 🚀 Getting Started

## Prerequisites

* Docker & Docker Compose (recommended)
* Or: Python 3.10+ and Node.js 20+ for local development

---

# 1️⃣ Clone Repository

```bash
git clone https://github.com/theloukili12/erp-integration-platform.git
cd erp-integration-platform
```

---

# 2️⃣ Start with Docker (Recommended)

```bash
docker compose up --build -d
```

This starts **all services** (PostgreSQL, Backend, Frontend).

| Service    | URL                         |
| ---------- | --------------------------- |
| Frontend   | http://localhost:3000        |
| Admin Panel| http://localhost:3000/admin  |
| Backend API| http://localhost:8000        |
| Swagger UI | http://localhost:8000/docs   |

---

# 3️⃣ Seed Default Data

Load default roles (Administrator, Manager, Mitarbeiter, Viewer), features, and permission matrix:

```bash
curl -X POST http://localhost:8000/admin/seed
```

Or click **"Standarddaten laden"** in the Admin Panel.

---

# 4️⃣ Local Development (Alternative)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_platform
```

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 📡 API Endpoints

## Core

| Method | Endpoint       | Description                |
| ------ | -------------- | -------------------------- |
| GET    | `/health`      | Service health check       |
| POST   | `/etl/import`  | Import ERP CSV data        |
| GET    | `/orders`      | List production orders     |
| GET    | `/orders/{id}` | Get production order by ID |
| POST   | `/orders`      | Create production order    |

## Admin / RBAC

| Method | Endpoint                          | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/admin/seed`                     | Seed default roles & features  |
| GET    | `/admin/departments`              | List departments               |
| POST   | `/admin/departments`              | Create department              |
| PUT    | `/admin/departments/{id}`         | Update department              |
| DELETE | `/admin/departments/{id}`         | Delete department              |
| GET    | `/admin/users`                    | List users                     |
| POST   | `/admin/users`                    | Create user                    |
| PUT    | `/admin/users/{id}`               | Update user                    |
| GET    | `/admin/users/{id}/permissions`   | Get effective user permissions |
| GET    | `/admin/roles`                    | List roles                     |
| POST   | `/admin/roles`                    | Create custom role             |
| GET    | `/admin/features`                 | List features/modules          |
| GET    | `/admin/roles/{id}/permissions`   | Get role permission matrix     |
| PUT    | `/admin/roles/{id}/permissions`   | Set role permission matrix     |
| GET    | `/admin/user-roles`               | List user-role assignments     |
| POST   | `/admin/user-roles`               | Assign role to user            |
| DELETE | `/admin/user-roles/{id}`          | Remove role from user          |

---

# 🧠 Engineering Concepts Demonstrated

* ERP integration architecture
* ETL workflows & data pipelines
* Layered backend architecture
* Role-Based Access Control (RBAC)
* Permission middleware pattern
* REST API design
* DTO validation with Pydantic
* Frontend/backend separation
* Full-stack Docker containerization
* Dashboard KPI visualization
* Manufacturing systems integration

---

# 🛣️ Roadmap

* [x] PostgreSQL integration
* [x] Production order REST APIs
* [x] ERP CSV ETL workflow
* [x] Validation layer
* [x] Next.js KPI dashboard
* [x] Dockerize frontend/backend
* [x] RBAC system (roles, features, permission matrix)
* [x] Admin panel UI
* [x] CORS & API middleware
* [ ] JWT authentication (login/logout)
* [ ] Audit logging (who did what, when)
* [ ] Advanced ETL logging & error tracking
* [ ] Kubernetes deployment manifests
* [ ] CI/CD with GitHub Actions
* [ ] Power BI / reporting integration

---

# 📄 License

MIT
