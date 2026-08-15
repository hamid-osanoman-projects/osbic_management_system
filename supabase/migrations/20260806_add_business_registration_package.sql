-- ==============================================================================
-- Migration: 20260806_add_business_registration_package.sql
-- Description: Seeds the Business Registration Package & Setup Services
-- ==============================================================================

-- 1. Insert the Service Package
INSERT INTO public.service_packages (id, name_en, name_ar, description_en, description_ar, icon, is_active)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'Business Registration Package & Setup Services',
  'باقة تسجيل الشركات وخدمات التأسيس',
  'Comprehensive package including all necessary services for company registration and establishment in Oman.',
  'باقة شاملة تتضمن كافة الخدمات اللازمة لتسجيل وتأسيس الشركات في سلطنة عمان.',
  'Briefcase',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert the Services
-- KYC (Know Your Customer without resident ID)
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e01',
  'KYC (Know Your Customer without resident ID)',
  'التحقق من هوية العميل بدون بطاقة إقامة',
  'setup',
  1,
  true,
  0,
  0,
  false
) ON CONFLICT (id) DO NOTHING;

-- Commercial Registration (CR)
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e02',
  'Commercial Registration (CR)',
  'السجل التجاري',
  'setup',
  2,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- OCCI (Chamber of Commerce)
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e03',
  'OCCI (Chamber of Commerce)',
  'غرفة تجارة وصناعة عمان',
  'setup',
  1,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Activity License
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e04',
  'Activity License',
  'ترخيص النشاط',
  'setup',
  1,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Feasibility Study
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e05',
  'Feasibility Study',
  'دراسة الجدوى',
  'setup',
  1,
  true,
  0,
  0,
  false
) ON CONFLICT (id) DO NOTHING;

-- Tax Card
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e06',
  'Tax Card',
  'البطاقة الضريبية',
  'setup',
  2,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Investment License
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e07',
  'Investment License',
  'ترخيص الاستثمار',
  'setup',
  4,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Authorization
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e08',
  'Authorization',
  'تفويض',
  'setup',
  1,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Medical Attestation
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e09',
  'Medical Attestation',
  'التصديق الطبي',
  'setup',
  1,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Clearance for Visa
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e10',
  'Clearance for Visa',
  'ترخيص تأشيرة',
  'visa',
  4,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Visa Processing
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e11',
  'Visa Processing',
  'إجراءات التأشيرة',
  'visa',
  5,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- Medical
INSERT INTO public.services (id, name_en, name_ar, category, estimated_days, is_active, default_work_fee, default_ministry_fee, requires_pro)
VALUES (
  'b28c89de-0e0e-473d-9d41-9a74288b8e12',
  'Medical',
  'الفحص الطبي',
  'visa',
  2,
  true,
  0,
  0,
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Link them in package_services
-- KYC (Know Your Customer without resident ID) - Order 1
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e01',
  1,
  1,
  false,
  false,
  0,
  1
) ON CONFLICT DO NOTHING;

-- Commercial Registration (CR) - Order 2
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e02',
  2,
  1,
  false,
  false,
  0,
  2
) ON CONFLICT DO NOTHING;

-- OCCI (Chamber of Commerce) - Order 3
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e03',
  3,
  1,
  false,
  false,
  0,
  1
) ON CONFLICT DO NOTHING;

-- Activity License - Order 4
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e04',
  4,
  1,
  false,
  false,
  0,
  1
) ON CONFLICT DO NOTHING;

-- Feasibility Study - Order 5
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e05',
  5,
  1,
  true,
  false,
  0,
  1
) ON CONFLICT DO NOTHING;

-- Tax Card - Order 6
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e06',
  6,
  1,
  false,
  false,
  1,
  2
) ON CONFLICT DO NOTHING;

-- Investment License - Order 7
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e07',
  7,
  1,
  false,
  false,
  1,
  4
) ON CONFLICT DO NOTHING;

-- Authorization - Order 8
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e08',
  8,
  1,
  false,
  false,
  1,
  1
) ON CONFLICT DO NOTHING;

-- Medical Attestation - Order 9
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e09',
  9,
  1,
  false,
  false,
  0,
  1
) ON CONFLICT DO NOTHING;

-- Clearance for Visa - Order 10
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e10',
  10,
  1,
  false,
  false,
  1,
  4
) ON CONFLICT DO NOTHING;

-- Visa Processing - Order 11
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e11',
  11,
  1,
  false,
  false,
  1,
  5
) ON CONFLICT DO NOTHING;

-- Medical - Order 12
INSERT INTO public.package_services (package_id, service_id, display_order, default_quantity, is_optional, is_parallel, estimated_days_min, estimated_days_max)
VALUES (
  'a32b2a6f-bd1a-4638-89c5-8f6a91176ee1',
  'b28c89de-0e0e-473d-9d41-9a74288b8e12',
  12,
  1,
  false,
  false,
  1,
  2
) ON CONFLICT DO NOTHING;
