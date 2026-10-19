# Diagnóstico de acceso del administrador

El seed usa `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` y `SUPERADMIN_DNI`.
`SUPERADMIN_CONTRASENA` no reemplaza `SUPERADMIN_PASSWORD`. Los nombres y
apellido se toman de `SUPERADMIN_NOMBRE` y `SUPERADMIN_APELLIDO` al crear
la persona.

El seed busca primero la persona por DNI. Si ya existía, conserva su email;
si ya tenía usuario, conserva la contraseña almacenada. Cambiar las variables
de Render no actualiza esas credenciales. La creación tampoco asigna un
nombre de usuario: se ingresa por el email guardado.

Para comprobar el entorno que presenta el fallo, desde `servidor` en ese
servicio ejecutar:

```sh
npm run admin:verificar
```

El comando consulta la base configurada en ese entorno e informa su esquema.
No ejecuta seeds, login, bootstrap, cambios de contraseña ni escrituras.
La contraseña y el hash no se imprimen. El resultado distingue:

- Configuración incompleta o administrador sin crear.
- Email guardado diferente al configurado.
- Email y DNI correspondientes a personas distintas.
- Usuario ausente, inactivo o eliminado.
- Contraseña configurada diferente a la almacenada.
- Credenciales correctas con rol de administrador, o cuenta sin ese rol.

Ejecutarlo en la PC comprueba la base local, no la base de Render, salvo que
la conexión esté configurada explícitamente para ese destino.

Si el resultado es `PASSWORD_DIFERENTE`, utilizar la contraseña original o
el flujo de recuperación por email cuando SMTP esté configurado. El
diagnóstico no cambia automáticamente cuentas ni contraseñas.

Un 401 aislado en la consola no distingue todos estos casos. Revisar también
el JSON de Network → login → Response y la salida del seed en el último
arranque de Render. El log del seed muestra el email efectivamente guardado
y si la contraseña se creó o se conservó.
