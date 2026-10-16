# Plantilla de recuperación de contraseña de FleetEase

Esta plantilla se aplica al proyecto Supabase alojado desde el Dashboard; subir el archivo al repositorio no cambia por sí solo los correos que envía Supabase Auth.

## Aplicación en producción

1. Abre el proyecto Supabase de FleetEase.
2. Entra en **Authentication → Email Templates → Reset Password** (los nombres pueden aparecer en español).
3. Cambia el asunto a: **Restablece tu contraseña de FleetEase**.
4. Reemplaza el contenido HTML con el contenido completo de `password-recovery-fleetease.html`.
5. Guarda los cambios y solicita un correo de recuperación de prueba.
6. Verifica que el botón abra `https://fleetease.com.mx/reset-password` y que el flujo termine en una pantalla de inicio de sesión nueva.

La plantilla usa `{{ .ConfirmationURL }}`, la variable oficial de Supabase Auth. No la sustituyas por una URL fija: contiene el enlace de confirmación generado para esa solicitud.
