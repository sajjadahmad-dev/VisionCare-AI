from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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
from pydantic import BaseModel
import json

# LangGraph and OpenAI imports
from langgraph.graph import StateGraph, END
#from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, AIMessage
from typing_extensions import TypedDict

# YOLO import
from ultralytics import YOLO

# Environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Eye Conjunctiva AI Agent", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
YOLO_MODEL_PATH = 'eye_conjuntiva_detection_model.pt'
UPLOAD_DIR = 'backend/uploads'
OUTPUT_DIR = 'backend/detection_results'
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Create directories
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

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

# Initialize OpenAI with updated models
if OPENAI_API_KEY:
    # Updated to use gpt-4o which supports vision
    llm = ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY, max_tokens=1000)
    text_llm = ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_API_KEY, max_tokens=1000)
else:
    print("Warning: OPENAI_API_KEY not found in environment variables")
    llm = None
    text_llm = None

# Pydantic models
class QuestionRequest(BaseModel):
    question: str

class AppointmentRequest(BaseModel):
    patient_name: str
    contact_number: str
    preferred_date: str
    preferred_time: str
    concern: Optional[str] = None
    doctor_id: Optional[int] = None

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

# Dummy doctors database
DOCTORS = [
    {
        "id": 1,
        "name": "Dr. Sarah Johnson",
        "specialty": "Ophthalmologist",
        "experience": "15 years",
        "rating": 4.8,
        "available_slots": ["09:00", "10:30", "14:00", "15:30", "17:00"]
    },
    {
        "id": 2,
        "name": "Dr. Michael Chen",
        "specialty": "Eye Specialist",
        "experience": "12 years",
        "rating": 4.7,
        "available_slots": ["08:30", "11:00", "13:30", "16:00", "18:00"]
    },
    {
        "id": 3,
        "name": "Dr. Emily Davis",
        "specialty": "Conjunctiva Specialist",
        "experience": "18 years",
        "rating": 4.9,
        "available_slots": ["09:30", "12:00", "14:30", "16:30"]
    }
]

# Dummy appointments storage
appointments = []

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
                
                # Create colored mask
                colored_mask = np.zeros_like(annotated_image, dtype=np.uint8)
                for c in range(3):
                    colored_mask[:, :, c] = mask_resized * color[c]
                
                # Blend with original image
                annotated_image = cv2.addWeighted(annotated_image, 1.0, colored_mask, 0.6, 0)
                
                # Find centroid for label placement
                moments = cv2.moments(mask_resized)
                if moments["m00"] != 0:
                    cx = int(moments["m10"] / moments["m00"])
                    cy = int(moments["m01"] / moments["m00"])
                    label = f"{CLASS_NAMES[cls_idx]} ({conf:.2f})"
                    
                    # Place label outside the mask
                    offset_x, offset_y = 60, -40
                    label_x = min(cx + offset_x, annotated_image.shape[1] - 10)
                    label_y = max(cy + offset_y, 20)
                    
                    # Draw arrow from label to centroid
                    cv2.arrowedLine(annotated_image, (label_x, label_y), (cx, cy), color, 2, tipLength=0.2)
                    
                    # Draw label background
                    font_scale = 0.6
                    font_thickness = 2
                    text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)[0]
                    highlight_color = (255, 255, 200)
                    padding_x, padding_y = 5, 8
                    
                    cv2.rectangle(annotated_image,
                                (label_x - padding_x, label_y - text_size[1] - padding_y),
                                (label_x + text_size[0] + padding_x, label_y + padding_y),
                                highlight_color, -1)
                    
                    # Draw label text
                    cv2.putText(annotated_image, label, (label_x, label_y),
                              cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), font_thickness, cv2.LINE_AA)
                
                # Store detection info
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
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image")
        
        # Run YOLO inference
        results = yolo_model(image, verbose=False)
        
        # Create visualization
        annotated_image, detection_info = create_segmentation_visualization(image, results[0])
        
        # Save annotated image
        output_filename = f"detected_{os.path.basename(image_path)}"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        cv2.imwrite(output_path, annotated_image)
        
        return output_path, detection_info
    
    except Exception as e:
        print(f"YOLO detection error: {e}")
        return None, []

def encode_image_to_base64(image_path: str) -> str:
    """Encode image to base64 for GPT-4 Vision"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        return ""

async def analyze_with_gpt_vision(image_path: str, detection_results: List[Dict], user_description: str = None) -> Dict[str, str]:
    """Analyze image with GPT-4o Vision"""
    if not llm:
        return {"analysis": "GPT analysis not available", "recommendations": "Please consult an eye specialist"}
    
    try:
        base64_image = encode_image_to_base64(image_path)
        if not base64_image:
            raise ValueError("Could not encode image")
        
        detection_summary = "\n".join([f"- {d['class']}: {d['confidence']:.2f} confidence" 
                                     for d in detection_results])
        
        # Include user description in the prompt
        user_context = f"\nUser's Description: {user_description}" if user_description else ""
        
        prompt = f"""As an AI ophthalmology assistant, analyze this eye image for conjunctiva health.

YOLO Model Detection Results:
{detection_summary if detection_summary else "No specific detections"}
{user_context}

Please provide a comprehensive analysis in the following format:

**ANALYSIS:**
Provide a detailed analysis of the conjunctiva condition visible in the image, including:
- Overall conjunctiva appearance
- Any signs of inflammation, redness, or irritation
- Tissue texture and color assessment
- Any abnormalities or concerning features

**RECOMMENDATIONS:**
Provide specific lifestyle recommendations and care instructions:
- Eye hygiene practices
- Environmental considerations
- Lifestyle modifications
- Preventive measures

**MEDICAL_ADVICE:**
Provide guidance on when to seek professional medical attention:
- Warning signs that require immediate attention
- Timeline for seeking care
- What to expect during a consultation

Focus on conjunctiva health, inflammation signs, and general eye wellness. Be thorough but accessible in your explanation."""

        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                }
            ]
        )
        
        response = await llm.ainvoke([message])
        
        # Parse the response
        content = response.content
        analysis = recommendations = medical_advice = ""
        
        # Extract sections from the response
        sections = content.split("**")
        current_section = ""
        
        for section in sections:
            section = section.strip()
            if section.startswith("ANALYSIS:"):
                current_section = "analysis"
                analysis = section.replace("ANALYSIS:", "").strip()
            elif section.startswith("RECOMMENDATIONS:"):
                current_section = "recommendations"
                recommendations = section.replace("RECOMMENDATIONS:", "").strip()
            elif section.startswith("MEDICAL_ADVICE:"):
                current_section = "medical_advice"
                medical_advice = section.replace("MEDICAL_ADVICE:", "").strip()
            elif current_section and section:
                if current_section == "analysis":
                    analysis += " " + section
                elif current_section == "recommendations":
                    recommendations += " " + section
                elif current_section == "medical_advice":
                    medical_advice += " " + section
        
        return {
            "analysis": analysis or content,
            "recommendations": recommendations or "Maintain good eye hygiene and avoid eye strain",
            "medical_advice": medical_advice or "Consult an ophthalmologist if symptoms persist or worsen"
        }
    
    except Exception as e:
        print(f"GPT Vision analysis error: {e}")
        return {
            "analysis": f"Analysis unavailable due to error: {str(e)}",
            "recommendations": "Maintain good eye hygiene and consult an eye specialist",
            "medical_advice": "Please consult an ophthalmologist for proper diagnosis"
        }

# LangGraph nodes
def process_image_node(state: AgentState):
    """Process uploaded image with YOLO"""
    image_path = state.get("image_path")
    if not image_path:
        return {"next_action": "question_answer"}
    
    # Process with YOLO
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
    
    # Analyze with GPT Vision
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
    if not messages or not text_llm:
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

        response = await text_llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            "gpt_analysis": {"analysis": response.content},
            "next_action": "complete"
        }
    
    except Exception as e:
        return {
            "gpt_analysis": {"analysis": f"I apologize, but I'm unable to process your question at the moment. Please consult an eye care professional for assistance."},
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
    return {"message": "Eye Conjunctiva AI Agent API", "version": "1.0.0"}

@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    symptoms: Optional[str] = Form(None),
    additional_info: Optional[str] = Form(None)
):
    """Analyze uploaded eye image with optional user description"""
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
        
        # Combine user inputs into description
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
        
        # Prepare response
        response_data = {
            "status": "success",
            "yolo_detection": result.get("yolo_results", {}),
            "gpt_analysis": result.get("gpt_analysis", {}),
            "user_description": combined_description,
            "file_id": file_id
        }
        
        return JSONResponse(content=response_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/detection-result/{file_id}")
async def get_detection_result(file_id: str):
    """Get detection result image"""
    detection_files = [f for f in os.listdir(OUTPUT_DIR) if file_id in f]
    if not detection_files:
        raise HTTPException(status_code=404, detail="Detection result not found")
    
    file_path = os.path.join(OUTPUT_DIR, detection_files[0])
    return FileResponse(file_path, media_type="image/jpeg")

@app.post("/ask-question")
async def ask_question(request: QuestionRequest):
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
        
        return {
            "status": "success",
            "answer": result.get("gpt_analysis", {}).get("analysis", "No response available"),
            "question": request.question
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question processing failed: {str(e)}")

@app.get("/doctors")
async def get_doctors():
    """Get list of available doctors"""
    return {"status": "success", "doctors": DOCTORS}

@app.post("/book-appointment")
async def book_appointment(request: AppointmentRequest):
    """Book appointment with a doctor"""
    try:
        # Generate appointment ID
        appointment_id = str(uuid.uuid4())[:8]

        # Find doctor by doctor_id if provided, else default to first doctor
        doctor = None
        if request.doctor_id is not None:
            doctor = next((d for d in DOCTORS if d["id"] == request.doctor_id), None)
        if doctor is None:
            doctor = DOCTORS[0]

        # Create appointment
        appointment = {
            "appointment_id": appointment_id,
            "patient_name": request.patient_name,
            "contact_number": request.contact_number,
            "preferred_date": request.preferred_date,
            "preferred_time": request.preferred_time,
            "concern": request.concern,
            "status": "confirmed",
            "doctor": doctor,
            "created_at": datetime.now().isoformat()
        }

        # Store appointment (in production, use a database)
        appointments.append(appointment)

        return {
            "status": "success",
            "message": "Appointment booked successfully",
            "appointment": appointment
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Appointment booking failed: {str(e)}")

@app.get("/appointments")
async def get_appointments():
    """Get all appointments (for demo purposes)"""
    return {"status": "success", "appointments": appointments}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "yolo_model_loaded": yolo_model is not None,
        "gpt_model_available": llm is not None,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
