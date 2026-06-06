FROM python:3.11-slim

# Install system dependencies for WeasyPrint (PDF builder)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libgobject-2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK datasets
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True)"

# Copy app code into a backend/ package folder
COPY . ./backend

# Expose API port
EXPOSE 8000

# Run uvicorn pointing to backend package
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
