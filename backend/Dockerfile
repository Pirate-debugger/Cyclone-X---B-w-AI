FROM python:3.12-slim

WORKDIR /workspace

# Install system dependencies for geospatial libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgeos-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /workspace/backend/requirements.txt
RUN pip install --no-cache-dir -r /workspace/backend/requirements.txt

COPY backend /workspace/backend
COPY data /workspace/data
COPY config /workspace/config

ENV PYTHONPATH="/workspace/backend"
ENV APP_MODE="demo"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
