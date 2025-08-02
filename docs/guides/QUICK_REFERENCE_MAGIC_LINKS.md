# Quick Reference: Magic Link Authentication

## 🚀 The Fix in 30 Seconds
- User creation now generates secure tokens
- Invitation emails contain magic links that bypass Google auth
- Users click link → Auto sign-in → Dashboard/Onboarding

## 🔗 Magic Link Format
```
https://yourdomain.com/api/invitation?token={64-character-hex-token}
```

## 🛠️ Utility Scripts

### Generate Magic Link for Existing User
```bash
node scripts/generate-magic-link-for-user.js
# Interactive prompt for email
# Shows user details
# Generates new token or reuses existing
```

## 📊 Database Queries

### Find Users with Pending Invitations
```sql
SELECT email, invitationTokenExpires 
FROM User 
WHERE invitationToken IS NOT NULL 
ORDER BY invitationTokenExpires DESC;
```

### Check If User Has Token
```sql
SELECT invitationToken IS NOT NULL as has_token 
FROM User 
WHERE email = 'user@example.com';
```

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Still see Google auth | Clear cookies, check URL has `/api/invitation?token=` |
| Token invalid error | Token used or expired - generate new one |
| User not found | Check exact email match (case-sensitive) |
| Wrong redirect | Check user role and onboardingCompleted status |

## 📝 Testing Checklist
- [ ] Create new user → Check invitationToken in DB
- [ ] Email contains `/api/invitation?token=...` URL
- [ ] Click link → Auto login (no Google)
- [ ] Dealership users → Onboarding page
- [ ] Other users → Dashboard
- [ ] Token cleared after use
- [ ] Can't reuse same link

## 🔐 Security Notes
- Tokens: 32 bytes, cryptographically secure
- Expiry: 7 days
- Usage: One-time only
- Sessions: 30 days after magic link login