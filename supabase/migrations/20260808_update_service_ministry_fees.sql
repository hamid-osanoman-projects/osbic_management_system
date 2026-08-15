-- ==============================================================================
-- Migration: 20260808_update_service_ministry_fees.sql
-- Description: Updates the default ministry fees and timeline values for setup and visa services
-- ==============================================================================

-- 1. KYC (Know Your Customer without resident ID)
UPDATE public.services
SET default_ministry_fee = 0.000, ministry_fee = 0.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 1
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e01';

-- 2. Commercial Registration (CR) - Default to 4th Grade
UPDATE public.services
SET default_ministry_fee = 81.300, ministry_fee = 81.300, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 2
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e02';

-- 3. OCCI (Chamber of Commerce)
UPDATE public.services
SET default_ministry_fee = 0.000, ministry_fee = 0.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 1
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e03';

-- 4. Activity License - Default to Muscat
UPDATE public.services
SET default_ministry_fee = 78.050, ministry_fee = 78.050, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 1
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e04';

-- 5. Feasibility Study
UPDATE public.services
SET default_ministry_fee = 25.000, ministry_fee = 25.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 1
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e05';

-- 6. Tax Card
UPDATE public.services
SET default_ministry_fee = 10.000, ministry_fee = 10.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 2
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e06';

-- 7. Investment License
UPDATE public.services
SET default_ministry_fee = 0.900, ministry_fee = 0.900, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 4
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e07';

-- 8. Authorization
UPDATE public.services
SET default_ministry_fee = 0.000, ministry_fee = 0.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 1
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e08';

-- 9. Medical Attestation - Default to Oman
UPDATE public.services
SET default_ministry_fee = 5.000, ministry_fee = 5.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 1
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e09';

-- 10. Clearance for Visa - Default to Investor Visa
UPDATE public.services
SET default_ministry_fee = 316.000, ministry_fee = 316.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 4
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e10';

-- 11. Visa Processing
UPDATE public.services
SET default_ministry_fee = 20.000, ministry_fee = 20.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 5
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e11';

-- 12. Medical
UPDATE public.services
SET default_ministry_fee = 30.000, ministry_fee = 30.000, default_work_fee = 0.000, work_fee = 0.000, estimated_days = 2
WHERE id = 'b28c89de-0e0e-473d-9d41-9a74288b8e12';
