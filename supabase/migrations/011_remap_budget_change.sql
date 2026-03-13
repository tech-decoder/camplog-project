-- Remap budget_change to increase_spend/decrease_spend
-- budget_change overlaps with the spend actions and is being removed

UPDATE changes SET action_type = 'increase_spend'
WHERE action_type = 'budget_change' AND change_value LIKE '+%';

UPDATE changes SET action_type = 'decrease_spend'
WHERE action_type = 'budget_change' AND change_value LIKE '-%';

-- Remaining budget_change rows (no +/- prefix) default to increase_spend
UPDATE changes SET action_type = 'increase_spend'
WHERE action_type = 'budget_change';
