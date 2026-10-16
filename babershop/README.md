# Navalha Barbearia

Aplicativo de agenda para acompanhar os atendimentos da barbearia. A interface React usa styled-components, e uma API Express valida e armazena os agendamentos.

## Executar localmente

Requisitos: Node.js e npm.

```sh
npm install
npm run dev
```

O comando de desenvolvimento inicia o Vite e a API Express. A API fica disponível em `http://localhost:3001`, e o Vite encaminha as chamadas `/api` para ela.

Em produção, gere os arquivos do frontend e inicie o servidor:

```sh
npm run build
npm start
```

O servidor Express atende a API e os arquivos compilados do frontend. A porta pode ser configurada pela variável de ambiente `PORT`.

Para validar o projeto:

```sh
npm run lint
npm run build
```

## Agendamentos

- Selecione um dia na agenda semanal e use **Novo agendamento** para reservar um horário.
- Use **Remarcar** para alterar os dados de um atendimento ou o botão de cancelar para liberar o horário.
- Os atendimentos ficam salvos em `~/.navalha-barbearia/appointments.json`, fora do diretório do projeto.
- Para escolher outro diretório de armazenamento, defina `BARBERSHOP_DATA_DIR`.
- Agendamentos salvos anteriormente no navegador são importados para a API na primeira abertura; se houver conflitos, os dados antigos permanecem no navegador e a interface informa a falha.
- Horários que conflitam com outro atendimento ativo não podem ser confirmados.
- Os serviços disponíveis são corte de cabelo, barba, cabelo + barba e acabamento. O expediente vai das 9h às 19h.

## API

- `GET /api/appointments`: lista os agendamentos.
- `POST /api/appointments`: cria um atendimento.
- `PUT /api/appointments/:id`: altera os dados de um atendimento.
- `PATCH /api/appointments/:id/cancel`: cancela um atendimento sem remover seu histórico.

O armazenamento é local ao servidor; sincronização entre instalações ou usuários requer hospedar a API e o arquivo de dados em uma infraestrutura compartilhada.
