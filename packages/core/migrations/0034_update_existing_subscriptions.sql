-- Update all existing subscription records with the current price of their product variant
UPDATE subscription s
JOIN product_variant pv ON s.product_variant_id = pv.id
SET s.price = pv.price
WHERE s.price IS NULL;