-- Canonicalize users.mobile_number to E.164 (+91XXXXXXXXXX for India).
-- Never drops uk_users_mobile_number. Never deletes or merges users.
-- If any two rows share the same canonical number, skip ALL rewrites.

WITH cleaned AS (
    SELECT
        u.id,
        u.mobile_number AS old_mobile,
        CASE
            WHEN u.mobile_number IS NULL OR length(btrim(u.mobile_number)) = 0 THEN NULL
            ELSE regexp_replace(u.mobile_number, '[^0-9+]', '', 'g')
        END AS digits
    FROM users u
),
stripped AS (
    SELECT
        id,
        old_mobile,
        CASE
            WHEN digits IS NULL OR digits = '' THEN NULL
            WHEN digits LIKE '+%' THEN digits
            WHEN digits LIKE '0%' THEN substring(digits FROM 2)
            ELSE digits
        END AS d
    FROM cleaned
),
plan AS (
    SELECT
        id,
        old_mobile,
        CASE
            WHEN d ~ '^\+91[6-9][0-9]{9}$' THEN d
            WHEN d ~ '^91[6-9][0-9]{9}$' THEN '+' || d
            WHEN d ~ '^[6-9][0-9]{9}$' THEN '+91' || d
            WHEN d ~ '^\+[1-9][0-9]{7,14}$' THEN d
            ELSE NULL
        END AS canonical_mobile
    FROM stripped
),
dups AS (
    SELECT canonical_mobile
    FROM plan
    WHERE canonical_mobile IS NOT NULL
    GROUP BY canonical_mobile
    HAVING count(*) > 1
)
UPDATE users u
SET mobile_number = p.canonical_mobile
FROM plan p
WHERE u.id = p.id
  AND p.canonical_mobile IS NOT NULL
  AND COALESCE(p.old_mobile, '') <> p.canonical_mobile
  AND NOT EXISTS (SELECT 1 FROM dups)
  AND NOT EXISTS (
      SELECT 1
      FROM users other
      WHERE other.mobile_number = p.canonical_mobile
        AND other.id <> u.id
  );
