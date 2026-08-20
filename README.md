# Mihenk

Mihenk; okuma geçmişi ve kişisel tercihlere göre kitap önerileri sunan, kitaplık ve okuma takibi özelliklerine sahip bir web uygulamasıdır.

## Özellikler

- Kişiselleştirilmiş kitap önerileri
- ISBN ve barkod ile kitap ekleme
- Kişisel kitaplık ve okuma ilerlemesi
- Pomodoro, okuma seansları ve yıllık okuma takvimi
- Okuma istatistikleri ve hedefler
- Supabase Auth ve PostgreSQL desteği
- Responsive PWA ve telefon için QR bağlantısı

## Teknolojiler

- FastAPI ve Python
- JavaScript, React ve TypeScript
- Supabase / PostgreSQL
- SQLite test altyapısı

## Yerelde çalıştırma

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Uygulama: [http://127.0.0.1:8010](http://127.0.0.1:8010)

Frontend dosyalarını yeniden derlemek için:

```powershell
cd frontend
npm install
npm run build
```

## Testler

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm test
npm run test:e2e
```

Ortam değişkenleri ve Supabase bağlantısı için `.env.example` dosyasını kullanın. Gizli anahtarları repoya eklemeyin.
