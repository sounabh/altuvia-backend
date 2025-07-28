# Program Management API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📚 Program Routes

### 1. Get All Programs
**GET** `/programs`

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Number of items per page
- `universityId` (string) - Filter by university ID
- `departmentId` (string) - Filter by department ID
- `degreeType` (string) - Filter by degree type (Bachelor, Master, PhD)
- `programLength` (number) - Filter by program length in years
- `minTuition` (number) - Minimum tuition fee
- `maxTuition` (number) - Maximum tuition fee
- `minScore` (number) - Minimum entrance score
- `maxScore` (number) - Maximum entrance score
- `search` (string) - Search in program name, description, or specializations
- `sortBy` (string, default: 'programName') - Sort field
- `sortOrder` (string, default: 'asc') - Sort order (asc/desc)

**Example Request:**
```bash
GET /api/programs?page=1&limit=5&degreeType=Master&search=computer&sortBy=programName
```

**Expected Response:**
```json
{
  "programs": [
    {
      "id": "prog-123",
      "programName": "Master of Computer Science",
      "programSlug": "master-computer-science",
      "degreeType": "Master",
      "programLength": 2,
      "specializations": ["AI", "Data Science", "Software Engineering"],
      "programDescription": "Advanced computer science program...",
      "averageEntranceScore": 85.5,
      "programTuitionFees": 25000,
      "programAdditionalFees": 2000,
      "isActive": true,
      "university": {
        "name": "Tech University",
        "slug": "tech-university"
      },
      "department": {
        "name": "Computer Science",
        "slug": "computer-science"
      },
      "rankings": [
        {
          "year": 2024,
          "rank": 15,
          "source": "QS World Rankings"
        }
      ],
      "_count": {
        "externalLinks": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "pages": 5
  }
}
```

### 2. Get Program by ID
**GET** `/programs/:id`

**Example Request:**
```bash
GET /api/programs/prog-123
```

**Expected Response:**
```json
{
  "id": "prog-123",
  "programName": "Master of Computer Science",
  "programSlug": "master-computer-science",
  "degreeType": "Master",
  "programLength": 2,
  "specializations": ["AI", "Data Science", "Software Engineering"],
  "programDescription": "Advanced computer science program focusing on cutting-edge technologies...",
  "curriculumOverview": "The curriculum includes advanced algorithms, machine learning, distributed systems...",
  "admissionRequirements": "Bachelor's degree in Computer Science or related field, GPA 3.0+...",
  "averageEntranceScore": 85.5,
  "programTuitionFees": 25000,
  "programAdditionalFees": 2000,
  "programMetaTitle": "Master of Computer Science - Tech University",
  "programMetaDescription": "Join our world-class CS program...",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-20T14:30:00Z",
  "university": {
    "id": "univ-456",
    "name": "Tech University",
    "slug": "tech-university"
  },
  "department": {
    "id": "dept-789",
    "name": "Computer Science",
    "slug": "computer-science"
  },
  "syllabus": {
    "fileUrl": "https://example.com/syllabus.pdf",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "rankings": [
    {
      "id": "rank-001",
      "year": 2024,
      "rank": 15,
      "source": "QS World Rankings"
    }
  ],
  "externalLinks": [
    {
      "id": "link-001",
      "title": "Program Homepage",
      "url": "https://techuniv.edu/cs-masters"
    }
  ]
}
```

### 3. Create Program
**POST** `/programs`

**Request Body:**
```json
{
  "universityId": "univ-456",
  "departmentId": "dept-789",
  "programName": "Master of Computer Science",
  "programSlug": "master-computer-science",
  "degreeType": "Master",
  "programLength": 2,
  "specializations": ["AI", "Data Science", "Software Engineering"],
  "programDescription": "Advanced computer science program focusing on cutting-edge technologies...",
  "curriculumOverview": "The curriculum includes advanced algorithms, machine learning...",
  "admissionRequirements": "Bachelor's degree in Computer Science or related field...",
  "averageEntranceScore": 85.5,
  "programTuitionFees": 25000,
  "programAdditionalFees": 2000,
  "programMetaTitle": "Master of Computer Science - Tech University",
  "programMetaDescription": "Join our world-class CS program..."
}
```

**Expected Response:**
```json
{
  "id": "prog-123",
  "programName": "Master of Computer Science",
  "programSlug": "master-computer-science",
  "degreeType": "Master",
  "programLength": 2,
  "specializations": ["AI", "Data Science", "Software Engineering"],
  "programDescription": "Advanced computer science program...",
  "curriculumOverview": "The curriculum includes...",
  "admissionRequirements": "Bachelor's degree in...",
  "averageEntranceScore": 85.5,
  "programTuitionFees": 25000,
  "programAdditionalFees": 2000,
  "programMetaTitle": "Master of Computer Science - Tech University",
  "programMetaDescription": "Join our world-class CS program...",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "university": {
    "name": "Tech University"
  },
  "department": {
    "name": "Computer Science"
  }
}
```

### 4. Update Program
**PUT** `/programs/:id`

**Request Body:**
```json
{
  "programName": "Master of Computer Science (Updated)",
  "programDescription": "Updated description...",
  "programTuitionFees": 27000
}
```

**Expected Response:**
```json
{
  "id": "prog-123",
  "programName": "Master of Computer Science (Updated)",
  "programDescription": "Updated description...",
  "programTuitionFees": 27000,
  "updatedAt": "2024-01-20T14:30:00Z",
  "university": {
    "name": "Tech University"
  },
  "department": {
    "name": "Computer Science"
  }
}
```

### 5. Delete Program
**DELETE** `/programs/:id`

**Expected Response:**
```json
{
  "message": "Program deleted successfully"
}
```

---

## 🏢 Department Routes

### 1. Get All Departments
**GET** `/programs/departments`

**Query Parameters:**
- `universityId` (string) - Filter by university ID
- `search` (string) - Search in department name

**Example Request:**
```bash
GET /api/programs/departments?universityId=univ-456&search=computer
```

**Expected Response:**
```json
[
  {
    "id": "dept-789",
    "name": "Computer Science",
    "slug": "computer-science",
    "universityId": "univ-456",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "university": {
      "name": "Tech University"
    },
    "_count": {
      "programs": 5
    }
  }
]
```

### 2. Get Department by ID
**GET** `/programs/departments/:id`

**Expected Response:**
```json
{
  "id": "dept-789",
  "name": "Computer Science",
  "slug": "computer-science",
  "universityId": "univ-456",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "university": {
    "id": "univ-456",
    "name": "Tech University"
  },
  "programs": [
    {
      "id": "prog-123",
      "programName": "Master of Computer Science",
      "programSlug": "master-computer-science",
      "degreeType": "Master",
      "isActive": true
    }
  ]
}
```

### 3. Create Department
**POST** `/programs/departments`

**Request Body:**
```json
{
  "universityId": "univ-456",
  "name": "Computer Science",
  "slug": "computer-science"
}
```

**Expected Response:**
```json
{
  "id": "dept-789",
  "name": "Computer Science",
  "slug": "computer-science",
  "universityId": "univ-456",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "university": {
    "name": "Tech University"
  }
}
```

### 4. Update Department
**PUT** `/programs/departments/:id`

**Request Body:**
```json
{
  "name": "Computer Science & Engineering"
}
```

### 5. Delete Department
**DELETE** `/programs/departments/:id`

**Expected Response:**
```json
{
  "message": "Department deleted successfully"
}
```

---

## 📄 Syllabus Routes

### 1. Upload Syllabus
**POST** `/programs/:id/syllabus`

**Request Body:**
```json
{
  "fileUrl": "https://example.com/syllabus.pdf"
}
```

**Expected Response:**
```json
{
  "programId": "prog-123",
  "fileUrl": "https://example.com/syllabus.pdf",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### 2. Get Syllabus
**GET** `/programs/:id/syllabus`

**Expected Response:**
```json
{
  "programId": "prog-123",
  "fileUrl": "https://example.com/syllabus.pdf",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### 3. Delete Syllabus
**DELETE** `/programs/:id/syllabus`

**Expected Response:**
```json
{
  "message": "Syllabus deleted successfully"
}
```

---

## 📊 Rankings Routes

### 1. Add Ranking
**POST** `/programs/:id/rankings`

**Request Body:**
```json
{
  "year": 2024,
  "rank": 15,
  "source": "QS World Rankings"
}
```

**Expected Response:**
```json
{
  "id": "rank-001",
  "programId": "prog-123",
  "year": 2024,
  "rank": 15,
  "source": "QS World Rankings",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### 2. Get Rankings
**GET** `/programs/:id/rankings`

**Expected Response:**
```json
[
  {
    "id": "rank-001",
    "programId": "prog-123",
    "year": 2024,
    "rank": 15,
    "source": "QS World Rankings",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

### 3. Update Ranking
**PUT** `/programs/rankings/:rankingId`

**Request Body:**
```json
{
  "rank": 12,
  "source": "QS World Rankings 2024"
}
```

### 4. Delete Ranking
**DELETE** `/programs/rankings/:rankingId`

**Expected Response:**
```json
{
  "message": "Ranking deleted successfully"
}
```

---

## 🔗 External Links Routes

### 1. Add External Link
**POST** `/programs/:id/links`

**Request Body:**
```json
{
  "title": "Program Homepage",
  "url": "https://techuniv.edu/cs-masters"
}
```

**Expected Response:**
```json
{
  "id": "link-001",
  "programId": "prog-123",
  "title": "Program Homepage",
  "url": "https://techuniv.edu/cs-masters",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### 2. Get External Links
**GET** `/programs/:id/links`

**Expected Response:**
```json
[
  {
    "id": "link-001",
    "programId": "prog-123",
    "title": "Program Homepage",
    "url": "https://techuniv.edu/cs-masters",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

### 3. Update External Link
**PUT** `/programs/links/:linkId`

**Request Body:**
```json
{
  "title": "Updated Program Homepage",
  "url": "https://techuniv.edu/masters/computer-science"
}
```

### 4. Delete External Link
**DELETE** `/programs/links/:linkId`

**Expected Response:**
```json
{
  "message": "External link deleted successfully"
}
```

---

## 📋 Testing with Postman/cURL

### Example cURL Commands

**1. Get All Programs:**
```bash
curl -X GET "http://localhost:5000/api/programs?page=1&limit=5" \
  -H "Authorization: Bearer your-jwt-token"
```

**2. Create a Program:**
```bash
curl -X POST "http://localhost:5000/api/programs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "universityId": "univ-456",
    "departmentId": "dept-789",
    "programName": "Master of Computer Science",
    "programSlug": "master-computer-science",
    "degreeType": "Master",
    "programLength": 2,
    "specializations": ["AI", "Data Science"],
    "programDescription": "Advanced CS program...",
    "averageEntranceScore": 85.5,
    "programTuitionFees": 25000
  }'
```

**3. Add Ranking:**
```bash
curl -X POST "http://localhost:5000/api/programs/prog-123/rankings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "year": 2024,
    "rank": 15,
    "source": "QS World Rankings"
  }'
```

---

## 🚨 Error Responses

### Common Error Codes:
- `400` - Bad Request (validation errors, duplicate entries)
- `404` - Not Found (resource doesn't exist)
- `401` - Unauthorized (invalid/missing token)
- `500` - Internal Server Error

### Error Response Format:
```json
{
  "error": "Program not found",
  "message": "The requested program was not found"
}
```

---

## 📝 Notes

1. **Pagination**: Most list endpoints support pagination with `page` and `limit` parameters
2. **Search**: Text search is case-insensitive and searches across multiple fields
3. **Filtering**: Multiple filters can be combined in a single request
4. **Sorting**: Results can be sorted by any valid field
5. **Relationships**: Related data is included using Prisma's `include` feature
6. **Validation**: Request bodies are validated against the database schema
7. **Error Handling**: Comprehensive error handling with specific error codes and messages

---

## 🔄 Database Schema Relations

```
University (1) -> (Many) Department
Department (1) -> (Many) Program
Program (1) -> (1) Syllabus
Program (1) -> (Many) ProgramRanking
Program (1) -> (Many) ExternalLink
```

This API provides complete CRUD operations for managing educational programs, departments, syllabi, rankings, and external links with proper authentication and validation.