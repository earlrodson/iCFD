-- Allow admins full write access to topics
CREATE POLICY "admins can manage topics" ON public.topics
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Allow admins to read all submissions
CREATE POLICY "admins can view all submissions" ON public.submissions
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Allow admins to update submission status
CREATE POLICY "admins can update submissions" ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
