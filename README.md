# VisionCare AI

Research-oriented web platform for eye conjunctiva screening, longitudinal history tracking, and doctor-patient workflow support.

This project combines two computer vision detection flows with GPT-Vision narrative support:

1. Conjunctiva disease/object analysis pipeline
2. Region-focused conjunctiva analysis pipeline

## Project Scope

VisionCare AI is designed as a Final Year Project (FYP) prototype for decision support, not autonomous diagnosis. It provides:

1. Multi-model image analysis (YOLO-based)
2. GPT-Vision clinical-style explanation and recommendations
3. Patient history with report generation (PDF download/email)
4. Role-based workflow: patient, doctor, admin
5. Appointment booking with optional shared historical reports

## Core Features

1. Authentication and role access control (user, doctor, admin)
2. Disease detection with visual output and model metadata
3. Region analysis with structured AI interpretation
4. Full report generation including:
   1. Uploaded image
   2. Model prediction output image
   3. Detection summaries
   4. GPT analysis, recommendations, and medical advice
5. Report export methods:
   1. Direct PDF download
   2. Email report with SMTP fallback handling
6. Appointment module:
   1. Patient booking
   2. Doctor verification view
   3. Shared old report access for doctor review

## Models Used

The backend currently uses two trained model files:

1. backend/eye_conjuntiva_detection_model.pt
2. backend/eye_conjuntiva_object_detection_model.pt

Both are integrated into FastAPI inference routes and their detections are surfaced to frontend cards and reports.

## Technology Stack

1. Backend: FastAPI, Uvicorn, Motor (MongoDB), Ultralytics YOLO, OpenCV, ReportLab
2. Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS, Radix UI
3. AI Text/Vision Layer: GPT-Vision API integration
4. Database: MongoDB Atlas (recommended) or local MongoDB
5. Deployment target: Vercel (recommended setup: two projects from one repo)

## Local Development Setup

### Prerequisites

1. Python 3.10+
2. Node.js 18+
3. MongoDB Atlas URI (or local MongoDB)

### 1) Clone Repository

```bash
git clone https://github.com/sajjadahmad-dev/VisionCare-AI.git
cd VisionCare-AI
```

### 2) Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create backend/.env from backend/.env.example and set required keys:

```env
MONGODB_URL=...
JWT_SECRET=...
VISION_API_KEY=...
VISION_MODEL=gpt-4o
VISION_API_BASE_URL=https://api.openai.com/v1
EMAIL_ADDRESS=...
EMAIL_PASSWORD=...
```

Run backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3) Frontend Setup

```bash
cd ../frontend
pnpm install
pnpm dev
```

or use npm if preferred:

```bash
npm install
npm run dev
```

Create frontend/.env.local:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 4) Access

1. Frontend: http://localhost:3000
2. Backend API: http://localhost:8000
3. Swagger docs: http://localhost:8000/docs

## Default Role Flow (Local)

1. Admin login uses configured admin password endpoint flow (commonly used value in local demo: admin123)
2. Doctor signs up and waits for admin approval
3. Patient signs up, runs analysis, books appointments, and can share old reports
4. Doctor sees shared reports in appointment detail and can download authorized files

## Deployment Notes

Current repository is prepared for one GitHub repository with two Vercel projects:

1. Frontend project root: frontend
2. Backend project root: backend

Reference guide: DEPLOY_VERCEL.md

## Reproducibility and Evaluation Notes

For research-quality reporting in your thesis/documentation, include:

1. Dataset source and inclusion criteria
2. Train/validation/test split methodology
3. Labeling protocol and inter-annotator agreement (if available)
4. Metrics per model (precision, recall, mAP, confusion matrix)
5. Error analysis by condition, illumination, blur, and occlusion
6. Clinical safety limitations and human-in-the-loop requirement

This repository provides inference and application workflow; training scripts/benchmark pipelines should be documented separately if used in your study.

## Ethical and Medical Disclaimer

VisionCare AI is a research prototype and educational system. It is not a licensed medical device and must not be used as the sole basis for diagnosis or treatment decisions.

## Repository Structure

```text
.
├── backend/
│   ├── main.py
│   ├── api/index.py
│   ├── requirements.txt
│   ├── eye_conjuntiva_detection_model.pt
│   ├── eye_conjuntiva_object_detection_model.pt
│   └── ...
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
├── docker-compose.yml
├── DEPLOY_VERCEL.md
└── README.md
```

## Author

Sajjad Ahmad  
BS Computer Science, University of Agriculture Faisalabad  
GitHub: https://github.com/sajjadahmad-dev

## License

Developed as part of FYP academic work.
