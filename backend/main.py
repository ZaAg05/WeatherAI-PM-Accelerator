from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import List
import requests
import os
from dotenv import load_dotenv

# ==========================================
# 0. VOS CLÉS API (REMPLACEZ LES VALEURS)
# ==========================================
# override=True force Python à lire le fichier .env et ignorer le cache
load_dotenv(override=True)

# .strip() nettoie automatiquement les espaces invisibles au début ou à la fin !
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "").strip()

# ==========================================
# 1. CONFIGURATION DE LA BASE DE DONNÉES (SQLite)
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./weather_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class WeatherRecordDB(Base):
    __tablename__ = "weather_records"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, index=True)
    start_date = Column(String)
    end_date = Column(String)
    temperature = Column(Float)
    description = Column(String)

Base.metadata.create_all(bind=engine)

# ==========================================
# 2. SCHÉMAS DE VALIDATION (Pydantic)
# ==========================================
class WeatherRecordCreate(BaseModel):
    location: str
    start_date: str
    end_date: str
    temperature: float
    description: str

class WeatherRecordResponse(WeatherRecordCreate):
    id: int
    class Config:
        from_attributes = True

# ==========================================
# 3. L'APPLICATION FASTAPI & CORS
# ==========================================
app = FastAPI(title="PM Accelerator - Weather & Location API")

# Autorise React (port 5173) à parler avec Python (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 4. ROUTES EXTERNES (Météo & YouTube)
# ==========================================

# --- FETCH WEATHER (Par nom de ville) ---
@app.get("/weather/{city_name}")
def get_current_weather(city_name: str):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city_name}&appid={OPENWEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "location": data["name"],
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "country": data["sys"]["country"],
            "icon": data["weather"][0]["icon"]
        }
    else:
        print("🔴 ERREUR OPENWEATHER :", response.json()) # Pour le débogage
        raise HTTPException(status_code=404, detail="City not found")

# --- FETCH WEATHER (Par coordonnées GPS) ---
@app.get("/weather/coords/")
def get_weather_by_coords(lat: float, lon: float):
    """
    Récupère la météo basée sur la position GPS, en forçant le nom de la ville (au lieu du quartier).
    """
    # 1. On cherche le nom de la ville principale (Reverse Geocoding)
    geo_url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={OPENWEATHER_API_KEY}"
    geo_response = requests.get(geo_url)
    
    city_name = ""
    if geo_response.status_code == 200 and len(geo_response.json()) > 0:
        city_name = geo_response.json()[0].get("name", "")
    
    # 2. On récupère la météo
    if city_name:
        # Si on a trouvé la ville (ex: Casablanca), on force la recherche par nom de ville !
        weather_url = f"http://api.openweathermap.org/data/2.5/weather?q={city_name}&appid={OPENWEATHER_API_KEY}&units=metric"
    else:
        # Plan de secours (si le géocodage échoue, on garde les coordonnées)
        weather_url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        
    response = requests.get(weather_url)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "location": data["name"],
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "country": data["sys"]["country"],
            "icon": data["weather"][0]["icon"]
        }
    else:
        print("🔴 ERREUR GPS :", response.json())
        raise HTTPException(status_code=400, detail="Error fetching weather for location")

# --- FETCH YOUTUBE VIDEOS ---
@app.get("/videos/{city_name}")
def get_city_videos(city_name: str):
    search_query = f"{city_name} city tour 4k"
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={search_query}&type=video&maxResults=3&key={YOUTUBE_API_KEY}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        videos = []
        for item in data.get("items", []):
            # Certains résultats peuvent être des chaînes et pas des vidéos, on s'assure d'avoir videoId
            if "videoId" in item["id"]:
                videos.append({
                    "video_id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"]
                })
        return videos
    else:
        print("🔴 ERREUR YOUTUBE :", response.json())
        return []

# ==========================================
# 5. ROUTES CRUD (Base de données)
# ==========================================

@app.post("/records/", response_model=WeatherRecordResponse)
def create_record(record: WeatherRecordCreate, db: Session = Depends(get_db)):
    db_record = WeatherRecordDB(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@app.get("/records/", response_model=List[WeatherRecordResponse])
def read_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(WeatherRecordDB).offset(skip).limit(limit).all()

@app.put("/records/{record_id}", response_model=WeatherRecordResponse)
def update_record(record_id: int, record: WeatherRecordCreate, db: Session = Depends(get_db)):
    db_record = db.query(WeatherRecordDB).filter(WeatherRecordDB.id == record_id).first()
    if db_record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db_record.location = record.location
    db_record.start_date = record.start_date
    db_record.end_date = record.end_date
    db_record.temperature = record.temperature
    db_record.description = record.description
    
    db.commit()
    db.refresh(db_record)
    return db_record

@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    db_record = db.query(WeatherRecordDB).filter(WeatherRecordDB.id == record_id).first()
    if db_record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(db_record)
    db.commit()
    return {"message": f"Record {record_id} successfully deleted"}