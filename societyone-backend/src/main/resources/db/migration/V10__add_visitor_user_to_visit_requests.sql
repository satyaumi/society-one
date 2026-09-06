-- V10: Link visit_requests directly to authenticated visitor user and backfill
ALTER TABLE visit_requests
ADD COLUMN IF NOT EXISTS visitor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visit_requests_visitor_user_id ON visit_requests(visitor_user_id);

-- Backfill from audit_logs where actor created the request
UPDATE visit_requests vr
SET visitor_user_id = al.actor_user_id
FROM audit_logs al
WHERE al.entity_type = 'VISIT_REQUEST'
  AND al.entity_id = vr.id
  AND al.action = 'VISIT_REQUEST_CREATED'
  AND vr.visitor_user_id IS NULL;

-- Backfill from users mobile_number matching visitors mobile_number
UPDATE visit_requests vr
SET visitor_user_id = u.id
FROM visitors v, users u
WHERE vr.visitor_id = v.id
  AND vr.visitor_user_id IS NULL
  AND u.mobile_number IS NOT NULL
  AND u.mobile_number <> ''
  AND u.mobile_number = v.mobile_number;
