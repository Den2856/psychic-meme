window.addEventListener("DOMContentLoaded", () => {
  /* 1 локальная функция для логики отображения видео */
  (() => {
    const video = document.getElementById('heroVideo');
    const fallback = document.getElementById('heroFallback');
    if (!video || !fallback) return;

    const SRC_DESKTOP = './media/vids/hero_vid.mp4';
    const SRC_MOBILE  = './media/vids/hero_vid_mob.mp4';

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    let currentSrc = null;
    const pick = () => (window.innerWidth <= 768 ? SRC_MOBILE : SRC_DESKTOP);

    function isLowDataMode() {
      return (
        window.innerWidth <= 470 &&
        (navigator.connection?.saveData ||
        window.matchMedia('(prefers-reduced-data: reduce)').matches)
      );
    }

    async function shouldShowFallback() {
      const lowData = (window.innerWidth <= 470) && (navigator.connection?.saveData === true);

      let lowBattery = false;

      try {
        if ('getBattery' in navigator) {
          const b = await navigator.getBattery();
          lowBattery = (b && !b.charging && b.level <= 0.15);
        }
      } catch {}

      return lowData || lowBattery;
    }

    function applySrc(url) {
      if (currentSrc === url) return;
      currentSrc = url;

      video.src = url;
      video.load();

      const tryPlay = () => video.play().catch(() => {});
      if (video.readyState >= 2) {
        tryPlay();
      } else {
        const onCanPlay = () => { tryPlay(); video.removeEventListener('canplay', onCanPlay); };
        video.addEventListener('canplay', onCanPlay);
      }
    }

    async function start() {
      if (await shouldShowFallback()) {

        video.style.display = 'none';
        fallback.style.display = 'block';
        if (video.src) { video.removeAttribute('src'); video.load(); }
      } else {
        video.style.display = 'block';
        fallback.style.display = 'none';
        applySrc(pick());
      }
    }


    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }

    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(start, 150);
    });
  })();


  const recipientBtns = Array.from(document.querySelectorAll('.recipient-btn'));
  const recipientPreview = document.querySelector('.recipient-preview');
  const thumb = document.getElementById('difficultyThumb');
  const label = document.getElementById('difficultyValue');
  const moodBtns = Array.from(document.querySelectorAll('.control--mood .mood-btn'));
  const colorDots = Array.from(document.querySelectorAll('.control--color .color-dot'));
  const asideImage = document.querySelector('.generator__aside-image');
  const asideCard = document.querySelector('.aside-card');
  const actionBtn = document.querySelector('.action-btn');

  let currentRecipient = "";
  let currentMood = "";
  let difficultyState = "";
  let lastIdeaHTML = "";


  const PREVIEW_TEXT = {
    colleagues: "Сканируем офисные будни!",
    partner: "Запущена программа ROMANTIKA!",
    family: "Уровень тепла настроен на 100%!",
    friends: "Анализируем весёлые воспоминания!"
  };

  /* 2 Логика блока "Для кого" */
  recipientBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      recipientBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentRecipient = btn.dataset.key;
      recipientPreview.textContent = PREVIEW_TEXT[currentRecipient] || "...";
    });
  });

  if (recipientBtns.length) {
    recipientBtns[Math.floor(Math.random() * recipientBtns.length)].click();
  }

  /* 2 Логика блока "Сложность" */
  (() => {
    const root = document.querySelector('.control--difficulty');
    if (!root) return;

    const container = root.querySelector('.slider-container');
    const rail = root.querySelector('.slider-rail') || container;
    const thumb = root.querySelector('#difficultyThumb') || root.querySelector('.slider-thumb');
    const label = root.querySelector('#difficultyValue') || root.querySelector('.difficulty-value');
    const difficultyTrack = root.querySelector('.difficulty-track'); // сюда мы будем вставлять нужный путь

    if (typeof difficultyState === 'string') difficultyState = Math.random() < 0.5 ? 'min' : 'max';

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    let railTop = 0, railH = 0;
    function measure() {
      const r = rail.getBoundingClientRect();
      railTop = r.top + window.scrollY;
      railH   = r.height;
    }

    function placeThumbByLocalY(localY) {
      const half = thumb.offsetHeight / 2;
      const y = clamp(localY - half, 0, railH) + rail.offsetTop - half;
      thumb.style.top = `${y}px`;
    }

    function localYFromClientY(clientY) {
      const local = clientY + window.scrollY - railTop;
      return clamp(local, 0, railH);
    }

    function setDifficulty(next, notify = true) {
      const norm = (next === 'max') ? 'max' : 'min';
      difficultyState = norm;
      if (label) label.textContent = norm;
      if (thumb) thumb.dataset.state = norm;

      // меняем картинку в зависимости от стейта
      if (difficultyTrack) {
        if (difficultyState === 'max') {
          difficultyTrack.src = './static/icons/max-range.svg';
        } else {
          difficultyTrack.src = './static/icons/min-range.svg';
        }
      }

      measure();
      const local = (norm === 'max') ? 0 : railH;
      placeThumbByLocalY(local);

      if (notify) {
        if (typeof resetActionBtn === 'function') resetActionBtn();
        root.dispatchEvent(new CustomEvent('difficulty-change', { detail: { value: norm } }));
      }
    }

    requestAnimationFrame(() => setDifficulty(difficultyState, false));

    let dragging = false;

    function onDown(e) {
      e.preventDefault();
      dragging = true;
      measure();
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const local = localYFromClientY(cy);
      placeThumbByLocalY(local);
      label.textContent = (local <= railH / 2) ? 'max' : 'min';
    }

    function onMove(e) {
      if (!dragging) return;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const local = localYFromClientY(cy);
      placeThumbByLocalY(local);
      label.textContent = (local <= railH / 2) ? 'max' : 'min';
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      const cy = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
      const local = localYFromClientY(cy);
      const next = (local <= railH / 2) ? 'max' : 'min';
      setDifficulty(next);
    }

    rail.addEventListener('mousedown', onDown);
    thumb.addEventListener('mousedown', onDown);
    rail.addEventListener('touchstart', onDown, { passive: false });
    thumb.addEventListener('touchstart', onDown, { passive: false });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    window.addEventListener('resize', () => setDifficulty(difficultyState, false));
  })();



  /* 3 Логика блока Mood-фильтра */
  moodBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      moodBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMood = btn.dataset.key;
    });
  });
  if (moodBtns.length) {
    moodBtns[Math.floor(Math.random() * moodBtns.length)].click();
  }

  /* 4 Логика цветовых точек */
  colorDots.forEach(dot => {
    dot.addEventListener("click", () => {
      colorDots.forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      const bg = dot.dataset.bg;
      if (bg) asideImage.style.backgroundImage = `url('${bg}')`;
    });
  });
  if (colorDots.length) {
    colorDots[Math.floor(Math.random() * colorDots.length)].click();
  }

  /* 4.1 Подмена data-bg для мобильных */
  function swapColorDotBg() {
    const isMobile = window.innerWidth <= 320;
    colorDots.forEach(dot => {
      const desktop = dot.dataset.bgDesktop;
      const mobile  = dot.dataset.bgMobile;
      if (isMobile && mobile) {
        dot.dataset.bg = mobile;
      } else if (!isMobile && desktop) {
        dot.dataset.bg = desktop;
      }
    });

    const active = document.querySelector(".color-dot.active");
    if (active && active.dataset.bg) {
      asideImage.style.backgroundImage = `url('${active.dataset.bg}')`;
    }
  }

  swapColorDotBg();


  /* 5 Шаблоны ИДЕЙ (48) */
  const ideaTemplates = {
    colleagues: {
      diamond: {
        min: `
          Стикеры для рабочего чата
          Даже не самые смешные фразы коллег могут заиграть новыми красками в формате стикеров. Современные сервисы облегчили нам задачу: теперь их можно сделать в несколько простых действий
        `.trim(),
        max: `
          Офисные мемы
          Превратите смешные рабочие ситуации в мемы, чтобы использовать в самые подходящие (или совсем неподходящие) моменты. Можно даже сделать адвент-календарь и отправлять коллегам поднимающие настроение картинки каждый день до конца декабря.
        `.trim()
      },
      star: {
        min: `
          Рабочий нейрогороскоп
          Сгенерируйте коллегам предсказания на следующий год. Если звёзды напророчат кому-то новые возможности, добавьте в послание промокод от Яндекс Практикума. Так ваш праздничный прогноз превратится в новые навыки или даже целую профессию. 
        `.trim(),
        max: `
          Церемония «Коллега года»
          Сделайте презентацию с итогами года и почётными грамотами для каждого. Если в офис по сугробам добираться никто не хочет, церемонию можно провести онлайн и отправить курьера. Закажите доставку от Яндекс Go прямо перед звонком, чтобы грамоты приезжали коллегам во время встречи.
        `.trim()
      },
      arrow: {
        min: `
          Напоминалка для рабочего чата
          Иногда в потоке задач коллеги забывают не только поздравить друг друга с днём рождения, но и пообедать вовремя. Позаботьтесь о них и добавьте в рабочий чат бота, который напомнит о важном.
        `.trim(),
        max: `
          Новогодний диджитал-уголок
          Если на работе не хватает праздничного настроения, создайте его сами. Опросите коллег и соберите в одном месте поздравления, идеи досуга для каникул, подборку новогодних фильмов или рецептов. Не забудьте поставить и украсить диджитал-ёлку.
        `.trim()
      }
    },

    friends: {
      diamond: {
        min: `
          Инструкция по эксплуатации друга
          У вас есть друг, который никогда не берёт трубку? Или не любит пиццу с ананасами? Напишите к нему инструкцию — облегчите жизнь себе и другим. А заодно сделаете первый подарок, который можно и нужно передаривать.
        `.trim(),
        max: `
          Выдуманный фотоальбом
          Соберите известные фотографии и вставьте в них лица своих друзей. Будет весело посмотреть на них на Луне, на Ялтинской конференции или на картине Ван Гога — можно собрать целый альбом.
        `.trim()
      },
      star: {
        min: `
          Плейлист о вашей дружбе
          Соберите в одном месте ностальгические треки: песни, которые напоминают о первой совместной поездке, которые вы знаете наизусть или под которые вас всегда тянет выйти на танцпол.
        `.trim(),
        max: `
          Вдохновляющий to-do лист
          Соберите для друзей список приключений на следующий год: новые хобби, мероприятия, курсы. Если они давно хотели решиться на карьерные изменения, добавьте промокод на курсы Яндекс Практикума — чтобы новые навыки или целую профессию можно было освоить со скидкой.
        `.trim()
      },
      arrow: {
        min: `
          Совместный виш-лист
          Создайте телеграм-канал для друзей, куда каждый может писать о том, что его бы порадовало: например, на день рождения хочется приставку, а сегодня — пиццу, чтобы скрасить грустный вечер. Увидите такой пост — заказывайте такси в Яндекс Go и отправляйтесь по нужному адресу (не забыв заехать в пиццерию).
        `.trim(),
        max: `
          Календарь встреч
          Взрослая жизнь — это когда с друзьями о встрече нужно договариваться минимум за месяц, чтобы все нашли силы и время. Предлагаем пойти дальше и сгенерировать календарь поводов на целый год вперёд (а ещё наказания за неявку).
        `.trim()
      }
    },

    family: {
      diamond: {
        min: `
          Набор открыток на весь год
          От потока открыток хочется отключить уведомления в семейном чате? Пора задать тон этому флешмобу! Сгенерируйте свои  поздравительные картинки с отсылками на интересы родных. И посмеётесь, и покажете, что неплохо знаете свою семью.
        `.trim(),
        max: `
          Заставки для телефона
          Помните школьные фотографии из двухтысячных, где детей переодевали в пиратов и мушкетёров? Вдохновимся работами мастеров: придумайте для вашей семьи забавное амплуа, найдите общее  фото и сделайте из него обои на телефон.
        `.trim()
      },
      star: {
        min: `
          Семейное онлайн-чаепитие
          Выведите звонки семье на новый уровень. Пряничный домик к чаю или пачку конфет из детства быстро привезёт Яндекс Лавка. Даже сидя по разные стороны экрана, можно стать ближе, уплетая карамель и вспоминая, как бабушка накладывала вам конфеты в карманы втайне от родителей.
        `.trim(),
        max: `
          Книга семейных рецептов
          Узнайте секреты приготовления бабушкиных пирожков, маминых котлет и фирменной дедушкиной ухи. Дополните их семейными историями — и получится памятная книга. Можно сразу вместе опробовать рецепты. Чтобы не тратить время на магазины, закажите все ингредиенты в Яндекс Еде.
        `.trim()
      },
      arrow: {
        min: `
          Реставрация старых фотографий
          Сделайте чёрно-белые архивные снимки вашей семьи цветными и соберите их в альбом — чтобы листать его за вечерним чаем и спорить, у кого же всё-таки прадедушкины глаза.
        `.trim(),
        max: `
          Урок цифровой грамотности
          Научите семью пользоваться приложениями, которые облегчат им жизнь. Составьте памятку для родителей, как оплачивать ЖКХ по QR-коду, а для бабушки с дедушкой — как заказывать лекарства или продукты онлайн. 
        `.trim()
      }
    },

    partner: {
      diamond: {
        min: `
          Нейробаллады о любви
          Вы когда-нибудь посвящали кому-то песни? Самое время это сделать — ведь сейчас можно не горланить романсы под окном второй половинки, а обойтись более современными решениями.
        `.trim(),
        max: `
          Рандомайзер подарков
          Нейросеть + маркетплейсы = оригинальный и неожиданный подарок для тех, у кого закончились идеи. Путешествовать по каталогу самому не надо, дайте YandexGPT сгенерировать артикул.
        `.trim()
      },
      star: {
        min: `
          Киновечер воспоминаний
          Соберите подборку фильмов, значимых для вашей пары. Например, фильм, на который вы впервые вместе сходили в кино или который дольше всего обсуждали. Пригласите партнёра на диванное свидание и устройте ностальгический киномарафон.
        `.trim(),
        max: `
          Аудиогид по вашим местам
          Пригласите партнёра на прогулку, а потом предложите наушник, в котором вместо обычной экскурсии будет ваша история. Когда замёрзнете, загляните в раздел «Куда сходить» от Яндекс Еды — он поможет найти поблизости хорошее место с горячим глинтвейном или вкусной едой. Возможно, оно станет ещё одной точкой для вашего следующего маршрута.
        `.trim()
      },
      arrow: {
        min: `
          Маршрут для следующего путешествия
          Составьте план вашего совместного приключения с помощью нейросети. Она сможет учесть интересы обоих, предложить небанальные достопримечательности, рассчитать бюджет и посоветовать, как удобнее всего добраться до нужных мест.  
        `.trim(),
        max: `
          Генератор ужинов
          Со временем вопрос «что приготовить на ужин» может вызывать не вдохновение, а усталость. Обратитесь к нейросетям: они помогут составить меню как в ресторане, только с теми блюдами, которые нравятся вам обоим. А если готовить совсем не хочется, всегда можно заказать Яндекс Еду — там найдётся кухня на любой вкус и настроение.
        `.trim()
      }
    },
  };

  function getIdea(recipient, mood, difficulty) {
    return (ideaTemplates[recipient]?.[mood]?.[difficulty] || "Идея не найдена.");
  }

  /* 6 Шаблоны "Как сделать?" (48) */
  const howToTemplates = {
    colleagues: {
      diamond: {
        min: "Прошерстите переписки на предмет забавных фраз и сделайте скриншоты. Если не хотите создавать стикеры вручную, воспользуйтесь специальными приложениями (например, Sticker Maker). Загрузите картинки, а оно само создаст набор. Вуаля, теперь вы самый смешной человек на работе!",
        max: "Вам поможет простой редактор, например Bazaart. Найдите подходящую картинку и напишите узнаваемый для коллег текст. Бонус: в картинку можно вставить лицо коллеги — самостоятельно или с помощью нейросети типа TurboText. Будет веселее, мы проверили"
      },
      star: {
        min: "Расскажите YandexGPT о коллегах и попросите её написать новогодние поздравления в стиле гороскопа. Чтобы предсказания получились интереснее, задайте в промте роль для нейросети (например, «представь, что ты астролог с десятилетним стажем») и добавьте побольше деталей.",
        max: "Расскажите факты о коллегах YandexGPT — она поможет составить текст. Необязательно вспоминать серьёзные достижения: подойдёт самое большое количество шуток или съеденных печений. Презентацию может сгенерировать сервис Presentsimple. Загрузите документ с информацией: нейросеть подберёт дизайн и картинки, а вы отредактируете слайды так, как вам нравится."
      },
      arrow: {
        min: "В телеграме, например, в чат можно пригласить бота Skeddy. Чтобы он напоминал о важных делах, настройте сообщения: укажите, как часто и о чём он должен писать. А если кто-то настойчиво забывает пообедать, приложите к сообщению промокод на первый заказ в Яндекс Лавке. Сервис быстро привезёт готовый обед и даже горячий кофе с десертом.",
        max: "Используйте интерактивную онлайн-доску, например Яндекс Концепт. Откройте доступ к редактированию, чтобы коллеги могли добавить что-то от себя. Вот идея для каникул от нас: когда надоест пересматривать «Иронию судьбы», можно пройти бесплатные курсы от Яндекс Практикума и вернуться на работу с новыми навыками."
      }
    },

    friends: {
      diamond: {
        min: "Вспомните особенности друга, загрузите их в YandexGPT и попросите нейросеть написать текст в стиле, к примеру, инструкции к стиральной машинке. Добавьте иллюстрации, где ваш друг изображён в виде схемы. Это можно сделать с помощью нейросети или вручную — в простом редакторе типа Bazaart.",
        max: "Главное — ракурс. Смело экспериментируйте с фотографиями и нейросетями (вам пригодится, например, TurboText или Artguru AI). Если вы претендуете на звание «Король приколов» — вставляйте лица в видеомемы, отрывки сериалов и фильмов. Такое можно провернуть с помощью Faceswap и подобных нейросетей."
      },
      star: {
        min: "Собрать плейлист можно почти в любом музыкальном сервисе. Например, в Яндекс Музыке нужно зайти в «Коллекцию» и нажать на плюс: дальше останется только придумать название с описанием и подобрать треки. ",
        max: "Если идей не хватает, обратитесь к YandexGPT. Расскажите ей, чем увлекается друг, что ему нравится и что хочется попробовать. Нейросеть предложит креативные идеи, которые можно адаптировать под себя."
      },
      arrow: {
        min: "Создайте закрытый телеграм-канал, пригласите всех друзей, назначьте их администраторами и откройте комментарии. Такой виш-лист станет не только кладезью мыслей, как порадовать близких на Новый год и другие праздники, но и местом смешных обсуждений и генерации новых идей.",
        max: "Вспомните все памятные даты: от годовщины дружбы до самой запоминающейся вечеринки. Занесите их календарь и поделитесь доступом. Воспользуйтесь YandexGPT и попросите покреативить с наказаниями, чтобы друзья 100 раз подумали, прежде чем придумывать новые отмазки."
      }
    },

    family: {
      diamond: {
        min: "Изображения удобно генерировать в Шедевруме и подобных нейросетях, а потом отдельно добавить текст. Открытку можно сделать в определённом стиле — не скупитесь на детали в описании. Получится и поздравление для сестры в стиле известного комикса, и открытка с огромным сомом для дедушки-рыбака. Главное, не перепутать.",
        max: "Faceswapper.AI вам в помощь! Если не получается придумать, в каком образе представить родных, в базе есть много шаблонов. Персонажи «Звёздных войн»? Мафиозный клан? Футбольная команда? Выбор за вами."
      },
      star: {
        min: "Выберите удобное всем приложение и организуйте видеозвонок. А если вы живёте рядом, то есть другой вариант: помогите бабушке с дедушкой выйти на связь с дальними родственниками, которых они давно не видели.",
        max: "Тёплые иллюстрации для рецептов можно сгенерировать в Шедевруме или других нейросетях. Дальше можете загрузить это всё в презентацию и сохранить в формате PDF, чтобы вся семья могла открыть «книгу» с телефона. Или пойти дальше — и обратиться в настоящую типографию."
      },
      arrow: {
        min: "Сервисов, которые покрасят чёрно-белые фото, много — выбирайте на свой вкус. Есть, например, ИИ-редакторы Hotspot и Neural.love. С первого раза может получиться неидеально — пригодится капелька терпения, как и в любых семейных делах.",
        max: "Подумайте, что пригодится вашим близким. Может, бабушке не нужен онлайн-банк, но поможет приложение со скидками на продукты? Соберите пошаговый гайд со скриншотами. А ещё его можно распечатать и провести «живой урок» — ещё одна идея совместного времяпрепровождения."
      }
    },

    partner: {
      diamond: {
        min: "Зарифмуйте текст про партнёра с помощью YandexGPT, а потом загрузите его в генератор Suno. Поэкспериментируйте с жанрами: может, вашей пассии больше понравится баллада в стиле пост-панк или джаз?",
        max: "Обговорите бюджет заранее и попросите нейросеть сгенерировать рандомное число (стоит заранее посмотреть, как выглядят артикулы на вашем любимом маркетплейсе). Вбейте это число в поиск по каталогу и посмотрите, что достанется вам или вашему партнёру. Если укладывается в бюджет — заказывайте."
      },
      star: {
        min: "Оформите фильмы в презентацию. После тёплых разговоров можно что-то и пересмотреть — из списка, который у вас получился. Чтобы создать киноатмосферу, закажите в Яндекс Лавке попкорн с разными вкусами, сладкую газировку и другие снеки под любимые фильмы.",
        max: "Составьте маршрут по значимым для вас местам (например, кафе, где прошло первое свидание). К каждой точке напишите небольшой текст, который начинается как аудиоэкскурсия о месте или здании, но продолжается историей о вас. Наговорите всё это на диктофон или сделайте озвучку с помощью нейросети (например, Robivox или Murf), чтобы сохранить эффект неожиданности."
      },
      arrow: {
        min: "Соберите все пожелания в промт и отдайте, например, YandexGPT — пусть думает. Чтобы побольше ходить, но успеть хорошенько полежать, чтобы к морю, но чтобы и горы тоже были, чтобы посетить все достопримечательности, но не забыть и про рестораны, и всё это за выходные... Удачи тебе, дорогая нейросеть!",
        max: "Расскажите YandexGPT про предпочтения вашей пары, а она соберёт подходящие рецепты. Можете попросить разделить их на группы по настроению (например, «Быстро приготовить», «Попробовать новое», «Любимая классика»), чтобы получилось настоящее меню. В день Х вам останется только определиться с пожеланиями и выбрать понравившееся блюдо."
      }
    },
  };
  
  function getHowTo(recipient, mood, diff) {
    return (
      (howToTemplates[recipient] || {})[mood]?.[diff]
      || "Инструкция не найдена."
    );
  }

  /* 7 Логика кнопок внутри карточки */
  function bindHow() {
    const btn = asideCard.querySelector(".how-btn");
    if (!btn) return;
    btn.addEventListener("click", renderHowTo);
  }
  function bindReturn() {
    const btn = asideCard.querySelector(".return-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      asideCard.innerHTML = lastIdeaHTML;
      bindHow();
    });
  }

  /* 8 Рендер ИДЕИ */
  function renderIdea() {
    const fullText = getIdea(currentRecipient, currentMood, difficultyState);
    
    const [firstLine, ...restLines] = fullText.split('\n');
    const title = firstLine || 'Идея';
    const body  = restLines.join(' ').trim();

    lastIdeaHTML = `
      <h3 class="aside-card__title">${title}</h3>
      <p class="aside-card__text">${body}</p>
      <div class="aside-card__footer">
        <button class="favorite-btn" aria-label="В избранное">
          <img src="./static/icons/heart.svg" alt="❤"/>
        </button>
        <button class="how-btn" type="button">Как сделать?</button>
      </div>
    `;

    asideCard.innerHTML = lastIdeaHTML;
    bindHow();
    asideImage.classList.add("visible");

    actionBtn.textContent = 'Поменяйте что-то в фильтрах';
    actionBtn.disabled = true;
  }

  /* 9 Рендер "Как сделать?" */
  function renderHowTo() {
    const howText = getHowTo(currentRecipient, currentMood, difficultyState);
    asideCard.innerHTML = `
      <h3 class="aside-card__title">Как сделать?</h3>
      <p class="aside-card__text">${howText}</p>
      <div class="aside-card__footer">
        <button class="favorite-btn" aria-label="В избранное">
          <img src="./static/icons/heart.svg" alt=""/>
        </button>
        <button class="return-btn" type="button">Вернуться к идее</button>
      </div>
    `;
    bindReturn();
  }

  function resetActionBtn() {
    actionBtn.textContent = 'Получить идею';
    actionBtn.disabled = false;
  }
  
  [...recipientBtns, ...moodBtns, ...colorDots, thumb].forEach(el => {
    el.addEventListener('click', resetActionBtn);
  });

  if (actionBtn) {
    actionBtn.addEventListener("click", renderIdea);
  }

  renderIdea();

  /* Локальная функция для рассчёта положения попапов в последнем блоке */
  (() => {
    const tempTips = new Map();

    function showTempTip(btn) {
      if (window.innerWidth <= 470) return;
      const host = btn.closest('.g2-card');
      if (!host) return;

      const text = btn.getAttribute('data-tip') || '';
      const tip  = document.createElement('div');
      tip.className = 'g2-tooltip --temp is-open';
      tip.textContent = text;
      document.body.appendChild(tip);
      tempTips.set(btn, tip);

      positionTempTip(btn);
    }

    function positionTempTip(btn) {
      const tip  = tempTips.get(btn);
      const host = btn.closest('.g2-card');
      if (!tip || !host) return;

      const r = host.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const x = r.left + (r.width - t.width) / 2;
      const y = r.top  - t.height - 12;
      tip.style.left = x + 'px';
      tip.style.top  = y + 'px';
    }

    function hideTempTip(btn) {
      const tip = tempTips.get(btn);
      if (tip) { tip.remove(); tempTips.delete(btn); }
    }

    document.querySelectorAll('.g2-tip[data-tip]').forEach(btn => {
      btn.addEventListener('mouseenter', () => showTempTip(btn));
      btn.addEventListener('mouseleave', () => hideTempTip(btn));
    });

    function repositionAllTemp() {
      tempTips.forEach((_, btn) => positionTempTip(btn));
    }
    window.addEventListener('resize', repositionAllTemp);
    window.addEventListener('scroll',  repositionAllTemp, { passive: true });

    const lavkaBtn = document.getElementById('g2LavkaInfoBtn');
    const lavkaCard = document.getElementById('g2Lavka');
    const tipTerms = document.getElementById('g2LavkaTipTerms');
    const tipCities = document.getElementById('g2LavkaTipCities');
    const expireText = document.getElementById('g2Expire')
    const expireTextLavka = document.getElementById('g2ExpireLavka')

    function placeLavkaTipsSmart() {
      if (!lavkaCard || !tipTerms || !tipCities) return;
      if (window.innerWidth <= 470) return;

      tipTerms.classList.remove('--below');
      tipCities.classList.remove('--below');

      const pad = 16;
      const gap = 12;
      const safe = 16;

      const r = lavkaCard.getBoundingClientRect();

      tipTerms.classList.add('is-open');
      tipCities.classList.add('is-open');

      const t1 = tipTerms.getBoundingClientRect();
      const t2 = tipCities.getBoundingClientRect();
      const maxW = Math.max(t1.width, t2.width);

      const spaceRight = window.innerWidth - r.right - pad - safe;

      if (spaceRight >= maxW) {
        const left = r.right + pad;
        const top1 = Math.max(safe, r.top + 24);
        const top2 = top1 + t1.height + gap;

        tipTerms.style.left = left + 'px';
        tipTerms.style.top = top1 + 'px';
        tipCities.style.left = left + 'px';
        tipCities.style.top = top2 + 'px';
      } else {
        const baseTop = r.top + gap;
        const left = Math.max(safe, r.left + (r.width - maxW) / 2);

        tipTerms.style.left = left + 'px';
        tipTerms.style.top = baseTop + 'px';
        tipCities.style.left = left + 'px';
        tipCities.style.top = (baseTop + t1.height + gap) + 'px';

        tipTerms.classList.add('--below');
        tipCities.classList.add('--below');
      }
    }

    function showLavka() {
      if (window.innerWidth <= 470) return;
      tipTerms?.classList.add('is-open');
      tipCities?.classList.add('is-open');
      placeLavkaTipsSmart();
    }
    function hideLavka() {
      tipTerms?.classList.remove('is-open');
      tipCities?.classList.remove('is-open');
    }

    if (lavkaBtn) {
      lavkaBtn.addEventListener('mouseenter', showLavka);
      lavkaBtn.addEventListener('mouseleave', hideLavka);
    }

    function updateExpireText() {
      if (window.innerWidth < 470) {
        expireText.textContent = 'Используйте до 31 января 2025 года. Промокод даёт скидку 50% при первом заказе, но не более 500 рублей.';
        expireTextLavka.textContent = 'Используйте до 31 декабря 2024 года. Промокод можно применить при первом заказе — на любые товары, кроме категорий "Скидки", "Магазин Яндекса", "Товары для взрослых" и детских смесей. Не суммируется с другими скидками и акциями. Казань, Ростов-на-Дону, Краснодар, Екатеринбург, Новосибирск, Нижний Новгород, Тюмень, Челябинск, Тула'
      } else {
        expireText.textContent = 'Используйте до 31 января 2025 года.';
        expireTextLavka.textContent = 'Используйте до 31 декабря 2024 года.'
      }
    }

    updateExpireText();

    window.addEventListener('resize', updateExpireText);


  })();
});
