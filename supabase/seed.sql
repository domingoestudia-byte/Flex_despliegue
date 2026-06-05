-- ── Productos ────────────────────────────────────────────────────────────────

insert into public.productos (nombre, descripcion, precio, categoria, disponible) values
  ('Agua mineral 50cl',    'Agua sin gas botella pequeña',          1.50, 'bebida', true),
  ('Refresco cola',        'Lata 33cl fría',                        2.00, 'bebida', true),
  ('Cerveza artesana',     'IPA local de barril, 33cl',             3.50, 'bebida', true),
  ('Gin-tonic premium',   'Ginebra Hendrick''s con tónica fever',  9.00, 'bebida', true),
  ('Mojito',               'Ron blanco, menta, lima y azúcar',      8.50, 'bebida', true),
  ('Zumo de naranja',      'Exprimido al momento',                   3.00, 'bebida', true),
  ('Nachos con guacamole', 'Tortillas crujientes con guac casero',  7.50, 'comida', true),
  ('Patatas bravas',       'Con salsa picante y alioli',            5.00, 'comida', true),
  ('Tabla de quesos',      'Selección de quesos con mermelada',    12.00, 'comida', true),
  ('Alitas BBQ',           '8 unidades con salsa barbacoa',         9.00, 'comida', true),
  ('Burger Flex',          'Ternera, cheddar, bacon y pepinillos', 13.00, 'comida', false);
  -- ('Pack Bienvenida',      '2 gin-tonics + nachos + patatas bravas',28.00, 'pack',   true),
  -- ('Pack Cumpleaños',      'Botella de cava + tabla de quesos',    45.00, 'pack',   true),
  -- ('Pack Noche VIP',       'Botella premium + 4 refrescos + alitas',60.00, 'pack',  true);


