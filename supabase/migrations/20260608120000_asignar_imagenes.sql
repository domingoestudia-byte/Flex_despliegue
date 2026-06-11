-- Asignar imágenes del bucket a cada producto
-- URL base del Storage local (coincide con NEXT_PUBLIC_SUPABASE_URL)
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/agua-mineral.jpg'     WHERE nombre = 'Agua mineral 50cl';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/refresco-cola.jpg'    WHERE nombre = 'Refresco cola';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/cerveza-artesana.jpg' WHERE nombre = 'Cerveza artesana';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/gintonic-premium.jpg' WHERE nombre = 'Gin-tonic premium';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/mojito.jpg'           WHERE nombre = 'Mojito';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/zumo-naranja.jpg'     WHERE nombre = 'Zumo de naranja';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/nachos-guacamole.jpg' WHERE nombre = 'Nachos con guacamole';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/patatas-bravas.jpg'   WHERE nombre = 'Patatas bravas';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/tabla-quesos.jpg'     WHERE nombre = 'Tabla de quesos';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/alitas-bbq.jpg'       WHERE nombre = 'Alitas BBQ';
UPDATE public.productos SET imagen_url = 'http://127.0.0.1:54321/storage/v1/object/public/productos/burger-flex.jpg'      WHERE nombre = 'Burger Flex';
