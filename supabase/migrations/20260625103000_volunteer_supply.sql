-- CREATE VOLUNTEER SUPPLY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.volunteer_supply_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  role_name TEXT NOT NULL,
  vol_count INTEGER NOT NULL,
  start_date DATE NOT NULL,
  hours_needed TEXT,
  duties TEXT,
  qualifications TEXT,
  skills TEXT,
  shift TEXT,
  travel_required BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_youth', -- pending_youth, proposed_by_youth, interviews_in_progress, interviews_submitted, approved, rejected
  youth_notes TEXT,
  proposed_volunteers JSONB DEFAULT '[]'::jsonb, -- array of {full_name, membership_number, cv_url, interview_status, interview_notes}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CREATE DEPARTMENT VOLUNTEERS TABLE (قاعدة بيانات متطوعي الإدارات)
CREATE TABLE IF NOT EXISTS public.department_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  membership_number TEXT,
  branch TEXT,
  department_code TEXT NOT NULL,
  skills TEXT,
  qualifications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_code, membership_number)
);

-- Enable RLS
ALTER TABLE public.volunteer_supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_volunteers ENABLE ROW LEVEL SECURITY;

-- Add touch_updated_at triggers
DROP TRIGGER IF EXISTS volunteer_supply_requests_touch ON public.volunteer_supply_requests;
CREATE TRIGGER volunteer_supply_requests_touch BEFORE UPDATE ON public.volunteer_supply_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS department_volunteers_touch ON public.department_volunteers;
CREATE TRIGGER department_volunteers_touch BEFORE UPDATE ON public.department_volunteers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Add policies for volunteer_supply_requests
DROP POLICY IF EXISTS "users see supply requests" ON public.volunteer_supply_requests;
CREATE POLICY "users see supply requests" ON public.volunteer_supply_requests FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['admin','youth_room','department_entry']::public.app_role[]));

DROP POLICY IF EXISTS "department entry inserts requests" ON public.volunteer_supply_requests;
CREATE POLICY "department entry inserts requests" ON public.volunteer_supply_requests FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(),'department_entry') OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "update supply requests" ON public.volunteer_supply_requests;
CREATE POLICY "update supply requests" ON public.volunteer_supply_requests FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['admin','youth_room']::public.app_role[]) OR (created_by = auth.uid() AND status IN ('pending_youth', 'proposed_by_youth', 'interviews_in_progress')));

-- Add policies for department_volunteers
DROP POLICY IF EXISTS "users read department volunteers" ON public.department_volunteers;
CREATE POLICY "users read department volunteers" ON public.department_volunteers FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "manage department volunteers" ON public.department_volunteers;
CREATE POLICY "manage department volunteers" ON public.department_volunteers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['admin','youth_room','department_entry']::public.app_role[]))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['admin','youth_room','department_entry']::public.app_role[]));
