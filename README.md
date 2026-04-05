#  Elder Care Management System

A full-stack web application designed to assist elderly individuals and caregivers by providing health monitoring, emergency support, and medication management features.

---

##  Features

*  **Role-based Authentication**

  * Secure login with OTP verification
*  **Medication Tracking**

  * Add, update, and manage medicines dynamically
*  **Voice Assistant**

  * Speech-to-text commands for accessibility
*  **Emergency Fall Detection**

  * Detects sudden falls using device motion sensors
*  **Live Location Tracking**

  * Real-time location sharing using Google Maps API
*  **Multi-language Support**

---

##  Tech Stack

### Frontend

* React (Vite)
* HTML, CSS, JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### APIs & Services

* Twilio (OTP services)
* Google Maps API

---

##  Project Structure

```bash
elder-care-website/
│
├── frontend/        # React frontend
├── backend/         # Node.js backend
├── .env.example     # Environment variables template
└── README.md
```

---

##  Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/elder-care.git
cd elder-care
```

---

### 2️⃣ Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file and add:

```env
PORT=5000
MONGO_URI=your_mongodb_uri
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_token
FRONTEND_URL=http://localhost:5173
```

Run backend:

```bash
npm start
```

---

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Usage

* Open: http://localhost:5173
* Register/Login
* Explore features like medication tracking and emergency support

---

##  Team Project

This project was developed as part of a group project.



---

## ⭐ Acknowledgements

Thanks to all contributors and resources that helped in building this project.
