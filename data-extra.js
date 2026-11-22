/* Дополнения данных: координаты на реальной карте, часы работы, маршруты, новые строки UI. */
(function () {
  "use strict";

  var EXTRA = {
    slovtsov:       { geo: { lat: 57.15401, lon: 65.54996 }, hours: { open: 10, close: 18, closed: [1] }, photo: "photos/slovtsov.jpg" },
    myhistory:      { geo: { lat: 57.15295, lon: 65.54823 }, hours: { open: 10, close: 20, closed: [1] } },
    bdt:            { geo: { lat: 57.14433, lon: 65.56013 }, hours: { open: 10, close: 19 }, photo: "photos/bdt.jpg" },
    library:        { geo: { lat: 57.15011, lon: 65.54397 }, hours: { open: 9, close: 20 }, photo: "photos/library.jpg" },
    printstudent:   { geo: { lat: 57.15891, lon: 65.52626 }, hours: { open: 9, close: 18 } },
    coworking:      { geo: { lat: 57.15845, lon: 65.52826 }, hours: { open: 9, close: 20 } },
    spletniki:      { geo: { lat: 57.14988, lon: 65.56304 } },
    zoo:            { hours: { open: 10, close: 18 } },
    krapivin:       { geo: { lat: 57.15670, lon: 65.53890 }, hours: { open: 0, close: 24 }, photo: "photos/krapivin.jpg" },
    kontora:        { geo: { lat: 57.16112, lon: 65.54709 }, hours: { open: 12, close: 21 }, photo: "photos/kontora.jpg", photoCredit: "Фото: мультицентр «Контора пароходства»" },
    kipenie:        { geo: { lat: 57.13773, lon: 65.56658 }, hours: { open: 10, close: 20 } },
    embankment:     { geo: { lat: 57.16300, lon: 65.52400 }, hours: { open: 0, close: 24 }, photo: "photos/tyumen.jpg" },
    tsvetnoy:       { geo: { lat: 57.15109, lon: 65.53663 }, hours: { open: 0, close: 24 }, photo: "photos/tsvetnoy.jpg" },
    dzerzhinskogo:  { geo: { lat: 57.15815, lon: 65.53955 }, hours: { open: 0, close: 24 }, photo: "photos/dzerzhinskogo.jpg" },
    alexandrovsky:  { geo: { lat: 57.16018, lon: 65.52934 }, hours: { open: 0, close: 24 }, photo: "photos/alexandrovsky.jpg", photoCredit: "Фото: visittyumen.ru" },
    gilyovskaya:    { geo: { lat: 57.12678, lon: 65.63178 }, hours: { open: 0, close: 24 }, photo: "photos/gilyovskaya.jpg" },
    gagarin:        { geo: { lat: 57.17292, lon: 65.61782 }, hours: { open: 0, close: 24 }, photo: "photos/gagarin.jpg" },
    "kontora-rink": { geo: { lat: 57.16150, lon: 65.54750 }, hours: { open: 11, close: 22 } },
    "lovers-rink":  { geo: { lat: 57.16419, lon: 65.52193 }, hours: { open: 11, close: 23 } },
    zatyumensky:    { geo: { lat: 57.16310, lon: 65.46217 }, hours: { open: 11, close: 22 }, photo: "photos/zatyumensky.jpg", photoCredit: "Фото: visittyumen.ru" },
    stroitel:       { geo: { lat: 57.14400, lon: 65.53300 }, hours: { open: 7, close: 22 } },
    canteen:        { geo: { lat: 57.15914, lon: 65.53068 }, hours: { open: 9, close: 16 } },
    stolovaya38:    { geo: { lat: 57.14863, lon: 65.54464 }, hours: { open: 9, close: 20 } },
    grenki:         { geo: { lat: 57.15455, lon: 65.53429 }, hours: { open: 9, close: 21 } },
    filmclub:       { geo: { lat: 57.16100, lon: 65.54660 }, hours: null },
    skhodka:        { geo: { lat: 57.15821, lon: 65.55366 }, hours: { open: 12, close: 23 } },
    azbuka:         { geo: { lat: 57.12342, lon: 65.56313 }, hours: { open: 10, close: 24 } },
    naberezhnik:    { geo: { lat: 57.16130, lon: 65.54550 }, hours: null }
  };

  window.PLACES.forEach(function (p) {
    var e = EXTRA[p.id];
    if (e) {
      p.geo = e.geo;
      p.hours = e.hours;
      if (e.photo) p.photo = e.photo;
    }
  });

  window.MAP_CFG = {
    image: "map-bg.jpg",
    bounds: { north: 57.190, south: 57.105, west: 65.440, east: 65.650 }
  };

  window.ROUTES = [
    {
      id: "free",
      totalRu: "0 ₽", totalEn: "0 ₽",
      ru: { title: "Вечер за 0 ₽", lead: "Прогулка по набережной, библиотека и бесплатное кино" },
      en: { title: "An evening for 0 ₽", lead: "A walk along the embankment, the library and a free film" },
      steps: [
        { id: "embankment", timeRu: "18:00", timeEn: "18:00", noteRu: "Смотровая на Туру", noteEn: "The Tura viewpoint" },
        { id: "library", timeRu: "19:00", timeEn: "19:00", noteRu: "Читальный зал и бесплатный Wi-Fi", noteEn: "Reading room and free Wi-Fi" },
        { id: "filmclub", timeRu: "20:00", timeEn: "20:00", noteRu: "Киноклуб, вход свободный", noteEn: "Film club, free entry" }
      ]
    },
    {
      id: "cheap",
      totalRu: "≈250 ₽", totalEn: "≈250 ₽",
      ru: { title: "Вечер до 300 ₽", lead: "Пообедать в столовой, покататься на катке и закончить вечер в центре" },
      en: { title: "An evening under 300 ₽", lead: "Have lunch in the canteen, skate and finish the evening in the centre" },
      steps: [
        { id: "canteen", timeRu: "17:30", timeEn: "17:30", noteRu: "Обед от 100 ₽", noteEn: "Lunch from 100 ₽" },
        { id: "tsvetnoy", timeRu: "19:00", timeEn: "19:00", noteRu: "Каток: вход 100 ₽", noteEn: "Ice rink: 100 ₽ entry" },
        { id: "stolovaya38", timeRu: "21:00", timeEn: "21:00", noteRu: "Обед 150–300 ₽", noteEn: "Lunch 150–300 ₽" }
      ]
    },
    {
      id: "meet",
      totalRu: "0–170 ₽", totalEn: "0–170 ₽",
      ru: { title: "Вечер, чтобы познакомиться", lead: "Три места, где легко заговорить с новыми людьми" },
      en: { title: "An evening to meet people", lead: "Three places where it is easy to talk to new people" },
      steps: [
        { id: "kontora", timeRu: "18:30", timeEn: "18:30", noteRu: "Выставка или лекция", noteEn: "An exhibition or a talk" },
        { id: "filmclub", timeRu: "20:00", timeEn: "20:00", noteRu: "Киноклуб с пиццей", noteEn: "Film club with pizza" },
        { id: "skhodka", timeRu: "21:30", timeEn: "21:30", noteRu: "Настолки, от 170 ₽", noteEn: "Board games, from 170 ₽" }
      ]
    }
  ];

  Object.assign(window.STR.ru, {
    "nav.theme": "Тема",
    "nav.home": "Главная",
    "nav.routes": "Маршруты",
    "routes.kicker": "Готовые сценарии",
    "routes.title": "Три вечера, которые уже собраны",
    "routes.lead": "Если выбирать не хочется, возьмите готовый маршрут из трёх мест с указанием времени и бюджета.",
    "routes.total": "Бюджет",
    "routes.steps": "места",
    "routes.open": "Открыть первое место",
    "search.label": "Поиск",
    "search.placeholder": "Музей, каток, набережная…",
    "sort.label": "Сортировка",
    "sort.default": "По умолчанию",
    "sort.free": "Сначала бесплатные",
    "sort.name": "По алфавиту",
    "filter.open": "Открыто сейчас",
    "hours.title": "Часы работы",
    "hours.open": "Сейчас открыто",
    "hours.closed": "Сейчас закрыто",
    "hours.allday": "Круглосуточно",
    "hours.check": "часы уточняйте",
    "theme.toDark": "Тёмная тема",
    "theme.toLight": "Светлая тема",
    "map.attribution": "Карта: © OpenStreetMap contributors",
    "routes.empty": "Маршрут недоступен"
  });

  Object.assign(window.STR.en, {
    "nav.theme": "Theme",
    "nav.home": "Home",
    "nav.routes": "Routes",
    "routes.kicker": "Ready-made plans",
    "routes.title": "Three evenings, already planned",
    "routes.lead": "If you do not want to choose, take a ready-made route of three places with times and a budget.",
    "routes.total": "Budget",
    "routes.steps": "places",
    "routes.open": "Open the first place",
    "search.label": "Search",
    "search.placeholder": "Museum, ice rink, embankment…",
    "sort.label": "Sort",
    "sort.default": "Default",
    "sort.free": "Free first",
    "sort.name": "A–Z",
    "filter.open": "Open now",
    "hours.title": "Opening hours",
    "hours.open": "Open now",
    "hours.closed": "Closed now",
    "hours.allday": "Open 24/7",
    "hours.check": "hours vary",
    "theme.toDark": "Dark theme",
    "theme.toLight": "Light theme",
    "map.attribution": "Map: © OpenStreetMap contributors",
    "routes.empty": "Route unavailable"
  });
})();
