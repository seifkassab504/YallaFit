-- Exercise Catalog Seed Data
-- Comprehensive, curated starter set across chest, back, shoulders, arms, legs, and core.

INSERT INTO public.exercise_catalog (id, name, primary_muscle, secondary_muscles, movement_pattern, equipment, difficulty, instructions, contraindications)
VALUES
    -- CHEST / PUSH
    ('bb_bench_press', 'Barbell Bench Press', 'Chest', ARRAY['Triceps', 'Anterior Deltoids'], 'Horizontal Push', 'Barbell', 'intermediate', 'Lie on bench, grip bar slightly wider than shoulder-width, lower bar to mid-chest, press upwards until arms extend.', 'Shoulder impingement, rotator cuff tear'),
    ('db_incline_press', 'Dumbbell Incline Bench Press', 'Upper Chest', ARRAY['Triceps', 'Anterior Deltoids'], 'Incline Push', 'Dumbbells', 'intermediate', 'Set bench to 30 degrees, press dumbbells overhead in a smooth arc, retracting shoulder blades.', 'Severe shoulder pain'),
    ('pushup', 'Standard Push-Up', 'Chest', ARRAY['Triceps', 'Core'], 'Horizontal Push', 'Bodyweight', 'beginner', 'Hands slightly wider than shoulders, body in a straight plank line, lower chest towards ground and push back up.', 'Wrist acute sprain'),
    ('cable_chest_fly', 'Standing Cable Chest Fly', 'Chest', ARRAY['Anterior Deltoids'], 'Isolation', 'Cable', 'beginner', 'Set pulleys at chest height, bring hands together in a hugging motion with slight elbow bend.', 'Extreme anterior shoulder instability'),
    ('dips_chest', 'Chest Dips', 'Lower Chest', ARRAY['Triceps', 'Front Shoulders'], 'Vertical Push', 'Bodyweight', 'advanced', 'Lean slightly forward on parallel bars, lower until upper arms are parallel to floor, press up.', 'Active sternum pain, rotator cuff tear'),

    -- SHOULDERS / PUSH
    ('overhead_press_bb', 'Standing Overhead Press', 'Shoulders', ARRAY['Triceps', 'Upper Chest', 'Core'], 'Vertical Push', 'Barbell', 'intermediate', 'Hold bar at collarbone height, press straight overhead locking elbows, bracing core and glutes.', 'Lower back disc herniation, severe shoulder impingement'),
    ('db_lateral_raise', 'Dumbbell Lateral Raise', 'Lateral Deltoids', ARRAY['Traps'], 'Isolation', 'Dumbbells', 'beginner', 'Stand tall, raise dumbbells out to sides until elbows reach shoulder height, control the descent.', 'Acute rotator cuff inflammation'),
    ('face_pull', 'Rope Face Pull', 'Rear Deltoids', ARRAY['Rotator Cuff', 'Upper Traps'], 'Horizontal Pull', 'Cable', 'beginner', 'Pull rope attachment towards eyes, flaring elbows back and rotating hands outwards.', NULL),

    -- BACK / PULL
    ('lat_pulldown', 'Wide-Grip Lat Pulldown', 'Lats', ARRAY['Biceps', 'Rhomboids'], 'Vertical Pull', 'Cable', 'beginner', 'Grip bar wide, pull down to upper chest while depressing shoulder blades, return smoothly.', 'Severe shoulder impingement'),
    ('bb_bent_over_row', 'Barbell Bent-Over Row', 'Upper Back', ARRAY['Lats', 'Biceps', 'Erector Spinae'], 'Horizontal Pull', 'Barbell', 'intermediate', 'Hinge at hips with flat back, pull barbell to lower ribcage, squeezing shoulder blades together.', 'Acute lumbar disc injury'),
    ('db_single_arm_row', 'Single-Arm Dumbbell Row', 'Lats', ARRAY['Rhomboids', 'Biceps'], 'Horizontal Pull', 'Dumbbells', 'beginner', 'Support knee and hand on bench, pull dumbbell to hip keeping elbow close to torso.', 'Lower back spasm'),
    ('pullup', 'Strict Pull-Up', 'Lats', ARRAY['Biceps', 'Mid Back'], 'Vertical Pull', 'Bodyweight', 'advanced', 'Hang from bar with overhand grip, pull chest up to the bar, lower with controlled tempo.', 'Shoulder labrum tear'),
    ('seated_cable_row', 'Seated Cable Row', 'Mid Back', ARRAY['Biceps', 'Lats'], 'Horizontal Pull', 'Cable', 'beginner', 'Sit with knees slightly bent, pull attachment to abdomen, keep torso stable and squeeze back.', 'Lumbar spine irritation'),

    -- ARMS (BICEPS / TRICEPS)
    ('bb_bicep_curl', 'Barbell Bicep Curl', 'Biceps', ARRAY['Forearms'], 'Isolation', 'Barbell', 'beginner', 'Hold barbell with underhand grip, curl weight up towards chest keeping elbows pinned by ribs.', 'Biceps tendonitis'),
    ('db_hammer_curl', 'Dumbbell Hammer Curl', 'Brachialis', ARRAY['Biceps', 'Forearms'], 'Isolation', 'Dumbbells', 'beginner', 'Hold dumbbells with neutral palms-facing-each-other grip, curl upwards smoothly.', NULL),
    ('tricep_rope_pushdown', 'Cable Tricep Pushdown', 'Triceps', ARRAY[], 'Isolation', 'Cable', 'beginner', 'Grip rope, push downwards spreading rope ends at the bottom, lock elbows without moving upper arms.', 'Elbow tendonitis / tennis elbow'),
    ('skullcrushers', 'Lying Tricep Extension', 'Triceps', ARRAY[], 'Isolation', 'Barbell', 'intermediate', 'Lie on bench, lower bar down towards forehead by bending elbows, press back upwards.', 'Olecranon bursitis, severe elbow pain'),

    -- LEGS / LOWER BODY
    ('barbell_back_squat', 'Barbell Back Squat', 'Quadriceps', ARRAY['Glutes', 'Hamstrings', 'Core'], 'Squat', 'Barbell', 'intermediate', 'Bar on upper traps, feet shoulder-width, squat down until thighs are parallel to floor, drive up through midfoot.', 'Severe knee meniscus tear, acute lumbar disc herniation'),
    ('goblet_squat', 'Dumbbell Goblet Squat', 'Quadriceps', ARRAY['Glutes', 'Core'], 'Squat', 'Dumbbells', 'beginner', 'Hold dumbbell vertically against chest, squat deeply keeping chest tall and knees out.', 'Severe knee osteoarthritis'),
    ('romanian_deadlift_bb', 'Barbell Romanian Deadlift (RDL)', 'Hamstrings', ARRAY['Glutes', 'Lower Back'], 'Hinge', 'Barbell', 'intermediate', 'Hold bar at thighs, push hips back with slight knee bend until stretch is felt in hamstrings, drive hips forward.', 'Acute hamstring strain, lumbar disc injury'),
    ('leg_press', '45-Degree Leg Press', 'Quadriceps', ARRAY['Glutes'], 'Machine Push', 'Machine', 'beginner', 'Place feet shoulder-width on platform, release safety, lower weight until knees reach 90 degrees, press back.', 'Severe lower back herniation if lumbar rounds'),
    ('leg_extension', 'Seated Leg Extension', 'Quadriceps', ARRAY[], 'Isolation', 'Machine', 'beginner', 'Sit with pad against lower shins, extend legs until straight, pause and control the descent.', 'Patellar tendonitis, ACL reconstruction rehab constraints'),
    ('lying_leg_curl', 'Lying Hamstring Leg Curl', 'Hamstrings', ARRAY['Calves'], 'Isolation', 'Machine', 'beginner', 'Lie face down, pad against achilles tendons, curl heels towards glutes smoothly.', 'Hamstring avulsion'),
    ('standing_calf_raise', 'Standing Calf Raise', 'Calves', ARRAY[], 'Isolation', 'Machine', 'beginner', 'Stand on balls of feet, drop heels for deep stretch, press up on toes as high as possible.', 'Achilles tendonitis'),

    -- CORE
    ('plank', 'Forearm Plank', 'Core', ARRAY['Shoulders', 'Glutes'], 'Core Stability', 'Bodyweight', 'beginner', 'Support body on forearms and toes, maintain flat spine and brace abdominal wall.', 'Acute shoulder injury, late pregnancy'),
    ('hanging_knee_raise', 'Hanging Knee / Leg Raise', 'Abdominals', ARRAY['Hip Flexors'], 'Core Flexion', 'Bodyweight', 'intermediate', 'Hang from pull-up bar, tuck knees towards chest without swinging momentum, lower controlled.', 'Shoulder impingement, severe hip flexor strain')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_muscle = EXCLUDED.primary_muscle,
    secondary_muscles = EXCLUDED.secondary_muscles,
    movement_pattern = EXCLUDED.movement_pattern,
    equipment = EXCLUDED.equipment,
    difficulty = EXCLUDED.difficulty,
    instructions = EXCLUDED.instructions,
    contraindications = EXCLUDED.contraindications;
