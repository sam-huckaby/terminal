-- Add a price column to the subscription table
ALTER TABLE `subscription` ADD `price` bigint;

-- Update all existing subscription records with the current price of their product variant
UPDATE subscription s
JOIN product_variant pv ON s.product_variant_id = pv.id
SET s.price = pv.price
WHERE s.price IS NULL;

-- Make the price column non-nullable
ALTER TABLE `subscription` MODIFY `price` bigint NOT NULL;

