-- ============================================================================
-- Triggers. These keep the data correct no matter which program writes to it.
--   1. before_application_insert : refuse an application the student may not make
--   2. after_application_insert  : create one pending row per round
--   3. after_round_update        : advance to the next round, or mark rejected
--   4. before_offer_insert       : only allow an offer after every round is passed
--   5. after_offer_insert        : mark the offer and close the student's other applications
-- ============================================================================
USE spit_placement;

DELIMITER $$

-- 1 ---------------------------------------------------------------------------
CREATE TRIGGER before_application_insert
BEFORE INSERT ON application
FOR EACH ROW
BEGIN
    DECLARE v_verified   BOOLEAN;
    DECLARE v_deadline   DATE;
    DECLARE v_eligible   INT;

    SELECT is_verified INTO v_verified FROM student WHERE student_id = NEW.student_id;
    IF v_verified = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student profile is not verified yet';
    END IF;

    SELECT deadline INTO v_deadline FROM job WHERE job_id = NEW.job_id;
    IF NEW.applied_on > v_deadline THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application deadline has passed';
    END IF;

    SELECT is_eligible INTO v_eligible
    FROM v_eligibility_summary
    WHERE student_id = NEW.student_id AND job_id = NEW.job_id;
    IF v_eligible = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student does not meet the eligibility rules for this job';
    END IF;
END$$

-- 2 ---------------------------------------------------------------------------
CREATE TRIGGER after_application_insert
AFTER INSERT ON application
FOR EACH ROW
BEGIN
    INSERT INTO candidate_round (application_id, round_order, round_name)
    SELECT NEW.application_id, jr.round_order, jr.round_name
    FROM job_round jr
    WHERE jr.job_id = NEW.job_id;
END$$

-- 3 ---------------------------------------------------------------------------
CREATE TRIGGER after_round_update
AFTER UPDATE ON candidate_round
FOR EACH ROW
BEGIN
    DECLARE v_job_id INT;
    DECLARE v_last   INT;

    IF NEW.outcome = 'Failed' AND OLD.outcome <> 'Failed' THEN
        UPDATE application SET status = 'Rejected'
        WHERE application_id = NEW.application_id;

    ELSEIF NEW.outcome = 'Passed' AND OLD.outcome <> 'Passed' THEN
        SELECT job_id INTO v_job_id FROM application WHERE application_id = NEW.application_id;
        SELECT MAX(round_order) INTO v_last FROM job_round WHERE job_id = v_job_id;

        IF NEW.round_order < v_last THEN
            UPDATE application SET current_round_order = NEW.round_order + 1
            WHERE application_id = NEW.application_id;
        END IF;
    END IF;
END$$

-- 4 ---------------------------------------------------------------------------
CREATE TRIGGER before_offer_insert
BEFORE INSERT ON offer
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_unfinished INT;

    SELECT status INTO v_status FROM application WHERE application_id = NEW.application_id;
    IF v_status <> 'In progress' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This application is no longer open';
    END IF;

    SELECT COUNT(*) INTO v_unfinished
    FROM candidate_round
    WHERE application_id = NEW.application_id AND outcome <> 'Passed';
    IF v_unfinished > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Every round must be passed before an offer is issued';
    END IF;
END$$

-- 5 ---------------------------------------------------------------------------
CREATE TRIGGER after_offer_insert
AFTER INSERT ON offer
FOR EACH ROW
BEGIN
    DECLARE v_student INT;

    SELECT student_id INTO v_student FROM application WHERE application_id = NEW.application_id;

    UPDATE application SET status = 'Offered'
    WHERE application_id = NEW.application_id;

    UPDATE application SET status = 'Closed'
    WHERE student_id = v_student
      AND application_id <> NEW.application_id
      AND status = 'In progress';
END$$

DELIMITER ;
