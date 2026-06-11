-- emails que deben tener rol admin automáticamente
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  as $$
declare
  is_admin boolean;
begin
  -- Comprobar si el email está en la lista de admins
  is_admin := lower(new.email) in ('diormingo@gmail.com');

  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    new.raw_user_meta_data->>'nombre',
    case when is_admin then 'admin' else 'cliente' end
  );
  return new;
end;
$$;