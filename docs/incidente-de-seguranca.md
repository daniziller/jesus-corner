# Incidente de segurança com dados pessoais — o que fazer

Procedimento do Jesus' Corner para incidentes com dados pessoais (art. 48 da
LGPD e Resolução CD/ANPD nº 15/2024, o Regulamento de Comunicação de
Incidente de Segurança). Escrito na revisão de LGPD de 2026-11-18.

> Este documento não substitui orientação jurídica. Na dúvida sobre se um
> caso precisa ser comunicado, fale com um advogado de proteção de dados
> **dentro do prazo**: comunicar e depois complementar é melhor do que
> perder o prazo.

## O que conta como incidente

Qualquer evento que comprometa a confidencialidade, a integridade ou a
disponibilidade de dados pessoais. Exemplos neste app:

- chave do Supabase (service role), da Vercel, do Stripe ou da Resend
  vazada (num commit, num print, num log);
- falha numa regra de acesso (RLS) que deixe alguém ler dados de outra
  pessoa: notas, pedidos de oração, e-mail;
- conta de administrador invadida;
- exportação, backup ou planilha com dados de usuários enviada à pessoa
  errada;
- perda de dados (apagamento indevido, banco corrompido sem backup).

**Atenção:** no Jesus' Corner quase tudo é **dado sensível**. Ter uma conta
já revela convicção religiosa (art. 5º, II), e os pedidos de oração
costumam falar de saúde. Por isso, a maioria dos incidentes aqui deve ser
tratada como de **risco relevante**.

## Primeiras horas: conter

1. **Anote a hora** em que o incidente foi descoberto. O prazo conta daí.
2. **Pare o vazamento**:
   - troque a chave exposta: Supabase → Settings → API (gerar nova service
     role); Vercel → variáveis; Stripe → Developers → API keys; Resend →
     API Keys;
   - publique de novo na Vercel com as chaves novas;
   - se a falha for de acesso no banco, corrija a regra (RLS) ou tire a
     função do ar;
   - conta de admin invadida: troque a senha, remova o autenticador em
     Supabase → Authentication → Users e cadastre de novo, e confira o
     registro de acesso do painel (tabela `admin_access_log`).
3. **Guarde as evidências**: logs da Vercel e do Supabase do período,
   prints, o commit da correção. Não apague nada que ajude a entender o
   alcance.

## Até 3 dias úteis: avaliar e comunicar

4. **Levante o alcance**:
   - quais dados foram expostos;
   - de quantas pessoas, e quais (a tabela `admin_access_log` e os logs
     ajudam);
   - por quanto tempo;
   - se houve acesso de fato ou só a possibilidade de acesso.
5. **Decida se comunica.** É obrigatório comunicar à ANPD e às pessoas
   afetadas quando o incidente puder causar **risco ou dano relevante**.
   Com dado sensível, a regra é presumir que sim.
6. **Comunique a ANPD** pelo formulário de comunicação de incidente no site
   da ANPD (gov.br/anpd → Incidente de segurança). O prazo é de **3 dias
   úteis** a partir de quando a empresa soube do incidente.
   - A Resolução CD/ANPD nº 2/2022 dá prazo em dobro a agentes de pequeno
     porte, mas esse benefício pode não valer para quem trata dado
     sensível. Conte com os 3 dias úteis.
7. **Comunique as pessoas afetadas** no mesmo prazo, por e-mail e por
   notificação no app (sino), em linguagem simples. O modelo está abaixo.

## Depois

8. Registre o incidente na tabela abaixo, **mesmo que não tenha sido
   comunicado**. A Resolução 15/2024 pede esse registro guardado por pelo
   menos 5 anos.
9. Corrija a causa, não só o efeito. Acrescente um teste em `scripts/` que
   falhe se o problema voltar.

## Modelo de comunicação às pessoas afetadas

> **Assunto:** Aviso sobre um incidente de segurança no Jesus' Corner
>
> Olá, [nome].
>
> No dia [data], identificamos [o que aconteceu, em uma frase simples].
> Isso pode ter exposto [quais dados: por exemplo, seu e-mail e o texto de
> pedidos de oração marcados como "só eu"] entre [data] e [data].
>
> O que já fizemos: [conter: por exemplo, trocamos as chaves de acesso e
> corrigimos a falha em tal dia].
>
> O que recomendamos: [por exemplo, desconfie de e-mails pedindo sua senha;
> nunca pedimos senha por e-mail].
>
> Comunicamos o caso à Autoridade Nacional de Proteção de Dados (ANPD).
> Para dúvidas, fale com a nossa Encarregada, Daniela Ziller:
> info@jesuscorner.app.
>
> Sentimos muito.
> Equipe Jesus' Corner

## O que a ANPD pede no formulário

- quem é o controlador: JCORNER DESENVOLVIMENTO DE SOFTWARE LTDA, CNPJ
  68.029.736/0001-26;
- quem é a Encarregada: Daniela Ziller, info@jesuscorner.app;
- descrição do incidente, data em que aconteceu e data em que foi
  descoberto;
- dados afetados, incluindo se havia dado sensível (aqui, quase sempre
  sim);
- número aproximado de pessoas afetadas;
- medidas de segurança que já existiam: RLS em todas as tabelas,
  verificação em duas etapas no painel do admin, registro de acesso do
  painel, fotos em armazenamento privado, senhas com hash no Supabase;
- riscos para as pessoas;
- medidas tomadas para conter e corrigir;
- se e quando as pessoas afetadas foram comunicadas.

## Registro de incidentes

| Data em que foi descoberto | O que aconteceu | Dados e pessoas afetadas | Comunicado à ANPD? | Comunicado às pessoas? | Correção |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
