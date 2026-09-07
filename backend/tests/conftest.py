import os
import tempfile


# Entegrasyon testleri gerçek Supabase projesinde kullanıcı/veri oluşturmamalıdır.
_test_data_dir = tempfile.TemporaryDirectory(prefix="mihenk-tests-")
os.environ["DATA_BACKEND"] = "sqlite"
os.environ["DATABASE_PATH"] = os.path.join(_test_data_dir.name, "app.db")
os.environ["APP_ENVIRONMENT"] = "test"
os.environ["COOKIE_SECURE"] = "false"
os.environ["REDIS_URL"] = ""
os.environ["ALLOW_REGISTRATION"] = "true"
os.environ["REMINDER_PROVIDER"] = "none"
os.environ["LLM_ENABLED"] = "false"
os.environ["RATE_LIMIT_ENABLED"] = "false"
