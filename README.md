# IONPAY

Primera base ejecutable de la billetera IONPAY. Android es la plataforma principal. La interfaz está construida con React, TypeScript y Vite, y se empaqueta como aplicación Android nativa mediante Capacitor.

## Funciones incluidas

- Registro local de usuario y acceso a una cuenta demo.
- Panel con saldos separados en PEN y USDT.
- Flujos simulados para enviar, pagar, recibir y convertir.
- Actualización del saldo y persistencia local en el navegador.
- Historial filtrable mediante Ion Activity.
- Comprobantes de operación mediante Ion Receipt.
- Ion Card virtual con control de congelamiento.
- Perfil, estado KYC y límites demostrativos.
- Centro de servicios con Ion QR, Ion Code, Ion Link e IonTouch.
- Herramientas demo para Ion Merchant, Checkout, Payouts y Gateway.
- Ion Limits, Ion Safe, IonExchange Link e Ion Guide.

## Ejecutar el proyecto

```bash
pnpm install
pnpm dev
```

Para comprobar la versión de producción:

```bash
pnpm build
pnpm preview
```

## Android

Requisitos para generar un APK localmente:

- Android Studio con el SDK de Android.
- Java 21 (incluido normalmente con Android Studio).

Para compilar la interfaz y sincronizarla con el proyecto Android:

```bash
pnpm android:sync
```

Para abrir el proyecto nativo en Android Studio:

```bash
pnpm android:open
```

El identificador de la aplicación es `com.ionpay.app`.

## Backend local

El proyecto incluye una API Node.js en `server/` con SQLite integrado. Implementa:

- Registro, inicio de sesión y sesiones con token.
- Contraseñas protegidas mediante `scrypt`.
- Cuentas separadas para PEN y USDT.
- Ledger de doble entrada con montos enteros.
- Transferencias entre usuarios y conversiones.
- Validación KYC y fondeo exclusivo para demostración.

Iniciar la API en `http://127.0.0.1:8787`:

```bash
pnpm api
```

Ejecutar sus pruebas automáticas:

```bash
pnpm api:test
```

## Alcance de esta versión

Todas las operaciones y fondos son simulados y se guardan en `localStorage`. Esta versión no procesa dinero real ni se conecta todavía con bancos, KYC, proveedores de tarjetas, redes blockchain o IonExchange.

La siguiente fase debe separar frontend y backend, implementar autenticación segura y crear un ledger de doble entrada antes de conectar proveedores financieros reales.
