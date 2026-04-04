-- Enable RLS on subscribers table (defense-in-depth)
-- The subscribe API route uses the service role key to bypass RLS,
-- but this ensures the anon key alone cannot read/modify subscriber data.

ALTER TABLE IF EXISTS subscribers ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (implicit — service role bypasses RLS)
-- Allow authenticated admins to read all subscribers
CREATE POLICY "Admins can read subscribers"
  ON subscribers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow authenticated admins to update subscribers
CREATE POLICY "Admins can update subscribers"
  ON subscribers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow authenticated admins to delete subscribers
CREATE POLICY "Admins can delete subscribers"
  ON subscribers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- No anon SELECT/UPDATE/DELETE — subscribe API uses service role key
-- No anon INSERT policy either — the subscribe endpoint uses service role
-- This is intentional: the service role key is only used server-side in API routes
