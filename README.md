# SchoolFlow Hub

SchoolFlow Hub is a comprehensive school management system designed to streamline administrative tasks, enhance communication between staff, students, and parents, and provide insightful analytics for better decision-making.

## Features

- Student Management
- Teacher Management
- Course Management
- Attendance Tracking
- Exam Records Management
- Graduation Eligibility Checking
- Reporting and Analytics
- Dark Mode Support

## Technologies Used

- HTML5, CSS3, JavaScript (ES6+)
- Parse SDK for Backend-as-a-Service
- Webpack for module bundling
- Jest for testing

## Setup Instructions

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/SchoolFlow-Hub.git
   ```

2. Navigate to the project directory:
   ```
   cd SchoolFlow-Hub
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory with your Parse Server configuration:
   ```
   PARSE_APP_ID=your_app_id
   PARSE_JS_KEY=your_javascript_key
   PARSE_SERVER_URL=https://parseapi.back4app.com/
   ```

### Building the Project

To build the project for production:
```
npm run build
```

This will create a `dist` folder with the bundled JavaScript file.

### Running Tests

To run the test suite:
```
npm test
```

### Development

For development, you can use a local server to serve the files. One option is to use `http-server`:
```
npx http-server
```

Then open your browser to the provided URL (usually http://localhost:8080).

## Usage

1. Open `loginPage.html` in your browser to access the login page
2. Log in with your credentials
3. Navigate through the dashboard to manage students, teachers, courses, attendance, and exams
4. Use the reporting features to generate insights about student performance

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For support or inquiries, please contact the project team at [your-email@example.com].