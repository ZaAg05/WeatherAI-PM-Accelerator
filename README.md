# WeatherAI — PM Accelerator Full-Stack Technical Assessment

**Built by Zakaria Agourram**  
Completes both **Tech Assessment #1 (Frontend)** and **Tech Assessment #2 (Backend)** as a Full-Stack application.

## Features
- **Real-Time Weather Search:** Live weather data by city name via the OpenWeatherMap API.
- **GPS Geolocation & Reverse Geocoding:** Detects the user's current coordinates and resolves the city name automatically.
- **Dynamic UI:** Responsive glassmorphism interface that adapts to current weather conditions.
- **YouTube Integration:** Fetches and embeds city walking tour videos using the YouTube Data API v3.
- **Full CRUD Persistence:** Stores, retrieves, updates, and deletes weather search history in an SQLite database via FastAPI & SQLAlchemy.
- **CSV Export:** One-click export of saved search history to CSV.

## Tech Stack
- **Frontend:** React (Vite), CSS
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, SQLite
- **External APIs:** OpenWeatherMap API, YouTube Data API v3

## Project Structure
```text
PMA_Weather_App/
├── README.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    ├── public/
    ├── index.html
    └── package.json
```

## API Endpoints
- `GET /weather/{city_name}` — Fetch live weather for a city
- `GET /weather/coords/?lat={lat}&lon={lon}` — Reverse-geocode coordinates and fetch weather
- `GET /videos/{city_name}` — Fetch city tour videos from YouTube
- `POST /records/` — Save a weather record
- `GET /records/` — List saved weather records
- `PUT /records/{record_id}` — Update a saved record
- `DELETE /records/{record_id}` — Delete a saved record

## Local Setup

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/` based on `.env.example`:
```env
OPENWEATHER_API_KEY=your_openweather_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
```

Start the backend server:
```bash
uvicorn main:app --reload
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.