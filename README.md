# NyayaSetu — Justice Bridge Petition Portal

An AI-powered civic petition platform that allows citizens to file petitions, automatically classifies them by urgency using machine learning, and sends daily email notifications to relevant government departments.

## Features

- **AI Urgency Classification** — Petitions are automatically classified into three urgency levels using a SentenceTransformer + SVC pipeline:
  - **Urgent Action Required** — Life-threatening or emergency situations
  - **Fast Action** — Time-sensitive issues requiring prompt attention
  - **Normal Action** — Standard requests for long-term improvements
- **Multi-Language Support** — Auto-detects petition language and translates non-English text to English before classification
- **Petition Tracking** — Citizens can track their petition status using a unique ID (`NS-YYYYMMDD-XXXXXXXX`)
- **Daily Email Notifications** — Scheduled job sends urgency-themed emails to department inboxes every morning
- **Department Routing** — Petitions are routed to the correct department based on category (10 categories supported)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5 |
| Backend | Flask 3.1, Python 3.10+ |
| Database | SQLite |
| ML Model | SentenceTransformer (all-mpnet-base-v2) + scikit-learn SVC |
| Scheduler | APScheduler |
| Email | Python smtplib (SMTP) |
| Translation | freetranslate (Google Translate) |

## Project Structure

```
Ai_pettition_project/
├── backend/
│   ├── config/
│   │   ├── email_config.json         # SMTP & scheduler settings
│   │   └── department_emails.json    # Category → department email mapping
│   ├── data/
│   │   ├── petitions.db              # SQLite database
│   │   └── petition_dataset.csv      # Training dataset (135 samples)
│   ├── encoder/
│   │   └── label_encoder.pickle      # Urgency label encoder
│   ├── models/
│   │   ├── svc_model_v1.pickle       # Previous model version
│   │   └── svc_model_v2.pickle       # Active SVC classifier
│   ├── notebooks/
│   │   ├── exploration.ipynb         # Data analysis
│   │   └── model_experimentation.ipynb
│   ├── src/
│   │   ├── server.py                 # Flask API server
│   │   ├── email_service.py          # Daily email job logic
│   │   ├── email_templates.py        # Urgency-themed HTML templates
│   │   ├── utils.py                  # Data/model loading utilities
│   │   └── main.py                   # Test script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Main React application
│   │   └── main.jsx                  # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── project_data/
    └── Ai-petition-classifier.pdf    # Project documentation
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python src/server.py
```

The backend runs at `http://localhost:5000`.

On first run, the server will:
1. Create/migrate the SQLite database
2. Load ML models (SentenceTransformer, SVC classifier, LabelEncoder)
3. Start the email scheduler (if enabled in config)

> If ML models fail to load, the server falls back to **mock mode** with random urgency assignment.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend runs at `http://localhost:3000`.

## API Endpoints

### Health Check
```
GET /api/health
→ { "status": "ok", "mock_mode": false }
```

### Submit a Petition
```
POST /api/petitions/submit
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "petition_title": "Broken water pipeline",
  "category": "Water & Sanitation",
  "description": "The main water pipeline on MG Road has been leaking for 3 weeks..."
}

→ 201 { "petition_id": "NS-20260401-A1B2C3D4", "predicted_label": "Fast Action", "label_id": 1 }
```

### Track a Petition
```
GET /api/petitions/track/NS-20260401-A1B2C3D4
→ { "petition_id": "...", "full_name": "...", "predicted_label": "Fast Action", ... }
```

### Email Job Status
```
GET /api/admin/email-status
→ { "total": 15, "emailed": 12, "pending": 3 }
```

### Trigger Email Job Manually
```
POST /api/admin/trigger-email-job
→ { "sent": 3, "failed": 0, "groups": 2 }
```

## Petition Categories

| Category | Department |
|----------|-----------|
| Infrastructure & Roads | Roads Department |
| Water & Sanitation | Water Department |
| Public Safety & Emergency | Safety Department |
| Environment & Pollution | Environment Department |
| Healthcare | Health Department |
| Education | Education Department |
| Public Transport | Transport Department |
| Housing & Land | Housing Department |
| Governance & Administration | Governance Department |
| Other | General Petitions |

## Email Notification Setup

The daily email job sends petitions to department inboxes grouped by category and urgency, with different email templates per urgency level.

### 1. Configure SMTP

Edit `backend/config/email_config.json`:

```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_user": "your-email@gmail.com",
  "smtp_password": "your-app-password",
  "sender_email": "your-email@gmail.com",
  "sender_name": "NyayaSetu Petition System",
  "use_tls": true,
  "schedule_hour": 8,
  "schedule_minute": 0,
  "enabled": true
}
```

> For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password).

### 2. Configure Department Emails

Edit `backend/config/department_emails.json` to map categories to real department email addresses.

### 3. Email Templates by Urgency

| Urgency | Theme | Tone | Response Expected |
|---------|-------|------|-------------------|
| Urgent Action Required | Red | CRITICAL — immediate action | Within 24 hours |
| Fast Action | Orange | PRIORITY — prompt attention | Within 48 hours |
| Normal Action | Blue | Informational — standard review | Standard processing |

## ML Pipeline

```
Petition Text
    ↓
Language Detection (langdetect)
    ↓
Translation to English (if needed, via Google Translate)
    ↓
Text Embedding (SentenceTransformer: all-mpnet-base-v2)
    ↓
Classification (SVC model)
    ↓
Label Decoding (LabelEncoder → "Urgent Action Required" / "Fast Action" / "Normal Action")
```

**Training data:** 135 labeled civic petition examples in `backend/data/petition_dataset.csv` with columns `paragraph` and `label`.

## Database Schema

| Column | Type | Description |
|--------|------|-------------|
| petition_id | TEXT (PK) | Format: `NS-YYYYMMDD-XXXXXXXX` |
| full_name | TEXT | Petitioner name |
| email | TEXT | Petitioner email |
| phone | TEXT | Phone number |
| address | TEXT | Street address |
| city | TEXT | City |
| state | TEXT | State |
| pincode | TEXT | Postal code |
| petition_title | TEXT | Petition title |
| category | TEXT | One of 10 categories |
| description | TEXT | Full petition text (ML input) |
| predicted_label | TEXT | AI-predicted urgency level |
| label_id | INTEGER | Numeric urgency (0, 1, 2) |
| detected_language | TEXT | Auto-detected language code |
| submitted_at | TEXT | Submission timestamp |
| emailed_at | TEXT | When petition was emailed to dept (NULL = pending) |
