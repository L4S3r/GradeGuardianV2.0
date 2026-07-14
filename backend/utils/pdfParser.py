# -*- coding: utf-8 -*-
import fitz
import sys
import re
import json

# Force stdout to UTF-8 to prevent encoding crashes on Windows
sys.stdout.reconfigure(encoding='utf-8')

def parse_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {"error": f"Failed to open PDF: {str(e)}"}

    course_name = None
    students = []

    for page_idx, page in enumerate(doc):
        text = page.get_text("text")
        
        # Extract course name
        if not course_name:
            match = re.search(r"اسم المقرر\s*:\s*([^\n]+)", text)
            if match:
                course_name = match.group(1).strip()
                
        blocks = page.get_text("blocks")
        for b in blocks:
            block_text = b[4].strip()
            if not block_text:
                continue
                
            # Check for quoted seat number at the start of block
            match = re.match(r'^"(\d+)"(.*)', block_text, re.DOTALL)
            if match:
                seat_no = match.group(1)
                rest = match.group(2).strip()
                
                # Split lines
                lines = [l.strip() for l in rest.split('\n') if l.strip()]
                if not lines:
                    continue
                    
                first_line = lines[0]
                # Extract Arabic name and any trailing digits on the first line
                first_line_match = re.match(r'^([^\d]+)(\d+)?$', first_line)
                if first_line_match:
                    name = first_line_match.group(1).strip()
                    first_num = first_line_match.group(2)
                else:
                    name = first_line
                    first_num = None
                    
                # Extract all numbers in this block
                numbers = []
                if first_num is not None:
                    numbers.append(float(first_num))
                for line in lines[1:]:
                    if re.match(r'^\d+(\.\d+)?$', line):
                        numbers.append(float(line))
                        
                total_grade = numbers[-1] if numbers else 0.0
                students.append({
                    "student_id": seat_no,
                    "student_name": name,
                    "grade": total_grade
                })

    return {
        "course_name": course_name,
        "students": students
    }

if __name__ == "__main__":
    # Ensure stdout uses UTF-8 encoding
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No PDF path provided"}))
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    result = parse_pdf(pdf_path)
    print(json.dumps(result, ensure_ascii=False))
