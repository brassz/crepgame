# Foreign Key Constraint Fix - Profiles Table

## Issue
The application was encountering a foreign key constraint violation error:
```
ERROR: 23503: insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"
DETAIL: Key (id)=(00000000-0000-0000-0000-000000000000) is not present in table "users".
```

## Root Cause
1. **Test Profile Insert**: The `database-setup.sql` file included a hardcoded test profile insert with UUID `00000000-0000-0000-0000-000000000000` that doesn't exist in the `auth.users` table.
2. **Missing User Validation**: The `ensureProfile` function in `profile.js` attempted to create profiles without validating if the user exists in the authentication system.
3. **No Automatic Profile Creation**: There was no mechanism to automatically create profiles when users sign up.
4. **Missing Auth Checks**: Database functions didn't validate if users were properly authenticated before performing operations.

## Fixes Applied

### 1. Database Schema Fixes (`database-setup.sql`)

#### Removed Invalid Test Profile
- Commented out the problematic test profile insert
- Added clear documentation about why it's commented out

#### Added Automatic Profile Creation
- Created `handle_new_user()` function to automatically create profiles when users sign up
- Added trigger `create_profile_on_signup` that fires when new users are created in `auth.users`
- This ensures profiles are always created with valid foreign key references

#### Enhanced Database Functions
- Added authentication validation (`auth.uid() IS NULL`) to all database functions:
  - `join_room()`
  - `leave_room()` 
  - `place_bet()`
  - `record_dice_roll()`

### 2. Client-Side Fixes (`profile.js`)

#### Enhanced Profile Validation
- Added validation to reject null or invalid user IDs
- Specifically blocks the problematic UUID `00000000-0000-0000-0000-000000000000`
- Added user existence verification before creating profiles
- Better error handling for foreign key constraint violations

#### Improved Error Messages
- Clear error messages when user ID is invalid
- Specific handling of foreign key constraint errors (23503)
- Fallback mechanisms when admin API is not available

### 3. UI Improvements (`index.html`)

#### Better Error Handling
- Added comprehensive error logging for profile loading
- Clear console messages for debugging authentication issues
- Graceful fallbacks to default balance when profile loading fails

## How the Fix Works

### New User Registration Flow
1. User signs up through Supabase Auth
2. `create_profile_on_signup` trigger automatically fires
3. `handle_new_user()` function creates profile with:
   - User's actual ID from `auth.users`
   - Email from authentication
   - Username derived from email or metadata
   - Default balance of 1000.00

### Existing User Flow
1. `ensureProfile()` validates user ID
2. Checks if profile exists
3. If not, verifies user exists in auth system first
4. Only creates profile if user is valid
5. Returns clear error if user doesn't exist

### Database Function Protection
- All functions now check `auth.uid() IS NULL` first
- Return structured error messages instead of SQL errors
- Prevents operations with invalid/null user references

## Testing the Fix

### Verify Database Setup
```sql
-- Check that automatic profile creation works
SELECT 'Setup complete!' as status, count(*) as rooms_created FROM public.game_rooms;

-- Verify trigger is installed
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'create_profile_on_signup';
```

### Test Profile Creation
1. Register new user through the application
2. Profile should be automatically created
3. Check profiles table for the new entry
4. Verify foreign key reference is valid

### Test Error Handling
1. Try operations without authentication
2. Should receive "User not authenticated" errors
3. Check browser console for clear error messages

## Prevention Measures

### For Developers
1. **Never hardcode UUIDs** in database inserts that reference `auth.users`
2. **Always validate authentication** before database operations
3. **Use triggers** for automatic profile creation instead of client-side logic
4. **Test with real authenticated users** rather than fake UUIDs

### For Database Changes
1. All new tables with foreign keys to `auth.users` should have automatic row creation triggers
2. Test foreign key constraints thoroughly before deployment
3. Use Row Level Security policies that check `auth.uid()`

## Files Modified
- `database-setup.sql` - Fixed test profile, added triggers and validation
- `game/js/profile.js` - Enhanced validation and error handling  
- `game/index.html` - Improved error logging and user feedback
- `FOREIGN_KEY_FIX.md` - This documentation

## Next Steps
1. Deploy the updated `database-setup.sql` to your Supabase instance
2. Test user registration and profile creation
3. Monitor for any remaining foreign key issues
4. Consider adding more comprehensive logging for production debugging