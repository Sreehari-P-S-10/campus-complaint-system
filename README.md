# 🏫 Campus Complaint & Maintenance Management System

A production-ready web application for college campuses that enables students to report and track maintenance issues, and administrators to manage, prioritize, and resolve complaints.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Design](#-database-design)
- [API Documentation](#-api-documentation)
- [Setup Instructions](#-setup-instructions)
- [Default Accounts](#-default-accounts)
- [Deployment (Apache)](#-deployment-apache)

---

## ✨ Features

### For Students
- **Register & Login** — Create an account and securely log in
- **File Complaints** — Report issues in categories: Hostel, WiFi, Classroom, Mess
- **Attach Files** — Upload images/documents as evidence (up to 5 files, 5MB each)
- **Track Status** — Monitor complaint progress (Open → In Progress → Resolved)
- **Filter & Search** — Find complaints by status, category, or keywords
- **Dashboard Statistics** — View personal complaint summary

### For Admins
- **View All Complaints** — See every complaint from all students
- **Update Status** — Change complaint status (Open → In Progress → Resolved)
- **Assign Priority** — Set priority levels (Low / Medium / High)
- **Dashboard Analytics** — See counts by status, category, and priority
- **Delete Complaints** — Remove resolved or duplicate complaints
- **Filter & Search** — Advanced filtering by status, category, priority, and search

### Security
- **Password Hashing** — All passwords encrypted with bcrypt (10 rounds)
- **JWT Authentication** — Secure token-based sessions stored in httpOnly cookies
- **Role-Based Access** — Students and admins have different permissions
- **Input Validation** — All inputs validated on both client and server side

---

## 🧱 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3, Bootstrap 5, jQuery 3.7 |
| Backend    | Node.js, Express.js                 |
| Database   | MySQL                               |
| Auth       | JWT (jsonwebtoken) + bcrypt         |
| File Upload| Multer                              |
| Deployment | Apache HTTP Server (reverse proxy)  |

---

## 📁 Project Structure

```
Complaint System/
├── config/
│   └── db.js                    # MySQL connection pool
├── controllers/
│   ├── authController.js        # Register, Login, Logout, GetMe
│   └── ticketController.js      # CRUD for tickets + file upload
├── middlewares/
│   ├── authMiddleware.js        # JWT token verification
│   └── roleMiddleware.js        # Role-based access control
├── models/
│   ├── userModel.js             # User database queries
│   └── ticketModel.js           # Ticket database queries
├── routes/
│   ├── authRoutes.js            # Auth API routes
│   └── ticketRoutes.js          # Ticket API routes
├── public/
│   ├── css/
│   │   └── style.css            # Custom dark theme styles
│   ├── js/
│   │   ├── auth.js              # Login/Register logic
│   │   ├── student.js           # Student dashboard logic
│   │   ├── admin.js             # Admin dashboard logic
│   │   └── complaint.js         # Create complaint logic
│   └── images/                  # Static images
├── views/
│   ├── login.html               # Login page
│   ├── register.html            # Registration page
│   ├── student-dashboard.html   # Student dashboard
│   ├── create-complaint.html    # New complaint form
│   └── admin-dashboard.html     # Admin dashboard
├── uploads/                     # Uploaded file attachments
├── server.js                    # Express app entry point
├── seed-admin.js                # Script to create default admin
├── schema.sql                   # Database schema
├── .env                         # Environment configuration
├── apache-config.conf           # Apache reverse proxy config
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

---

## 🗄️ Database Design

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    users     │       │     tickets      │       │   attachments   │
├──────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)      │──┐    │ id (PK)          │──┐    │ id (PK)         │
│ name         │  │    │ user_id (FK) ────│──┘    │ ticket_id (FK)──│──┘
│ email (UQ)   │  └───>│ title            │       │ file_path       │
│ password     │       │ description      │       │ original_name   │
│ role         │       │ category         │       │ created_at      │
│ created_at   │       │ priority         │       └─────────────────┘
└──────────────┘       │ status           │
                       │ created_at       │
                       │ updated_at       │
                       └──────────────────┘
```

### Relationships
- **users → tickets**: One-to-Many (one user can file many tickets)
- **tickets → attachments**: One-to-Many (one ticket can have multiple file attachments)
- Both foreign keys use `ON DELETE CASCADE` (deleting a user deletes their tickets; deleting a ticket deletes its attachments)

### Table Details

**users**
| Column     | Type         | Constraints           |
|------------|--------------|-----------------------|
| id         | INT          | PRIMARY KEY, AUTO_INC |
| name       | VARCHAR(100) | NOT NULL              |
| email      | VARCHAR(150) | NOT NULL, UNIQUE      |
| password   | VARCHAR(255) | NOT NULL (bcrypt hash) |
| role       | ENUM         | 'student' / 'admin'   |
| created_at | TIMESTAMP    | DEFAULT CURRENT       |

**tickets**
| Column      | Type         | Constraints                      |
|-------------|--------------|----------------------------------|
| id          | INT          | PRIMARY KEY, AUTO_INC            |
| user_id     | INT          | FK → users(id), ON DELETE CASCADE |
| title       | VARCHAR(255) | NOT NULL                         |
| description | TEXT         | NOT NULL                         |
| category    | ENUM         | Hostel / WiFi / Classroom / Mess |
| priority    | ENUM         | Low / Medium / High              |
| status      | ENUM         | Open / In Progress / Resolved    |
| created_at  | TIMESTAMP    | DEFAULT CURRENT                  |
| updated_at  | TIMESTAMP    | AUTO UPDATE                      |

**attachments**
| Column        | Type         | Constraints                        |
|---------------|--------------|------------------------------------|
| id            | INT          | PRIMARY KEY, AUTO_INC              |
| ticket_id     | INT          | FK → tickets(id), ON DELETE CASCADE |
| file_path     | VARCHAR(500) | NOT NULL                           |
| original_name | VARCHAR(255) | NOT NULL                           |
| created_at    | TIMESTAMP    | DEFAULT CURRENT                    |

---

## 🔌 API Documentation

### Authentication APIs

| Method | Endpoint       | Auth | Description            |
|--------|----------------|------|------------------------|
| POST   | /api/register  | No   | Register new student   |
| POST   | /api/login     | No   | Login & get JWT token  |
| POST   | /api/logout    | No   | Clear auth cookie      |
| GET    | /api/me        | Yes  | Get current user info  |

### Ticket APIs

| Method | Endpoint                 | Auth  | Role    | Description               |
|--------|--------------------------|-------|---------|---------------------------|
| POST   | /api/tickets             | Yes   | Any     | Create new complaint      |
| GET    | /api/tickets             | Yes   | Any     | List complaints (filtered)|
| GET    | /api/tickets/stats       | Yes   | Any     | Dashboard statistics      |
| GET    | /api/tickets/:id         | Yes   | Any     | Get complaint details     |
| PUT    | /api/tickets/:id/status  | Yes   | Admin   | Update status/priority    |
| DELETE | /api/tickets/:id         | Yes   | Owner/Admin | Delete complaint      |

### Sample API Requests & Responses

**Register:**
```
POST /api/register
Body: { "name": "John", "email": "john@campus.edu", "password": "john123", "confirmPassword": "john123" }
Response: { "success": true, "message": "Registration successful!", "data": { "id": 2, "name": "John", "role": "student", "token": "..." } }
```

**Login:**
```
POST /api/login
Body: { "email": "admin@campus.edu", "password": "admin123" }
Response: { "success": true, "message": "Login successful!", "data": { "id": 1, "name": "Campus Admin", "role": "admin", "token": "..." } }
```

**Create Ticket (with file):**
```
POST /api/tickets
Content-Type: multipart/form-data
Body: title, description, category, attachments (files)
Response: { "success": true, "message": "Complaint submitted successfully!", "data": { ... } }
```

**Update Status (Admin):**
```
PUT /api/tickets/1/status
Body: { "status": "In Progress", "priority": "High" }
Response: { "success": true, "message": "Complaint updated successfully!" }
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** v18+ installed
- **MySQL** installed and running
- **npm** (comes with Node.js)

### Step-by-Step Setup

**Step 1: Set up the Database**
1. Open **MySQL Command Line Client** (search in Start menu)
2. Enter your MySQL root password
3. Copy and paste the contents of `schema.sql` and press Enter
4. Type `exit` to close MySQL

**Step 2: Configure Environment**
1. Open the `.env` file in the project
2. Set your MySQL password: `DB_PASSWORD=your_mysql_password_here`
3. Save the file

**Step 3: Create Default Admin Account**
1. Open a terminal/command prompt in the project folder
2. Run: `node seed-admin.js`
3. You should see "Admin account created successfully"

**Step 4: Start the Server**
1. Run: `node server.js`
2. You should see "Server running on: http://localhost:3000"

**Step 5: Open in Browser**
1. Go to: http://localhost:3000
2. Login with admin: `admin@campus.edu` / `admin123`
3. Or register a new student account

---

## 👤 Default Accounts

### Admin Account
| Field    | Value              |
|----------|--------------------|
| Email    | admin@campus.edu   |
| Password | admin123           |
| Role     | Admin              |

> ⚠️ **IMPORTANT**: Change the admin password in production!

### Creating Student Accounts
Students can register themselves through the Register page at `/register`.

---

## 🐧 Deployment (Apache)

See the `apache-config.conf` file for detailed instructions. Summary:

### Linux
```bash
sudo apt install apache2
sudo a2enmod proxy proxy_http
sudo cp apache-config.conf /etc/apache2/sites-available/campus-complaints.conf
sudo a2ensite campus-complaints.conf
sudo systemctl restart apache2
node server.js
```

### Windows (XAMPP)
1. Install XAMPP
2. Enable proxy modules in `httpd.conf`
3. Add VirtualHost config to `httpd-vhosts.conf`
4. Restart Apache
5. Run `node server.js`

Access the app at: **http://localhost**

---

## 📝 License

This project is built for educational purposes as part of a campus management initiative.
