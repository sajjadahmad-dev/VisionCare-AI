import socket
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import cv2
import numpy as np
import base64
import io
from PIL import Image
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import asyncio
from pydantic import BaseModel, EmailStr, Field
import json
import bcrypt
import jwt
from motor.motor_asyncio import AsyncIOMotorClient
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import matplotlib.pyplot as plt
from io import BytesIO

# LangGraph imports
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

# YOLO import
from ultralytics import YOLO

# OpenAI with AIMLAPI
from openai import OpenAI

# Environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="VisionCare AI", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
YOLO_MODEL_PATH = 'backend/eye_conjuntiva_detection_model.pt'
UPLOAD_DIR = 'backend/uploads'
OUTPUT_DIR = 'backend/detection_results'
COMPARISON_DIR = 'backend/comparisons'
DOCTOR_DOCUMENTS_DIR = os.path.abspath('backend/uploads/doctor_documents')

# API Keys
AIMLAPI_KEY = os.getenv('AIMLAPI_KEY')
MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

# Email Configuration
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

# Create directories
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(COMPARISON_DIR, exist_ok=True)
os.makedirs(DOCTOR_DOCUMENTS_DIR, exist_ok=True)

# Serve doctor documents as static files
app.mount("/uploads/doctor_documents", StaticFiles(directory=DOCTOR_DOCUMENTS_DIR), name="doctor_documents")
# Serve detection results as static files
app.mount("/detection_results", StaticFiles(directory=OUTPUT_DIR), name="detection_results")

# YOLO model configuration
CLASS_NAMES = ['forniceal', 'forniceal_palpebral', 'palpebral']
CLASS_COLORS = [
    (0, 0, 139),    # Dark red/blue for forniceal
    (0, 100, 0),    # Dark green for forniceal_palpebral
    (139, 0, 139)   # Dark magenta for palpebral
]

# Initialize models
try:
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print("YOLO model loaded successfully")
except Exception as e:
    print(f"Warning: Could not load YOLO model: {e}")
    yolo_model = None

# Initialize OpenAI with AIMLAPI
if AIMLAPI_KEY:
    ai_client = OpenAI(
        base_url="https://api.aimlapi.com/v1",
        api_key=AIMLAPI_KEY,
    )
    print("AIMLAPI client initialized successfully")
else:
    print("Warning: AIMLAPI_KEY not found in environment variables")
    ai_client = None

# MongoDB setup
mongodb_client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global mongodb_client, db
    try:
        mongodb_client = AsyncIOMotorClient(MONGODB_URL)
        db = mongodb_client.visioncare_ai
        # Test the connection
        await mongodb_client.admin.command('ping')
        print("Connected to MongoDB successfully")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        mongodb_client = None
        db = None

@app.on_event("shutdown")
async def shutdown_db_client():
    if mongodb_client:
        mongodb_client.close()

# Security
security = HTTPBearer()

# Pydantic models
class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class QuestionRequest(BaseModel):
    question: str

class DoctorSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    specialty: str
    experience_years: int = Field(..., ge=0)
    license_number: str
    phone: Optional[str] = None
    bio: Optional[str] = None

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class DoctorApprovalRequest(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None

class DoctorLogin(BaseModel):
    email: EmailStr
    password: str

class DoctorAvailability(BaseModel):
    date: str  # YYYY-MM-DD format
    time_slots: List[str]  # ["09:00", "10:00", etc.]

class AppointmentRequest(BaseModel):
    patient_name: str
    contact_number: str
    preferred_date: str
    preferred_time: str
    concern: Optional[str] = None
    doctor_id: Optional[str] = None  # Changed from int to str for MongoDB ObjectId
    status: Optional[str] = "pending"

class AppointmentStatusUpdate(BaseModel):
    status: str  # pending, confirmed, scheduled, completed, rejected
    notes: Optional[str] = None

class AIBookingRequest(BaseModel):
    message: str  # Natural language booking request

class ImageAnalysisRequest(BaseModel):
    description: Optional[str] = None
    symptoms: Optional[str] = None
    additional_info: Optional[str] = None

class AgentState(TypedDict):
    messages: List[Dict[str, Any]]
    image_path: Optional[str]
    user_description: Optional[str]
    yolo_results: Optional[Dict[str, Any]]
    gpt_analysis: Optional[str]
    recommendations: Optional[str]
    next_action: Optional[str]

# Helper Functions

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    """Create JWT access token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict:
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_current_doctor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated doctor"""
    token = credentials.credentials
    payload = decode_token(token)
    doctor = await db.doctors.find_one({"_id": payload["user_id"]})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

async def send_email(to_email: str, subject: str, body: str, html: bool = False):
    """Send email using SMTP with multiple fallback options"""
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        print("⚠️  Email credentials not configured. Set EMAIL_ADDRESS and EMAIL_PASSWORD in .env")
        return False

    # Prepare message
    msg = MIMEMultipart('alternative')
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg['Subject'] = subject

    if html:
        msg.attach(MIMEText(body, 'html'))
    else:
        msg.attach(MIMEText(body, 'plain'))

    # Define multiple SMTP configurations to try
    smtp_configs = [
        {"host": "smtp.gmail.com", "port": 465, "use_ssl": True, "name": "Gmail SSL"},
        # Gmail TLS (port 587)
        {"host": "smtp.gmail.com", "port": 587, "use_ssl": False, "name": "Gmail TLS"},
        # Gmail SSL (port 465)
        
        # Outlook/Hotmail TLS (if using outlook/hotmail email)
        {"host": "smtp-mail.outlook.com", "port": 587, "use_ssl": False, "name": "Outlook TLS"},
    ]

    # Try each configuration
    for config in smtp_configs:
        try:
            print(f"🔄 Trying {config['name']} ({config['host']}:{config['port']})...")
            
            if config['use_ssl']:
                # SSL connection (port 465)
                with smtplib.SMTP_SSL(config['host'], config['port'], timeout=15) as server:
                    server.set_debuglevel(0)
                    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
                    server.send_message(msg)
                    print(f"✅ Email sent successfully to {to_email} via {config['name']}")
                    return True
            else:
                # TLS connection (port 587)
                with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
                    server.set_debuglevel(0)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
                    server.send_message(msg)
                    print(f"✅ Email sent successfully to {to_email} via {config['name']}")
                    return True

        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ {config['name']}: Authentication failed")
            print(f"   Error: {e}")
            if "gmail" in config['host'].lower():
                print("   📌 For Gmail, use App Password: https://myaccount.google.com/apppasswords")
            continue

        except socket.timeout:
            print(f"❌ {config['name']}: Connection timeout")
            continue

        except socket.gaierror as e:
            print(f"❌ {config['name']}: DNS resolution failed - {e}")
            continue

        except ConnectionRefusedError:
            print(f"❌ {config['name']}: Connection refused")
            continue

        except Exception as e:
            print(f"❌ {config['name']}: {type(e).__name__}: {e}")
            continue

    # All attempts failed
    print("\n❌ All email sending attempts failed!")
    print("\n🔧 TROUBLESHOOTING STEPS:")
    print("1. Check Windows Firewall:")
    print("   - Search 'Windows Defender Firewall' → 'Allow an app'")
    print("   - Allow Python through both Private and Public networks")
    print("\n2. Disable Antivirus temporarily to test")
    print("\n3. For Gmail:")
    print("   - Enable 2-Step Verification")
    print("   - Create App Password at: https://myaccount.google.com/apppasswords")
    print("   - Use the 16-character app password in .env")
    print("\n4. Check if your ISP blocks SMTP ports (try mobile hotspot to test)")
    print("\n5. Try running as administrator")
    print("\n6. Test connection manually:")
    print(f"   telnet {SMTP_SERVER} {SMTP_PORT}")
    
    return False

async def send_welcome_email(email: str, full_name: str):
    """Send welcome email to new user"""
    subject = "Welcome to VisionCare AI!"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #2c3e50;">Welcome to VisionCare AI! 👁️</h2>
                <p>Dear {full_name},</p>
                <p>Thank you for creating an account with us! We're excited to help you monitor and maintain your eye health.</p>

                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #3498db;">What You Can Do:</h3>
                    <ul>
                        <li>📸 Upload eye images for AI-powered analysis</li>
                        <li>📊 Track your eye health progress over time</li>
                        <li>🔍 Compare images to see improvements</li>
                        <li>🩺 Book appointments with specialists</li>
                        <li>📧 Receive automated follow-up reminders</li>
                    </ul>
                </div>

                <p>Your eye health journey starts here. Upload your first image to get started!</p>

                <p style="margin-top: 30px;">Best regards,<br>
                <strong>VisionCare AI Team</strong></p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
    </html>
    """
    await send_email(email, subject, body, html=True)

async def send_doctor_welcome_email(email: str, full_name: str):
    """Send welcome email to new doctor (account under review)"""
    subject = "Your Doctor Account is Under Review - VisionCare AI"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #2c3e50;">Doctor Account Submitted for Review 👨‍⚕️</h2>
                <p>Dear Dr. {full_name},</p>
                <p>Thank you for registering as a doctor on VisionCare AI! Your account and documents have been received and are now under review by our administrators.</p>
                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h3 style="color: #3498db;">What Happens Next?</h3>
                    <ul>
                        <li>🔎 Our team will verify your credentials and documents.</li>
                        <li>⏳ This process may take up to 24-48 hours.</li>
                        <li>📧 You will receive an email once your account is approved or if more information is needed.</li>
                    </ul>
                </div>
                <p style="color: #2c3e50;">You will not be able to access the doctor dashboard until your account is approved.</p>
                <p style="margin-top: 30px;">Best regards,<br>
                <strong>VisionCare AI Team</strong></p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
    </html>
    """
    await send_email(email, subject, body, html=True)

async def send_doctor_approval_email(email: str, full_name: str):
    """Send approval notification to doctor"""
    subject = "Your Doctor Account Has Been Approved! ✅"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #28a745;">Congratulations! Your Account is Approved 🎉</h2>
                <p>Dear Dr. {full_name},</p>
                <p>Great news! Your doctor account has been approved by our administrators.</p>

                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <h3 style="margin-top: 0;">What's Next?</h3>
                    <ul>
                        <li>✅ You can now log in to your doctor dashboard</li>
                        <li>📅 Set up your availability schedule</li>
                        <li>👥 Start receiving patient appointment requests</li>
                        <li>📊 Access your practice management tools</li>
                    </ul>
                </div>

                <p>You can now access all doctor features and begin helping patients with their eye health needs.</p>

                <p style="margin-top: 30px;">Best regards,<br>
                <strong>VisionCare AI Team</strong></p>
            </div>
        </body>
    </html>
    """
    await send_email(email, subject, body, html=True)

async def send_doctor_rejection_email(email: str, full_name: str, notes: Optional[str] = None):
    """Send rejection notification to doctor"""
    subject = "Doctor Account Application Update"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #dc3545;">Account Application Update</h2>
                <p>Dear Dr. {full_name},</p>
                <p>We regret to inform you that your doctor account application has not been approved at this time.</p>

                {f'<div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;"><p><strong>Administrator Notes:</strong></p><p>{notes}</p></div>' if notes else ''}

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h4 style="margin-top: 0;">What You Can Do:</h4>
                    <ul>
                        <li>📧 Contact our support team for more information</li>
                        <li>📝 Review and update your application details</li>
                        <li>🔄 Reapply after addressing any concerns</li>
                    </ul>
                </div>

                <p>If you have any questions or need clarification, please don't hesitate to contact our support team.</p>

                <p style="margin-top: 30px;">Best regards,<br>
                <strong>VisionCare AI Team</strong></p>
            </div>
        </body>
    </html>
    """
    await send_email(email, subject, body, html=True)

async def send_analysis_result_email(email: str, full_name: str, analysis: Dict, file_id: str):
    """Send analysis results via email"""
    subject = "Your VisionCare AI Analysis Results"
    
    condition = analysis.get('condition', 'Unknown')
    severity = analysis.get('severity', 'Unknown')
    recommendations = analysis.get('recommendations', 'Please consult a specialist')
    
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #2c3e50;">Your VisionCare AI Analysis Results 📋</h2>
                <p>Dear {full_name},</p>
                <p>Your recent eye image analysis has been completed. Here are the results:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #3498db;">Analysis Summary</h3>
                    <p><strong>Detected Condition:</strong> {condition}</p>
                    <p><strong>Severity Level:</strong> {severity}</p>
                    <p><strong>Analysis ID:</strong> {file_id}</p>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <h4 style="margin-top: 0;">Recommendations:</h4>
                    <p>{recommendations}</p>
                </div>
                
                <p style="background-color: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                    <strong>Reminder:</strong> Please check your eyes again after 3 days to monitor progress.
                </p>
                
                <p style="margin-top: 30px;">Visit your dashboard to view detailed results and track your progress.</p>
                
                <p style="margin-top: 30px;">Best regards,<br>
                <strong>VisionCare AI Team</strong></p>
            </div>
        </body>
    </html>
    """
    await send_email(email, subject, body, html=True)

def create_segmentation_visualization(image, results):
    """Create segmentation visualization with dark colors and labels"""
    annotated_image = image.copy()
    detection_info = []
    
    if hasattr(results, 'masks') and results.masks is not None:
        masks = results.masks.data.cpu().numpy()
        classes = results.boxes.cls.cpu().numpy().astype(int)
        confidences = results.boxes.conf.cpu().numpy()
        
        for mask, cls_idx, conf in zip(masks, classes, confidences):
            if cls_idx < len(CLASS_COLORS):
                color = CLASS_COLORS[cls_idx]
                mask = (mask > 0.5).astype(np.uint8)
                mask_resized = cv2.resize(mask, (annotated_image.shape[1], annotated_image.shape[0]), 
                                        interpolation=cv2.INTER_NEAREST)
                
                colored_mask = np.zeros_like(annotated_image, dtype=np.uint8)
                for c in range(3):
                    colored_mask[:, :, c] = mask_resized * color[c]
                
                annotated_image = cv2.addWeighted(annotated_image, 1.0, colored_mask, 0.6, 0)
                
                moments = cv2.moments(mask_resized)
                if moments["m00"] != 0:
                    cx = int(moments["m10"] / moments["m00"])
                    cy = int(moments["m01"] / moments["m00"])
                    label = f"{CLASS_NAMES[cls_idx]} ({conf:.2f})"
                    
                    offset_x, offset_y = 60, -40
                    label_x = min(cx + offset_x, annotated_image.shape[1] - 10)
                    label_y = max(cy + offset_y, 20)
                    
                    cv2.arrowedLine(annotated_image, (label_x, label_y), (cx, cy), color, 2, tipLength=0.2)
                    
                    font_scale = 0.6
                    font_thickness = 2
                    text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)[0]
                    highlight_color = (255, 255, 200)
                    padding_x, padding_y = 5, 8
                    
                    cv2.rectangle(annotated_image,
                                (label_x - padding_x, label_y - text_size[1] - padding_y),
                                (label_x + text_size[0] + padding_x, label_y + padding_y),
                                highlight_color, -1)
                    
                    cv2.putText(annotated_image, label, (label_x, label_y),
                              cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), font_thickness, cv2.LINE_AA)
                
                detection_info.append({
                    "class": CLASS_NAMES[cls_idx],
                    "confidence": float(conf),
                    "area": int(np.sum(mask_resized))
                })
    
    return annotated_image, detection_info

def process_yolo_detection(image_path: str):
    """Process image with YOLO model"""
    if not yolo_model:
        return None, []
    
    try:
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image")
        
        results = yolo_model(image, verbose=False)
        annotated_image, detection_info = create_segmentation_visualization(image, results[0])
        
        output_filename = f"detected_{os.path.basename(image_path)}"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        cv2.imwrite(output_path, annotated_image)
        
        return output_path, detection_info
    
    except Exception as e:
        print(f"YOLO detection error: {e}")
        return None, []

def encode_image_to_base64(image_path: str) -> str:
    """Encode image to base64"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        return ""

async def analyze_with_gpt_vision(image_path: str, detection_results: List[Dict], user_description: str = None) -> Dict[str, Any]:
    """Analyze image with GPT-4o Vision via AIMLAPI"""
    if not ai_client:
        return {
            "analysis": "AI analysis not available",
            "recommendations": "Please consult an eye specialist",
            "condition": "Unknown",
            "severity": "Unknown"
        }
    
    try:
        base64_image = encode_image_to_base64(image_path)
        if not base64_image:
            raise ValueError("Could not encode image")
        
        detection_summary = "\n".join([f"- {d['class']}: {d['confidence']:.2f} confidence" 
                                     for d in detection_results])
        
        user_context = f"\nUser's Description: {user_description}" if user_description else ""
        
        prompt = f"""As an AI ophthalmology assistant, analyze this eye image for conjunctiva health.

YOLO Model Detection Results:
{detection_summary if detection_summary else "No specific detections"}
{user_context}

Provide a comprehensive analysis in the following JSON format:
{{
    "condition": "Name of detected condition (e.g., Conjunctivitis, Normal, Inflammation)",
    "severity": "mild/moderate/severe/normal",
    "analysis": "Detailed analysis of the conjunctiva condition",
    "recommendations": "Specific care instructions and lifestyle recommendations",
    "medical_advice": "When to seek professional attention and warning signs",
    "risk_level": "low/medium/high",
    "follow_up": "Suggested timeline for next check (e.g., '3 days', '1 week')"
}}

Focus on conjunctiva health, inflammation signs, and provide actionable advice."""

        response = ai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            max_tokens=1500
        )
        
        content = response.choices[0].message.content
        
        # Try to parse JSON response
        try:
            result = json.loads(content)
        except:
            # Fallback if response is not JSON
            result = {
                "condition": "Analysis Complete",
                "severity": "Unknown",
                "analysis": content,
                "recommendations": "Please consult an eye specialist for detailed advice",
                "medical_advice": "Seek professional attention if symptoms persist",
                "risk_level": "medium",
                "follow_up": "3 days"
            }
        
        return result
    
    except Exception as e:
        print(f"GPT Vision analysis error: {e}")
        return {
            "condition": "Analysis Error",
            "severity": "Unknown",
            "analysis": f"Analysis unavailable: {str(e)}",
            "recommendations": "Please consult an eye specialist",
            "medical_advice": "Seek professional diagnosis",
            "risk_level": "unknown",
            "follow_up": "ASAP"
        }

async def create_comparison_image(user_id: str, current_image_path: str) -> Optional[str]:
    """Create comparison between current and previous images"""
    try:
        # Get previous analyses for this user
        previous_analyses = await db.analyses.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(2).to_list(length=2)
        
        if len(previous_analyses) < 2:
            return None  # Need at least 2 images to compare
        
        current_img = cv2.imread(current_image_path)
        previous_path = previous_analyses[1]['image_path']
        previous_img = cv2.imread(previous_path)
        
        if current_img is None or previous_img is None:
            return None
        
        # Resize images to same size
        height = max(current_img.shape[0], previous_img.shape[0])
        width = max(current_img.shape[1], previous_img.shape[1])
        
        current_resized = cv2.resize(current_img, (width, height))
        previous_resized = cv2.resize(previous_img, (width, height))
        
        # Create comparison image side by side
        comparison = np.hstack([previous_resized, current_resized])
        
        # Add labels
        cv2.putText(comparison, "Previous", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(comparison, "Current", (width + 10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # Add dates
        prev_date = previous_analyses[1]['timestamp'].strftime("%Y-%m-%d")
        curr_date = datetime.now().strftime("%Y-%m-%d")
        
        cv2.putText(comparison, prev_date, (10, height - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(comparison, curr_date, (width + 10, height - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Save comparison image
        comparison_filename = f"comparison_{user_id}_{uuid.uuid4()}.jpg"
        comparison_path = os.path.join(COMPARISON_DIR, comparison_filename)
        cv2.imwrite(comparison_path, comparison)
        
        return comparison_path
    
    except Exception as e:
        print(f"Error creating comparison: {e}")
        return None

async def generate_progress_chart(user_id: str) -> Optional[str]:
    """Generate progress chart for user"""
    try:
        analyses = await db.analyses.find(
            {"user_id": user_id}
        ).sort("timestamp", 1).to_list(length=100)
        
        if len(analyses) < 2:
            return None
        
        # Extract data
        dates = [a['timestamp'].strftime("%m/%d") for a in analyses]
        severity_map = {"normal": 0, "mild": 1, "moderate": 2, "severe": 3, "unknown": 1.5}
        severities = [severity_map.get(a.get('severity', 'unknown').lower(), 1.5) 
                     for a in analyses]
        
        # Create chart
        plt.figure(figsize=(10, 6))
        plt.plot(dates, severities, marker='o', linewidth=2, markersize=8)
        plt.xlabel('Date', fontsize=12)
        plt.ylabel('Severity Level', fontsize=12)
        plt.title('Eye Health Progress Over Time', fontsize=14, fontweight='bold')
        plt.yticks([0, 1, 2, 3], ['Normal', 'Mild', 'Moderate', 'Severe'])
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save chart
        chart_filename = f"progress_{user_id}_{uuid.uuid4()}.png"
        chart_path = os.path.join(COMPARISON_DIR, chart_filename)
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return chart_path
    
    except Exception as e:
        print(f"Error generating progress chart: {e}")
        return None

# LangGraph nodes
def process_image_node(state: AgentState):
    """Process uploaded image with YOLO"""
    image_path = state.get("image_path")
    if not image_path:
        return {"next_action": "question_answer"}
    
    detection_path, detection_results = process_yolo_detection(image_path)
    
    return {
        "yolo_results": {
            "detection_path": detection_path,
            "detections": detection_results
        },
        "next_action": "gpt_analysis"
    }

async def gpt_analysis_node(state: AgentState):
    """Analyze image with GPT-4o Vision"""
    image_path = state.get("image_path")
    yolo_results = state.get("yolo_results", {})
    user_description = state.get("user_description")
    
    if not image_path:
        return {"next_action": "question_answer"}
    
    gpt_results = await analyze_with_gpt_vision(
        image_path, 
        yolo_results.get("detections", []),
        user_description
    )
    
    return {
        "gpt_analysis": gpt_results,
        "next_action": "complete"
    }

async def question_answer_node(state: AgentState):
    """Handle text-based questions about eyes"""
    messages = state.get("messages", [])
    if not messages or not ai_client:
        return {"next_action": "complete"}
    
    last_message = messages[-1].get("content", "")
    
    try:
        prompt = f"""You are an AI ophthalmology assistant specializing in eye health and conjunctiva conditions.

User Question: {last_message}

Provide helpful, accurate information about:
- Eye health and conjunctiva conditions
- Symptoms and their potential causes
- General eye care recommendations
- When to seek professional medical attention

Always remind users to consult healthcare professionals for proper diagnosis and treatment."""

        response = ai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        
        return {
            "gpt_analysis": {"analysis": response.choices[0].message.content},
            "next_action": "complete"
        }
    
    except Exception as e:
        return {
            "gpt_analysis": {
                "analysis": "I apologize, but I'm unable to process your question at the moment. Please consult an eye care professional."
            },
            "next_action": "complete"
        }

def route_next_action(state: AgentState):
    """Route to next action based on state"""
    next_action = state.get("next_action", "complete")
    if next_action == "complete":
        return END
    return next_action

# Create LangGraph workflow
workflow = StateGraph(AgentState)
workflow.add_node("process_image", process_image_node)
workflow.add_node("gpt_analysis", gpt_analysis_node)
workflow.add_node("question_answer", question_answer_node)

workflow.add_conditional_edges("process_image", route_next_action)
workflow.add_conditional_edges("gpt_analysis", route_next_action)
workflow.add_conditional_edges("question_answer", route_next_action)

workflow.set_entry_point("process_image")
agent = workflow.compile()

# API Routes

@app.get("/")
async def root():
    return {
        "message": "Eye Health AI Agent API",
        "version": "2.0.0",
        "features": [
            "AI Detection Agent",
            "Real-Time Prediction",
            "Image Comparison Engine",
            "User Database System",
            "Automated Email System",
            "Health Progress Dashboard",
            "Security + Privacy Layer"
        ]
    }

@app.post("/auth/signup")
async def signup(user: UserSignup):
    """User signup endpoint"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user.password)
    
    user_doc = {
        "_id": user_id,
        "email": user.email,
        "password": hashed_password,
        "full_name": user.full_name,
        "phone": user.phone,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    # Send welcome email
    asyncio.create_task(send_welcome_email(user.email, user.full_name))
    
    # Create access token
    token = create_access_token(user_id, user.email)
    
    return {
        "status": "success",
        "message": "Account created successfully! Check your email for welcome message.",
        "user": {
            "id": user_id,
            "email": user.email,
            "full_name": user.full_name
        },
        "token": token
    }

@app.post("/auth/login")
async def login(credentials: UserLogin):
    """User login endpoint"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    token = create_access_token(user["_id"], user["email"])
    
    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "id": user["_id"],
            "email": user["email"],
            "full_name": user["full_name"]
        },
        "access_token": token
    }

@app.get("/auth/profile")
async def get_profile(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "status": "success",
        "user": {
            "id": current_user["_id"],
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "phone": current_user.get("phone"),
            "created_at": current_user["created_at"].isoformat()
        }
    }

@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    symptoms: Optional[str] = Form(None),
    additional_info: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """Analyze uploaded eye image with authentication"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Combine user inputs
        user_description_parts = []
        if description:
            user_description_parts.append(f"Description: {description}")
        if symptoms:
            user_description_parts.append(f"Symptoms: {symptoms}")
        if additional_info:
            user_description_parts.append(f"Additional Info: {additional_info}")
        
        combined_description = "; ".join(user_description_parts) if user_description_parts else None
        
        # Process with LangGraph agent
        initial_state = {
            "messages": [],
            "image_path": file_path,
            "user_description": combined_description,
            "yolo_results": None,
            "gpt_analysis": None,
            "next_action": "process_image"
        }
        
        result = await agent.ainvoke(initial_state)
        
        gpt_analysis = result.get("gpt_analysis", {})
        
        # Save analysis to database
        analysis_doc = {
            "_id": file_id,
            "user_id": current_user["_id"],
            "image_path": file_path,
            "detection_path": result.get("yolo_results", {}).get("detection_path"),
            "user_description": combined_description,
            "detections": result.get("yolo_results", {}).get("detections", []),
            "condition": gpt_analysis.get("condition", "Unknown"),
            "severity": gpt_analysis.get("severity", "Unknown"),
            "analysis": gpt_analysis.get("analysis", ""),
            "recommendations": gpt_analysis.get("recommendations", ""),
            "medical_advice": gpt_analysis.get("medical_advice", ""),
            "risk_level": gpt_analysis.get("risk_level", "medium"),
            "follow_up": gpt_analysis.get("follow_up", "3 days"),
            "timestamp": datetime.utcnow()
        }
        
        await db.analyses.insert_one(analysis_doc)
        
        # Create comparison image if previous images exist
        comparison_path = await create_comparison_image(current_user["_id"], file_path)
        
        # Send email with results
        asyncio.create_task(send_analysis_result_email(
            current_user["email"],
            current_user["full_name"],
            gpt_analysis,
            file_id
        ))
        
        # Prepare response
        response_data = {
            "status": "success",
            "analysis_id": file_id,
            "yolo_detection": result.get("yolo_results", {}),
            "gpt_analysis": gpt_analysis,
            "user_description": combined_description,
            "comparison_available": comparison_path is not None,
            "message": "Analysis complete! Results have been sent to your email."
        }
        
        return JSONResponse(content=response_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/detection-result/{file_id}")
async def get_detection_result(file_id: str, current_user = Depends(get_current_user)):
    """Get detection result image"""
    detection_files = [f for f in os.listdir(OUTPUT_DIR) if file_id in f]
    if not detection_files:
        raise HTTPException(status_code=404, detail="Detection result not found")
    
    file_path = os.path.join(OUTPUT_DIR, detection_files[0])
    return FileResponse(file_path, media_type="image/jpeg")

@app.get("/comparison/{analysis_id}")
async def get_comparison(analysis_id: str, current_user = Depends(get_current_user)):
    """Get comparison image for an analysis"""
    # Verify analysis belongs to user
    analysis = await db.analyses.find_one({"_id": analysis_id, "user_id": current_user["_id"]})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Create comparison on demand
    comparison_path = await create_comparison_image(current_user["_id"], analysis["image_path"])
    
    if not comparison_path:
        raise HTTPException(status_code=404, detail="Not enough images for comparison")
    
    return FileResponse(comparison_path, media_type="image/jpeg")

@app.get("/history")
async def get_analysis_history(
    limit: int = 20,
    skip: int = 0,
    current_user = Depends(get_current_user)
):
    """Get user's analysis history"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get analyses
    analyses = await db.analyses.find(
        {"user_id": current_user["_id"]}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Format response
    history = []
    for analysis in analyses:
        history.append({
            "id": analysis["_id"],
            "timestamp": analysis["timestamp"].isoformat(),
            "condition": analysis.get("condition", "Unknown"),
            "severity": analysis.get("severity", "Unknown"),
            "risk_level": analysis.get("risk_level", "medium"),
            "follow_up": analysis.get("follow_up", "3 days"),
            "user_description": analysis.get("user_description")
        })
    
    return {
        "status": "success",
        "count": len(history),
        "analyses": history
    }

@app.get("/history/{analysis_id}")
async def get_analysis_detail(analysis_id: str, current_user = Depends(get_current_user)):
    """Get detailed analysis by ID"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    analysis = await db.analyses.find_one({
        "_id": analysis_id,
        "user_id": current_user["_id"]
    })
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "status": "success",
        "analysis": {
            "id": analysis["_id"],
            "timestamp": analysis["timestamp"].isoformat(),
            "condition": analysis.get("condition", "Unknown"),
            "severity": analysis.get("severity", "Unknown"),
            "risk_level": analysis.get("risk_level", "medium"),
            "analysis": analysis.get("analysis", ""),
            "recommendations": analysis.get("recommendations", ""),
            "medical_advice": analysis.get("medical_advice", ""),
            "follow_up": analysis.get("follow_up", "3 days"),
            "user_description": analysis.get("user_description"),
            "detections": analysis.get("detections", [])
        }
    }

@app.get("/progress-dashboard")
async def get_progress_dashboard(current_user = Depends(get_current_user)):
    """Get comprehensive progress dashboard"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get all analyses
    analyses = await db.analyses.find(
        {"user_id": current_user["_id"]}
    ).sort("timestamp", 1).to_list(length=100)
    
    if not analyses:
        return {
            "status": "success",
            "message": "No analyses yet. Upload your first image to get started!",
            "total_analyses": 0
        }
    
    # Calculate statistics
    severity_counts = {"normal": 0, "mild": 0, "moderate": 0, "severe": 0}
    conditions = {}
    
    for analysis in analyses:
        severity = analysis.get("severity", "unknown").lower()
        if severity in severity_counts:
            severity_counts[severity] += 1
        
        condition = analysis.get("condition", "Unknown")
        conditions[condition] = conditions.get(condition, 0) + 1
    
    # Get latest analysis
    latest = analyses[-1]
    
    # Determine trend
    if len(analyses) >= 2:
        severity_map = {"normal": 0, "mild": 1, "moderate": 2, "severe": 3}
        current_severity = severity_map.get(latest.get("severity", "mild").lower(), 1)
        previous_severity = severity_map.get(analyses[-2].get("severity", "mild").lower(), 1)
        
        if current_severity < previous_severity:
            trend = "improving"
        elif current_severity > previous_severity:
            trend = "worsening"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
    
    # Generate progress chart
    chart_path = await generate_progress_chart(current_user["_id"])
    
    return {
        "status": "success",
        "total_analyses": len(analyses),
        "severity_distribution": severity_counts,
        "conditions_detected": conditions,
        "latest_analysis": {
            "id": latest["_id"],
            "timestamp": latest["timestamp"].isoformat(),
            "condition": latest.get("condition", "Unknown"),
            "severity": latest.get("severity", "Unknown"),
            "risk_level": latest.get("risk_level", "medium")
        },
        "trend": trend,
        "chart_available": chart_path is not None,
        "next_checkup": latest.get("follow_up", "3 days")
    }

@app.get("/progress-chart")
async def get_progress_chart(current_user = Depends(get_current_user)):
    """Get progress chart image"""
    chart_path = await generate_progress_chart(current_user["_id"])
    
    if not chart_path:
        raise HTTPException(status_code=404, detail="Not enough data for chart")
    
    return FileResponse(chart_path, media_type="image/png")

@app.post("/ask-question")
async def ask_question(
    request: QuestionRequest,
    current_user = Depends(get_current_user)
):
    """Ask text-based questions about eye health"""
    try:
        initial_state = {
            "messages": [{"role": "user", "content": request.question}],
            "image_path": None,
            "yolo_results": None,
            "gpt_analysis": None,
            "next_action": "question_answer"
        }
        
        result = await agent.ainvoke(initial_state)
        
        # Save question to database
        question_doc = {
            "_id": str(uuid.uuid4()),
            "user_id": current_user["_id"],
            "question": request.question,
            "answer": result.get("gpt_analysis", {}).get("analysis", "No response"),
            "timestamp": datetime.utcnow()
        }
        await db.questions.insert_one(question_doc)
        
        return {
            "status": "success",
            "answer": result.get("gpt_analysis", {}).get("analysis", "No response available"),
            "question": request.question
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question processing failed: {str(e)}")

@app.get("/doctors")
async def get_doctors(current_user = Depends(get_current_user)):
    """Get list of available approved doctors from the database"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    # Only return doctors with status "approved"
    doctors_cursor = db.doctors.find({"status": "approved"})
    doctors = []
    async for doc in doctors_cursor:
        doctors.append({
            "id": str(doc.get("_id")),
            "full_name": doc.get("full_name") or doc.get("name"),
            "specialty": doc.get("specialty"),
            "experience_years": doc.get("experience_years"),
            "license_number": doc.get("license_number"),
            "availability": doc.get("availability", []),
            "status": doc.get("status"),
        })
    return {"status": "success", "doctors": doctors}

@app.post("/book-appointment")
async def book_appointment(
    request: AppointmentRequest,
    current_user = Depends(get_current_user)
):
    """Book appointment with a doctor"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Get doctor from database
        doctor = await db.doctors.find_one({"_id": request.doctor_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

        # Check availability
        availability = doctor.get("availability", [])
        slot_available = False
        updated_availability = []

        # Find the availability entry for the selected day
        try:
            selected_date_obj = datetime.strptime(request.preferred_date, "%Y-%m-%d")
            selected_day = selected_date_obj.strftime("%A")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format")

        for entry in availability:
            if entry.get("day") == selected_day:
                # Check if requested time is within start/end
                start = entry.get("start")
                end = entry.get("end")
                if start and end and start <= request.preferred_time < end:
                    slot_available = True
                updated_availability.append(entry)
            else:
                updated_availability.append(entry)

        if not slot_available:
            raise HTTPException(status_code=400, detail="Requested time slot is not available")

        appointment_id = str(uuid.uuid4())[:8]

        # Create appointment
        appointment = {
            "_id": appointment_id,
            "user_id": current_user["_id"],
            "patient_name": current_user.get("full_name", "Unknown"),
            "contact_number": request.contact_number if hasattr(request, "contact_number") else "",
            "preferred_date": request.preferred_date,
            "preferred_time": request.preferred_time,
            "concern": request.concern,
            "status": request.status or "pending",
            "doctor_id": doctor["_id"],
            "doctor_name": doctor["full_name"],
            "doctor_specialty": doctor["specialty"],
            "created_at": datetime.utcnow()
        }

        await db.appointments.insert_one(appointment)

        # Update doctor's availability
        await db.doctors.update_one(
            {"_id": doctor["_id"]},
            {"$set": {"availability": updated_availability}}
        )

        # Send confirmation email to patient
        subject = "Appointment Confirmation - Eye Health AI"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Appointment Confirmed! ✅</h2>
                <p>Dear {current_user['full_name']},</p>
                <p>Your appointment has been successfully booked.</p>

                <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3>Appointment Details:</h3>
                    <p><strong>Appointment ID:</strong> {appointment_id}</p>
                    <p><strong>Doctor:</strong> {doctor['full_name']}</p>
                    <p><strong>Specialty:</strong> {doctor['specialty']}</p>
                    <p><strong>Date:</strong> {request.preferred_date}</p>
                    <p><strong>Time:</strong> {request.preferred_time}</p>
                    <p><strong>Patient:</strong> {request.patient_name}</p>
                    <p><strong>Status:</strong> {appointment['status']}</p>
                </div>

                <p>Please arrive 10 minutes before your scheduled time.</p>

                <p>Best regards,<br>Eye Health AI Team</p>
            </body>
        </html>
        """
        asyncio.create_task(send_email(current_user["email"], subject, body, html=True))

        # Send confirmation email to doctor
        doctor_subject = "New Appointment Booked - Eye Health AI"
        doctor_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>New Appointment Booked! 📅</h2>
                <p>Dear Dr. {doctor['full_name']},</p>
                <p>A new appointment has been booked with you.</p>

                <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3>Appointment Details:</h3>
                    <p><strong>Appointment ID:</strong> {appointment_id}</p>
                    <p><strong>Patient:</strong> {request.patient_name}</p>
                    <p><strong>Date:</strong> {request.preferred_date}</p>
                    <p><strong>Time:</strong> {request.preferred_time}</p>
                    <p><strong>Status:</strong> {appointment['status']}</p>
                </div>

                <p>Please check your dashboard for more details.</p>

                <p>Best regards,<br>Eye Health AI Team</p>
            </body>
        </html>
        """
        asyncio.create_task(send_email(doctor["email"], doctor_subject, doctor_body, html=True))

        return {
            "status": "success",
            "message": "Appointment booked successfully! Confirmation sent to your email.",
            "appointment": {
                "appointment_id": appointment_id,
                "patient_name": request.patient_name,
                "doctor": {
                    "id": doctor["_id"],
                    "name": doctor["full_name"],
                    "specialty": doctor["specialty"]
                },
                "date": request.preferred_date,
                "time": request.preferred_time,
                "status": appointment["status"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Appointment booking failed: {str(e)}")

@app.get("/appointments")
async def get_appointments(current_user = Depends(get_current_user)):
    """Get user's appointments"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    appointments = await db.appointments.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(length=50)
    
    formatted_appointments = []
    for apt in appointments:
        formatted_appointments.append({
            "appointment_id": apt["_id"],
            "patient_name": apt["patient_name"],
            "contact_number": apt["contact_number"],
            "preferred_date": apt["preferred_date"],
            "preferred_time": apt["preferred_time"],
            "concern": apt.get("concern"),
            "status": apt["status"],
            "doctor": {
                "id": str(apt.get("doctor_id", "")),
                "name": apt.get("doctor_name", ""),
                "specialty": apt.get("doctor_specialty", ""),
            },
            "created_at": apt["created_at"].isoformat(),
            "prescription": apt.get("prescription"),
        })

    return {
        "status": "success",
        "count": len(formatted_appointments),
        "appointments": formatted_appointments,
    }

@app.post("/auth/doctor/signup")
async def doctor_signup(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    specialty: str = Form(...),
    experience_years: int = Form(...),
    license_number: str = Form(...),
    phone: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    availability: Optional[str] = Form(None),  # JSON string
    cnic_front: UploadFile = File(...),
    cnic_back: UploadFile = File(...),
    doctor_certificate: UploadFile = File(...)
):
    """Doctor signup endpoint with document uploads and availability"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    # Validate file types
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    for file, field_name in [(cnic_front, "CNIC Front"), (cnic_back, "CNIC Back"), (doctor_certificate, "Doctor Certificate")]:
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"{field_name} must be an image (JPEG/PNG) or PDF file")

    # Check if doctor already exists
    existing_doctor = await db.doctors.find_one({"email": email})
    if existing_doctor:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Parse availability JSON string
    parsed_availability = []
    if availability:
        try:
            parsed_availability = json.loads(availability)
            # Validate structure: list of {day, start, end}
            valid_days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
            if not isinstance(parsed_availability, list):
                raise ValueError
            for entry in parsed_availability:
                if (
                    not isinstance(entry, dict)
                    or "day" not in entry
                    or "start" not in entry
                    or "end" not in entry
                    or entry["day"] not in valid_days
                    or not isinstance(entry["start"], str)
                    or not isinstance(entry["end"], str)
                    or entry["start"] >= entry["end"]
                ):
                    raise ValueError
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid availability format")

    # Create new doctor
    doctor_id = str(uuid.uuid4())
    hashed_password = hash_password(password)

    # Save uploaded files
    document_paths = {}

    try:
        # Save CNIC front
        cnic_front_filename = f"{doctor_id}_cnic_front{os.path.splitext(cnic_front.filename)[1]}"
        cnic_front_path = os.path.join(DOCTOR_DOCUMENTS_DIR, cnic_front_filename)
        with open(cnic_front_path, "wb") as f:
            content = await cnic_front.read()
            f.write(content)
        document_paths["cnic_front"] = cnic_front_path

        # Save CNIC back
        cnic_back_filename = f"{doctor_id}_cnic_back{os.path.splitext(cnic_back.filename)[1]}"
        cnic_back_path = os.path.join(DOCTOR_DOCUMENTS_DIR, cnic_back_filename)
        with open(cnic_back_path, "wb") as f:
            content = await cnic_back.read()
            f.write(content)
        document_paths["cnic_back"] = cnic_back_path

        # Save doctor certificate
        cert_filename = f"{doctor_id}_certificate{os.path.splitext(doctor_certificate.filename)[1]}"
        cert_path = os.path.join(DOCTOR_DOCUMENTS_DIR, cert_filename)
        with open(cert_path, "wb") as f:
            content = await doctor_certificate.read()
            f.write(content)
        document_paths["doctor_certificate"] = cert_path

    except Exception as e:
        # Clean up any files that were saved
        for path in document_paths.values():
            if os.path.exists(path):
                os.remove(path)
        raise HTTPException(status_code=500, detail=f"Failed to save documents: {str(e)}")

    doctor_doc = {
        "_id": doctor_id,
        "email": email,
        "password": hashed_password,
        "full_name": full_name,
        "specialty": specialty,
        "experience_years": experience_years,
        "license_number": license_number,
        "phone": phone,
        "bio": bio,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.utcnow(),
        "is_active": True,
        "availability": parsed_availability,
        "documents": document_paths  # Store document file paths
    }

    await db.doctors.insert_one(doctor_doc)

    # Send welcome email
    asyncio.create_task(send_doctor_welcome_email(email, full_name))

    # Create access token
    token = create_access_token(doctor_id, email)

    return {
        "status": "success",
        "message": "Doctor account created successfully! Your documents are under review. Check your email for welcome message.",
        "doctor": {
            "id": doctor_id,
            "email": email,
            "full_name": full_name,
            "specialty": specialty
        },
        "token": token
    }

@app.post("/auth/doctor/login")
async def doctor_login(credentials: DoctorLogin):
    """Doctor login endpoint"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    # Find doctor
    doctor = await db.doctors.find_one({"email": credentials.email})
    if not doctor:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not verify_password(credentials.password, doctor["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if doctor is approved
    if doctor.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Account pending approval. Please contact administrator.")

    # Create access token
    token = create_access_token(doctor["_id"], doctor["email"])

    return {
        "status": "success",
        "message": "Login successful",
        "doctor": {
            "id": doctor["_id"],
            "email": doctor["email"],
            "full_name": doctor["full_name"],
            "specialty": doctor["specialty"]
        },
        "access_token": token
    }

@app.get("/auth/doctor/profile")
async def get_doctor_profile(current_doctor = Depends(get_current_doctor)):
    """Get current doctor profile"""
    return {
        "status": "success",
        "doctor": {
            "id": current_doctor["_id"],
            "email": current_doctor["email"],
            "full_name": current_doctor["full_name"],
            "specialty": current_doctor["specialty"],
            "experience_years": current_doctor["experience_years"],
            "license_number": current_doctor["license_number"],
            "phone": current_doctor.get("phone"),
            "bio": current_doctor.get("bio"),
            "created_at": current_doctor["created_at"].isoformat(),
            "availability": current_doctor.get("availability", []),
            "status": current_doctor.get("status", "pending")
        }
    }

@app.post("/doctor/availability")
async def set_doctor_availability(
    availability: List[DoctorAvailability],
    current_doctor = Depends(get_current_doctor)
):
    """Set/update doctor availability slots"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Convert to dict format for storage
        availability_dicts = []
        for slot in availability:
            availability_dicts.append({
                "date": slot.date,
                "time_slots": slot.time_slots
            })

        # Update doctor's availability
        await db.doctors.update_one(
            {"_id": current_doctor["_id"]},
            {"$set": {"availability": availability_dicts}}
        )

        return {
            "status": "success",
            "message": "Availability updated successfully",
            "availability": availability_dicts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update availability: {str(e)}")

@app.get("/doctor/availability")
async def get_doctor_availability(current_doctor = Depends(get_current_doctor)):
    """Get current doctor's availability"""
    return {
        "status": "success",
        "availability": current_doctor.get("availability", [])
    }

@app.get("/doctor/{doctor_id}/availability")
async def get_doctor_availability_public(doctor_id: str, current_user = Depends(get_current_user)):
    """Get specific doctor's availability for booking (public endpoint)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    doctor = await db.doctors.find_one({"_id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {
        "status": "success",
        "doctor": {
            "id": doctor["_id"],
            "full_name": doctor["full_name"],
            "specialty": doctor["specialty"]
        },
        "availability": doctor.get("availability", [])
    }

@app.get("/doctor/dashboard")
async def get_doctor_dashboard(current_doctor = Depends(get_current_doctor)):
    """Get doctor's dashboard with appointments and statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Get all appointments for this doctor
        appointments = await db.appointments.find(
            {"doctor_id": current_doctor["_id"]}
        ).sort("created_at", -1).to_list(length=100)

        # Calculate statistics
        total_appointments = len(appointments)
        pending_appointments = len([apt for apt in appointments if apt.get("status") == "pending"])
        confirmed_appointments = len([apt for apt in appointments if apt.get("status") == "confirmed"])
        completed_appointments = len([apt for apt in appointments if apt.get("status") == "completed"])

        # Get today's appointments
        today = datetime.utcnow().date()
        today_appointments = [
            apt for apt in appointments
            if apt.get("preferred_date") == today.isoformat()
        ]

        # Get upcoming appointments (next 7 days)
        next_week = today + timedelta(days=7)
        upcoming_appointments = [
            apt for apt in appointments
            if apt.get("preferred_date") and
            today <= datetime.fromisoformat(apt["preferred_date"]).date() <= next_week and
            apt.get("status") in ["pending", "confirmed"]
        ]

        return {
            "status": "success",
            "dashboard": {
                "total_appointments": total_appointments,
                "pending_appointments": pending_appointments,
                "confirmed_appointments": confirmed_appointments,
                "completed_appointments": completed_appointments,
                "today_appointments": len(today_appointments),
                "upcoming_appointments": len(upcoming_appointments)
            },
            "recent_appointments": [
                {
                    "appointment_id": apt["_id"],
                    "patient_name": apt["patient_name"],
                    "preferred_date": apt["preferred_date"],
                    "preferred_time": apt["preferred_time"],
                    "status": apt.get("status", "pending"),
                    "concern": apt.get("concern"),
                    "created_at": apt["created_at"].isoformat()
                } for apt in appointments[:10]  # Last 10 appointments
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {str(e)}")

@app.get("/doctor/appointments")
async def get_doctor_appointments(
    status_filter: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_doctor = Depends(get_current_doctor)
):
    """Get all appointments for the current doctor"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Build query
        query = {"doctor_id": current_doctor["_id"]}
        if status_filter:
            query["status"] = status_filter

        # Get appointments
        appointments = await db.appointments.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)

        # Format response
        formatted_appointments = []
        for apt in appointments:
            formatted_appointments.append({
                "appointment_id": apt.get("_id", ""),
                "patient_name": apt.get("patient_name", ""),
                "contact_number": apt.get("contact_number", ""),
                "preferred_date": apt.get("preferred_date", ""),
                "preferred_time": apt.get("preferred_time", ""),
                "concern": apt.get("concern", ""),
                "status": apt.get("status", "pending"),
                "created_at": apt.get("created_at", datetime.utcnow()).isoformat() if apt.get("created_at") else "",
                "prescription": apt.get("prescription", ""),
            })

        return {
            "status": "success",
            "count": len(formatted_appointments),
            "appointments": formatted_appointments,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load appointments: {str(e)}")

@app.put("/doctor/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status_update: AppointmentStatusUpdate,
    current_doctor = Depends(get_current_doctor)
):
    """Update appointment status"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Find appointment
        appointment = await db.appointments.find_one({
            "_id": appointment_id,
            "doctor_id": current_doctor["_id"]
        })

        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        # Update appointment status
        await db.appointments.update_one(
            {"_id": appointment_id},
            {
                "$set": {
                    "status": status_update.status,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # If status is completed, add notes if provided
        if status_update.status == "completed" and status_update.notes:
            await db.appointments.update_one(
                {"_id": appointment_id},
                {"$set": {"completion_notes": status_update.notes}}
            )

        # Send notification email to patient if status changed to confirmed or rejected
        if status_update.status in ["confirmed", "rejected"]:
            patient = await db.users.find_one({"_id": appointment["user_id"]})
            if patient:
                subject = f"Appointment {status_update.status.title()} - Eye Health AI"
                body = f"""
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <h2>Appointment {status_update.status.title()}! {'✅' if status_update.status == 'confirmed' else '❌'}</h2>
                        <p>Dear {patient['full_name']},</p>
                        <p>Your appointment has been {status_update.status}.</p>

                        <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h3>Appointment Details:</h3>
                            <p><strong>Appointment ID:</strong> {appointment_id}</p>
                            <p><strong>Doctor:</strong> {current_doctor['full_name']}</p>
                            <p><strong>Specialty:</strong> {current_doctor['specialty']}</p>
                            <p><strong>Date:</strong> {appointment['preferred_date']}</p>
                            <p><strong>Time:</strong> {appointment['preferred_time']}</p>
                            <p><strong>Patient:</strong> {appointment['patient_name']}</p>
                            <p><strong>Status:</strong> {status_update.status.title()}</p>
                        </div>

                        {'<p>Please arrive 10 minutes before your scheduled time.</p>' if status_update.status == 'confirmed' else '<p>If you have any questions, please contact us.</p>'}

                        <p>Best regards,<br>Eye Health AI Team</p>
                    </body>
                </html>
                """
                asyncio.create_task(send_email(patient["email"], subject, body, html=True))

        return {
            "status": "success",
            "message": f"Appointment status updated to {status_update.status}",
            "appointment_id": appointment_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update appointment status: {str(e)}")

from fastapi import Body

# New: Add or update prescription for an appointment
@app.put("/doctor/appointments/{appointment_id}/prescription")
async def update_appointment_prescription(
    appointment_id: str,
    prescription: str = Body(..., embed=True),
    current_doctor = Depends(get_current_doctor)
):
    """Add or update prescription for an appointment"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    try:
        appointment = await db.appointments.find_one({
            "_id": appointment_id,
            "doctor_id": current_doctor["_id"]
        })
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        await db.appointments.update_one(
            {"_id": appointment_id},
            {"$set": {"prescription": prescription, "prescription_updated_at": datetime.utcnow()}}
        )
        return {"status": "success", "message": "Prescription updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update prescription: {str(e)}")

@app.post("/auth/admin/login")
async def admin_login(password: str = Body(..., embed=True)):
    """Admin login endpoint (password only, password is 'admin123')"""
    if password != "admin123":
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Use hardcoded admin id and email for token
    admin_id = "admin"
    admin_email = "admin@eyehealth.com"

    token = create_access_token(admin_id, admin_email)

    return {
        "status": "success",
        "message": "Admin login successful",
        "admin": {
            "id": admin_id,
            "email": admin_email,
            "full_name": "Admin"
        },
        "token": token
    }

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated admin"""
    token = credentials.credentials
    payload = decode_token(token)
    # Allow hardcoded admin
    if payload.get("user_id") == "admin" and payload.get("email") == "admin@eyehealth.com":
        return {
            "_id": "admin",
            "email": "admin@eyehealth.com",
            "full_name": "Admin"
        }
    admin = await db.admins.find_one({"_id": payload["user_id"]})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin

@app.get("/admin/dashboard")
async def get_admin_dashboard(current_admin = Depends(get_current_admin)):
    """Get admin dashboard with doctor statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Get doctor statistics
        total_doctors = await db.doctors.count_documents({})
        pending_doctors = await db.doctors.count_documents({"status": "pending"})
        approved_doctors = await db.doctors.count_documents({"status": "approved"})
        rejected_doctors = await db.doctors.count_documents({"status": "rejected"})

        # Get recent pending doctors
        pending_doctors_list = await db.doctors.find(
            {"status": "pending"}
        ).sort("created_at", -1).limit(10).to_list(length=10)

        # Get total users and appointments
        total_users = await db.users.count_documents({})
        total_appointments = await db.appointments.count_documents({})

        return {
            "status": "success",
            "dashboard": {
                "total_doctors": total_doctors,
                "pending_doctors": pending_doctors,
                "approved_doctors": approved_doctors,
                "rejected_doctors": rejected_doctors,
                "total_users": total_users,
                "total_appointments": total_appointments
            },
            "pending_doctors": [
                {
                    "id": doc["_id"],
                    "full_name": doc["full_name"],
                    "email": doc["email"],
                    "specialty": doc["specialty"],
                    "experience_years": doc["experience_years"],
                    "license_number": doc["license_number"],
                    "created_at": doc["created_at"].isoformat()
                } for doc in pending_doctors_list
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load admin dashboard: {str(e)}")

@app.get("/admin/doctors")
async def get_all_doctors(
    status_filter: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_admin = Depends(get_current_admin)
):
    """Get all doctors with optional status filter"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Build query
        query = {}
        if status_filter:
            query["status"] = status_filter

        # Get doctors
        doctors = await db.doctors.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)

        # Format response
        formatted_doctors = []
        for doc in doctors:
            formatted_doctors.append({
                "id": doc["_id"],
                "email": doc["email"],
                "full_name": doc["full_name"],
                "specialty": doc["specialty"],
                "experience_years": doc["experience_years"],
                "license_number": doc["license_number"],
                "phone": doc.get("phone"),
                "bio": doc.get("bio"),
                "status": doc.get("status", "pending"),
                "created_at": doc["created_at"].isoformat()
            })

        return {
            "status": "success",
            "count": len(formatted_doctors),
            "doctors": formatted_doctors
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load doctors: {str(e)}")

@app.put("/admin/doctors/{doctor_id}/status")
async def update_doctor_status(
    doctor_id: str,
    request: DoctorApprovalRequest,
    current_admin = Depends(get_current_admin)
):
    """Approve or reject doctor application"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Find doctor
        doctor = await db.doctors.find_one({"_id": doctor_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

        # Update doctor status
        await db.doctors.update_one(
            {"_id": doctor_id},
            {
                "$set": {
                    "status": "approved" if request.action == "approve" else "rejected",
                    "updated_at": datetime.utcnow(),
                    "admin_notes": request.notes
                }
            }
        )

        # Send notification email
        if request.action == "approve":
            asyncio.create_task(send_doctor_approval_email(doctor["email"], doctor["full_name"]))
        else:
            asyncio.create_task(send_doctor_rejection_email(doctor["email"], doctor["full_name"], request.notes))

        return {
            "status": "success",
            "message": f"Doctor {request.action}d successfully",
            "doctor_id": doctor_id,
            "action": request.action
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update doctor status: {str(e)}")

@app.get("/admin/doctors/{doctor_id}/documents")
async def get_doctor_documents(
    doctor_id: str,
    current_admin = Depends(get_current_admin)
):
    """Get list of documents for a specific doctor"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Find doctor
        doctor = await db.doctors.find_one({"_id": doctor_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

        documents = doctor.get("documents", {})
        document_list = []

        for doc_type, file_path in documents.items():
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                file_ext = os.path.splitext(file_path)[1].lower()
                document_list.append({
                    "type": doc_type,
                    "filename": os.path.basename(file_path),
                    "file_path": file_path,
                    "file_size": file_size,
                    "file_extension": file_ext,
                    "exists": True
                })
            else:
                document_list.append({
                    "type": doc_type,
                    "filename": os.path.basename(file_path) if file_path else "Not uploaded",
                    "file_path": file_path,
                    "file_size": 0,
                    "file_extension": "",
                    "exists": False
                })

        return {
            "status": "success",
            "doctor_id": doctor_id,
            "doctor_name": doctor["full_name"],
            "documents": document_list
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")

@app.get("/admin/doctors/{doctor_id}/documents/{document_type}")
async def download_doctor_document(
    doctor_id: str,
    document_type: str,
    current_admin = Depends(get_current_admin)
):
    """Download a specific doctor document"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Validate document type
        allowed_types = ["cnic_front", "cnic_back", "doctor_certificate"]
        if document_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid document type")

        # Find doctor
        doctor = await db.doctors.find_one({"_id": doctor_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

        documents = doctor.get("documents", {})
        file_path = documents.get(document_type)

        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Document not found")

        # Determine media type based on file extension
        file_ext = os.path.splitext(file_path)[1].lower()
        media_type = "application/pdf" if file_ext == ".pdf" else "image/jpeg"

        return FileResponse(
            file_path,
            media_type=media_type,
            filename=f"{doctor['full_name'].replace(' ', '_')}_{document_type}{file_ext}"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "yolo_model_loaded": yolo_model is not None,
        "ai_client_available": ai_client is not None,
        "database_connected": db is not None,
        "email_configured": EMAIL_ADDRESS is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
