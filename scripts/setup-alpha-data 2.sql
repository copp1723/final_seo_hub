-- Clean up and setup alpha launch data
-- ONE AGENCY + 22 DEALERSHIPS

-- Clean existing data (cascade deletes)
DELETE FROM requests;
DELETE FROM dealerships;
DELETE FROM agencies;
DELETE FROM users WHERE email != 'josh.copp@onekeel.ai';

-- Create single agency
INSERT INTO agencies (
  id, name, slug, domain, plan, status, 
  "primaryColor", "secondaryColor", "maxUsers", "maxConversations",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Jay Hatfield Motors',
  'jay-hatfield-motors', 
  'jayhatfieldmotors.com',
  'platinum',
  'active',
  '#1e40af',
  '#3b82f6', 
  50,
  500,
  NOW(),
  NOW()
);

-- Get agency ID for dealerships
WITH agency_data AS (
  SELECT id as agency_id FROM agencies WHERE slug = 'jay-hatfield-motors'
)
-- Create 22 dealerships
INSERT INTO dealerships (
  id, name, "agencyId", website, address, phone,
  "activePackageType", "currentBillingPeriodStart", "currentBillingPeriodEnd",
  "createdAt", "updatedAt", "clientId"
)
SELECT 
  gen_random_uuid(),
  dealership_name,
  agency_data.agency_id,
  website,
  address,
  phone,
  'PLATINUM',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
  NOW(),
  NOW(),
  'JHM-' || LPAD(ROW_NUMBER() OVER()::text, 3, '0')
FROM agency_data,
(VALUES 
  ('Jay Hatfield Chevrolet Buick GMC', 'https://jayhatfieldchevrolet.com', '123 Main St, Rainsville, AL 35986', '(256) 638-2244'),
  ('Jay Hatfield Ford', 'https://jayhatfieldford.com', '456 Highway 35, Rainsville, AL 35986', '(256) 638-3355'),
  ('Jay Hatfield Chrysler Dodge Jeep Ram', 'https://jayhatfieldcdjr.com', '789 DeKalb Ave, Rainsville, AL 35986', '(256) 638-4466'),
  ('Jay Hatfield Toyota', 'https://jayhatfieldtoyota.com', '321 Industrial Blvd, Rainsville, AL 35986', '(256) 638-5577'),
  ('Jay Hatfield Honda', 'https://jayhatfieldhonda.com', '654 Commerce Dr, Rainsville, AL 35986', '(256) 638-6688'),
  ('Jay Hatfield Nissan', 'https://jayhatfieldnissan.com', '987 Auto Plaza, Rainsville, AL 35986', '(256) 638-7799'),
  ('Jay Hatfield Hyundai', 'https://jayhatfieldhyundai.com', '147 Dealer Row, Rainsville, AL 35986', '(256) 638-8800'),
  ('Jay Hatfield Kia', 'https://jayhatfieldkia.com', '258 Motor Mile, Rainsville, AL 35986', '(256) 638-9911'),
  ('Jay Hatfield Mazda', 'https://jayhatfieldmazda.com', '369 Car Lot Ln, Rainsville, AL 35986', '(256) 638-1122'),
  ('Jay Hatfield Subaru', 'https://jayhatfieldsubaru.com', '741 Vehicle Way, Rainsville, AL 35986', '(256) 638-2233'),
  ('Jay Hatfield Volkswagen', 'https://jayhatfieldvw.com', '852 Automotive Ave, Rainsville, AL 35986', '(256) 638-3344'),
  ('Jay Hatfield BMW', 'https://jayhatfieldbmw.com', '963 Luxury Lane, Rainsville, AL 35986', '(256) 638-4455'),
  ('Jay Hatfield Mercedes-Benz', 'https://jayhatfieldmb.com', '159 Premium Pkwy, Rainsville, AL 35986', '(256) 638-5566'),
  ('Jay Hatfield Audi', 'https://jayhatfieldaudi.com', '357 Elite Blvd, Rainsville, AL 35986', '(256) 638-6677'),
  ('Jay Hatfield Lexus', 'https://jayhatfieldlexus.com', '468 Prestige Dr, Rainsville, AL 35986', '(256) 638-7788'),
  ('Jay Hatfield Acura', 'https://jayhatfieldacura.com', '579 Quality Ct, Rainsville, AL 35986', '(256) 638-8899'),
  ('Jay Hatfield Infiniti', 'https://jayhatfieldinfiniti.com', '680 Excellence Way, Rainsville, AL 35986', '(256) 638-9900'),
  ('Jay Hatfield Cadillac', 'https://jayhatfieldcadillac.com', '791 Luxury Loop, Rainsville, AL 35986', '(256) 638-0011'),
  ('Jay Hatfield Lincoln', 'https://jayhatfieldlincoln.com', '802 Premier Plaza, Rainsville, AL 35986', '(256) 638-1133'),
  ('Jay Hatfield Volvo', 'https://jayhatfieldvolvo.com', '913 Safety St, Rainsville, AL 35986', '(256) 638-2244'),
  ('Jay Hatfield Genesis', 'https://jayhatfieldgenesis.com', '024 Innovation Ave, Rainsville, AL 35986', '(256) 638-3355'),
  ('Jay Hatfield Used Cars', 'https://jayhatfieldused.com', '135 Pre-Owned Pkwy, Rainsville, AL 35986', '(256) 638-4466')
) AS dealership_data(dealership_name, website, address, phone);

-- Verify counts
SELECT 
  (SELECT COUNT(*) FROM agencies) as agency_count,
  (SELECT COUNT(*) FROM dealerships) as dealership_count;