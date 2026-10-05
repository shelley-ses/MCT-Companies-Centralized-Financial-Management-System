# MCT Companies Centralized Financial Management System

Centralized financial management system for managing financial records, transactions, reports, and company information across MCT Companies.

---

## Project Structure

```text
MCT-Companies-Centralized-Financial-Management-System/
├── backend/                  # FastAPI Backend API
│   ├── app/
│   │   ├── api/v1/          # Endpoints (Health, Companies, etc.)
│   │   ├── core/            # Configuration & Settings
│   │   ├── db/              # Database session & models
│   │   ├── models/          # ORM data models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic layer
│   │   └── main.py          # FastAPI application entry point
│   ├── .env                 # Environment variables
│   ├── requirements.txt     # Python dependencies
│   └── venv/                # Python virtual environment (pre-created)
│
├── frontend/                 # React.js Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx          # Financial Dashboard UI
│   │   ├── App.css          # Dashboard styling
│   │   ├── index.css        # Global design tokens & styling
│   │   └── main.jsx         # React application root
│   ├── package.json
│   └── vite.config.js       # Vite config with API proxy
│
└── README.md
```

---

## How to Run the Project

### Option A: Run Both Together (Recommended) 🚀

From the project root folder, simply run:

```powershell
npm run dev
```

Or double-click / run:
- **`.\start-all.ps1`** (PowerShell)
- **`.\start-all.bat`** (CMD / Explorer)

This concurrently starts:
- 🔵 **Backend (FastAPI)** on [http://127.0.0.1:8000](http://127.0.0.1:8000) (Docs at `/docs`)
- 🟣 **Frontend (React)** on [http://localhost:5173](http://localhost:5173)

---

### Option B: Run Individually in Separate Terminals

In your first terminal:

```powershell
cd backend
.\run.ps1
```

*(Alternatively, run directly without scripts: `.\venv\Scripts\uvicorn app.main:app --reload`)*

- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### 2. Run the Frontend (React + Vite)

In your second terminal:

```powershell
cd frontend

# Start the Vite development server
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)

---

## API Endpoints Included

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root API welcome message |
| `GET` | `/api/v1/health` | Service health status check |
| `GET` | `/api/v1/companies` | List all registered MCT entities with financial figures |
| `GET` | `/api/v1/companies/{id}` | Retrieve details for a specific entity |
| `POST`| `/api/v1/companies` | Register a new MCT entity |
