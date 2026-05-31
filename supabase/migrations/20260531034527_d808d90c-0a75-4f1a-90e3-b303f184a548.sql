
-- Roles
CREATE TYPE public.app_role AS ENUM ('patient', 'staff');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default patient role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'::app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  notes TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient reads own reports" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff inserts reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND uploaded_by = auth.uid());
CREATE POLICY "staff updates reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff deletes reports" ON public.reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- Health tips
CREATE TABLE public.health_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_tips TO authenticated;
GRANT ALL ON public.health_tips TO service_role;
ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all auth read tips" ON public.health_tips FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert tips" ON public.health_tips FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND author_id = auth.uid());
CREATE POLICY "staff update tips" ON public.health_tips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff delete tips" ON public.health_tips FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- AI chat messages
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own chat" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user insert own chat" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user delete own chat" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for reports (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "staff upload reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff list reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND (public.has_role(auth.uid(), 'staff') OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "staff delete reports" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND public.has_role(auth.uid(), 'staff'));
