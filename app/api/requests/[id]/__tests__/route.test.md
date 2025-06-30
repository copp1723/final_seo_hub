# Test Cases for app/api/requests/[id]/route.ts

This document outlines test cases for the API endpoint responsible for updating and retrieving request details. These tests would typically be implemented using a framework like Jest along with `supertest` for making HTTP requests in a Node.js environment, or Next.js specific server testing utilities.

The mock database used in `route.ts` should be configured or spied upon to verify interactions and returned data.

## PUT /api/requests/[id]

**Context: Status Updates**

1.  **Valid Status Update**:
    *   Request: `PUT /api/requests/existing-request-id` with body `{ "status": "IN_PROGRESS" }`
    *   Expected Response: Status 200, JSON body includes `{ "message": "Request status updated to IN_PROGRESS.", "request": { ..., "status": "IN_PROGRESS" } }`
    *   DB Check: `db.request.update` called with correct ID and status.

2.  **Invalid Status Value**:
    *   Request: `PUT /api/requests/existing-request-id` with body `{ "status": "INVALID_STATUS_XYZ" }`
    *   Expected Response: Status 400, JSON body includes `{ "error": "Invalid status value" }`
    *   DB Check: `db.request.update` not called.

3.  **Request Not Found for Status Update**:
    *   Request: `PUT /api/requests/non-existent-id` with body `{ "status": "OPEN" }`
    *   Expected Response: Status 404, JSON body includes `{ "error": "Request not found" }`

4.  **Setting Status to DONE records completionDate**:
    *   Request: `PUT /api/requests/existing-request-id` (assuming current status is not DONE) with body `{ "status": "DONE" }`
    *   Expected Response: Status 200, JSON body `request` object contains a `completionDate` (ISO string).
    *   DB Check: `db.request.update` called with data including a `completionDate`.

**Context: Task Completion**

5.  **Valid Task Completion**:
    *   Pre-condition: Request `existing-request-id` has status `IN_PROGRESS`.
    *   Request: `PUT /api/requests/existing-request-id` with body `{ "taskDetails": { "title": "New Task Done", "url": "http://example.com", "notes": "Detailed notes" } }`
    *   Expected Response: Status 200, JSON body includes `{ "message": "Task marked as complete.", "request": { ..., "completedTasks": [...], "completedTaskCount": (previousCount + 1) } }`. The `completedTasks` array should contain the new task with a `completedAt` timestamp.
    *   DB Check: `db.request.update` called with `completedTasks` array updated and `completedTaskCount` incremented.

6.  **Task Completion - Title is Required**:
    *   Pre-condition: Request `existing-request-id` has status `IN_PROGRESS`.
    *   Request: `PUT /api/requests/existing-request-id` with body `{ "taskDetails": { "url": "http://example.com" } }` (missing title)
    *   Expected Response: Status 400, JSON body includes `{ "error": "Task title is required for completion" }`

7.  **Task Completion - Request Not IN_PROGRESS**:
    *   Pre-condition: Request `existing-request-id` has status `OPEN`.
    *   Request: `PUT /api/requests/existing-request-id` with body `{ "taskDetails": { "title": "New Task" } }`
    *   Expected Response: Status 400, JSON body includes `{ "error": "Tasks can only be completed if the request is IN_PROGRESS" }`

8.  **Task Completion - Request Not Found**:
    *   Request: `PUT /api/requests/non-existent-id` with body `{ "taskDetails": { "title": "New Task" } }`
    *   Expected Response: Status 404, JSON body includes `{ "error": "Request not found" }`

**Context: General / Edge Cases**

9.  **Invalid JSON Payload**:
    *   Request: `PUT /api/requests/existing-request-id` with body `{"invalid json`
    *   Expected Response: Status 400, JSON body includes `{ "error": "Invalid JSON payload" }`

10. **No Update Data Provided**:
    *   Request: `PUT /api/requests/existing-request-id` with body `{}` (empty JSON)
    *   Expected Response: Status 200, JSON body includes `{ "message": "No update performed. Provide status or taskDetails." }`

11. **Simultaneous Status Update and Task Completion**:
    *   Pre-condition: Request `existing-request-id` has status `IN_PROGRESS`.
    *   Request: `PUT /api/requests/existing-request-id` with body `{ "status": "IN_PROGRESS", "taskDetails": { "title": "Another Task" } }`
    *   Expected Response: Status 200, JSON body includes a message like "Request status updated to IN_PROGRESS. Task marked as complete." and the request object reflects both changes.
    *   DB Check: `db.request.update` called with data reflecting both status (even if same) and new task details.

## GET /api/requests/[id]

1.  **Fetch Existing Request**:
    *   Request: `GET /api/requests/existing-request-id`
    *   Expected Response: Status 200, JSON body is the request object from the mock DB.

2.  **Fetch Non-Existent Request**:
    *   Request: `GET /api/requests/non-existent-id`
    *   Expected Response: Status 404, JSON body includes `{ "error": "Request not found" }`

3.  **Request ID Not Provided in Path (Conceptual - framework usually handles this routing)**:
    *   Request: `GET /api/requests/` (or however the framework routes if ID is missing but expected)
    *   Expected Response: Typically a 404 from the routing system itself, or a 400 if the handler is reached and ID is undefined. The current code has `if (!id) { return NextResponse.json({ error: 'Request ID is required' }, { status: 400 }); }` which would cover cases where params.id is missing.

---

These test cases provide a good starting point for ensuring the reliability of the API endpoint.
Remember to mock any external dependencies, like the database, appropriately.
The `existing-request-id` should correspond to an ID that the mock `db.request.findUnique` will return a valid object for.
The `non-existent-id` should be an ID for which `db.request.findUnique` returns `null`.
