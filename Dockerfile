FROM node:22-bookworm-slim AS frontend-build
WORKDIR /workspace
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix frontend
COPY frontend ./frontend
COPY app/static ./app/static
RUN npm run build --prefix frontend

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8010 WEB_CONCURRENCY=2
WORKDIR /app
RUN addgroup --system mihenk && adduser --system --ingroup mihenk mihenk
COPY requirements.lock.txt ./
RUN --mount=type=cache,target=/root/.cache/pip python -m pip install -r requirements.lock.txt
COPY app ./app
COPY data/books.json data/recommendation_eval_cases.json ./data/
COPY scripts ./scripts
COPY database ./database
COPY --from=frontend-build /workspace/app/static/generated ./app/static/generated
RUN mkdir -p /app/data /app/tmp && chown -R mihenk:mihenk /app
USER mihenk
EXPOSE 8010
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8010')+'/ready',timeout=3)"
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8010} --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips=${FORWARDED_ALLOW_IPS:-127.0.0.1}"]
