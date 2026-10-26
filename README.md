# Velora · Sitio web (GitHub + Netlify + Supabase)

Sitio de la agencia de seguros **Velora** con publicaciones con carrusel de fotos, artículos, videos de YouTube, formulario de cotización que abre WhatsApp y panel de administración.

## Estructura
```
index.html            Sitio público
admin.html            Panel de administración (/admin)
assets/js/config.js   ← ÚNICO archivo que debes editar
assets/js/app.js      Lógica del sitio
assets/js/admin.js    Lógica del panel
assets/css/           Estilos con la paleta de marca
assets/img/           Logos e isotipo
supabase/schema.sql   Tablas, seguridad y bucket de imágenes
data/demo.json        Contenido de ejemplo (solo si Supabase no está configurado)
netlify.toml          Configuración de Netlify
```

## Paso 1 · Supabase
1. Crea un proyecto en https://supabase.com (New project).
2. Ve a **SQL Editor → New query**, pega todo `supabase/schema.sql` y pulsa **Run**.
3. Ve a **Authentication → Users → Add user → Create new user**. Pon tu correo y contraseña y marca **Auto Confirm User**.
4. Ve a **Authentication → Sign In / Providers** y **desactiva "Allow new users to sign up"**, para que nadie más pueda crear cuentas.
5. Ve a **Project Settings → API** y copia **Project URL** y **anon public key**.

## Paso 2 · Configurar
Abre `assets/js/config.js` y reemplaza:
- `SUPABASE_URL` y `SUPABASE_ANON_KEY`: los valores del paso 1.5.
- `WHATSAPP`: el número de la agencia, por ejemplo `573001234567`.
- `EMAIL` y `CIUDAD`.

> La anon key es pública por diseño; la seguridad la dan las políticas RLS del `schema.sql`. **Nunca** pongas la `service_role` key en este proyecto.

## Paso 3 · GitHub
1. Crea un repositorio nuevo, por ejemplo `velora-web`.
2. Sube todo el contenido de esta carpeta (no la carpeta, su contenido) con **Add file → Upload files**.

## Paso 4 · Netlify
1. **Add new project → Import an existing project → GitHub** y elige el repositorio.
2. Build command: vacío. Publish directory: `.`
3. **Deploy**. Cada cambio que subas a GitHub se publica solo.
4. (Opcional) **Domain management** para conectar `velora.com.co`.

## Uso diario
- Entra a `https://tu-sitio.netlify.app/admin` con el usuario del paso 1.3.
- **Publicaciones**: crea fotos (carrusel con varias imágenes, se comprimen solas), artículos o videos. Puedes ordenar imágenes, ocultar o editar.
- **Solicitudes**: ves cada persona que llenó el formulario, cambias el estado (Nuevo, Contactado, Cotizado, Cerrado) y la descargas a Excel con **Descargar Excel (CSV)**.

## Cómo funciona el formulario
1. El cliente llena sus datos y acepta el tratamiento de datos (Ley 1581 de 2012).
2. La solicitud se guarda en Supabase (tabla `leads`).
3. Se abre WhatsApp con el mensaje listo para enviar al número de la agencia.

## Pendientes recomendados
- Publicar una política de tratamiento de datos y enlazarla en el formulario.
- Verificar el nombre "Velora" en RUES y SIC antes de registrar dominio y marca.
