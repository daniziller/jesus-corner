// Lista estática e ordenada dos passos do tutorial de primeiro acesso — ver
// src/tour/TourController.jsx (orquestra) e src/tour/TourOverlay.jsx (mede
// e desenha o spotlight). `tab` é a aba que precisa estar ativa pro alvo
// existir (null = existe em qualquer aba); `target` é o valor do atributo
// data-tour a procurar; `shape` define o border-radius do recorte.
export const TOUR_STEPS = [
  { id: 'welcome',  tab: 'home',    target: 'home-routine-card',   titleKey: 'tour.welcomeTitle',  bodyKey: 'tour.welcomeBody',  shape: 'rect' },
  { id: 'routine',  tab: 'home',    target: 'home-routine-card',   titleKey: 'tour.routineTitle',  bodyKey: 'tour.routineBody',  shape: 'rect' },
  { id: 'bible',    tab: 'home',    target: 'home-bible-ring',     titleKey: 'tour.bibleTitle',    bodyKey: 'tour.bibleBody',    shape: 'rect' },
  { id: 'nav',      tab: 'home',    target: 'nav-tabs',            titleKey: 'tour.navTitle',      bodyKey: 'tour.navBody',      shape: 'rect' },
  { id: 'routineTab', tab: 'routine', target: 'routine-hero',      titleKey: 'tour.routineTabTitle', bodyKey: 'tour.routineTabBody', shape: 'rect' },
  { id: 'prayer',   tab: 'prayer',  target: 'prayer-acts-card',    titleKey: 'tour.prayerTitle',   bodyKey: 'tour.prayerBody',   shape: 'rect' },
  { id: 'journey',  tab: 'journey', target: 'journey-hero',        titleKey: 'tour.journeyTitle',  bodyKey: 'tour.journeyBody',  shape: 'rect' },
  { id: 'progress', tab: 'stats',   target: 'progress-big-ring',   titleKey: 'tour.progressTitle', bodyKey: 'tour.progressBody', shape: 'rect' },
  { id: 'groups',   tab: 'groups',  target: 'groups-create-button', titleKey: 'tour.groupsTitle',  bodyKey: 'tour.groupsBody',   shape: 'rect' },
  { id: 'profile',  tab: null,      target: 'profile-avatar',      titleKey: 'tour.profileTitle',  bodyKey: 'tour.profileBody',  shape: 'circle' },
]
