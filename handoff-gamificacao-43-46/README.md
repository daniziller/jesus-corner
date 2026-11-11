# Gamificação — pacote de handoff (turnos 43–46)

Quatro peças novas, um sistema só: **a roda da Bíblia**, **o contador de semanas**, **as conquistas** e **a estante de selos**. Tudo parte do mesmo dado — o que a pessoa leu, quando, e por quanto tempo — e tudo obedece à mesma regra do resto do app: **nada zera, nada se perde, ninguém compete**.

## Telas

| PNG | Tela | O que é |
|---|---|---|
| `screens/G1-hoje.png` | **G1** Hoje | A aba Hoje (34a) com duas trocas: entra o cartão **SUA BÍBLIA** (a roda) e o cartão **SUAS SEMANAS** (o contador) no lugar de "ESTA SEMANA". O resto é idêntico. |
| `screens/G2-sua-biblia.png` | **G2** Sua Bíblia | A roda grande, com seletor Livros/Capítulos, três números, progresso por bloco e "Como a roda vai ficando". |
| `screens/G2b-roda-por-capitulos.png` | **G2b** referência | **Só o cartão da roda importa aqui**: é como a roda fica no modo **Capítulos** do seletor de G2. Ignore o resto da tela. |
| `screens/G3-contador-semanas.png` | **G3** referência | O cartão SUAS SEMANAS isolado, em tamanho maior, para conferir medidas. |
| `screens/G4-parabens-conquista.png` | **G4** Nova conquista | O momento de parabéns ao subir um degrau de uma família. |
| `screens/G5-minhas-conquistas.png` | **G5** Minhas conquistas | 10 de 38, a mais perto, as cinco famílias e os oito blocos. |
| `screens/G6-familia-constancia.png` | **G6** Uma família | A escada inteira de uma família (exemplo: Constância). O mesmo layout serve às cinco. |
| `screens/G7-sistema-conquistas.png` | **G7** referência | Quadro com as 38 conquistas, todas acesas. **Não é tela do app** — é a tabela visual do sistema. |
| `screens/G8-livro-completo.png` | **G8** Livro completo | O momento de parabéns ao terminar um livro: o selo. |
| `screens/G9-minha-estante.png` | **G9** Minha estante | Os 66 selos em oito prateleiras, com a escada "Livros completos" no topo. |
| `screens/G10-selo.png` | **G10** Um selo | O que ficou de um livro terminado. |

Dados prontos em `data/`: `blocos-da-biblia.json` (8 blocos, 66 livros, cores, capítulos, posição) e `conquistas.json` (5 famílias × 6 degraus, 8 blocos, regras de cada uma).

## Mapa de navegação

```
Hoje (G1)
 ├ cartão SUA BÍBLIA (toque em qualquer ponto) ─→ G2
 ├ "Ver livros" (canto do cartão) ──────────────→ G9
 ├ cartão SUAS SEMANAS (toque) ─────────────────→ G5
 └ o resto do Hoje ─────────────────────────────→ sem mudança (34a)

G2 Sua Bíblia
 ├ seletor Livros | Capítulos ──────────────────→ troca o desenho da roda, sem navegar
 ├ toque numa fatia ────────────────────────────→ G10 se o livro está completo; senão abre o livro na Bíblia
 └ linha de um bloco ───────────────────────────→ G9 rolada até a prateleira daquele bloco

G5 Minhas conquistas  (também pelo Perfil → "Minhas conquistas")
 ├ cartão de uma família ───────────────────────→ G6 daquela família
 ├ "A mais perto" ──────────────────────────────→ G6 da família correspondente
 ├ cartão Livros completos ─────────────────────→ G9
 └ cartão Blocos da Bíblia ─────────────────────→ G9

G9 Minha estante
 ├ selo cheio ──────────────────────────────────→ G10
 ├ selo em andamento / tracejado ───────────────→ abre o livro na Bíblia
 └ "O próximo selo" ────────────────────────────→ abre o livro na Bíblia, no próximo capítulo não lido

Fim de uma sessão (oração, leitura ou reflexão concluída)
 ├ terminou um livro ───────────────────────────→ G8  → "Ver minha estante" G9 | "Continuar"
 └ subiu um degrau ─────────────────────────────→ G4  → "Continuar" | "Ver minhas conquistas" G5
```

## Ordem de implementação

1. **Dados e cálculo, sem UI.** Blocos, progresso por livro, semanas na meta, famílias, selos. Com testes. Nada visível muda.
2. **A roda** — componente, cartão no Hoje (G1), tela G2 com os dois modos.
3. **O contador de semanas** — cartão no Hoje (G1/G3), substituindo "ESTA SEMANA".
4. **Conquistas** — G5, G6 e o momento G4.
5. **Selos** — G9, G10 e o momento G8.

Pare depois de cada bloco e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

"4,2%", "50 de 1.189", "Gênesis 41 de 50", "18 semanas na meta", "1 de 4", "10 de 38", "Dez horas com Deus", "próxima em fevereiro", "Jonas · 28 de agosto · 4 capítulos em 4 dias · 52 min", "Diego" — **nada hardcoded**. Idêntico ao quadro é a estrutura: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam.
