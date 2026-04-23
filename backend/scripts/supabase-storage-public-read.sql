-- Supabase SQL Editor’da çalıştırın: `uploads` bucket’ındaki dosyaların
-- herkese açık URL ile okunabilmesi için (PUBLIC bucket’ta eksik policy varsa).
-- service_role ile yapılan yüklemeler RLS’i zaten bypass eder; bu çoğunlukla GET / public URL içindir.

-- Zaten varsa hata verebilir; o zaman atlayın.
create policy "Allow public read uploads bucket"
on storage.objects
for select
to public
using (bucket_id = 'uploads');
