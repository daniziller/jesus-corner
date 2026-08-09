-- Idioma no momento do evento (ver src/analytics/onboardingEvents.js), pro
-- filtro por idioma no funil do admin (api/admin/metrics.js). Mesma fonte
-- que authStore.signup usa pro cadastro (getAppLanguage()), então o idioma
-- gravado aqui já bate com o da conta criada no fim do wizard.
alter table public.onboarding_events add column language text;
create index onboarding_events_language_idx on public.onboarding_events (language);
