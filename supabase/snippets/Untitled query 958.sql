create policy "público: ver imágenes productos"
  on storage.objects for select
  using ( bucket_id = 'productos' );

create policy "admin: subir imágenes productos"
  on storage.objects for insert
  with check (
    bucket_id = 'productos'
    and public.mi_rol() = 'admin'
  );

create policy "admin: borrar imágenes productos"
  on storage.objects for delete
  using (
    bucket_id = 'productos'
    and public.mi_rol() = 'admin'
  );