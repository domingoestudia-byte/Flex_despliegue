-- =========================================================
-- DATOS DE PRUEBA - ESQUEMA REAL
-- =========================================================

-- PRODUCTOS (para carrito/pedidos)
INSERT INTO public.productos (nombre, descripcion, precio, categoria, imagen_url) VALUES
  ('Mojito Premium', 'Ron blanco, lima y menta fresca', 14.00, 'bebida', 'https://placehold.co/200x200/27272a/d4a843?text=Mojito'),
  ('Whisky Gold', 'Whisky reserva especial', 18.50, 'bebida', 'https://placehold.co/200x200/27272a/d4a843?text=Whisky'),
  ('Vodka Energy', 'Vodka premium con energy drink', 16.00, 'bebida', 'https://placehold.co/200x200/27272a/d4a843?text=Vodka'),
  ('Champagne VIP', 'Botella exclusiva para reservados', 120.00, 'bebida', 'https://placehold.co/200x200/27272a/d4a843?text=Champagne'),
  ('Nachos Supreme', 'Nachos con queso, guacamole y jalapeños', 12.00, 'comida', 'https://placehold.co/200x200/27272a/d4a843?text=Nachos'),
  ('Pack Cumpleaños', 'Botella + 2 cocktails + nachos', 85.00, 'pack', 'https://placehold.co/200x200/27272a/d4a843?text=Pack');

-- SALAS VIP (para SeccionVIP y SelectorSalaVip)
INSERT INTO public.salas_vip (nombre, descripcion, capacidad, precio_hora, imagen_url, activa) VALUES
  ('Sala Roja',  'Ambiente íntimo con equipo de sonido Marshall',  8,  80.00, 'https://placehold.co/320x180/7f1d1d/d4a843?text=Sala+Roja', true),
  ('Sala Negra', 'Escenario propio + luces de discoteca',          15, 120.00, 'https://placehold.co/320x180/1f2937/d4a843?text=Sala+Negra', true),
  ('Sala Gold',  'Suite VIP con servicio de botella incluido',     6,  150.00, 'https://placehold.co/320x180/78350f/d4a843?text=Sala+Gold', true);
  