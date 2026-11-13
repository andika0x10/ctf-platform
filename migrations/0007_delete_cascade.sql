-- Cascades run after the parent disappears so the owner membership guard
-- continues to protect ordinary member removals. Keep existing data intact.
CREATE TRIGGER teams_delete_cascade
AFTER DELETE ON teams
BEGIN
  DELETE FROM solves WHERE team_id = OLD.id;
  DELETE FROM submissions WHERE team_id = OLD.id;
  DELETE FROM team_events WHERE team_id = OLD.id;
  DELETE FROM team_members WHERE team_id = OLD.id;
END;

CREATE TRIGGER challenges_delete_cascade
AFTER DELETE ON challenges
BEGIN
  DELETE FROM solves WHERE challenge_id = OLD.id;
  DELETE FROM submissions WHERE challenge_id = OLD.id;
END;
