# SmartCrop AI

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

This is an AI-powered application for analyzing documents and images using Google's Gemini API.

## 🚀 Setup & Run Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy the example environment file:
     ```bash
     cp .env.example .env.local
     # On Windows Command Prompt: copy .env.example .env.local
     # On Powershell: Copy-Item .env.example .env.local
     ```
   - Open `.env.local` and paste your Gemini API Key:
     ```env
     VITE_GEMINI_API_KEY=your_actual_api_key_here
     ```
     > **Note:** Get your API key from [Google AI Studio](https://aistudio.google.com/).

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

## 📤 How to Upload to GitHub

1. **Initialize Git** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Connect to GitHub**
   - Create a new repository on GitHub.
   - Run the commands provided by GitHub (replace URL with your repo URL):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
