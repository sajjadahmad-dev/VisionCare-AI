# VisionCare AI - Intelligent Conjunctiva Disease Detection and Monitoring System

## Project Overview
VisionCare AI is an AI-powered diagnostic tool designed for early detection and monitoring of conjunctiva diseases using advanced computer vision and natural language processing techniques. The system consists of a backend API built with FastAPI that leverages YOLO for image detection and GPT-4o for AI analysis, and a modern frontend built with Next.js for user interaction, image upload, and appointment booking.

---

## Quick Start Guide

### Prerequisites
- Python 3.8+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/sajjadahmad-dev/VisionCare-AI.git
cd VisionCare-AI
```

### 2. Backend Setup

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Environment Configuration
Create a `.env` file in the `backend` directory:
```env
# AI/ML API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
MONGODB_URL=mongodb+srv://your_mongodb_atlas_connection_string

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Email Configuration
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

#### Run Backend
```bash
python main.py
```
Backend will start on `http://localhost:8000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
# or if using pnpm
pnpm install
```

#### Run Frontend
```bash
npm run dev
# or
pnpm dev
```
Frontend will start on `http://localhost:3000` (or 3001 if 3000 is busy)

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Default Credentials
- **Admin Login**: Password = `admin123`
- **MongoDB**: Configure your Atlas connection string

### Features Overview
- ✅ User registration and authentication
- ✅ AI-powered conjunctiva disease detection
- ✅ Progress tracking and history
- ✅ Doctor appointment system
- ✅ Admin dashboard for doctor approval
- ✅ Email notifications
- ✅ AI chatbot for eye health queries

---

## Backend

### Overview
The backend is a FastAPI application that provides RESTful endpoints for:
- Uploading and analyzing eye images using a YOLO-based detection model.
- AI-powered analysis and recommendations using GPT-4o Vision.
- Handling user questions related to eye health.
- Managing doctor listings and appointment bookings.

### Technologies & Dependencies
- Python 3.x
- FastAPI
- YOLO (Ultralytics)
- OpenAI GPT-4o (via LangChain and LangGraph)
- OpenCV, Pillow, NumPy
- Uvicorn (ASGI server)
- Other dependencies listed in `backend/requirements.txt`

### Running the Backend
1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Set environment variables in `backend/.env` (e.g., `OPENAI_API_KEY`).
3. Run the backend server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
4. The backend API will be available at `http://localhost:8000`.

---

## Frontend

### Overview
The frontend is a Next.js application built with React and TypeScript. It provides:
- A user-friendly interface for uploading eye images for analysis.
- Real-time AI-powered diagnostic results.
- Doctor selection and appointment booking features.
- Responsive design with animations and modern UI components.

### Technologies & Dependencies
- Next.js (React framework)
- TypeScript
- Tailwind CSS for styling
- Radix UI components
- Framer Motion for animations
- Other dependencies listed in `frontend/package.json`

### Running the Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Access the frontend at `http://localhost:3000`.

---

## Running the Full Project with Docker Compose

This project includes a `docker-compose.yml` file to run both backend and frontend services in containers.

1. Ensure Docker is installed and running.
2. Run the following command in the project root:
   ```bash
   docker-compose up --build
   ```
3. Backend will be available at `http://localhost:8000`.
4. Frontend will be available at `http://localhost:3000`.

---

## Project Structure

```
.
├── backend/
│   ├── main.py                  # FastAPI backend application
│   ├── requirements.txt         # Python dependencies
│   ├── eye_conjuntiva_detection_model.pt  # YOLO model file
│   ├── uploads/                 # Uploaded images storage
│   ├── detection_results/       # YOLO detection output images
│   ├── Dockerfile               # Backend Dockerfile
│   └── .env                    # Environment variables
├── frontend/
│   ├── app/                    # Next.js app directory with pages and components
│   ├── components/             # UI components
│   ├── public/                 # Static assets
│   ├── package.json            # Node.js dependencies and scripts
│   ├── Dockerfile              # Frontend Dockerfile
│   └── ...                    # Other config and source files
├── docker-compose.yml          # Docker Compose configuration
└── README.md                   # This file
```

---

## Notes

- The backend uses a pre-trained YOLO model (`eye_conjuntiva_detection_model.pt`) for conjunctiva detection.
- Uploaded images are stored in `backend/uploads/` and detection results are saved in `backend/detection_results/`.
- The frontend communicates with the backend API via environment variable `NEXT_PUBLIC_BACKEND_URL`.
- The system supports booking appointments with dummy doctor data and stores appointments in memory (for demo purposes).

---

## Contact

For questions or support, please contact the project maintainer.

---

_EyeCare AI © 2025_
