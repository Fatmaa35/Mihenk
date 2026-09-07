CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL,
    themes_json TEXT NOT NULL,
    traits_json TEXT NOT NULL,
    description TEXT NOT NULL,
    source_name TEXT,
    source_url TEXT,
    cover_url TEXT,
    series_name TEXT,
    series_index REAL,
    canonical_work_key TEXT,
    publication_type TEXT NOT NULL DEFAULT 'unknown' CHECK (publication_type IN ('fiction','nonfiction','poetry','essay','children','academic','reference','unknown')),
    language TEXT NOT NULL DEFAULT 'tr',
    original_language TEXT,
    page_count INTEGER CHECK (page_count IS NULL OR page_count > 0),
    atmosphere_json TEXT NOT NULL DEFAULT '[]',
    narrative_style_json TEXT NOT NULL DEFAULT '[]',
    narrative_pace TEXT CHECK (narrative_pace IS NULL OR narrative_pace IN ('slow','medium','fast')),
    quality_score REAL NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
    quality_flags_json TEXT NOT NULL DEFAULT '[]',
    is_recommendable INTEGER NOT NULL DEFAULT 0 CHECK (is_recommendable IN (0,1)),
    rating_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_count >= 0),
    rating_average REAL NOT NULL DEFAULT 0 CHECK(rating_average BETWEEN 0 AND 5),
    popularity_score REAL NOT NULL DEFAULT 0 CHECK(popularity_score BETWEEN 0 AND 1),
    metadata_updated_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    app_role TEXT NOT NULL DEFAULT 'user' CHECK (app_role IN ('user','editor','admin')),
    is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0,1)),
    verification_label TEXT,
    verified_at TEXT,
    verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    banned_at TEXT,
    banned_until TEXT,
    banned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    ban_reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    before_json TEXT,
    after_json TEXT,
    request_id TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS action_executions (
    idempotency_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    result_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'succeeded' CHECK(status IN ('succeeded','failed','undone')),
    action_payload_json TEXT NOT NULL DEFAULT '{}',
    inverse_action_json TEXT,
    error_code TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    undone_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_review_items (
    id TEXT PRIMARY KEY,
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('missing_cover','duplicate','suspicious_metadata','source_conflict','missing_isbn')),
    severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
    details_json TEXT NOT NULL DEFAULT '{}',
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_catalog_review_open ON catalog_review_items(status, severity, created_at);

CREATE TABLE IF NOT EXISTS catalog_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL CHECK (job_type IN ('google_books_import','open_library_import','metadata_refresh','quality_scan')),
    payload_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','dead_letter')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_catalog_jobs_pending ON catalog_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS book_field_sources (
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    observed_value_json TEXT,
    observed_at TEXT NOT NULL,
    PRIMARY KEY(book_id, field_name, source_name)
);

CREATE TABLE IF NOT EXISTS auth_accounts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
ON password_reset_tokens(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    personality_text TEXT NOT NULL DEFAULT '',
    selected_traits_json TEXT NOT NULL DEFAULT '[]',
    preferred_genres_json TEXT NOT NULL DEFAULT '[]',
    disliked_genres_json TEXT NOT NULL DEFAULT '[]',
    liked_styles_json TEXT NOT NULL DEFAULT '[]',
    disliked_styles_json TEXT NOT NULL DEFAULT '[]',
    pace_preference TEXT CHECK (pace_preference IS NULL OR pace_preference IN ('slow','medium','fast','mixed')),
    focus_preference TEXT CHECK (focus_preference IS NULL OR focus_preference IN ('character','plot','balanced')),
    tone_preference TEXT CHECK (tone_preference IS NULL OR tone_preference IN ('dark','hopeful','balanced')),
    violence_sensitivity INTEGER NOT NULL DEFAULT 0 CHECK (violence_sensitivity BETWEEN 0 AND 3),
    romance_sensitivity INTEGER NOT NULL DEFAULT 0 CHECK (romance_sensitivity BETWEEN 0 AND 3),
    spoiler_sensitivity INTEGER NOT NULL DEFAULT 2 CHECK (spoiler_sensitivity BETWEEN 0 AND 3),
    length_preference TEXT CHECK (length_preference IS NULL OR length_preference IN ('short','medium','long','any')),
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_books (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    shelf TEXT NOT NULL CHECK (shelf IN ('read','reading','to_read','abandoned')),
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0,1)),
    current_page INTEGER NOT NULL DEFAULT 0 CHECK (current_page >= 0),
    total_pages INTEGER CHECK (total_pages IS NULL OR total_pages > 0),
    started_at TEXT,
    finished_at TEXT,
    abandonment_reason TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id, book_id),
    CHECK (total_pages IS NULL OR current_page <= total_pages)
);

CREATE INDEX IF NOT EXISTS idx_user_books_shelf ON user_books(user_id, shelf);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);

CREATE TABLE IF NOT EXISTS user_custom_books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 255),
    author TEXT NOT NULL DEFAULT 'Bilinmeyen yazar',
    genre TEXT NOT NULL DEFAULT 'Genel',
    cover_url TEXT,
    shelf TEXT NOT NULL CHECK (shelf IN ('read','reading','to_read','abandoned')),
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0,1)),
    current_page INTEGER NOT NULL DEFAULT 0 CHECK (current_page >= 0),
    total_pages INTEGER CHECK (total_pages IS NULL OR total_pages > 0),
    started_at TEXT,
    finished_at TEXT,
    abandonment_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (total_pages IS NULL OR current_page <= total_pages)
);

CREATE INDEX IF NOT EXISTS idx_user_custom_books_shelf
ON user_custom_books(user_id, shelf);

CREATE TABLE IF NOT EXISTS reading_goals (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_year INTEGER NOT NULL CHECK (goal_year BETWEEN 2000 AND 2200),
    target_books INTEGER NOT NULL CHECK (target_books BETWEEN 1 AND 1000),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id, goal_year)
);

CREATE TABLE IF NOT EXISTS reading_activity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    custom_book_id TEXT REFERENCES user_custom_books(id) ON DELETE CASCADE,
    activity_date TEXT NOT NULL,
    pages_read INTEGER NOT NULL CHECK (pages_read > 0),
    created_at TEXT NOT NULL,
    CHECK ((book_id IS NOT NULL) != (custom_book_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_reading_activity_user_date
ON reading_activity(user_id, activity_date);

CREATE TABLE IF NOT EXISTS price_alerts (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    target_price_minor INTEGER NOT NULL CHECK (target_price_minor > 0),
    currency TEXT NOT NULL DEFAULT 'TRY' CHECK (length(currency) = 3),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    last_notified_price_minor INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_active
ON price_alerts(is_active, book_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('price_drop','reading_reminder','comment_reply','comment_helpful','new_follower','badge_earned','edition_update')),
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    read_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('great_match','not_for_me','already_know','more_like_this')),
    query_text TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, book_id, feedback_type)
);

CREATE TABLE IF NOT EXISTS book_ratings (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,book_id)
);
CREATE INDEX IF NOT EXISTS idx_book_ratings_book ON book_ratings(book_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS book_comments (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    parent_comment_id TEXT REFERENCES book_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK(length(trim(content)) BETWEEN 2 AND 2000),contains_spoiler INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','hidden','removed')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_comments_public ON book_comments(book_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS comment_helpful_votes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id TEXT NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY(user_id,comment_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_helpful_comment ON comment_helpful_votes(comment_id,created_at DESC);

CREATE TABLE IF NOT EXISTS comment_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id TEXT NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK(reason IN ('spam','harassment','spoiler','hate','misinformation','other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
    moderator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id,comment_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_reports_queue ON comment_reports(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY(follower_id,followed_id),
    CHECK(follower_id <> followed_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id,created_at DESC);

CREATE TABLE IF NOT EXISTS badge_definitions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL CHECK(xp_reward >= 0),
    sort_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_code TEXT NOT NULL REFERENCES badge_definitions(code) ON DELETE CASCADE,
    earned_at TEXT NOT NULL,
    PRIMARY KEY(user_id,badge_code)
);

CREATE TABLE IF NOT EXISTS user_badge_showcase (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
    badge_code TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id,slot),
    UNIQUE(user_id,badge_code),
    FOREIGN KEY(user_id,badge_code) REFERENCES user_badges(user_id,badge_code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON user_badges(user_id,earned_at DESC);

INSERT OR IGNORE INTO badge_definitions(code,name,description,icon,xp_reward,sort_order) VALUES
('first_shelf','İlk Sayfa','İlk kitabını kitaplığına ekle.','📖',10,1),
('first_review','İlk İzlenim','İlk yayımlanmış yorumunu paylaş.','✍️',15,2),
('reader_5','Yolun Başında','Beş kitabı tamamla.','🌱',50,3),
('reader_25','Kitap Kurdu','Yirmi beş kitabı tamamla.','🐛',150,4),
('genre_explorer','Tür Kaşifi','Beş farklı türden kitap tamamla.','🧭',75,5),
('active_7','Düzenli Okur','Yedi farklı günde okuma ilerlemesi kaydet.','📅',40,6),
('streak_7','Okuma Serisi','Yedi günlük kesintisiz okuma serisine ulaş.','🔥',100,7),
('critic_10','Eleştirel Bakış','On yayımlanmış kitap yorumu paylaş.','🖋️',120,8),
('ratings_10','Topluluğun Sesi','On farklı kitabı yıldızla.','⭐',60,9),
('goal_getter','Hedef Tamam','Bir yıllık okuma hedefini tamamla.','🏆',100,10);

CREATE TABLE IF NOT EXISTS application_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,level TEXT NOT NULL,event_type TEXT NOT NULL,request_id TEXT,route TEXT,status_code INTEGER,
    duration_ms REAL,details_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_application_events_recent ON application_events(created_at DESC);

CREATE TABLE IF NOT EXISTS product_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL CHECK(event_name IN (
        'session_started','view_opened','onboarding_started','onboarding_completed',
        'notification_opt_in','feedback_submitted'
    )),
    properties_json TEXT NOT NULL DEFAULT '{}',
    occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_events_user_time ON product_events(user_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_name_time ON product_events(event_name,occurred_at DESC);

CREATE TABLE IF NOT EXISTS beta_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK(category IN ('bug','idea','usability','content','other')),
    rating INTEGER CHECK(rating BETWEEN 0 AND 10),
    message TEXT NOT NULL CHECK(length(trim(message)) BETWEEN 5 AND 2000),
    context_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','planned','resolved','closed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status_time ON beta_feedback(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_time ON beta_feedback(user_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user
ON recommendation_feedback(user_id, feedback_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    is_pinned INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0,1)),
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0,1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
ON chat_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content TEXT NOT NULL,
    books_json TEXT NOT NULL DEFAULT '[]',
    citations_json TEXT NOT NULL DEFAULT '[]',
    edited_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
ON chat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS reading_plans (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    target_date TEXT NOT NULL,
    daily_pages INTEGER NOT NULL CHECK (daily_pages > 0),
    reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0,1)),
    reminder_time TEXT NOT NULL DEFAULT '20:00',
    timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    excluded_weekdays_json TEXT NOT NULL DEFAULT '[]',
    weekday_pages INTEGER,
    weekend_pages INTEGER,
    delivery_channel TEXT NOT NULL DEFAULT 'in_app' CHECK(delivery_channel IN ('in_app','email','push')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS reading_plan_days (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, plan_date TEXT NOT NULL,
    planned_pages INTEGER NOT NULL CHECK(planned_pages >= 0), completed_pages INTEGER NOT NULL DEFAULT 0 CHECK(completed_pages >= 0),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,book_id,plan_date)
);
CREATE INDEX IF NOT EXISTS idx_reading_plan_days_calendar ON reading_plan_days(user_id,plan_date);

CREATE TABLE IF NOT EXISTS reminder_deliveries (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    scheduled_for TEXT NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT NOT NULL UNIQUE,last_error TEXT,sent_at TEXT,created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_due ON reminder_deliveries(status,scheduled_for);

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,p256dh TEXT NOT NULL,auth TEXT NOT NULL,user_agent TEXT,
    created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user ON web_push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,description TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0,
    rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK(rollout_percent BETWEEN 0 AND 100),updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    fallback_used INTEGER NOT NULL DEFAULT 0 CHECK (fallback_used IN (0,1)),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS retailers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    robots_url TEXT NOT NULL,
    content_policy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS editions (
    isbn TEXT PRIMARY KEY,
    isbn10 TEXT UNIQUE CHECK (isbn10 IS NULL OR length(isbn10) = 10),
    isbn13 TEXT UNIQUE CHECK (isbn13 IS NULL OR (length(isbn13) = 13 AND isbn13 GLOB '97[89]*')),
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    author TEXT,
    publisher TEXT,
    translator TEXT,
    edition_label TEXT,
    language TEXT,
    published_date TEXT,
    page_count INTEGER CHECK (page_count IS NULL OR page_count > 0),
    source_name TEXT,
    source_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    verified_at TEXT
);

CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    edition_isbn TEXT NOT NULL REFERENCES editions(isbn) ON DELETE CASCADE,
    retailer_id TEXT NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
    product_url TEXT NOT NULL UNIQUE,
    price_minor INTEGER NOT NULL,
    list_price_minor INTEGER,
    currency TEXT NOT NULL DEFAULT 'TRY',
    stock_status TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    UNIQUE(edition_isbn, retailer_id)
);

CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    price_minor INTEGER NOT NULL,
    stock_status TEXT NOT NULL,
    observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_pipeline_runs (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL CHECK (job_type IN ('price_refresh','price_forecast')),
    orchestrator TEXT NOT NULL DEFAULT 'manual',
    trigger_kind TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','partial','failed','skipped')),
    checked_count INTEGER NOT NULL DEFAULT 0 CHECK (checked_count >= 0),
    success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
    failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
    started_at TEXT NOT NULL,
    finished_at TEXT,
    report_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS data_pipeline_logs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES data_pipeline_runs(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('info','warning','error')),
    stage TEXT NOT NULL,
    message TEXT NOT NULL,
    context_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    forecast_date TEXT NOT NULL,
    predicted_price_minor INTEGER NOT NULL CHECK (predicted_price_minor >= 0),
    lower_price_minor INTEGER NOT NULL CHECK (lower_price_minor >= 0),
    upper_price_minor INTEGER NOT NULL CHECK (upper_price_minor >= lower_price_minor),
    drop_probability REAL NOT NULL CHECK (drop_probability BETWEEN 0 AND 1),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    trained_through TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(book_id, forecast_date, model_version)
);

CREATE TABLE IF NOT EXISTS edition_verification_attempts (
    book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    attempted_at TEXT NOT NULL,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_offers_edition ON offers(edition_isbn);
CREATE INDEX IF NOT EXISTS idx_editions_book ON editions(book_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started ON data_pipeline_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_run_created ON data_pipeline_logs(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_forecasts_book_date ON price_forecasts(book_id, forecast_date);

CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    custom_book_id TEXT REFERENCES user_custom_books(id) ON DELETE CASCADE,
    start_page INTEGER NOT NULL CHECK (start_page >= 0),
    end_page INTEGER NOT NULL CHECK (end_page >= start_page),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
    session_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CHECK ((book_id IS NOT NULL) != (custom_book_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_date ON reading_sessions(user_id, session_date DESC);

CREATE TABLE IF NOT EXISTS book_quotes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    custom_book_id TEXT REFERENCES user_custom_books(id) ON DELETE CASCADE,
    quote_text TEXT NOT NULL CHECK (length(trim(quote_text)) > 0),
    page_number INTEGER CHECK (page_number IS NULL OR page_number >= 0),
    tags_json TEXT NOT NULL DEFAULT '[]',
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'ocr', 'barcode_import')),
    created_at TEXT NOT NULL,
    CHECK ((book_id IS NOT NULL) != (custom_book_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_book_quotes_user_created ON book_quotes(user_id, created_at DESC);

-- Product growth: onboarding, measurable recommendations and retention loops.
CREATE TABLE IF NOT EXISTS onboarding_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    liked_book_ids_json TEXT NOT NULL DEFAULT '[]',
    liked_authors_json TEXT NOT NULL DEFAULT '[]',
    onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0,1)),
    completed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_interactions (
    id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('impression','click','library_add','reading_start','reading_finish','like','dislike')),
    position INTEGER CHECK(position IS NULL OR position > 0),
    experiment_variant TEXT NOT NULL CHECK(experiment_variant IN ('catalog_control','ai_assisted')),
    query_text TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_funnel
ON recommendation_interactions(experiment_variant,event_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_user
ON recommendation_interactions(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    consent_granted INTEGER NOT NULL DEFAULT 0 CHECK(consent_granted IN (0,1)),
    weekly_digest INTEGER NOT NULL DEFAULT 1 CHECK(weekly_digest IN (0,1)),
    recommendations INTEGER NOT NULL DEFAULT 1 CHECK(recommendations IN (0,1)),
    price_drops INTEGER NOT NULL DEFAULT 1 CHECK(price_drops IN (0,1)),
    stock_updates INTEGER NOT NULL DEFAULT 0 CHECK(stock_updates IN (0,1)),
    social_updates INTEGER NOT NULL DEFAULT 1 CHECK(social_updates IN (0,1)),
    frequency TEXT NOT NULL DEFAULT 'weekly' CHECK(frequency IN ('instant','daily','weekly','off')),
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS edition_subscriptions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK(event_type IN ('new_edition','back_in_stock')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    last_notified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id,book_id,event_type)
);
CREATE INDEX IF NOT EXISTS idx_edition_subscriptions_active
ON edition_subscriptions(book_id,event_type,is_active);

CREATE TABLE IF NOT EXISTS reading_lists (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
    description TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','unlisted','public')),
    share_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reading_lists_owner ON reading_lists(owner_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS reading_list_items (
    list_id TEXT NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    note TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 1 CHECK(position > 0),
    added_at TEXT NOT NULL,
    PRIMARY KEY(list_id,book_id)
);
CREATE INDEX IF NOT EXISTS idx_reading_list_items_order ON reading_list_items(list_id,position,added_at);

CREATE TABLE IF NOT EXISTS book_clubs (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 120),
    description TEXT NOT NULL DEFAULT '',
    rules TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','unlisted','public')),
    invite_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS book_club_members (
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','moderator','member')),
    joined_at TEXT NOT NULL,
    PRIMARY KEY(club_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_book_club_members_user ON book_club_members(user_id,joined_at DESC);

CREATE TABLE IF NOT EXISTS book_club_reads (
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    start_date TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','reading','completed')),
    created_at TEXT NOT NULL,
    PRIMARY KEY(club_id,book_id)
);

CREATE TABLE IF NOT EXISTS book_club_progress (
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 0 CHECK(current_page >= 0),
    total_pages INTEGER CHECK(total_pages IS NULL OR total_pages > 0),
    daily_target_pages INTEGER NOT NULL DEFAULT 10 CHECK(daily_target_pages > 0),
    updated_at TEXT NOT NULL,
    PRIMARY KEY(club_id,user_id,book_id)
);
CREATE INDEX IF NOT EXISTS idx_book_club_progress_book ON book_club_progress(book_id);

CREATE TABLE IF NOT EXISTS book_club_discussions (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK(length(trim(content)) BETWEEN 2 AND 2000),
    page_number INTEGER CHECK(page_number IS NULL OR page_number > 0),
    chapter_title TEXT,
    discussion_type TEXT NOT NULL DEFAULT 'discussion' CHECK(discussion_type IN ('discussion','quote','question','analysis')),
    parent_id TEXT REFERENCES book_club_discussions(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_club_discussions_feed ON book_club_discussions(club_id,book_id,page_number,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_club_discussions_user ON book_club_discussions(user_id);

CREATE TABLE IF NOT EXISTS book_club_reactions (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL REFERENCES book_club_discussions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK(reaction_type IN ('thoughtful','agree','heart','bookmark')),
    created_at TEXT NOT NULL,
    UNIQUE(discussion_id, user_id, reaction_type)
);
CREATE INDEX IF NOT EXISTS idx_book_club_reactions_disc ON book_club_reactions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_book_club_reactions_user ON book_club_reactions(user_id);

CREATE TABLE IF NOT EXISTS book_club_events (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 160),
    description TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL DEFAULT 'general' CHECK(event_type IN ('kickoff','midpoint','final','general')),
    event_date TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_club_events_club ON book_club_events(club_id,event_date ASC);

CREATE TABLE IF NOT EXISTS book_club_event_rsvps (
    event_id TEXT NOT NULL REFERENCES book_club_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'attending' CHECK(status IN ('attending','maybe','declined')),
    created_at TEXT NOT NULL,
    PRIMARY KEY(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_book_club_event_rsvps_user ON book_club_event_rsvps(user_id);

CREATE TABLE IF NOT EXISTS book_club_polls (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 160),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_club_polls_club ON book_club_polls(club_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS book_club_poll_options (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES book_club_polls(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(poll_id,book_id)
);
CREATE INDEX IF NOT EXISTS idx_book_club_poll_options_book ON book_club_poll_options(book_id);

CREATE TABLE IF NOT EXISTS book_club_votes (
    poll_id TEXT NOT NULL REFERENCES book_club_polls(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL REFERENCES book_club_poll_options(id) ON DELETE CASCADE,
    voted_at TEXT NOT NULL,
    PRIMARY KEY(poll_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_book_club_votes_option ON book_club_votes(option_id);

CREATE TABLE IF NOT EXISTS book_club_rooms (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES book_clubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 160),
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    phase TEXT NOT NULL DEFAULT 'reading' CHECK(phase IN ('reading','break','discussion')),
    duration_minutes INTEGER NOT NULL DEFAULT 25 CHECK(duration_minutes > 0),
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_club_rooms_club ON book_club_rooms(club_id);

CREATE TABLE IF NOT EXISTS book_club_room_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES book_club_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 1000),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_club_room_messages_room ON book_club_room_messages(room_id, created_at ASC);

