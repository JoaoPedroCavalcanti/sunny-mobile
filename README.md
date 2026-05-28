# Sunnyvale Connect Mobile (React Native)

Front-end mobile (iOS/Android) em React Native com Expo, conectado ao backend atual.

## Como rodar

1. Entre na pasta:
```bash
cd mobile-app
```

2. Instale dependencias:
```bash
npm install
```

3. Configure a URL da API:
- Edite `app.json` em `expo.extra.apiBaseUrl`
- Ou use `EXPO_PUBLIC_API_BASE_URL`

Exemplos:
- Android emulator (host local): `http://10.0.2.2:8000`
- iOS simulator: `http://127.0.0.1:8000`
- Dispositivo fisico: `http://SEU_IP_LOCAL:8000`

4. Inicie:
```bash
npm run start
```

## Stack

- Expo + React Native + TypeScript
- React Navigation (stack + tabs)
- Axios com refresh automatico de token JWT
- Zustand + AsyncStorage para sessao

## Rotas do backend cobertas

### Auth
- `POST /api/token/`
- `POST /api/token/refresh/`
- `POST /api/token/verify/`

### Users
- `GET /user/`
- `POST /user/`
- `DELETE /user/{id}/`
- `GET /user/me/`
- `PATCH /user/me/`

### BBQ Reservations
- `GET /bbq/`
- `POST /bbq/`
- `PATCH /bbq/{id}/`
- `DELETE /bbq/{id}/`

### Hall Reservations
- `GET /hall/`
- `POST /hall/`
- `PATCH /hall/{id}/`
- `DELETE /hall/{id}/`

### Visitor Access
- `GET /visitor_access/`
- `POST /visitor_access/`
- `PATCH /visitor_access/{id}/`
- `DELETE /visitor_access/{id}/`
- `GET /visitor_access/checkin/{token}/`
- `GET /visitor_access/checkout/{token}/`

### Service Requests
- `GET /service_requests/`
- `POST /service_requests/`
- `GET /service_requests/{id}/`
- `PATCH /service_requests/{id}/`
- `DELETE /service_requests/{id}/`
- `PATCH /service_requests/accept_or_decline/{id}/{accept|decline}/`

### Condo Payments
- `GET /condo_payments/`
- `POST /condo_payments/`
- `PATCH /condo_payments/{id}/`
- `DELETE /condo_payments/{id}/`
- `PATCH /condo_payments/set_paid_status/`

### Delivery Notifications
- `POST /delivery_notification/`
- `GET /delivery_notification/list/`
- `GET /delivery_notification/{id}/`

### News
- `GET /sunny_vale_news/`
- `POST /sunny_vale_news/`
- `PATCH /sunny_vale_news/{id}/`
- `DELETE /sunny_vale_news/{id}/`

## Estrutura de telas

- Login / cadastro
- Home (resumo + atalhos)
- Reservas (churrasqueira e salao)
- Comunicados (noticias + entregas)
- Financeiro
- Perfil
- Visitantes
- Check-in / Check-out por token
- Solicitacoes de servico
# sunny-mobile
