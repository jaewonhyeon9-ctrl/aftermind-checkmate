-- 2026-05-27: Supabase Storage 버킷 "checkins" 생성 + RLS
-- 사진을 공개 URL로 접근 가능하게 (체크인은 팀 전원이 보는 피드라서 공개 OK).
-- 업로드 권한은 로그인된 사용자에게만 부여. 본인 폴더에만 쓸 수 있게 제한.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checkins',
  'checkins',
  true,
  10 * 1024 * 1024,                              -- 10MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 누구나 읽기 가능 (public bucket이지만 명시적 policy 도 추가)
DROP POLICY IF EXISTS "checkins_public_read" ON storage.objects;
CREATE POLICY "checkins_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkins');

-- 로그인된 사용자는 본인 authId 폴더 하위에만 업로드/수정/삭제
DROP POLICY IF EXISTS "checkins_owner_insert" ON storage.objects;
CREATE POLICY "checkins_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'checkins'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "checkins_owner_update" ON storage.objects;
CREATE POLICY "checkins_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'checkins'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "checkins_owner_delete" ON storage.objects;
CREATE POLICY "checkins_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'checkins'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
