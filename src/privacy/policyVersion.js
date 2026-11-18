// Versão da Política de Privacidade — separada de consent.js para o
// servidor (api/) poder importar sem puxar o cliente do Supabase.
//
// Suba esta versão sempre que o texto da política mudar de forma relevante.
// Ela é gravada junto de cada consentimento, para saber exatamente com o que
// a pessoa concordou naquele dia, e subir a versão faz todo mundo passar de
// novo pela tela de consentimento (needsConsentRefresh).
//
// 2026-09-02: Política §3 passou a divulgar a OpenAI como sub-processador
// (voz do texto bíblico, sem dado pessoal), a Encarregada e o direito de
// reclamar à ANPD.
// 2026-11-18: revisão de LGPD — consentimento separado para a escrita
// assistida (IA) e a transferência internacional, declaração de idade
// própria, e-mail do resumo semanal com opção de desligar, exclusão de
// conta completa.
export const POLICY_VERSION = '2026-11-18'
