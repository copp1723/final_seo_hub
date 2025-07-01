# Gap Analysis - Enhanced Task Visibility

## Feature: Enhanced Task Visibility - More prominent task management interface

### Current State Analysis

The current task management interface has the following characteristics:

1. **Dashboard Page**:
   - Shows basic stats: Active Requests, Tasks Completed, Total Requests
   - Package usage progress bars (Pages, Blogs, GBP Posts, Improvements)
   - Quick actions for navigation

2. **Requests Page**:
   - Lists requests as cards with basic information
   - Shows progress bars within each request card
   - Has filtering and search capabilities
   - Displays completed tasks in a compact list

3. **Current Issues**:
   - Tasks are buried within request cards, not immediately visible
   - No dedicated task view or management interface
   - Completed tasks are shown as a small list at the bottom of each card
   - No way to see all tasks across all requests in one view
   - Limited task details (only title and URL for completed tasks)
   - No task-specific status tracking beyond completed/not completed

### Proposed Enhancements

1. **Dedicated Tasks View**:
   - Create a new `/tasks` route with a comprehensive task management interface
   - Show all tasks across all requests in a unified view
   - Include both pending and completed tasks

2. **Enhanced Task Cards**:
   - Create prominent task cards with:
     - Task type icon and color coding
     - Status badge (Pending, In Progress, Completed)
     - Priority indicator
     - Due date or timeline
     - Associated request information
     - Quick actions (Mark Complete, View Details, etc.)

3. **Task Dashboard Widget**:
   - Add a "Recent Tasks" or "Priority Tasks" widget to the dashboard
   - Show upcoming and overdue tasks prominently
   - Quick access to mark tasks complete

4. **Enhanced Request Cards**:
   - Make the task section more prominent within request cards
   - Show individual tasks with status instead of just progress bars
   - Add task quick actions directly in the request view

5. **Task Status Workflow**:
   - Implement proper task status: Pending → In Progress → Completed
   - Add ability to update task status
   - Track when tasks were started and completed

6. **Visual Improvements**:
   - Use color coding for task types (blue for pages, green for blogs, etc.)
   - Add visual priority indicators
   - Implement task completion animations
   - Add progress rings or charts for better visualization

### Implementation Plan

#### Phase 1: Database Schema Updates
- Add a `tasks` table to properly track individual tasks
- Include fields for: status, priority, due_date, started_at, completed_at
- Link tasks to requests and users

#### Phase 2: API Endpoints
- Create CRUD endpoints for tasks
- Add task status update endpoints
- Create aggregation endpoints for task statistics

#### Phase 3: UI Components
- Create TaskCard component with enhanced visibility
- Build TaskList component with filtering/sorting
- Develop TaskStatusBadge and TaskPriorityIndicator components

#### Phase 4: Pages and Integration
- Create dedicated /tasks page
- Add task widgets to dashboard
- Enhance request cards with better task visibility
- Implement real-time updates for task status changes

### Success Metrics
- Users can see all their tasks at a glance
- Task completion rate increases due to better visibility
- Reduced time to find and update task status
- Improved user satisfaction with task management workflow