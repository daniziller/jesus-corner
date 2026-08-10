import { useState, useEffect, useRef } from 'react'
import { signup, login, logout, requestPasswordReset, resetPassword, resendConfirmationEmail, passwordRequirements, isValidPassword, needsPasswordChange, changePassword } from '../auth/authStore'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { termsUrl, privacyUrl } from '../utils/legalLinks'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { setSelectedPlanId } from '../plan/planStore'
import { setReadingOrder } from '../reading/readingOrderStore'
import { setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { STORE_TIERS } from '../billing/storeTiers'
import { formatAmount } from '../billing/formatAmount'
import { startCheckout } from '../billing/subscriptionStore'
import { redeemInviteCode } from '../invites/inviteStore'
import { trackOnboardingEvent } from '../analytics/onboardingEvents'
import { recordConsents, needsConsentRefresh, PURPOSES } from '../privacy/consent'
import { MIN_AGE } from '../privacy/minAge'
import { ageToApproxBirthdate } from '../utils/age'

// Gravado no primeiro login/cadastro bem-sucedido — sem isso, quem já usa
// o app veria o onboarding (pensado pra converter visitante novo) toda vez
// que a sessão expirasse, em vez de cair direto no login.
const HAS_AUTH_KEY = 'jc_has_authenticated'

const PRAYER_DURATION_OPTIONS = [5, 10, 15, 20, 30]
const REFLECTION_DURATION_OPTIONS = [5, 8, 10, 15, 20, 30]
const STANDARD_PLAN = PLANS.find(p => p.id === 'standard')

export default function AuthScreen({ onAuthenticated }) {
  // Quem nunca autenticou nesse navegador vê o onboarding primeiro (pensado
  // pra converter visitante novo); quem já tem o flag cai direto no login,
  // como antes.
  const [mode, setMode] = useState(() => (
    typeof localStorage !== 'undefined' && localStorage.getItem(HAS_AUTH_KEY) ? 'login' : 'onboarding'
  )) // 'onboarding' | 'login' | 'forgot' | 'forcePasswordChange' | 'consentRefresh'
  // Guardado durante 'forcePasswordChange'/'consentRefresh': a pessoa já
  // está autenticada no Supabase nesse ponto, só falta o app "liberar" a
  // sessão (chamar onAuthenticated) depois de resolver as pendências.
  const [pendingUser, setPendingUser] = useState(null)

  // Encadeia as checagens pós-login: senha fraca primeiro (mais urgente,
  // segurança da conta), depois consentimento. Cada etapa, ao terminar,
  // chama handleAuthenticated(user) de novo — na segunda passada a
  // pendência que acabou de ser resolvida já não bloqueia mais, então o
  // fluxo naturalmente avança pra próxima checagem (ou libera o app).
  async function handleAuthenticated(user) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HAS_AUTH_KEY, '1')

    // Quem já tinha conta quando a senha deixou de ser um PIN de 6 dígitos
    // (ver migration 0026) precisa trocar antes de continuar.
    const needsPwChange = await needsPasswordChange().catch(() => false)
    if (needsPwChange) {
      setPendingUser(user)
      setMode('forcePasswordChange')
      return
    }

    // Quem se cadastrou agora mesmo já sai com o consentimento em dia (ver
    // SignupStep), então isso na prática só pega quem loga numa conta criada
    // antes desse sistema existir, ou depois de a política mudar de versão.
    const needsRefresh = await needsConsentRefresh().catch(() => false)
    if (needsRefresh) {
      setPendingUser(user)
      setMode('consentRefresh')
      return
    }

    onAuthenticated(user)
  }

  return (
    <div className="auth-screen" style={styles.screen}>
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <img src="/icons/icon-192.png" alt="" style={styles.logo} />
        <span style={styles.brandName}>JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
      </div>

      <div className="auth-sheet" style={styles.sheet}>
        {mode === 'onboarding' && <OnboardingWizard onAuthenticated={handleAuthenticated} onGoLogin={() => setMode('login')} />}
        {mode === 'login'  && <LoginView    onAuthenticated={handleAuthenticated} onGoSignup={() => setMode('onboarding')} onGoForgot={() => setMode('forgot')} />}
        {mode === 'forgot' && <ForgotView   onAuthenticated={handleAuthenticated} onGoLogin={() => setMode('login')} />}
        {mode === 'forcePasswordChange' && (
          <ForceChangePasswordStep onDone={() => handleAuthenticated(pendingUser)} />
        )}
        {mode === 'consentRefresh' && (
          <ConsentRefreshStep
            onDone={() => onAuthenticated(pendingUser)}
            onDecline={() => { setPendingUser(null); setMode('login') }}
          />
        )}
      </div>
    </div>
  )
}

/* ── Cabeçalho comum de cada etapa (voltar + "passo X de 7") ── */
function StepHeader({ step, total, onBack }) {
  return (
    <div style={styles.stepHeader}>
      <span style={{ ...styles.link, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={onBack}>
        <AppIcon name="ArrowLeft" size={14} color="currentColor" /> {t('onboarding.back')}
      </span>
      <span style={styles.stepCounter}>{t('onboarding.stepCounter', { step, total })}</span>
    </div>
  )
}

/* ── Onboarding de primeiro acesso (substitui a antiga tela de boas-vindas + o tour) ── */
function OnboardingWizard({ onAuthenticated, onGoLogin }) {
  const [step, setStep] = useState('name') // 'name' | 'valueIntro' | 'features' | 'prayerTime' | 'firstTimeReading' | 'readingPlan' | 'reflectionTime' | 'preview' | 'signup'
  const [name, setName] = useState('')
  const [prayerMinutes, setPrayerMinutes] = useState(STANDARD_PLAN.prayerMinutes)
  const [readingOrder, setReadingOrderState] = useState('ot_first')
  const [planId, setPlanId] = useState('standard')
  const [reflectionMinutes, setReflectionMinutes] = useState(STANDARD_PLAN.reflectionMinutes)

  // Marca a chegada em cada passo pro funil do admin (ver
  // src/analytics/onboardingEvents.js) — dispara de novo se a pessoa voltar
  // e avançar outra vez, mas isso não infla a contagem porque o funil conta
  // sessões distintas, não eventos.
  useEffect(() => { trackOnboardingEvent(step) }, [step])

  const STEPS = ['name', 'valueIntro', 'features', 'prayerTime', 'firstTimeReading', 'readingPlan', 'reflectionTime', 'preview', 'signup']
  const stepNum = STEPS.indexOf(step) + 1

  function goTo(next) { setStep(next) }

  if (step === 'name') {
    return (
      <NameStep
        name={name}
        setName={setName}
        onNext={() => goTo('valueIntro')}
        onGoLogin={onGoLogin}
      />
    )
  }
  if (step === 'valueIntro') {
    return (
      <ValueIntroStep
        stepNum={stepNum}
        total={STEPS.length}
        name={name}
        onBackToName={() => goTo('name')}
        onNext={() => goTo('features')}
      />
    )
  }
  if (step === 'features') {
    return (
      <FeaturesStep
        header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('valueIntro')} />}
        onNext={() => goTo('prayerTime')}
      />
    )
  }
  if (step === 'prayerTime') {
    return (
      <DurationStep
        header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('features')} />}
        icon="HandHeart"
        color={ROUTINE_STEP_COLORS.prayer}
        title={t('onboarding.prayerTime.title')}
        subtitle={t('onboarding.prayerTime.subtitle')}
        options={PRAYER_DURATION_OPTIONS}
        value={prayerMinutes}
        onChange={setPrayerMinutes}
        onNext={() => goTo('firstTimeReading')}
      />
    )
  }
  if (step === 'firstTimeReading') {
    return (
      <FirstTimeReadingStep
        header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('prayerTime')} />}
        onChoose={order => { setReadingOrderState(order); goTo('readingPlan') }}
      />
    )
  }
  if (step === 'readingPlan') {
    return (
      <ReadingPlanStep
        header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('firstTimeReading')} />}
        planId={planId}
        setPlanId={setPlanId}
        onNext={() => goTo('reflectionTime')}
      />
    )
  }
  if (step === 'reflectionTime') {
    return (
      <DurationStep
        header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('readingPlan')} />}
        icon="PenLine"
        color={ROUTINE_STEP_COLORS.reflection}
        title={t('onboarding.reflectionTime.title')}
        subtitle={t('onboarding.reflectionTime.subtitle')}
        options={REFLECTION_DURATION_OPTIONS}
        value={reflectionMinutes}
        onChange={setReflectionMinutes}
        onNext={() => goTo('preview')}
      />
    )
  }
  if (step === 'preview') {
    return (
      <PreviewStep
        header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('reflectionTime')} />}
        prayerMinutes={prayerMinutes}
        planId={planId}
        reflectionMinutes={reflectionMinutes}
        onNext={() => goTo('signup')}
      />
    )
  }
  return (
    <SignupStep
      header={<StepHeader step={stepNum} total={STEPS.length} onBack={() => goTo('preview')} />}
      name={name}
      prayerMinutes={prayerMinutes}
      planId={planId}
      reflectionMinutes={reflectionMinutes}
      readingOrder={readingOrder}
      onAuthenticated={onAuthenticated}
      onGoLogin={onGoLogin}
    />
  )
}

/* ── 1. Nome ── */
function NameStep({ name, setName, onNext, onGoLogin }) {
  return (
    <div style={styles.form}>
      <h1 style={{ ...styles.title, fontSize: 26 }}>{t('onboarding.name.title')}</h1>
      <p style={styles.subtitle}>{t('onboarding.name.subtitle')}</p>

      <Field label={t('auth.nameLabel')} value={name} onChange={setName} placeholder={t('auth.namePlaceholder')} autoFocus />

      <div style={{ marginTop: 4 }}>
        <button type="button" className="btn-primary" disabled={!name.trim()} onClick={onNext}>
          {t('onboarding.continueBtn')}
        </button>
      </div>

      <div style={{ ...styles.linksRow, justifyContent: 'center' }}>
        <span style={styles.link} onClick={onGoLogin}>{t('auth.welcomeAlreadyHaveAccount')}</span>
      </div>
    </div>
  )
}

/* ── 2. Introdução de valor ── Nomeia o problema que o app resolve (muitas
   vozes disputando a atenção, quase nenhum tempo a sós com Deus) antes de
   mostrar os recursos. Duas perguntas de reflexão fazem a pessoa se
   enxergar no problema; as respostas não são gravadas em lugar nenhum — a
   da segunda pergunta só personaliza a mensagem de fechamento
   (method.empathy.*). As 4 fases moram dentro do mesmo passo do wizard de
   propósito: no funil do admin conta como um passo só, e o "voltar" anda
   fase a fase antes de sair pro passo do nome. ── */
const VALUE_INTRO_COLOR = '#9D4300' // = var(--or); hex literal pra permitir suffixar alpha (`${VALUE_INTRO_COLOR}1A`) abaixo
const OBSTACLE_KEYS = ['rush', 'phone', 'start', 'consistency']

function ValueIntroStep({ stepNum, total, name, onBackToName, onNext }) {
  const [phase, setPhase] = useState('hook') // 'hook' | 'q1' | 'q2' | 'method'
  const [obstacle, setObstacle] = useState('rush')

  const PHASES = ['hook', 'q1', 'q2', 'method']
  function back() {
    const i = PHASES.indexOf(phase)
    if (i === 0) onBackToName()
    else setPhase(PHASES[i - 1])
  }
  const header = <StepHeader step={stepNum} total={total} onBack={back} />

  if (phase === 'hook') {
    return (
      <div style={styles.form}>
        {header}
        <p style={styles.greeting}>{t('onboarding.greeting', { name: name.trim().split(' ')[0] })}</p>
        <div style={{ ...styles.tutorialIconWrap, background: `${VALUE_INTRO_COLOR}1A` }}>
          <AppIcon name="Megaphone" size={22} color={VALUE_INTRO_COLOR} />
        </div>
        <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.valueIntro.hook.title')}</h1>
        <p style={styles.subtitle}>{t('onboarding.valueIntro.hook.body')}</p>
        <div style={{ marginTop: 4 }}>
          <button type="button" className="btn-primary" onClick={() => setPhase('q1')}>{t('onboarding.valueIntro.hook.btn')}</button>
        </div>
      </div>
    )
  }

  if (phase === 'q1' || phase === 'q2') {
    const q = phase
    const options = q === 'q1' ? ['almostNone', 'under10', 'upTo30', 'over30'] : OBSTACLE_KEYS
    return (
      <div style={styles.form}>
        {header}
        <div style={{ ...styles.tutorialIconWrap, background: `${VALUE_INTRO_COLOR}1A` }}>
          <AppIcon name={q === 'q1' ? 'Hourglass' : 'Zap'} size={22} color={VALUE_INTRO_COLOR} />
        </div>
        <h1 style={{ ...styles.title, fontSize: 24 }}>{t(`onboarding.valueIntro.${q}.title`)}</h1>
        <p style={styles.subtitle}>{t(`onboarding.valueIntro.${q}.subtitle`)}</p>

        <div style={styles.choiceCol}>
          {options.map(key => (
            <button
              key={key}
              type="button"
              style={styles.planBtnFree}
              onClick={() => {
                if (q === 'q2') setObstacle(key)
                setPhase(q === 'q1' ? 'q2' : 'method')
              }}
            >
              {t(`onboarding.valueIntro.${q}.${key}`)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const methodRows = [
    { key: 'prayer', icon: 'HandHeart', color: ROUTINE_STEP_COLORS.prayer },
    { key: 'reading', icon: 'BookOpen', color: ROUTINE_STEP_COLORS.reading },
    { key: 'reflection', icon: 'PenLine', color: ROUTINE_STEP_COLORS.reflection },
  ]
  return (
    <div style={styles.form}>
      {header}
      <div style={{ ...styles.tutorialIconWrap, background: `${VALUE_INTRO_COLOR}1A` }}>
        <AppIcon name="Sparkles" size={22} color={VALUE_INTRO_COLOR} />
      </div>
      <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.valueIntro.method.title')}</h1>
      <p style={styles.subtitle}>{t(`onboarding.valueIntro.method.empathy.${obstacle}`)}</p>
      <p style={styles.subtitle}>{t('onboarding.valueIntro.method.body')}</p>

      <div style={styles.previewCard}>
        {methodRows.map((r, i) => (
          <div key={r.key} style={{ ...styles.previewRow, ...(i === methodRows.length - 1 ? { borderBottom: 'none' } : {}) }}>
            <div style={{ ...styles.previewIcon, background: `${r.color}1A` }}>
              <AppIcon name={r.icon} size={16} color={r.color} />
            </div>
            <span style={styles.previewLabel}>{t(`onboarding.valueIntro.method.${r.key}`)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        <button type="button" className="btn-primary" onClick={onNext}>{t('onboarding.valueIntro.method.btn')}</button>
      </div>
    </div>
  )
}

/* ── 3. Boas-vindas + recursos (screenshots) ── Rolagem manual (arrasta pro
   lado, com scroll-snap) em vez de trocar sozinho — dá tempo de ler cada
   card no próprio ritmo, e o "espiar" do próximo card na borda já convida a
   arrastar. Rotina abre e Progresso vem logo em seguida de propósito — são
   os dois recursos com mais destaque pedido (a rotina é o fio condutor pros
   próximos passos do onboarding, o progresso reforça de cara que o app
   acompanha o que já foi lido e quanto falta). */
function FeaturesStep({ header, onNext }) {
  const lang = getAppLanguage() ?? 'pt'
  const suffix = lang === 'en' ? '-en' : ''
  const cards = [
    { key: 'routine', icon: 'ClipboardList', img: `/onboarding/rotina${suffix}.png` },
    { key: 'progress', icon: 'BarChart3', img: `/onboarding/progresso${suffix}.png` },
    { key: 'prayer', icon: 'HandHeart', img: `/onboarding/oracao${suffix}.png` },
    { key: 'reading', icon: 'BookOpen', img: `/onboarding/leitura${suffix}.png` },
    { key: 'reflection', icon: 'PenLine', img: `/onboarding/reflexao${suffix}.png` },
    { key: 'studies', icon: 'GraduationCap', img: `/onboarding/estudos${suffix}.png` },
    { key: 'community', icon: 'Users', img: `/onboarding/comunidade${suffix}.png` },
  ]

  const scrollerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function handleScroll() {
    const el = scrollerRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / cards.length
    setActiveIndex(Math.round(el.scrollLeft / cardWidth))
  }

  function scrollToIndex(i) {
    const el = scrollerRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / cards.length
    el.scrollTo({ left: i * cardWidth, behavior: 'smooth' })
  }

  return (
    <div style={styles.form}>
      {header}
      <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.features.title')}</h1>
      <p style={styles.subtitle}>{t('onboarding.features.subtitle')}</p>

      <div ref={scrollerRef} onScroll={handleScroll} className="feature-scroller" style={styles.featureScroller}>
        {cards.map(card => (
          <div key={card.key} style={styles.featureCard}>
            <img src={card.img} alt="" style={styles.featureCardImg} />
            <div style={styles.featureCardIconWrap}>
              <AppIcon name={card.icon} size={16} color="var(--or)" />
            </div>
            <p style={styles.featureCardTitle}>{t(`onboarding.features.${card.key}.title`)}</p>
            <p style={styles.featureCardDesc}>{t(`onboarding.features.${card.key}.desc`)}</p>
          </div>
        ))}
      </div>

      <div style={styles.welcomeDotsRow}>
        {cards.map((card, i) => (
          <span
            key={card.key}
            style={{ ...styles.welcomeDot, background: i === activeIndex ? 'var(--or)' : 'var(--g2)', cursor: 'pointer' }}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        <button type="button" className="btn-primary" onClick={onNext}>{t('onboarding.features.continueBtn')}</button>
      </div>
    </div>
  )
}

/* ── 4 e 6. Tempo de oração / reflexão (mesmo padrão visual de RoutineScreen.jsx) ── */
function DurationStep({ header, icon, color, title, subtitle, options, value, onChange, onNext }) {
  return (
    <div style={styles.form}>
      {header}
      <div style={{ ...styles.tutorialIconWrap, background: `${color}1A` }}>
        <AppIcon name={icon} size={22} color={color} />
      </div>
      <h1 style={{ ...styles.title, fontSize: 24 }}>{title}</h1>
      <p style={styles.subtitle}>{subtitle}</p>

      <div style={styles.durationSel}>
        {options.map(n => (
          <button
            key={n}
            type="button"
            style={{ ...styles.durationBtn, ...(n === value ? { ...styles.durationBtnActive, background: color } : {}) }}
            onClick={() => onChange(n)}
          >
            <span style={styles.durationBtnNum}>{n}</span>
            <span style={styles.durationBtnUnit}>{t('routine.min')}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        <button type="button" className="btn-primary" onClick={onNext}>{t('onboarding.continueBtn')}</button>
      </div>
    </div>
  )
}

/* ── 4.5. Primeira vez lendo a Bíblia? — sugere começar pelo Novo Testamento
   (Evangelhos), pra quem nunca leu, em vez da ordem tradicional (Antigo
   Testamento primeiro). A escolha só reordena os blocos existentes — não
   cria sessões novas nem afeta o que já foi lido (ver src/utils/progress.js)
   — e continua sempre editável depois na aba Perfil. ── */
function FirstTimeReadingStep({ header, onChoose }) {
  const [answered, setAnswered] = useState(null) // null | 'yes' | 'no'

  if (answered !== 'yes') {
    return (
      <div style={styles.form}>
        {header}
        <div style={{ ...styles.tutorialIconWrap, background: `${ROUTINE_STEP_COLORS.reading}1A` }}>
          <AppIcon name="BookOpen" size={22} color={ROUTINE_STEP_COLORS.reading} />
        </div>
        <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.firstTimeReading.question')}</h1>
        <p style={styles.subtitle}>{t('onboarding.firstTimeReading.questionSub')}</p>

        <div style={styles.planSel}>
          <button
            type="button"
            style={styles.planBtn}
            onClick={() => setAnswered('yes')}
          >
            {t('onboarding.firstTimeReading.yes')}
          </button>
          <button
            type="button"
            style={styles.planBtn}
            onClick={() => onChoose('ot_first')}
          >
            {t('onboarding.firstTimeReading.no')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.form}>
      {header}
      <div style={{ ...styles.tutorialIconWrap, background: `${ROUTINE_STEP_COLORS.reading}1A` }}>
        <AppIcon name="Sparkles" size={22} color={ROUTINE_STEP_COLORS.reading} />
      </div>
      <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.firstTimeReading.suggestTitle')}</h1>
      <p style={styles.subtitle}>{t('onboarding.firstTimeReading.suggestBody')}</p>

      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="btn-primary" onClick={() => onChoose('nt_first')}>
          {t('onboarding.firstTimeReading.accept')}
        </button>
        <button type="button" style={styles.resendBtn} onClick={() => onChoose('ot_first')}>
          {t('onboarding.firstTimeReading.decline')}
        </button>
      </div>
    </div>
  )
}

/* ── 5. Plano/tempo de leitura (mesmo padrão visual de RoutineScreen.jsx) ── */
function ReadingPlanStep({ header, planId, setPlanId, onNext }) {
  const lang = getAppLanguage() ?? 'pt'
  return (
    <div style={styles.form}>
      {header}
      <div style={{ ...styles.tutorialIconWrap, background: `${ROUTINE_STEP_COLORS.reading}1A` }}>
        <AppIcon name="BookOpen" size={22} color={ROUTINE_STEP_COLORS.reading} />
      </div>
      <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.readingPlan.title')}</h1>
      <p style={styles.subtitle}>{t('onboarding.readingPlan.subtitle')}</p>

      <div style={styles.planSel}>
        {PLANS.filter(p => p.id !== 'free').map(p => (
          <button
            key={p.id}
            type="button"
            style={{ ...styles.planBtn, ...(planId === p.id ? { ...styles.planBtnActive, background: ROUTINE_STEP_COLORS.reading } : {}) }}
            onClick={() => setPlanId(p.id)}
          >
            {lang === 'en' ? p.labelEn : p.label}
          </button>
        ))}
      </div>
      {PLANS.filter(p => p.id === 'free').map(p => (
        <button
          key={p.id}
          type="button"
          style={{ ...styles.planBtnFree, ...(planId === p.id ? { ...styles.planBtnActive, background: ROUTINE_STEP_COLORS.reading } : {}) }}
          onClick={() => setPlanId(p.id)}
        >
          {lang === 'en' ? p.labelEn : p.label}
        </button>
      ))}
      <span style={styles.sectionCaption}>
        {PLANS.find(p => p.id === planId).readingMinutes != null
          ? t('journey.minPerDay', { n: PLANS.find(p => p.id === planId).readingMinutes })
          : t('journey.noTimeTarget')}
      </span>

      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn-primary" onClick={onNext}>{t('onboarding.continueBtn')}</button>
      </div>
    </div>
  )
}

/* ── 7. Prévia da rotina completa ── */
function PreviewStep({ header, prayerMinutes, planId, reflectionMinutes, onNext }) {
  const lang = getAppLanguage() ?? 'pt'
  const plan = PLANS.find(p => p.id === planId)
  const totalMinutes = prayerMinutes + reflectionMinutes + (plan.readingMinutes ?? 0)
  const minLabel = n => `${n} ${t('routine.min')}`
  const rows = [
    { key: 'prayer', icon: 'HandHeart', color: ROUTINE_STEP_COLORS.prayer, label: t('home.routinePrayer'), value: minLabel(prayerMinutes) },
    { key: 'reading', icon: 'BookOpen', color: ROUTINE_STEP_COLORS.reading, label: lang === 'en' ? plan.labelEn : plan.label, value: plan.readingMinutes != null ? minLabel(plan.readingMinutes) : t('journey.noTimeTarget') },
    { key: 'reflection', icon: 'PenLine', color: ROUTINE_STEP_COLORS.reflection, label: t('home.routineReflection'), value: minLabel(reflectionMinutes) },
  ]

  return (
    <div style={styles.form}>
      {header}
      <h1 style={{ ...styles.title, fontSize: 24 }}>{t('onboarding.preview.title')}</h1>
      <p style={styles.subtitle}>{t('onboarding.preview.subtitle')}</p>

      <div style={styles.previewCard}>
        {rows.map(r => (
          <div key={r.key} style={styles.previewRow}>
            <div style={{ ...styles.previewIcon, background: `${r.color}1A` }}>
              <AppIcon name={r.icon} size={16} color={r.color} />
            </div>
            <span style={styles.previewLabel}>{r.label}</span>
            <span style={styles.previewValue}>{r.value}</span>
          </div>
        ))}
        <div style={styles.previewTotalRow}>
          <span style={styles.previewTotalLabel}>{t('onboarding.preview.total')}</span>
          <span style={styles.previewTotalValue}>{minLabel(totalMinutes)}</span>
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        <button type="button" className="btn-primary" onClick={onNext}>{t('onboarding.preview.continueBtn')}</button>
      </div>
    </div>
  )
}

const CHECKLIST_ITEMS = [
  { icon: 'BookOpen', key: 'reading' },
  { icon: 'HandHeart', key: 'prayer' },
  { icon: 'PenLine', key: 'reflection' },
  { icon: 'ClipboardList', key: 'routine' },
  { icon: 'GraduationCap', key: 'studies' },
  { icon: 'Users', key: 'community' },
  { icon: 'BarChart3', key: 'progress' },
]

/* ── 8. Cadastro: checklist de recursos + conta + plano + código de convite ── */
function SignupStep({ header, name, prayerMinutes, planId, reflectionMinutes, readingOrder, onAuthenticated, onGoLogin }) {
  const [email, setEmail]         = useState('')
  const [age, setAge]             = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [isPublic, setIsPublic]   = useState(true)
  // Consentimento separado por finalidade — ver src/privacy/consent.js.
  // Os dois obrigatórios começam desmarcados; o de marketing é opcional e
  // precisa continuar desmarcado por padrão (opt-in, nunca opt-out).
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToSensitive, setAgreedToSensitive] = useState(false)
  const [agreedToMarketing, setAgreedToMarketing] = useState(false)
  const [currency, setCurrency]   = useState('brl')
  const [billingMode, setBillingMode] = useState('monthly')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const lang = getAppLanguage() ?? 'pt'
  const [confirmationEmail, setConfirmationEmail] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && country && country !== 'BR') setCurrency('usd')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const tier = STORE_TIERS[billingMode]
  const amountCents = Math.round(tier[currency] * 100)

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) { setError(t('auth.passwordsDontMatch')); return }
    if (!agreedToTerms || !agreedToSensitive) { setError(t('auth.mustAgreeToTerms')); return }
    const ageNum = Number(age)
    if (!age || !Number.isFinite(ageNum) || ageNum <= 0 || ageNum > 120) { setError(t('auth.ageInvalidError')); return }
    // Art. 14 da LGPD: menor de 12 é criança, e o tratamento exige
    // consentimento específico de um dos pais, que não temos como verificar.
    // A checagem se repete no servidor (ver src/auth/authStore.js).
    if (ageNum < MIN_AGE) { setError(t('auth.minAgeError')); return }
    setLoading(true)
    try {
      // A tela só pede idade — convertemos pra uma data sintética antes de
      // guardar, já que o resto do app (gate de 16+ da Comunidade etc.)
      // trabalha com data de nascimento (ver ageToApproxBirthdate).
      const birthdate = ageToApproxBirthdate(ageNum)
      const user = await signup({ name, email, password, birthdate, isPublic, language: lang })
      setError('')

      // Registra o consentimento assim que existe sessão. Espera terminar
      // (silent:true por padrão, então uma falha não derruba o cadastro) —
      // sem isso, o handleAuthenticated do AuthScreen chama
      // needsConsentRefresh() antes da linha existir no banco, e quem acabou
      // de aceitar veria a mesma tela de novo. Se mesmo assim falhar, o app
      // reapresenta no próximo login (ver needsConsentRefresh).
      await recordConsents([
        { purpose: PURPOSES.TERMS, granted: true },
        { purpose: PURPOSES.SENSITIVE_DATA, granted: true },
        { purpose: PURPOSES.MARKETING_EMAIL, granted: agreedToMarketing },
        { purpose: PURPOSES.PUBLIC_PROFILE, granted: isPublic },
      ])
      if (user.needsEmailConfirmation) {
        setConfirmationEmail(user.email)
        setLoading(false)
        return
      }

      // Persiste as escolhas do onboarding — plano no backend (precisa de
      // sessão, por isso só agora), tempos de oração/reflexão são só
      // localStorage (ver src/prayer/prayerDurationStore.js).
      setSelectedPlanId(user.email, planId).catch(() => {})
      setReadingOrder(user.email, readingOrder).catch(() => {})
      setSavedPrayerMinutes(prayerMinutes)
      setSavedReflectionMinutes(reflectionMinutes)
      trackOnboardingEvent('signup_completed', { userId: user.id })

      // Entra no app na hora — se o checkout abaixo falhar por qualquer
      // motivo, a pessoa já está logada e cai no PaywallGate normal, onde
      // consegue escolher o plano de novo (ver App.jsx).
      onAuthenticated(user)

      const trimmedCode = inviteCode.trim()
      if (trimmedCode) {
        try {
          const { applied } = await redeemInviteCode(trimmedCode)
          if (applied === 'free') {
            trackOnboardingEvent('subscribed', { userId: user.id })
            return
          }
        } catch {
          // Código inválido não deve travar o cadastro — segue pro checkout normal.
        }
      }
      trackOnboardingEvent('checkout_started', { userId: user.id })
      const url = await startCheckout({ interval: billingMode === 'annual' ? 'year' : 'month', currency })
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (confirmationEmail) {
    return (
      <ConfirmEmailView email={confirmationEmail} onGoLogin={onGoLogin} />
    )
  }

  return (
    <form style={styles.form} onSubmit={submit}>
      {header}
      <h1 style={styles.title}>{t('auth.signupTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.signupSubtitle')}</p>

      <div style={styles.checklistCard}>
        {CHECKLIST_ITEMS.map(item => (
          <div key={item.key} style={styles.checklistRow}>
            <AppIcon name={item.icon} size={15} color="var(--or)" />
            <span style={styles.checklistText}>{t(`onboarding.checklist.${item.key}`)}</span>
            <AppIcon name="Check" size={14} color="var(--gr)" />
          </div>
        ))}
      </div>

      <Field label={t('auth.emailLabel')} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
      <Field label={t('auth.ageLabel')} type="number" value={age} onChange={setAge} placeholder="18" />
      <PasswordField label={t('auth.createPasswordLabel')} value={password} onChange={setPassword} showRequirements autoComplete="new-password" />
      <PasswordField label={t('auth.confirmPasswordLabel')} value={confirm} onChange={setConfirm} autoComplete="new-password" />

      <div style={styles.publicToggleRow}>
        <div style={{ flex: 1 }}>
          <p style={styles.publicToggleLabel}>{t('auth.publicProfileLabel')}</p>
          <p style={styles.publicToggleSub}>{t('auth.publicProfileSub')}</p>
        </div>
        <div
          className={`toggle ${isPublic ? '' : 'off'}`}
          onClick={() => setIsPublic(v => !v)}
          role="switch"
          aria-checked={isPublic}
        >
          <div className="toggle-thumb" />
        </div>
      </div>

      <div style={styles.planPickerCard}>
        <p style={styles.publicToggleLabel}>{t('onboarding.plan.label')}</p>
        <div style={styles.currencyToggle}>
          <button type="button" style={{ ...styles.currencyBtn, ...(currency === 'brl' ? styles.currencyBtnActive : {}) }} onClick={() => setCurrency('brl')}>R$</button>
          <button type="button" style={{ ...styles.currencyBtn, ...(currency === 'usd' ? styles.currencyBtnActive : {}) }} onClick={() => setCurrency('usd')}>US$</button>
        </div>
        <div style={styles.modeToggle}>
          <button type="button" style={{ ...styles.modeBtn, ...(billingMode === 'monthly' ? styles.modeBtnActive : {}) }} onClick={() => setBillingMode('monthly')}>{t('billing.modeMonthly')}</button>
          <button type="button" style={{ ...styles.modeBtn, ...(billingMode === 'annual' ? styles.modeBtnActive : {}) }} onClick={() => setBillingMode('annual')}>{t('billing.modeAnnual')}</button>
        </div>
        <p style={styles.fixedPrice}>
          {formatAmount(amountCents, currency)}
          <span style={styles.fixedPriceUnit}>{t(billingMode === 'annual' ? 'billing.perYear' : 'billing.perMonth')}</span>
        </p>
      </div>

      <label style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>{t('onboarding.inviteCodeLabel')}</span>
        <input
          style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: 2 }}
          type="text"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
          placeholder={t('onboarding.inviteCodePlaceholder')}
        />
      </label>

      {/* Consentimento em camadas — art. 8º, §4º da LGPD: consentimento para
          finalidades genéricas é nulo. Os dois primeiros são obrigatórios
          para operar o serviço; o terceiro é opcional e vem desmarcado,
          porque recusa não pode impedir o uso do app. Ver
          src/privacy/consent.js. */}
      <div style={styles.agreeRow}>
        <input
          type="checkbox"
          style={styles.agreeCheckbox}
          checked={agreedToTerms}
          onChange={e => setAgreedToTerms(e.target.checked)}
        />
        <span style={styles.agreeText}>
          {t('auth.agreeToTermsPrefix')}
          <a href={termsUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.agreeLink}>{t('profile.termsLabel')}</a>
          {t('auth.agreeToTermsMiddle')}
          <a href={privacyUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.agreeLink}>{t('profile.privacyLabel')}</a>
          {t('auth.agreeToTermsSuffix')}
        </span>
      </div>

      <div style={styles.agreeRow}>
        <input
          type="checkbox"
          style={styles.agreeCheckbox}
          checked={agreedToSensitive}
          onChange={e => setAgreedToSensitive(e.target.checked)}
        />
        <span style={styles.agreeText}>{t('auth.agreeToSensitiveData')}</span>
      </div>

      <div style={styles.agreeRow}>
        <input
          type="checkbox"
          style={styles.agreeCheckbox}
          checked={agreedToMarketing}
          onChange={e => setAgreedToMarketing(e.target.checked)}
        />
        <span style={styles.agreeText}>{t('auth.agreeToMarketing')}</span>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        type="submit" className="btn-primary" style={{ marginTop: 6 }}
        disabled={loading || !agreedToTerms || !agreedToSensitive}
      >
        {loading ? t('auth.loading') : t('onboarding.signupBtn', { amount: formatAmount(amountCents, currency) })}
      </button>

      <div style={styles.linksRow}>
        <span />
        <span style={styles.link} onClick={onGoLogin}>{t('auth.alreadyHaveAccount')}</span>
      </div>
    </form>
  )
}

/* ── Login ── */
function LoginView({ onAuthenticated, onGoSignup, onGoForgot }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login({ email, password })
      setError('')
      onAuthenticated(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={styles.form} onSubmit={submit}>
      <h1 style={styles.title}>{t('auth.loginTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.loginSubtitle')}</p>

      <Field label={t('auth.emailLabel')} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />
      <PasswordField label={t('auth.passwordLabel')} value={password} onChange={setPassword} autoComplete="current-password" />

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitLogin')}</button>

      <div style={styles.linksRow}>
        <span style={styles.link} onClick={onGoForgot}>{t('auth.forgotPassword')}</span>
        <span style={styles.link} onClick={onGoSignup}>{t('auth.createAccount')}</span>
      </div>
    </form>
  )
}

// Reapresentado a quem já tem conta e loga com o consentimento obrigatório
// faltando ou desatualizado — ver needsConsentRefresh em
// src/privacy/consent.js. A sessão no Supabase já existe nesse ponto (o
// login/signup já aconteceu); esta tela só decide se o app "libera" o
// acesso (onDone) ou desfaz a sessão (onDecline), porque consentimento
// não pode ser condição imposta sem alternativa real de recusa.
function ConsentRefreshStep({ onDone, onDecline }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToSensitive, setAgreedToSensitive] = useState(false)
  const [agreedToMarketing, setAgreedToMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState('')
  const lang = getAppLanguage()

  async function confirm() {
    if (!agreedToTerms || !agreedToSensitive) { setError(t('auth.mustAgreeToTerms')); return }
    setLoading(true)
    setError('')
    try {
      await recordConsents([
        { purpose: PURPOSES.TERMS, granted: true },
        { purpose: PURPOSES.SENSITIVE_DATA, granted: true },
        { purpose: PURPOSES.MARKETING_EMAIL, granted: agreedToMarketing },
      ], { silent: false })
      onDone()
    } catch (err) {
      console.error('Falha ao registrar consentimento', err)
      setError(t('auth.consentRefreshError'))
      setLoading(false)
    }
  }

  async function decline() {
    setDeclining(true)
    await logout().catch(() => {})
    onDecline()
  }

  return (
    <div style={styles.form}>
      <h1 style={styles.title}>{t('auth.consentRefreshTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.consentRefreshBody')}</p>

      <div style={styles.agreeRow}>
        <input
          type="checkbox"
          style={styles.agreeCheckbox}
          checked={agreedToTerms}
          onChange={e => setAgreedToTerms(e.target.checked)}
        />
        <span style={styles.agreeText}>
          {t('auth.agreeToTermsPrefix')}
          <a href={termsUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.agreeLink}>{t('profile.termsLabel')}</a>
          {t('auth.agreeToTermsMiddle')}
          <a href={privacyUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.agreeLink}>{t('profile.privacyLabel')}</a>
          {t('auth.agreeToTermsSuffix')}
        </span>
      </div>

      <div style={styles.agreeRow}>
        <input
          type="checkbox"
          style={styles.agreeCheckbox}
          checked={agreedToSensitive}
          onChange={e => setAgreedToSensitive(e.target.checked)}
        />
        <span style={styles.agreeText}>{t('auth.agreeToSensitiveData')}</span>
      </div>

      <div style={styles.agreeRow}>
        <input
          type="checkbox"
          style={styles.agreeCheckbox}
          checked={agreedToMarketing}
          onChange={e => setAgreedToMarketing(e.target.checked)}
        />
        <span style={styles.agreeText}>{t('auth.agreeToMarketing')}</span>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        type="button" className="btn-primary" style={{ marginTop: 6 }}
        onClick={confirm} disabled={loading || declining || !agreedToTerms || !agreedToSensitive}
      >
        {loading ? t('auth.loading') : t('onboarding.continueBtn')}
      </button>

      <div style={styles.linksRow}>
        <span style={styles.link} onClick={decline}>
          {declining ? t('auth.loading') : t('auth.consentRefreshDecline')}
        </span>
      </div>
    </div>
  )
}

// Forçado no login de quem já tinha conta quando a senha deixou de ser um
// PIN de 6 dígitos — ver needsPasswordChange/changePassword em
// src/auth/authStore.js e a migration 0026. Sem opção de recusar (like
// ConsentRefreshStep tem): isso não é uma escolha de consentimento, é
// segurança da própria conta — mas ainda oferece "Sair" pra quem não quiser
// trocar agora, em vez de prender a pessoa na tela sem saída nenhuma.
function ForceChangePasswordStep({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  async function confirmChange() {
    if (password !== confirm) { setError(t('auth.passwordsDontMatch')); return }
    setLoading(true)
    setError('')
    try {
      await changePassword(password)
      onDone()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    await logout().catch(() => {})
    window.location.reload()
  }

  return (
    <div style={styles.form}>
      <h1 style={styles.title}>{t('auth.forceChangeTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.forceChangeBody')}</p>

      <PasswordField label={t('auth.newPasswordLabel')} value={password} onChange={setPassword} showRequirements autoComplete="new-password" />
      <PasswordField label={t('auth.confirmNewPasswordLabel')} value={confirm} onChange={setConfirm} autoComplete="new-password" />

      {error && <p style={styles.error}>{error}</p>}

      <button
        type="button" className="btn-primary" style={{ marginTop: 6 }}
        onClick={confirmChange} disabled={loading || signingOut || !isValidPassword(password)}
      >
        {loading ? t('auth.loading') : t('onboarding.continueBtn')}
      </button>

      <div style={styles.linksRow}>
        <span style={styles.link} onClick={signOut}>
          {signingOut ? t('auth.loading') : t('auth.forceChangeSignOut')}
        </span>
      </div>
    </div>
  )
}

// Tela mostrada logo após o cadastro quando o Supabase exige confirmação
// por email — cobre o caso de a pessoa não achar/não receber o email (foi
// pro spam, demorou, digitou certo mas o provedor atrasou) com um botão de
// reenvio. Cooldown de 30s entre reenvios evita spam e dá tempo do email
// anterior chegar antes de pedir outro.
function ConfirmEmailView({ email, onGoLogin }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function startCooldown() {
    setCooldown(30)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(intervalRef.current); return 0 }
        return c - 1
      })
    }, 1000)
  }

  async function handleResend() {
    setStatus('sending')
    try {
      await resendConfirmationEmail(email)
      setStatus('sent')
      startCooldown()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={styles.form}>
      <h1 style={styles.title}>{t('auth.confirmEmailTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.confirmEmailSubtitle', { email })}</p>

      {status === 'sent' && <p style={styles.resendSuccess}>{t('auth.resendEmailSuccess')}</p>}
      {status === 'error' && <p style={styles.error}>{t('auth.resendEmailError')}</p>}

      <button
        type="button"
        style={{ ...styles.resendBtn, ...((status === 'sending' || cooldown > 0) ? styles.resendBtnDisabled : {}) }}
        onClick={handleResend}
        disabled={status === 'sending' || cooldown > 0}
      >
        {status === 'sending' ? t('auth.loading') : cooldown > 0 ? t('auth.resendEmailCooldown', { s: cooldown }) : t('auth.resendEmailBtn')}
      </button>

      <button type="button" className="btn-primary" style={{ marginTop: 6 }} onClick={onGoLogin}>{t('auth.backToLogin')}</button>
    </div>
  )
}

/* ── Esqueci a senha ── */
function ForgotView({ onAuthenticated, onGoLogin }) {
  const [step, setStep]           = useState('request') // 'request' | 'reset'
  const [email, setEmail]         = useState('')
  const [code, setCode]           = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function submitRequest(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setError('')
      setStep('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitReset(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch'))
      return
    }
    setLoading(true)
    try {
      const user = await resetPassword({ email, code, newPassword: password })
      setError('')
      onAuthenticated(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'request') {
    return (
      <form style={styles.form} onSubmit={submitRequest}>
        <h1 style={styles.title}>{t('auth.forgotTitle')}</h1>
        <p style={styles.subtitle}>{t('auth.forgotSubtitle')}</p>

        <Field label={t('auth.emailLabel')} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitSendCode')}</button>

        <div style={styles.linksRow}>
          <span />
          <span style={styles.link} onClick={onGoLogin}>{t('auth.backToLogin')}</span>
        </div>
      </form>
    )
  }

  return (
    <form style={styles.form} onSubmit={submitReset}>
      <h1 style={styles.title}>{t('auth.resetTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.resetSubtitle', { email })}</p>

      <PinField label={t('auth.codeLabel')} value={code} onChange={setCode} length={12} />
      <PasswordField label={t('auth.newPasswordLabel')} value={password} onChange={setPassword} showRequirements autoComplete="new-password" />
      <PasswordField label={t('auth.confirmNewPasswordLabel')} value={confirm} onChange={setConfirm} autoComplete="new-password" />

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitReset')}</button>

      <div style={styles.linksRow}>
        <span />
        <span style={styles.link} onClick={onGoLogin}>{t('auth.backToLogin')}</span>
      </div>
    </form>
  )
}

/* ── Campos reutilizáveis ── */
function Field({ label, value, onChange, type = 'text', placeholder, autoFocus, max }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        style={styles.input}
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        max={max}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

// Só sobrou pro código de verificação por email (12 dígitos, gerado pelo
// Supabase — o tamanho é definido nas configurações do projeto, não pelo
// app). Senha de verdade usa PasswordField, abaixo.
function PinField({ label, value, onChange, length = 6 }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        style={{ ...styles.input, ...styles.pinInput }}
        type="password"
        inputMode="numeric"
        maxLength={length}
        placeholder={'•'.repeat(length)}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
      />
    </label>
  )
}

// Campo de senha de verdade (texto livre, não mais um PIN numérico) — botão
// pra mostrar/ocultar e, quando showRequirements, um checklist ao vivo das 5
// regras (ver passwordRequirements em src/auth/authStore.js). Só os campos
// de CRIAR senha nova mostram o checklist; confirmar e logar não precisam.
function PasswordField({ label, value, onChange, showRequirements, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const reqs = showRequirements ? passwordRequirements(value) : null

  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <div style={styles.passwordInputWrap}>
        <input
          style={{ ...styles.input, paddingRight: 42 }}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
        />
        <button
          type="button"
          style={styles.passwordToggle}
          onClick={() => setVisible(v => !v)}
          aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
        >
          <AppIcon name={visible ? 'EyeOff' : 'Eye'} size={17} color="var(--g4)" />
        </button>
      </div>
      {reqs && (
        <div style={styles.passwordChecklist}>
          <PasswordRequirementRow ok={reqs.length} label={t('auth.passwordReqLength')} />
          <PasswordRequirementRow ok={reqs.upper} label={t('auth.passwordReqUpper')} />
          <PasswordRequirementRow ok={reqs.lower} label={t('auth.passwordReqLower')} />
          <PasswordRequirementRow ok={reqs.number} label={t('auth.passwordReqNumber')} />
          <PasswordRequirementRow ok={reqs.special} label={t('auth.passwordReqSpecial')} />
        </div>
      )}
    </label>
  )
}

function PasswordRequirementRow({ ok, label }) {
  return (
    <span style={{ ...styles.passwordReqItem, color: ok ? 'var(--gr)' : 'var(--g4)' }}>
      <AppIcon name={ok ? 'CheckCircle2' : 'Circle'} size={12} color={ok ? 'var(--gr)' : 'var(--g3)'} />
      {label}
    </span>
  )
}

const styles = {
  screen:        { display: 'flex', flexDirection: 'column', height: '100%' },
  hero:          { background: 'var(--bk-hero)', padding: '18px 24px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, flexShrink: 0, position: 'relative', overflow: 'hidden' },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.5, top: -100, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.32, bottom: -90, left: -50 },
  logo:          { position: 'relative', width: 34, height: 34, borderRadius: 9, boxShadow: '0 6px 14px rgba(0,0,0,.35)', flexShrink: 0 },
  brandName:     { position: 'relative', fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 800, color: 'var(--white)', letterSpacing: 0.5 },
  greeting:      { fontSize: 15, fontWeight: 800, color: 'var(--or)', margin: '2px 0 -6px' },
  sheet:         { flex: 1, overflowY: 'auto', background: 'var(--white)', borderRadius: '20px 20px 0 0', marginTop: -14, padding: '24px 22px 32px' },
  form:          { display: 'flex', flexDirection: 'column', gap: 12 },
  title:         { fontSize: 25, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  subtitle:      { fontSize: 15.5, fontWeight: 500, color: 'var(--g5)', marginTop: -6, marginBottom: 4, lineHeight: 1.5 },
  fieldWrap:     { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel:    { fontSize: 12, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.3, textTransform: 'uppercase' },
  input:         { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '12px 13px', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)' },
  pinInput:      { letterSpacing: 6, fontSize: 19, textAlign: 'center' },
  passwordInputWrap: { position: 'relative', display: 'flex' },
  passwordToggle:    { position: 'absolute', right: 4, top: 0, bottom: 0, width: 36, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  passwordChecklist: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 },
  passwordReqItem:   { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, transition: 'color .15s' },
  error:         { fontSize: 13.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  resendSuccess: { fontSize: 13.5, fontWeight: 600, color: 'var(--gr)', background: 'var(--grl, rgba(34,197,94,.1))', borderRadius: 8, padding: '8px 10px' },
  resendBtn:     { width: '100%', border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 13, padding: 13, fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: 'var(--bk)', cursor: 'pointer' },
  resendBtnDisabled: { opacity: 0.55, cursor: 'default' },
  linksRow:      { display: 'flex', justifyContent: 'space-between', marginTop: 4 },
  link:          { fontSize: 13, fontWeight: 700, color: 'var(--or)', cursor: 'pointer' },
  publicToggleRow:   { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: '11px 13px' },
  publicToggleLabel: { fontSize: 13.5, fontWeight: 700, color: 'var(--bk)' },
  publicToggleSub:   { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', marginTop: 2, lineHeight: 1.4 },
  agreeRow:      { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '2px 1px' },
  agreeCheckbox: { width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: 'var(--or)', cursor: 'pointer' },
  agreeText:     { fontSize: 13.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  agreeLink:     { color: 'var(--or)', fontWeight: 700, textDecoration: 'none' },
  welcomeDotsRow:     { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 2 },
  welcomeDot:         { width: 6, height: 6, borderRadius: '50%' },
  tutorialIconWrap:  { width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 2px' },
  stepHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  stepCounter:   { fontSize: 12.5, fontWeight: 700, color: 'var(--g4)' },
  featureScroller: { display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', margin: '0 -22px', padding: '2px 22px 4px' },
  featureCard:   { flex: '0 0 84%', scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 18, padding: '18px 16px 16px', textAlign: 'center' },
  featureCardImg: { width: '100%', maxWidth: 170, borderRadius: 16, boxShadow: '0 10px 24px rgba(0,0,0,.12)', marginBottom: 4 },
  featureCardIconWrap: { width: 30, height: 30, borderRadius: 9, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  featureCardTitle: { fontSize: 17, fontWeight: 800, color: 'var(--bk)', margin: 0 },
  featureCardDesc:  { fontSize: 14.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: 0 },
  durationSel:   { display: 'flex', flexWrap: 'wrap', gap: 8 },
  durationBtn:   { flex: '1 0 26%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '11px 6px', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', cursor: 'pointer', fontFamily: 'var(--font)' },
  durationBtnActive: { border: 'none' },
  durationBtnNum: { fontFamily: 'var(--font-display)', fontSize: 18.5, fontWeight: 800, color: 'inherit' },
  durationBtnUnit: { fontSize: 11.5, fontWeight: 600, color: 'inherit', opacity: 0.75 },
  planSel:       { display: 'flex', gap: 8 },
  choiceCol:     { display: 'flex', flexDirection: 'column', gap: 8 },
  planBtn:       { flex: 1, padding: '11px 6px', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: 'var(--g6)' },
  planBtnFree:   { width: '100%', padding: '11px 6px', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: 'var(--g6)' },
  planBtnActive: { border: 'none', color: 'white' },
  sectionCaption: { fontSize: 13, fontWeight: 600, color: 'var(--g5)' },
  previewCard:   { display: 'flex', flexDirection: 'column', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 16, padding: '14px 16px' },
  previewRow:    { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--g2)' },
  previewIcon:   { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  previewLabel:  { flex: 1, fontSize: 14.5, fontWeight: 700, color: 'var(--bk)' },
  previewValue:  { fontSize: 14, fontWeight: 600, color: 'var(--g5)' },
  previewTotalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  previewTotalLabel: { fontSize: 15, fontWeight: 800, color: 'var(--bk)' },
  previewTotalValue: { fontSize: 18.5, fontWeight: 900, color: 'var(--or)' },
  checklistCard: { display: 'flex', flexDirection: 'column', gap: 9, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: '13px 14px' },
  checklistRow:  { display: 'flex', alignItems: 'center', gap: 9 },
  checklistText: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--bk)' },
  planPickerCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: '14px' },
  currencyToggle: { display: 'flex', gap: 6, background: 'white', border: '0.5px solid var(--g2)', borderRadius: 10, padding: 3 },
  currencyBtn:   { padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 7, border: 'none', background: 'transparent', fontFamily: 'var(--font)' },
  currencyBtnActive: { color: 'white', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  modeToggle:    { display: 'flex', gap: 6, background: 'white', border: '0.5px solid var(--g2)', borderRadius: 12, padding: 4, width: '100%' },
  modeBtn:       { flex: 1, textAlign: 'center', padding: '9px 8px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 9, border: 'none', background: 'transparent', fontFamily: 'var(--font)' },
  modeBtnActive: { color: 'white', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  fixedPrice:    { fontSize: 26, fontWeight: 900, color: 'var(--bk)', letterSpacing: '-0.4px', display: 'flex', alignItems: 'baseline', gap: 4, margin: 0 },
  fixedPriceUnit: { fontSize: 13, fontWeight: 700, color: 'var(--g5)' },
}
