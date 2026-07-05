#!/usr/bin/env python3
"""
GradeGuardian V2.0 - Cryptographic Faculty Key Generator
Generates a high-entropy 256-bit cryptographic authorization key for Alexandria University Faculty/Doctors.
"""

import secrets
import os
import sys

# Ensure UTF-8 output encoding for Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")
KEY_FILE = os.path.join(BASE_DIR, "faculty_key.txt")

def generate_key():
    # 256-bit URL-safe token with prefix
    crypto_key = f"GG-FACULTY-{secrets.token_urlsafe(32)}"
    
    # Save to faculty_key.txt
    with open(KEY_FILE, "w", encoding="utf-8") as f:
        f.write(crypto_key)
        
    print("\n" + "="*70)
    print("GradeGuardian V2.0 - Cryptographic Faculty Key Generator")
    print("="*70)
    print(f"\nGenerated 256-Bit Cryptographic Key:")
    print(f"   {crypto_key}\n")
    print(f"Saved key to local file: {KEY_FILE}")
    print("\nTo use in production environment (Vercel / Supabase / .env):")
    print(f"   FACULTY_SECRET_KEY={crypto_key}\n")
    print("="*70 + "\n")

if __name__ == "__main__":
    generate_key()
