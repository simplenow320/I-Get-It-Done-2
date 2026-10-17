-- Older App Store builds saved a hand-off to a linked teammate with only the
-- teammate's nickname in assigned_to and no delegated_to_user_id, so the task
-- never reached the teammate's "Assigned to Me" list. Link those open
-- hand-offs to the teammate when exactly one linked teammate has that
-- nickname. Completed tasks are left as they are. Safe to run repeatedly.

UPDATE tasks t
SET delegated_to_user_id = tm.teammate_id
FROM team_members tm
WHERE t.delegated_to_user_id IS NULL
  AND t.completed_at IS NULL
  AND t.delegation_status IS NOT NULL
  AND t.assigned_to IS NOT NULL
  AND tm.user_id = t.user_id
  AND tm.nickname = t.assigned_to
  AND tm.teammate_id IS NOT NULL
  AND tm.teammate_id <> t.user_id
  AND (
    SELECT count(*) FROM team_members x
    WHERE x.user_id = t.user_id AND x.nickname = t.assigned_to AND x.teammate_id IS NOT NULL
  ) = 1;
