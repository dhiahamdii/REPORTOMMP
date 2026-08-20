FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir \
    "fastapi>=0.136.1" \
    "uvicorn[standard]>=0.46.0" \
    "sqlalchemy>=2.0.49" \
    "python-multipart>=0.0.27" \
    "openai>=2.33.0" \
    "python-dotenv>=1.0.0"

COPY . .

RUN mkdir -p /data

ENV DATABASE_URL=sqlite:////data/maintenance_reports.db

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
