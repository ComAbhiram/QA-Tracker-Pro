-- Fix leave_type constraint to include WFH and other new types
DO $$ 
BEGIN
    -- Drop the existing constraint
    ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_leave_type_check;

    -- Add the new constraint with all values from the UI
    ALTER TABLE leaves ADD CONSTRAINT leaves_leave_type_check CHECK (leave_type IN (
        'Full Day Casual Leave',
        'Full Day Sick Leave',
        'Unplanned Leave',
        'Half Day Morning Session Casual Leave',
        'Half Day Morning Session Sick Leave',
        'Half Day Afternoon Session Casual Leave',
        'Half Day Afternoon Session Sick Leave',
        'WFH',
        'Half Day WFH Morning session',
        'Half Day WFH Afternoon session'
    ));
END $$;
