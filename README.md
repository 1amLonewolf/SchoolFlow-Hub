# SchoolFlow Hub

A comprehensive school management system built with modern web technologies.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Building](#building)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

SchoolFlow Hub is a complete school management solution that helps educational institutions manage students, teachers, courses, attendance, exams, and more. The system provides a responsive web interface with role-based access control and real-time data visualization.

## Features

- **User Authentication**: Secure login system with session management
- **Student Management**: Add, edit, delete, and bulk upload students
- **Teacher Management**: Manage teacher information and assignments
- **Course Management**: Create courses and assign them to teachers
- **Attendance Tracking**: Record and monitor student attendance
- **Exam Management**: Record exam results with advanced filtering
- **Season Management**: Academic year/term tracking
- **Graduation Eligibility**: Automated checks based on attendance and exams
- **Reports & Analytics**: Data visualization with charts
- **Data Export**: Export functionality for various data types
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark Mode**: User preference for light/dark theme

## Architecture

### Frontend
- Pure HTML/CSS/JavaScript (no frameworks)
- Modular architecture with separate components
- Responsive design with mobile-first approach
- Chart.js for data visualization

### Backend
- Node.js HTTP server for serving static files
- Back4App (Parse Server) for data persistence
- RESTful API interactions
- Session management

### Security
- Secure password handling
- Session token validation
- Input sanitization
- Content Security Policy
- Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Back4App account (for database)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd schoolflow-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Create a `.env` file in the project root with the following variables:
   ```env
   BACK4APP_APP_ID=your_back4app_app_id
   BACK4APP_JS_KEY=your_back4app_js_key
   BACK4APP_MASTER_KEY=your_back4app_master_key
   BACK4APP_SERVER_URL=https://parseapi.back4app.com/
   ADMIN_USERNAME=admin
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=secure_password
   ```

2. Create the admin user:
   ```bash
   npm run create-admin
   ```

3. Configure Back4App permissions:
   - Log into your Back4App Dashboard
   - For each class (Student, Teacher, Course, etc.):
     - Go to Database > Browser > [Class Name]
     - Click the Settings (gear) icon
     - Select "Class Level Permissions"
     - Add the "Admin" role to all permissions
     - Click "Save"

## Usage

1. Start the development server:
   ```bash
   node server.js
   ```

2. Open your browser and navigate to `http://localhost:8000`

3. Log in with the admin credentials you created

## Development

### Project Structure

```
schoolflow-hub/
├── js/                    # Modular JavaScript components
│   ├── dashboard.js       # Main dashboard coordinator
│   ├── studentManager.js  # Student management logic
│   ├── teacherManager.js  # Teacher management logic
│   ├── seasonManager.js   # Season management logic
│   └── utils.js           # Utility functions
├── tests/                 # Unit tests
├── scripts/               # Admin setup scripts
├── dist/                  # Built/bundled files
├── server.js             # Node.js HTTP server
├── loginPage.html        # Authentication page
├── login.js              # Login form handling
├── dashboard.html        # Main application interface
├── dashboard.css         # Dashboard styling
├── loginPage.css         # Login page styling
├── package.json          # Dependencies and scripts
└── README.md             # Project documentation
```

### Code Standards

- Use consistent indentation (2 spaces)
- Follow naming conventions (camelCase for variables/functions, PascalCase for classes)
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Building

Build for production:
```bash
npm run build
```

Build for development:
```bash
npm run build:dev
```

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the built files to your web server

3. Ensure your Back4App configuration is correct

## API Documentation

The application uses the Back4App Parse Server API. Refer to the [Parse JavaScript SDK documentation](https://docs.parseplatform.org/js/guide/) for detailed API information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.