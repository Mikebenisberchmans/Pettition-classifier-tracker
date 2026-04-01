"""
NyayaSetu Backend API
"""

import os, re, uuid, sqlite3, asyncio, pickle, logging
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_PATH    = r"C:\Users\benij\ds_project\Ai_pettition_project\backend\data\petitions.db"
MODEL_PATH = r"C:\Users\benij\ds_project\Ai_pettition_project\backend\models\svc_model_v2.pickle"
ENC_PATH   = r"C:\Users\benij\ds_project\Ai_pettition_project\backend\encoder\label_encoder.pickle"

# ── ML pipeline — loaded ONCE, only in the main process ──────────────────────
MOCK_MODE       = False
embedding_model = None
svc_model       = None
label_encoder   = None

def load_models():
    global embedding_model, svc_model, label_encoder, MOCK_MODE
    try:
        from sentence_transformers import SentenceTransformer
        from langdetect import DetectorFactory
        DetectorFactory.seed = 0

        logger.info("Loading SentenceTransformer…")
        embedding_model = SentenceTransformer("all-mpnet-base-v2")

        logger.info("Loading SVC model…")
        with open(MODEL_PATH, "rb") as f:
            svc_model = pickle.load(f)

        logger.info("Loading LabelEncoder…")
        with open(ENC_PATH, "rb") as f:
            label_encoder = pickle.load(f)

        logger.info("ML models loaded. Classes: %s", label_encoder.classes_)
        MOCK_MODE = False
    except Exception as e:
        logger.warning("ML models not loaded (%s). Running in MOCK mode.", e)
        MOCK_MODE = True


async def _translate_to_english(text: str) -> str:
    from freetranslate.googletranslate import GoogleTranslate
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    translator = GoogleTranslate()
    parts = [(await translator.translate(s, "en")).translated_text for s in sentences]
    return " ".join(parts)


def predict_urgency(raw_text: str) -> dict:
    if MOCK_MODE:
        import random
        labels = ["Fast Action", "Normal Action", "Urgent Action Required"]
        chosen = random.choice(labels)
        return {"prediction": chosen, "label_id": labels.index(chosen), "detected_language": "en"}

    from langdetect import detect
    text = raw_text.lower()
    try:
        lang = detect(text)
    except Exception:
        lang = "en"

    translated_text = None
    if lang != "en":
        translated_text = asyncio.run(_translate_to_english(text))
        text_for_model = translated_text
    else:
        text_for_model = text

    embedding     = embedding_model.encode([text_for_model])
    numeric_label = svc_model.predict(embedding)[0]
    human_label   = label_encoder.inverse_transform([numeric_label])[0].strip()

    result = {"prediction": human_label, "label_id": int(numeric_label), "detected_language": lang}
    if translated_text:
        result["translated_text"] = translated_text
    return result


# ── Database ──────────────────────────────────────────────────────────────────
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS petitions (
                petition_id       TEXT PRIMARY KEY,
                full_name         TEXT NOT NULL,
                email             TEXT NOT NULL,
                phone             TEXT,
                address           TEXT,
                city              TEXT,
                state             TEXT,
                pincode           TEXT,
                petition_title    TEXT NOT NULL,
                category          TEXT NOT NULL,
                description       TEXT NOT NULL,
                predicted_label   TEXT,
                label_id          INTEGER,
                detected_language TEXT,
                submitted_at      TEXT NOT NULL,
                emailed_at        TEXT
            )
        """)
        # Migration for existing databases: add emailed_at if missing
        try:
            conn.execute("ALTER TABLE petitions ADD COLUMN emailed_at TEXT")
            # Mark all existing petitions as already emailed so the first
            # scheduled run does not blast historical data.
            conn.execute("UPDATE petitions SET emailed_at = submitted_at WHERE emailed_at IS NULL")
        except sqlite3.OperationalError:
            pass  # column already exists
        conn.commit()
    logger.info("DB ready at %s", DB_PATH)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "mock_mode": MOCK_MODE})


@app.route("/api/petitions/submit", methods=["POST"])
def submit_petition():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "JSON body required."}), 400

    for field in ["full_name", "email", "petition_title", "category", "description"]:
        if not data.get(field, "").strip():
            return jsonify({"error": f"Field '{field}' is required."}), 400

    short_id    = uuid.uuid4().hex[:8].upper()
    petition_id = f"NS-{datetime.now().strftime('%Y%m%d')}-{short_id}"

    try:
        pred = predict_urgency(data["description"])
    except Exception as e:
        logger.exception("Prediction error")
        pred = {"prediction": "Under Review", "label_id": -1, "detected_language": "unknown"}

    db = get_db()
    db.execute("""
        INSERT INTO petitions
          (petition_id, full_name, email, phone, address, city, state, pincode,
           petition_title, category, description, predicted_label, label_id,
           detected_language, submitted_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        petition_id,
        data.get("full_name", "").strip(),
        data.get("email", "").strip(),
        data.get("phone", "").strip(),
        data.get("address", "").strip(),
        data.get("city", "").strip(),
        data.get("state", "").strip(),
        data.get("pincode", "").strip(),
        data.get("petition_title", "").strip(),
        data.get("category", "").strip(),
        data.get("description", "").strip(),
        pred["prediction"],
        pred["label_id"],
        pred.get("detected_language", "en"),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    ))
    db.commit()

    logger.info("Petition filed: %s → %s", petition_id, pred["prediction"])
    return jsonify({
        "petition_id":     petition_id,
        "predicted_label": pred["prediction"],
        "label_id":        pred["label_id"],
    }), 201


@app.route("/api/petitions/track/<petition_id>")
def track_petition(petition_id):
    db  = get_db()
    row = db.execute(
        "SELECT * FROM petitions WHERE petition_id = ?", (petition_id,)
    ).fetchone()

    if not row:
        return jsonify({"error": "Petition not found. Please check the ID."}), 404

    return jsonify({
        "petition_id":       row["petition_id"],
        "full_name":         row["full_name"],
        "email":             row["email"],
        "petition_title":    row["petition_title"],
        "category":          row["category"],
        "city":              row["city"],
        "state":             row["state"],
        "predicted_label":   row["predicted_label"],
        "label_id":          row["label_id"],
        "detected_language": row["detected_language"],
        "submitted_at":      row["submitted_at"],
    })


# ── Admin / Email Job endpoints ──────────────────────────────────────────────
@app.route("/api/admin/trigger-email-job", methods=["POST"])
def trigger_email_job():
    """Manually trigger the daily email job (for testing)."""
    from email_service import run_daily_email_job
    result = run_daily_email_job()
    return jsonify(result)


@app.route("/api/admin/email-status")
def email_status():
    """Quick overview of emailed vs pending petitions."""
    db = get_db()
    total   = db.execute("SELECT COUNT(*) FROM petitions").fetchone()[0]
    emailed = db.execute("SELECT COUNT(*) FROM petitions WHERE emailed_at IS NOT NULL").fetchone()[0]
    pending = db.execute("SELECT COUNT(*) FROM petitions WHERE emailed_at IS NULL").fetchone()[0]
    return jsonify({"total": total, "emailed": emailed, "pending": pending})


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    load_models()                      # load once, before Flask starts

    # Start the daily email scheduler if enabled
    from email_service import load_email_config, run_daily_email_job
    try:
        email_cfg = load_email_config()
        if email_cfg.get("enabled"):
            from apscheduler.schedulers.background import BackgroundScheduler
            scheduler = BackgroundScheduler()
            scheduler.add_job(
                run_daily_email_job,
                trigger="cron",
                hour=email_cfg["schedule_hour"],
                minute=email_cfg["schedule_minute"],
                id="daily_petition_email",
            )
            scheduler.start()
            logger.info("Email scheduler started: daily at %02d:%02d",
                        email_cfg["schedule_hour"], email_cfg["schedule_minute"])
        else:
            logger.info("Email scheduler disabled (set enabled=true in config/email_config.json)")
    except Exception:
        logger.exception("Could not initialize email scheduler")

    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)