-- Update dealerships with proper clientId format for SEO team mapping

UPDATE dealerships SET "clientId" = 
  CASE name
    WHEN 'Jay Hatfield Chevrolet Buick GMC' THEN 'user_jayhatfieldchevy_rainsville_2024'
    WHEN 'Jay Hatfield Ford' THEN 'user_jayhatfieldford_rainsville_2024'
    WHEN 'Jay Hatfield Chrysler Dodge Jeep Ram' THEN 'user_jayhatfieldcdjr_rainsville_2024'
    WHEN 'Jay Hatfield Toyota' THEN 'user_jayhatfieldtoyota_rainsville_2024'
    WHEN 'Jay Hatfield Honda' THEN 'user_jayhatfieldhonda_rainsville_2024'
    WHEN 'Jay Hatfield Nissan' THEN 'user_jayhatfieldnissan_rainsville_2024'
    WHEN 'Jay Hatfield Hyundai' THEN 'user_jayhatfieldhyundai_rainsville_2024'
    WHEN 'Jay Hatfield Kia' THEN 'user_jayhatfieldkia_rainsville_2024'
    WHEN 'Jay Hatfield Mazda' THEN 'user_jayhatfieldmazda_rainsville_2024'
    WHEN 'Jay Hatfield Subaru' THEN 'user_jayhatfieldsubaru_rainsville_2024'
    WHEN 'Jay Hatfield Volkswagen' THEN 'user_jayhatfieldvw_rainsville_2024'
    WHEN 'Jay Hatfield BMW' THEN 'user_jayhatfieldbmw_rainsville_2024'
    WHEN 'Jay Hatfield Mercedes-Benz' THEN 'user_jayhatfieldmb_rainsville_2024'
    WHEN 'Jay Hatfield Audi' THEN 'user_jayhatfieldaudi_rainsville_2024'
    WHEN 'Jay Hatfield Lexus' THEN 'user_jayhatfieldlexus_rainsville_2024'
    WHEN 'Jay Hatfield Acura' THEN 'user_jayhatfieldacura_rainsville_2024'
    WHEN 'Jay Hatfield Infiniti' THEN 'user_jayhatfieldinfiniti_rainsville_2024'
    WHEN 'Jay Hatfield Cadillac' THEN 'user_jayhatfieldcadillac_rainsville_2024'
    WHEN 'Jay Hatfield Lincoln' THEN 'user_jayhatfieldlincoln_rainsville_2024'
    WHEN 'Jay Hatfield Volvo' THEN 'user_jayhatfieldvolvo_rainsville_2024'
    WHEN 'Jay Hatfield Genesis' THEN 'user_jayhatfieldgenesis_rainsville_2024'
    WHEN 'Jay Hatfield Used Cars' THEN 'user_jayhatfieldused_rainsville_2024'
  END;

-- Verify update
SELECT name, "clientId" FROM dealerships ORDER BY name;