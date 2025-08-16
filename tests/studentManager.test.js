// tests/studentManager.test.js

// Mock the Parse library
jest.mock('parse/node', () => {
    return {
        User: jest.fn(),
        Query: jest.fn().mockImplementation(() => {
            return {
                equalTo: jest.fn().mockReturnThis(),
                first: jest.fn(),
            };
        }),
        Object: {
            extend: jest.fn().mockReturnValue(jest.fn()),
        },
    };
});

// Mock environment variables
process.env.BACK4APP_APP_ID = 'test-app-id';
process.env.BACK4APP_JS_KEY = 'test-js-key';
process.env.BACK4APP_MASTER_KEY = 'test-master-key';
process.env.BACK4APP_SERVER_URL = 'https://parseapi.back4app.com/';
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'testpassword';
process.env.ADMIN_EMAIL = 'admin@test.com';

// Import our module
const StudentManager = require('../js/studentManager');

describe('StudentManager', () => {
    let studentManager;

    beforeEach(() => {
        studentManager = new StudentManager();
    });

    describe('getStudentsBySeason', () => {
        it('should filter students by season ID', () => {
            // Create mock student data (plain JavaScript objects, not Parse objects)
            const mockStudents = [
                { 
                    id: '1', 
                    seasonId: 1,
                    isActive: true,
                    name: 'Student 1'
                },
                { 
                    id: '2', 
                    seasonId: 2,
                    isActive: true,
                    name: 'Student 2'
                },
                { 
                    id: '3', 
                    seasonId: 1,
                    isActive: true,
                    name: 'Student 3'
                }
            ];

            // Set the students in the manager
            studentManager.setStudents(mockStudents);

            // Test filtering by season 1
            const seasonOneStudents = studentManager.getStudentsBySeason(1);
            
            expect(seasonOneStudents).toHaveLength(2);
            expect(seasonOneStudents[0].id).toBe('1');
            expect(seasonOneStudents[1].id).toBe('3');
        });

        it('should handle students with no season ID', () => {
            const mockStudents = [
                { 
                    id: '1', 
                    seasonId: null,
                    isActive: true,
                    name: 'Student 1'
                }
            ];

            studentManager.setStudents(mockStudents);
            
            // Students with no season ID should be included if they are active
            const result = studentManager.getStudentsBySeason(1);
            expect(result).toHaveLength(1);
        });
    });

    describe('resetStudentForm', () => {
        it('should reset the student form elements', () => {
            // Mock DOM elements
            document.body.innerHTML = `
                <form id="addStudentForm">
                    <input id="studentName" value="Test Student">
                    <input id="studentID" value="12345">
                    <h3 id="student-form-heading">Edit Student</h3>
                    <button id="saveStudentBtn">Update Student</button>
                    <button id="cancelStudentBtn" style="display: inline-block">Cancel</button>
                </form>
            `;

            studentManager.resetStudentForm();

            // Check that form is reset
            const form = document.getElementById('addStudentForm');
            expect(form.hasAttribute('data-editing-id')).toBe(false);
            
            // Check that form heading is reset
            expect(document.getElementById('student-form-heading').textContent).toBe('Add New Student');
            
            // Check that button text is reset
            expect(document.getElementById('saveStudentBtn').textContent).toBe('Save Student');
            
            // Check that cancel button is hidden
            expect(document.getElementById('cancelStudentBtn').style.display).toBe('none');
        });
    });
});