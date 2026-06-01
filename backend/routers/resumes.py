from fastapi import APIRouter, UploadFile, File, HTTPException
import json
import os
import fitz # PyMuPDF
from groq import Groq

router = APIRouter(
    prefix="/api/upload-resume",
    tags=["resumes"]
)

@router.post("/")
async def upload_resume(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    try:
        content = await file.read()
        
        # Simple text extraction for PDF using PyMuPDF (fitz)
        extracted_text = ""
        if file.filename.lower().endswith('.pdf'):
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text()
            doc.close()
        elif file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            extracted_text = "Image OCR not implemented, relying on fallback"
        else:
            extracted_text = content.decode('utf-8', errors='ignore')
            
        groq_key = os.getenv("GROQ_API_KEY")
        
        if not groq_key or groq_key == "your_groq_api_key_here":
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in the .env file.")

        # Use Groq to parse the text
        client = Groq(api_key=groq_key)
        
        prompt = """You are a professional ATS resume parser.
Analyze the following raw extracted resume text and structure it into a clean, complete, and highly accurate JSON object.

Extract the following fields carefully:
1. name: The candidate's full name. Be very careful to find the actual candidate's name at the top. Do NOT set it to an email address, phone number, or job title.
2. email: Email Address (lowercase, e.g. "priya.rao@datascience.in").
3. phone: Phone Number (standard format, e.g. "+91 97890 54321").
4. linkedin: LinkedIn profile URL (clean).
5. location: Current city location (e.g. Chennai, Bangalore, Mumbai, Hyderabad, Pune).
6. currentEmployer: Company they currently work for (or "Independent Consultant" if freelance).
7. designation: Current job title or role.
8. totalExperience: Total professional experience in years (integer, e.g. 6).
9. teachingExperience: Teaching / training experience in years (integer, e.g. 2).
10. skills: Array of key technology skills (e.g., ["Python", "Generative AI", "PyTorch"]).
11. certifications: Array of all professional certifications mentioned in the resume.
12. education: Highest academic degree and the university/college as mentioned in their resume.
13. engagementPreference: One of "Freelancer", "Consultant", "Visiting faculty", "Full-time".
14. deliveryMode: One of "Hybrid", "Online", "Offline".
15. hourlyExpectation: Estimated hourly expectation rate in INR (integer, e.g. 2500).
16. dailyRate: Estimated daily expectation rate in INR (integer, e.g. 18000).
17. travelWillingness: One of "Yes", "No", "Selective".
18. negotiability: One of "Negotiable", "Highly Negotiable", "Non-Negotiable".
19. audienceFit: Array of target audiences (e.g., ["Working professionals", "Corporate learners", "Students"]).

Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks like ```json. Return valid parseable JSON.

Resume Raw Text:
""" + extracted_text

        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": "You are a helpful assistant designed to output JSON. You must output ONLY JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        
        parsed_json_str = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if the model ignored instructions
        if parsed_json_str.startswith("```json"):
            parsed_json_str = parsed_json_str[7:]
        if parsed_json_str.startswith("```"):
            parsed_json_str = parsed_json_str[3:]
        if parsed_json_str.endswith("```"):
            parsed_json_str = parsed_json_str[:-3]
            
        try:
            parsed_profile = json.loads(parsed_json_str.strip())
        except json.JSONDecodeError as json_err:
            print(f"Failed to parse JSON from Groq: {parsed_json_str}")
            raise HTTPException(status_code=500, detail=f"Failed to parse JSON from AI: {str(json_err)}")
        
        return parsed_profile

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error extracting resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))
