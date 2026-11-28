(() => {
  const scythians = "https://www.iranicaonline.org/articles/scythians/scythians-i-history/";
  const ammianus = "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Ammian/31%2A.html";
  const athanaricSource = "https://www.jstor.org/stable/10.3998/mpub.11453670";
  const hunnicRulers = "https://www.mpov.uw.edu.pl/en/thesaurus/persons/attila";
  const avars = "https://eprints.whiterose.ac.uk/215647/8/Dagnall%2BOA%2Bchapter.pdf";
  const bulgarianRulers = "https://www.degruyterbrill.com/document/doi/10.1515/9783110744392-012/pdf";
  const balkanChronology = "https://assets.cambridge.org/052181/5398/frontmatter/0521815398_frontmatter.htm";
  const volgaMission = "https://nyupress.org/9781479899890/mission-to-the-volga/";
  const khazarLetters = "https://sourcebooks.fordham.edu/source/khazars1.asp";
  const earlyChronicle = "https://djvu.online/file/AxFy4TiI1olRo";
  const laterChronicle = "https://www.zdravrussia.ru/literature/ixxiiivek/?nnew=1772&sview=4";
  const igorCampaign = "https://litopys.org.ua/ipatlet/ipat27.htm";
  const kotyanSource = "https://old.bigenc.ru/domestic_history/text/3830586";

  window.FLOW_EARLY_OFFICES = [
    ["scyth", "idantirs", "Скифский царь", -513, -513, scythians, "Около 513 года до н. э. возглавил сопротивление походу Дария. Датировка похода спорна."],
    ["scyth", "atey", "Скифский царь", -339, -339, scythians, "Погиб в битве с Филиппом Македонским в 339 году до н. э. Год вступления на престол неизвестен."],

    ["goth", "athanaric", "Вождь тервингов", 369, 369, athanaricSource, "В 369 году заключил мир с императором Валентом на Дунае."],
    ["goth", "germanarikh", "Король гревтунгов", 375, 375, ammianus, "Умер во время нашествия гуннов, около 375 года. Начало правления неизвестно."],
    ["goth", "fritigern", "Вождь готов", 378, 378, ammianus, "Возглавлял готов в сражении при Адрианополе в 378 году."],

    ["hun", "bleda", "Соправитель гуннов", 434, 445, hunnicRulers, "Начало совместного правления с Аттилой относят примерно к 434 году."],
    ["hun", "attila", "Правитель гуннов", 434, 453, hunnicRulers, "В начале правил вместе с Бледой. С 445 года правил единолично."],
    ["avar", "bayan", "Каган авар", 568, 568, avars, "К концу 560-х годов закрепил власть авар в Паннонии."],

    ["dbulg", "asparuh", "Правитель дунайских болгар", 681, 701, bulgarianRulers, "Отсчёт от образования государства на Дунае в 680–681 годах. Конец правления датируется приблизительно."],
    ["dbulg", "tervel", "Правитель Болгарии", 705, 705, balkanChronology, "В 705 году помог Юстиниану II вернуть трон. Границы правления датируют по-разному."],
    ["dbulg", "krum", "Правитель Болгарии", 802, 814, balkanChronology, "Начало правления датируется приблизительно, около 802–803 годов."],
    ["dbulg", "omurtag", "Правитель Болгарии", 814, 831, bulgarianRulers, "Начало правления относят к 814–815 годам."],
    ["dbulg", "malamir", "Правитель Болгарии", 831, 836, bulgarianRulers],
    ["dbulg", "presian_i_bulg", "Правитель Болгарии", 836, 852, bulgarianRulers],
    ["dbulg", "boris_i_bulg", "Правитель Болгарии", 852, 889, bulgarianRulers, "Принял крещение с именем Михаил."],
    ["dbulg", "vladimir_rasate", "Князь Болгарии", 889, 893, bulgarianRulers],
    ["dbulg", "simeon_i_bulg", "Правитель Болгарии", 893, 927, bulgarianRulers, "С 913 года выдвигал притязания на императорский титул."],
    ["dbulg", "petr_bolg", "Царь Болгарии", 927, 969, balkanChronology, "Последние месяцы правления и смерть датируют 969–970 годами."],
    ["dbulg", "boris_bolg", "Царь Болгарии", 969, 971, balkanChronology, "Пришёл к власти около 969–970 годов. Иоанн Цимисхий лишил его царских регалий в 971 году."],
    ["dbulg", "roman_bulg", "Царь Болгарии", 976, 997, bulgarianRulers, "В хронологиях начало правления относят к 976–977 годам."],
    ["dbulg", "samuil_bulg", "Царь Болгарии", 997, 1014, bulgarianRulers],
    ["dbulg", "gavril_radomir", "Царь Болгарии", 1014, 1015, bulgarianRulers],
    ["dbulg", "ivan_vladislav", "Царь Болгарии", 1015, 1018, bulgarianRulers, "Гибель в 1018 году предшествовала окончательному подчинению Болгарии Византией."],

    ["bulg", "almush", "Правитель волжских булгар", 922, 922, volgaMission, "Принял багдадское посольство, описанное Ибн Фадланом."],
    ["khaz", "joseph_khazar", "Правитель хазар", 960, 960, khazarLetters, "Около 960 года датируют переписку с Хасдаем ибн Шапрутом. Годы правления Иосифа точно не установлены."],

    ["pech", "kurya", "Вождь печенегов", 972, 972, earlyChronicle, "По летописи, устроил засаду, в которой погиб Святослав."],
    ["polov", "iskal", "Половецкий хан", 1061, 1061, earlyChronicle, "Возглавлял набег на Переяславскую землю."],
    ["polov", "tugorkan", "Половецкий хан", 1096, 1096, laterChronicle, "Осадил Переяславль и погиб в бою у Трубежа."],
    ["polov", "boniak", "Половецкий хан", 1096, 1096, laterChronicle, "Совершил набег на окрестности Киева."],
    ["polov", "konchak", "Половецкий хан", 1185, 1185, igorCampaign, "Участвовал в разгроме войска Игоря Святославича."],
    ["polov", "gzak", "Половецкий хан", 1185, 1185, igorCampaign, "Действовал вместе с Кончаком в походе против Игоря."],
    ["polov", "kotyan", "Половецкий хан", 1223, 1223, kotyanSource, "Обратился к русским князьям за помощью перед битвой на Калке."],
  ];

  window.FLOW_EARLY_PEOPLE = {
    athanaric:{n:"Атанарих", b:"steppe", d:"Вождь тервингов. Договорился с императором Валентом о мире на Дунае.", flows:["goth"], src:athanaricSource},
    fritigern:{n:"Фритигерн", b:"steppe", d:"Предводитель готов в сражении при Адрианополе.", flows:["goth"], src:ammianus},
    bleda:{n:"Бледа", b:"steppe", d:"Брат Аттилы, правил гуннами вместе с ним до 445 года.", flows:["hun"], src:hunnicRulers},
    asparuh:{n:"Аспарух", b:"foreign", d:"Правитель дунайских болгар, при котором возникло Первое Болгарское царство.", flows:["dbulg"], src:bulgarianRulers},
    tervel:{n:"Тервел", b:"foreign", d:"Болгарский правитель, помог вернуться к власти византийскому императору Юстиниану II.", flows:["dbulg"], src:balkanChronology},
    krum:{n:"Крум", b:"foreign", d:"Болгарский правитель, расширил владения и воевал с Византией.", flows:["dbulg"], src:balkanChronology},
    omurtag:{n:"Омуртаг", b:"foreign", d:"Болгарский правитель, преемник Крума.", flows:["dbulg"], src:bulgarianRulers},
    malamir:{n:"Маламир", b:"foreign", d:"Болгарский правитель, преемник Омуртага.", flows:["dbulg"], src:bulgarianRulers},
    presian_i_bulg:{n:"Пресиан I", b:"foreign", d:"Болгарский правитель, предшественник Бориса I.", flows:["dbulg"], src:bulgarianRulers},
    boris_i_bulg:{n:"Борис I", b:"foreign", d:"Правитель Болгарии, принявший христианство с именем Михаил.", flows:["dbulg"], src:bulgarianRulers},
    vladimir_rasate:{n:"Владимир Расате", b:"foreign", d:"Болгарский князь, преемник Бориса I.", flows:["dbulg"], src:bulgarianRulers},
    simeon_i_bulg:{n:"Симеон I", b:"foreign", d:"Правитель Болгарии, отец царя Петра I.", flows:["dbulg"], src:bulgarianRulers},
    roman_bulg:{n:"Роман Болгарский", b:"foreign", d:"Болгарский царь, брат Бориса II и предшественник Самуила.", flows:["dbulg"], src:bulgarianRulers},
    samuil_bulg:{n:"Самуил", b:"foreign", d:"Болгарский царь, сопротивлялся завоеванию Византией.", flows:["dbulg"], src:bulgarianRulers},
    gavril_radomir:{n:"Гавриил Радомир", b:"foreign", d:"Болгарский царь, преемник Самуила.", flows:["dbulg"], src:bulgarianRulers},
    ivan_vladislav:{n:"Иван Владислав", b:"foreign", d:"Болгарский царь в последние годы войны с Византией.", flows:["dbulg"], src:bulgarianRulers},
    almush:{n:"Алмуш", b:"steppe", d:"Правитель волжских булгар, принимавший посольство Ибн Фадлана.", flows:["bulg"], src:volgaMission},
    joseph_khazar:{n:"Иосиф", b:"steppe", d:"Хазарский правитель, известный по ответу Хасдаю ибн Шапруту.", flows:["khaz"], src:khazarLetters},
  };
})();
