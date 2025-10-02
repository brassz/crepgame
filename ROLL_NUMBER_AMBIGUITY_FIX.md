# Fix for "column reference roll_number is ambiguous" Error

## 🐛 Problem
The `record_dice_roll` function in Supabase was failing with the error:
```
column reference "roll_number" is ambiguous
```

This occurred because the function had both:
1. A local variable named `roll_number`
2. A column named `roll_number` in the `dice_rolls` table

PostgreSQL couldn't determine which `roll_number` was being referenced in the SQL query.

## ✅ Solution Applied

**File:** `database-setup.sql`  
**Lines:** 555-557

**Before (problematic code):**
```sql
-- Get next roll number
SELECT COALESCE(MAX(roll_number), 0) + 1 INTO roll_number
FROM public.dice_rolls
WHERE game_session_id = p_game_session_id;
```

**After (fixed code):**
```sql
-- Get next roll number
SELECT COALESCE(MAX(dr.roll_number), 0) + 1 INTO roll_number
FROM public.dice_rolls dr
WHERE dr.game_session_id = p_game_session_id;
```

## 🔧 Changes Made

1. **Added table alias**: `FROM public.dice_rolls dr`
2. **Qualified column reference**: `MAX(dr.roll_number)` instead of `MAX(roll_number)`
3. **Qualified WHERE clause**: `dr.game_session_id` for consistency

## 📋 How to Apply This Fix

### Option 1: Update via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Update the Function**
   ```sql
   CREATE OR REPLACE FUNCTION record_dice_roll(
       p_game_session_id UUID,
       p_die1 INTEGER,
       p_die2 INTEGER,
       p_phase TEXT,
       p_result TEXT DEFAULT NULL
   )
   RETURNS JSON
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
       game_session RECORD;
       roll_record RECORD;
       roll_number INTEGER;
   BEGIN
       -- Check if user is authenticated
       IF auth.uid() IS NULL THEN
           RETURN json_build_object('success', false, 'error', 'User not authenticated');
       END IF;

       -- Validate player is in this game session
       SELECT gs.*, gr.id as room_id INTO game_session
       FROM public.game_sessions gs
       JOIN public.game_rooms gr ON gr.id = gs.room_id
       JOIN public.player_sessions ps ON ps.room_id = gr.id
       WHERE gs.id = p_game_session_id 
       AND ps.player_id = auth.uid() 
       AND ps.is_active = true;

       IF NOT FOUND THEN
           RETURN json_build_object('success', false, 'error', 'Not authorized for this game session');
       END IF;

       -- Get next roll number (FIXED LINE)
       SELECT COALESCE(MAX(dr.roll_number), 0) + 1 INTO roll_number
       FROM public.dice_rolls dr
       WHERE dr.game_session_id = p_game_session_id;

       -- Record the roll
       INSERT INTO public.dice_rolls (
           game_session_id,
           shooter_id,
           die1,
           die2,
           roll_number,
           phase,
           result
       )
       VALUES (
           p_game_session_id,
           auth.uid(),
           p_die1,
           p_die2,
           roll_number,
           p_phase,
           p_result
       )
       RETURNING * INTO roll_record;

       -- Update game session with latest roll
       UPDATE public.game_sessions
       SET dice_result = json_build_object(
               'die1', p_die1,
               'die2', p_die2,
               'total', p_die1 + p_die2,
               'timestamp', NOW()
           ),
           updated_at = NOW()
       WHERE id = p_game_session_id;

       -- Log roll event
       INSERT INTO public.game_events (room_id, game_session_id, event_type, event_data, created_by)
       VALUES (
           game_session.room_id,
           p_game_session_id,
           'dice_rolled',
           json_build_object(
               'die1', p_die1,
               'die2', p_die2,
               'total', p_die1 + p_die2,
               'roll_number', roll_number,
               'phase', p_phase,
               'result', p_result,
               'shooter_id', auth.uid()
           ),
           auth.uid()
       );

       RETURN json_build_object(
           'success', true,
           'roll', json_build_object(
               'id', roll_record.id,
               'die1', p_die1,
               'die2', p_die2,
               'total', p_die1 + p_die2,
               'roll_number', roll_number
           )
       );
   END;
   $$;
   ```

3. **Click RUN** to execute the updated function

### Option 2: Re-run Complete Database Setup

1. **Open Supabase Dashboard → SQL Editor**
2. **Run the entire updated `database-setup.sql`** file
   - This will recreate all functions with the fix applied

## 🧪 Testing the Fix

After applying the fix, test it by:

1. **Start your game server**: `npm run dev`
2. **Open the game**: `http://localhost:3000`
3. **Join a room and roll dice**
4. **Check browser console** - the error should be gone
5. **Verify in Supabase**: Check that dice rolls are being recorded in the `dice_rolls` table

## 🎯 Expected Result

- ✅ Dice rolls should be recorded successfully
- ✅ No more "ambiguous column" errors in console
- ✅ `roll_number` should increment properly (1, 2, 3, etc.)
- ✅ Game should continue normally

## 📝 Technical Details

**Root Cause**: PostgreSQL requires explicit qualification when column names match variable names in the same scope.

**Best Practice**: Always use table aliases in complex queries to avoid ambiguity, especially in stored procedures/functions.

**Impact**: This fix resolves the dice rolling functionality without affecting any other game features.