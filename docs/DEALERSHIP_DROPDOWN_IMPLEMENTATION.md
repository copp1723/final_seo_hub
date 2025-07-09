# Dealership Selection Dropdown Implementation

## Overview
This document outlines the implementation of the multi-dealership dropdown navigation UI that allows users to switch between dealerships within their agency.

## Files Created/Modified

### 1. API Endpoint: `/app/api/dealerships/switch/route.ts`
- **GET endpoint**: Retrieves current dealership and available dealerships for the user
- **POST endpoint**: Switches user's active dealership
- **Security**: Validates user access to dealerships within their agency
- **Response**: Returns current and available dealerships

### 2. Component: `/components/layout/dealership-selector.tsx`
- **Dropdown UI**: Modern dropdown with building icon and dealership names
- **State Management**: Handles loading, switching, and error states
- **Session Integration**: Uses NextAuth session to track current dealership
- **Responsive**: Works on both desktop and mobile
- **UX Features**: 
  - Loading spinner during operations
  - Current dealership highlighted with checkmark
  - Optimistic updates with page refresh
  - Click outside to close

### 3. Navigation Integration: `/components/layout/navigation.tsx`
- **Desktop**: Added to navigation bar between main nav and user menu
- **Mobile**: Added as separate section in mobile menu
- **Conditional Rendering**: Only shows if user has access to multiple dealerships

## Technical Features

### Authentication & Authorization
- Validates user session and agency membership
- Ensures users can only switch to dealerships within their agency
- Updates user's `dealershipId` in database when switching

### Session Management
- Uses NextAuth's `update()` function to refresh session
- Triggers page refresh to update all dealership-specific data
- Maintains session state across page reloads

### User Experience
- Shows current dealership prominently
- Smooth loading states during API calls
- Error handling with user-friendly messages
- Responsive design for all screen sizes

### Database Integration
- Queries agency dealerships through Prisma
- Updates user's active dealership on switch
- Validates dealership ownership before allowing switch

## Usage

### For Users
1. **View Current Dealership**: The dropdown shows the currently selected dealership
2. **Switch Dealership**: Click dropdown to see available dealerships and select a new one
3. **Automatic Updates**: Page refreshes to show data for the newly selected dealership

### For Developers
1. **Session Access**: Current dealership ID available in `session.user.dealershipId`
2. **API Integration**: Use `/api/dealerships/switch` for programmatic switching
3. **Component Reuse**: `DealershipSelector` can be used in other parts of the app

## API Endpoints

### GET `/api/dealerships/switch`
```json
{
  "currentDealership": {
    "id": "dealership-id",
    "name": "Dealership Name"
  },
  "availableDealerships": [
    {
      "id": "dealership-1",
      "name": "Dealership 1"
    },
    {
      "id": "dealership-2", 
      "name": "Dealership 2"
    }
  ]
}
```

### POST `/api/dealerships/switch`
```json
// Request
{
  "dealershipId": "new-dealership-id"
}

// Response
{
  "success": true,
  "dealership": {
    "id": "new-dealership-id",
    "name": "New Dealership Name"
  }
}
```

## Security Considerations
- All endpoints require authentication
- Users can only access dealerships within their agency
- Database constraints prevent unauthorized dealership access
- Session validation on every request

## Testing Notes
- Test with users who have access to multiple dealerships
- Verify session updates correctly
- Check responsive behavior on mobile devices
- Validate error handling with network issues

## Future Enhancements
- Add dealership logos/branding to dropdown
- Implement search/filter for agencies with many dealerships
- Add recent dealerships for quick switching
- Cache dealership list for performance