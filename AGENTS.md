# IONPAY — instrucciones para agentes

## Objetivo

IONPAY es una billetera financiera Android-first que conecta pagos cotidianos, liquidez e inversión dentro del ecosistema Ion. La experiencia debe ser simple para el usuario aunque la infraestructura interna sea rigurosa.

## Reglas del producto

- El saldo fiat local (PEN en el MVP) se utiliza para pagos, envíos, transferencias, retiros, comercios y tarjetas.
- El saldo USDT se utiliza exclusivamente para inversión mediante IonExchange Link.
- No presentar USDT como medio de pago cotidiano.
- Toda operación debe tener estado, trazabilidad, actividad y comprobante.
- Mantener visibles las diferencias entre saldo disponible, pendiente y retenido.
- Android es la plataforma principal. La vista web es el entorno rápido de desarrollo y validación.
- Ninguna función demo debe presentarse como una integración financiera real.

## Arquitectura actual

- Frontend: React 19, TypeScript y Vite.
- Android: Capacitor, proyecto nativo dentro de `android/`.
- Backend local: Node.js y SQLite integrado dentro de `server/`.
- Contabilidad: ledger de doble entrada con montos almacenados como enteros.
- Persistencia visual demo: `localStorage` hasta terminar la integración con la API.

## Diseño

- Identidad visual basada en blanco y negro con verde lima como acento.
- Logotipo tipográfico: `ionPAY`.
- Diseño móvil limpio, con saldo principal negro, acciones circulares y navegación inferior.
- Conservar accesibilidad, estados visibles, zonas seguras de Android y diseño responsive.
- No eliminar módulos existentes al reorganizar pantallas.

## Módulos

- Cuenta, registro, KYC, seguridad y Ion Limits.
- Enviar, recibir, pagar e Ion Convert.
- Ion QR, Ion Code, Ion Link e IonTouch.
- Ion Merchant, Ion Checkout, Ion Payouts e Ion Gateway.
- Ion Card e Ion Disposable Card.
- IonExchange Link, Ion Receipt, Ion Activity, Ion Safe e Ion Guide.

## Seguridad y Git

- Nunca incluir contraseñas, tokens, API keys, credenciales, archivos `.env`, keystores o datos financieros reales.
- No conectar proveedores financieros reales sin requisitos, credenciales de prueba y autorización explícita.
- No usar números de punto flotante para saldos o asientos contables del backend.
- Mantener commits pequeños y descriptivos; no reescribir historial compartido.
- Preservar cambios del usuario y evitar operaciones destructivas de Git.

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm api
pnpm api:test
pnpm android:sync
```

## Verificación mínima antes de entregar cambios

1. Ejecutar `pnpm build`.
2. Ejecutar `pnpm api:test` cuando se modifique backend, autenticación, saldos o transacciones.
3. Probar visualmente las pantallas modificadas en tamaño móvil.
4. Sincronizar Android mediante `pnpm android:sync` cuando cambien archivos web que deban llegar al APK.
