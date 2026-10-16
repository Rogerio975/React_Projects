# Navalha Barbearia

Aplicativo de agenda para acompanhar os atendimentos da barbearia. Permite criar horários, remarcar atendimentos existentes e cancelar reservas.

## Executar localmente

Requisitos: Node.js e npm.

```sh
npm install
npm run dev
```

Para validar o projeto:

```sh
npm run lint
npm run build
```

## Agendamentos

- Selecione um dia na agenda semanal e use **Novo agendamento** para reservar um horário.
- Use **Remarcar** para alterar os dados de um atendimento ou o botão de cancelar para liberar o horário.
- Os atendimentos ficam salvos no armazenamento local do navegador e continuam disponíveis nesse navegador após recarregar a página.
- Horários que conflitam com outro atendimento ativo não podem ser confirmados.
- Os serviços disponíveis são corte de cabelo, barba, cabelo + barba e acabamento. O expediente vai das 9h às 19h.

Os dados são locais ao navegador; este aplicativo ainda não sincroniza agendamentos entre dispositivos ou usuários.
