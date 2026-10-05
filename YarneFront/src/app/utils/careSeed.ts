import type { CareContent, L10n } from "./careContent";

/**
 * The built-in care guide, shown until the admin saves their own (Admin → Care). No pieces are
 * linked and no piece notes are set here: which bag is made of what, and what is special about
 * it, are facts about real products, so they are only ever entered in the admin.
 */
const t = (en: string, uk: string): L10n => ({ en, uk });

export const CARE_SEED: CareContent = {
  version: 1,
  materials: [
    {
      id: "raffia",
      slug: "raffia",
      name: t("Raffia", "Рафія"),
      heroTitle: t("Caring for raffia", "Догляд за рафією"),
      heroSubtitle: t("keep it dry, let it breathe.", "тримайте сухою, дайте дихати."),
      intro: t(
        "Raffia is a natural palm fibre, woven by hand. It's light and strong, but it dislikes water and being crushed.",
        "Рафія — натуральне пальмове волокно, сплетене вручну. Вона легка й міцна, але не любить води та стискання.",
      ),
      tileImageUrl: null,
      pieceProductIds: [],
      topics: [
        {
          id: "carry",
          icon: "bag",
          title: t("Carrying", "Носіння"),
          summary: t(
            "Raffia is light but stiff, and sharp edges can break the weave. Keep keys in a pouch and carry it by both handles.",
            "Рафія легка, але жорстка, і гострі краї можуть пошкодити плетіння. Тримайте ключі в косметичці й носіть сумку за обидві ручки.",
          ),
          heading: t("How to carry raffia", "Як носити рафію"),
          warning: t(
            "Overloading stretches the weave around the handles, and it does not spring back.",
            "Перевантаження розтягує плетіння біля ручок, і воно вже не повертає форму.",
          ),
          need: [t("A small pouch", "Невелика косметичка")],
          steps: [
            t("Put keys, pens and anything sharp in a small pouch.", "Складіть ключі, ручки та все гостре в невелику косметичку."),
            t("Keep it light: a phone, a wallet and a scarf are plenty.", "Не перевантажуйте: телефону, гаманця й хустки цілком достатньо."),
            t("Carry it by both handles so the weight pulls evenly.", "Носіть за обидві ручки, щоб вага розподілялася рівномірно."),
            t("Empty it at the end of the day and let it rest in its shape.", "Наприкінці дня спорожніть сумку й дайте їй відпочити у своїй формі."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "clean",
          icon: "brush",
          title: t("Cleaning", "Чищення"),
          summary: t(
            "Brush off dust with a soft, dry brush, following the weave. For a mark, dab with a barely damp cloth. Never scrub.",
            "Змахуйте пил м'якою сухою щіткою за напрямком плетіння. Пляму промокніть ледь вологою тканиною. Ніколи не тріть.",
          ),
          heading: t("How to clean raffia", "Як чистити рафію"),
          warning: t(
            "Test on a hidden spot first, such as the inside seam. If the colour lifts, stop.",
            "Спершу спробуйте на непомітному місці, наприклад на внутрішньому шві. Якщо колір сходить, зупиніться.",
          ),
          need: [
            t("Soft dry brush", "М'яка суха щітка"),
            t("Cotton cloth", "Бавовняна тканина"),
            t("Cool water", "Прохолодна вода"),
            t("Tissue paper", "Цигарковий папір"),
          ],
          steps: [
            t("Empty the bag and shake out crumbs and sand.", "Спорожніть сумку й витрусіть крихти та пісок."),
            t(
              "Brush off dust with a soft, dry brush, following the direction of the weave.",
              "Змахніть пил м'якою сухою щіткою за напрямком плетіння.",
            ),
            t(
              "Dampen a cloth with cool water, then wring it until it is barely damp.",
              "Змочіть тканину прохолодною водою й відіжміть так, щоб вона була ледь вологою.",
            ),
            t(
              "Dab the mark gently. Never rub or scrub: it frays the fibre.",
              "Обережно промокніть пляму. Не тріть: від цього волокно розпушується.",
            ),
            t(
              "Fill the bag with tissue paper and let it air-dry in the shade.",
              "Наповніть сумку цигарковим папером і залиште сохнути в тіні.",
            ),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "wash",
          icon: "drop",
          title: t("Washing", "Прання"),
          summary: t(
            "Never. Raffia must not be soaked or put in a machine: water swells the fibre and loosens the weave.",
            "Ніколи. Рафію не можна замочувати чи прати в машині: від води волокно набухає, а плетіння слабшає.",
          ),
          heading: t("Raffia is never washed", "Рафію не перуть"),
          warning: t(
            "This applies to every raffia piece, whatever its lining or handles.",
            "Це стосується кожного виробу з рафії, хоч би якими були підкладка чи ручки.",
          ),
          need: [],
          steps: [
            t("Don't soak it, rinse it or put it in a machine.", "Не замочуйте, не полощіть і не кладіть у пральну машину."),
            t("For marks, follow the cleaning steps instead.", "Плями виводьте за інструкцією з чищення."),
            t(
              "For a deeper clean, send it to us: we clean raffia by hand in our workshop.",
              "Для глибшого чищення надішліть сумку нам: ми чистимо рафію вручну у своїй майстерні.",
            ),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "dry",
          icon: "wind",
          title: t("Drying", "Сушіння"),
          summary: t(
            "If it gets wet, blot with a towel, fill with paper so it holds its shape and let it air-dry in the shade, away from heat.",
            "Якщо сумка намокла, промокніть її рушником, наповніть папером, щоб тримала форму, і сушіть у тіні, подалі від тепла.",
          ),
          heading: t("If raffia gets wet", "Якщо рафія намокла"),
          warning: t(
            "No hair dryer or radiator: heat makes raffia brittle.",
            "Жодного фена чи батареї: від тепла рафія стає крихкою.",
          ),
          need: [t("Dry towel", "Сухий рушник"), t("Tissue paper", "Цигарковий папір")],
          steps: [
            t("Blot it with a dry towel. Press, don't rub.", "Промокніть сухим рушником. Притискайте, а не тріть."),
            t("Fill it firmly with tissue paper so it holds its shape.", "Щільно наповніть цигарковим папером, щоб сумка тримала форму."),
            t(
              "Stand it upright in the shade, away from radiators and sun.",
              "Поставте вертикально в тіні, подалі від батарей і сонця.",
            ),
            t("Change the paper if it gets damp.", "Замініть папір, якщо він зволожився."),
            t("Let it dry completely before you store it.", "Дайте повністю висохнути, перш ніж ховати на зберігання."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "store",
          icon: "box",
          title: t("Storing", "Зберігання"),
          summary: t(
            "In its cotton dust bag, filled with tissue paper, standing on a shelf. Never in plastic, never under heavy things.",
            "У бавовняному пильнику, наповненою папером, на полиці. Ніколи в поліетилені й ніколи під важкими речами.",
          ),
          heading: t("How to store raffia", "Як зберігати рафію"),
          warning: t(
            "Never put it away damp: raffia can mould in a closed bag.",
            "Не ховайте вологою: у закритому чохлі рафія може запліснявіти.",
          ),
          need: [t("Cotton dust bag", "Бавовняний пильник"), t("Tissue paper", "Цигарковий папір")],
          steps: [
            t("Make sure it is completely dry.", "Переконайтеся, що сумка повністю суха."),
            t("Fill it with tissue paper.", "Наповніть її цигарковим папером."),
            t("Put it in its cotton dust bag, never in plastic.", "Покладіть у бавовняний пильник, а не в поліетилен."),
            t("Stand it on a shelf with nothing on top.", "Поставте на полицю, нічого не кладучи зверху."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "shape",
          icon: "sun",
          title: t("Sun and shape", "Сонце і форма"),
          summary: t(
            "Long hours in strong sun fade natural raffia. A little steam from 20 cm revives a crushed weave.",
            "Від довгих годин на яскравому сонці натуральна рафія вигорає. Трохи пари з відстані 20 см відновлює зім'яте плетіння.",
          ),
          heading: t("How to revive a crushed weave", "Як відновити зім'яте плетіння"),
          warning: t(
            "Keep the steamer moving. Holding it in one place can scorch the fibre.",
            "Постійно рухайте відпарювачем. Якщо тримати його на одному місці, волокно можна обпалити.",
          ),
          need: [t("Clothes steamer", "Відпарювач для одягу"), t("Tissue paper", "Цигарковий папір")],
          steps: [
            t("Fill the bag with tissue paper.", "Наповніть сумку цигарковим папером."),
            t(
              "Hold a steamer about 20 cm away and steam a few seconds at a time.",
              "Тримайте відпарювач на відстані близько 20 см і відпарюйте по кілька секунд.",
            ),
            t("Reshape it by hand while the fibre is warm.", "Поки волокно тепле, поправте форму руками."),
            t("Leave it filled overnight to set.", "Залиште наповненою на ніч, щоб форма закріпилася."),
            t(
              "Keep it out of strong sun so the colour stays even.",
              "Бережіть від яскравого сонця, щоб колір залишався рівним.",
            ),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
      ],
      dos: [
        t("Brush it gently after a dusty day", "Легко чистіть щіткою після запиленого дня"),
        t("Fill it with paper when it's resting", "Наповнюйте папером, коли не носите"),
        t("Let it dry fully before you store it", "Дайте повністю висохнути перед зберіганням"),
        t("Keep it in its cotton dust bag", "Зберігайте в бавовняному пильнику"),
        t("Carry sharp things in a pouch", "Носіть гострі речі в косметичці"),
      ],
      donts: [
        t("Soak it or put it in a machine", "Замочувати чи прати в машині"),
        t("Leave it in strong sun for hours", "Залишати на яскравому сонці на години"),
        t("Crush it in a suitcase", "Стискати у валізі"),
        t("Store it in plastic", "Зберігати в поліетилені"),
        t("Spray perfume or oils near it", "Розпилювати поруч парфуми чи олії"),
      ],
      questions: [
        {
          q: t("It got caught in the rain.", "Сумка потрапила під дощ."),
          a: t(
            "Blot it, fill it with paper and dry it in the shade. Most raffia recovers its shape.",
            "Промокніть, наповніть папером і висушіть у тіні. Здебільшого рафія повертає форму.",
          ),
        },
        {
          q: t("The weave looks crushed.", "Плетіння зім'ялося."),
          a: t(
            "Hold a steamer about 20 cm away, reshape by hand and leave it filled with paper overnight.",
            "Відпарте з відстані близько 20 см, поправте форму руками й залиште на ніч наповненою папером.",
          ),
        },
        {
          q: t("A strand came loose.", "Вибилося волокно."),
          a: t(
            "Don't cut it. Tuck it gently back into the weave, or send the bag to us.",
            "Не обрізайте його. Обережно заправте назад у плетіння або надішліть сумку нам.",
          ),
        },
      ],
    },
    {
      id: "cotton-yarn",
      slug: "cotton-yarn",
      name: t("Cotton yarn", "Бавовняна пряжа"),
      heroTitle: t("Caring for cotton knit", "Догляд за бавовняним в'язанням"),
      heroSubtitle: t("cool water, dried flat.", "прохолодна вода, сушити розкладеною."),
      intro: t(
        "Our cotton yarn is soft and breathable. A hand-knitted cotton bag keeps its shape for years when it's washed gently and always dried flat.",
        "Наша бавовняна пряжа м'яка й дихає. В'язана вручну бавовняна сумка роками тримає форму, якщо прати її дбайливо й завжди сушити розкладеною.",
      ),
      tileImageUrl: null,
      pieceProductIds: [],
      topics: [
        {
          id: "carry",
          icon: "bag",
          title: t("Carrying", "Носіння"),
          summary: t(
            "Cotton knit gives a little to what you carry. Keep laptops and bottles for another bag, and empty it at the end of the day.",
            "Бавовняне в'язання трохи тягнеться під вагою. Ноутбуки й пляшки залиште для іншої сумки, а цю спорожнюйте наприкінці дня.",
          ),
          heading: t("How to carry cotton knit", "Як носити бавовняне в'язання"),
          warning: t(
            "Knit stretches under weight and does not always spring back.",
            "В'язання розтягується під вагою й не завжди повертає форму.",
          ),
          need: [],
          steps: [
            t(
              "Keep heavy things like laptops and bottles for another bag.",
              "Важкі речі, як-от ноутбуки й пляшки, носіть в іншій сумці.",
            ),
            t("Spread the weight and carry it by both handles.", "Розподіляйте вагу й носіть за обидві ручки."),
            t("Empty it at the end of the day.", "Спорожнюйте сумку наприкінці дня."),
            t(
              "Let it rest flat or filled with paper overnight.",
              "На ніч залишайте її розкладеною або наповненою папером.",
            ),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "clean",
          icon: "brush",
          title: t("Cleaning", "Чищення"),
          summary: t(
            "Blot marks with a soft cloth and a drop of mild soap in cool water. Never rub: it raises the fibre.",
            "Плями промокайте м'якою тканиною з краплею м'якого мила в прохолодній воді. Не тріть: від цього волокно розпушується.",
          ),
          heading: t("How to spot-clean cotton knit", "Як вивести пляму з бавовняного в'язання"),
          warning: t("Test the soap on an inside seam first.", "Спершу перевірте мило на внутрішньому шві."),
          need: [t("Mild soap", "М'яке мило"), t("Soft cloth", "М'яка тканина"), t("Cool water", "Прохолодна вода")],
          steps: [
            t("Mix a drop of mild soap into cool water.", "Розчиніть краплю м'якого мила в прохолодній воді."),
            t("Dip a soft cloth and wring it well.", "Змочіть м'яку тканину й добре відіжміть."),
            t(
              "Dab the mark from the outside in. Never rub.",
              "Промокайте пляму від країв до центру. Не тріть.",
            ),
            t("Rinse the spot with a clean damp cloth.", "Протріть це місце чистою вологою тканиною."),
            t("Lay it flat to dry.", "Розкладіть сумку сушитися."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "wash",
          icon: "drop",
          title: t("Washing", "Прання"),
          summary: t(
            "By hand, up to 30 °C, with a mild wool or delicates detergent. Soak for ten minutes, rinse, then press the water out in a towel.",
            "Вручну, до 30 °C, із м'яким засобом для вовни чи делікатних тканин. Замочіть на десять хвилин, прополощіть і відіжміть воду в рушнику.",
          ),
          heading: t("How to hand wash cotton knit", "Як прати бавовняне в'язання вручну"),
          warning: t(
            "Hand wash only, up to 30 °C. A washing machine stretches and felts the knit.",
            "Лише ручне прання, до 30 °C. Пральна машина розтягує й звалює в'язання.",
          ),
          need: [
            t("Basin", "Миска"),
            t("Delicates detergent", "Засіб для делікатних тканин"),
            t("Two towels", "Два рушники"),
          ],
          steps: [
            t(
              "Fill a basin with cool water, up to 30 °C, and a little wool or delicates detergent.",
              "Наберіть у миску прохолодної води, до 30 °C, і додайте трохи засобу для вовни чи делікатних тканин.",
            ),
            t(
              "Turn the bag inside out and soak it for ten minutes. Don't rub.",
              "Виверніть сумку навиворіт і замочіть на десять хвилин. Не тріть.",
            ),
            t(
              "Rinse in clean cool water until it runs clear.",
              "Полощіть у чистій прохолодній воді, доки вона не стане прозорою.",
            ),
            t(
              "Roll it in a towel and press the water out. Never wring.",
              "Загорніть у рушник і відіжміть воду притискаючи. Не викручуйте.",
            ),
            t("Reshape it and dry it flat.", "Поправте форму й сушіть у розкладеному вигляді."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "dry",
          icon: "wind",
          title: t("Drying", "Сушіння"),
          summary: t(
            "Always flat on a dry towel, reshaped by hand. No tumble dryer, radiator or direct sun.",
            "Завжди розкладеною на сухому рушнику, поправивши форму руками. Без сушильної машини, батареї чи прямого сонця.",
          ),
          heading: t("How to dry cotton knit", "Як сушити бавовняне в'язання"),
          warning: t(
            "Never hang it to dry: wet knit stretches under its own weight.",
            "Ніколи не сушіть на вішаку: мокре в'язання розтягується під власною вагою.",
          ),
          need: [t("Dry towel", "Сухий рушник"), t("Tissue paper", "Цигарковий папір")],
          steps: [
            t("Lay it flat on a dry towel.", "Розкладіть сумку на сухому рушнику."),
            t("Reshape it by hand: corners, base and handles.", "Поправте форму руками: кути, дно й ручки."),
            t(
              "Fill it loosely with paper so it keeps its shape.",
              "Нещільно наповніть папером, щоб сумка тримала форму.",
            ),
            t("Turn it over after a few hours.", "За кілька годин переверніть."),
            t("Dry it away from radiators and direct sun.", "Сушіть подалі від батарей і прямого сонця."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "store",
          icon: "box",
          title: t("Storing", "Зберігання"),
          summary: t(
            "Folded or filled with paper, lying down. Hanging it by the handles lets the knit stretch under its own weight.",
            "Складеною або наповненою папером, у лежачому положенні. Якщо повісити за ручки, в'язання розтягнеться під власною вагою.",
          ),
          heading: t("How to store cotton knit", "Як зберігати бавовняне в'язання"),
          warning: t(
            "Never store it damp, and never on a hanger.",
            "Ніколи не зберігайте вологою і ніколи на вішаку.",
          ),
          need: [t("Cotton dust bag", "Бавовняний пильник"), t("Tissue paper", "Цигарковий папір")],
          steps: [
            t("Make sure it is completely dry.", "Переконайтеся, що сумка повністю суха."),
            t(
              "Fill it with tissue paper or fold it gently.",
              "Наповніть її цигарковим папером або акуратно складіть.",
            ),
            t("Put it in its cotton dust bag.", "Покладіть у бавовняний пильник."),
            t(
              "Lay it on a shelf. Never hang it by the handles.",
              "Покладіть на полицю. Ніколи не вішайте за ручки.",
            ),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
        {
          id: "pill",
          icon: "pilling",
          title: t("Pilling", "Ковтунці"),
          summary: t(
            "Small fibre balls are natural with cotton. Lift them lightly with a fabric comb, along the surface.",
            "Маленькі ковтунці для бавовни природні. Легко знімайте їх гребінцем для тканини вздовж поверхні.",
          ),
          heading: t("How to remove pilling", "Як прибрати ковтунці"),
          warning: t(
            "Never cut or pull the pills: it opens the knit.",
            "Не зрізайте й не висмикуйте ковтунці: від цього в'язання розпускається.",
          ),
          need: [t("Fabric comb", "Гребінець для тканини")],
          steps: [
            t("Lay the bag flat on a table.", "Розкладіть сумку на столі."),
            t("Hold the knit taut with one hand.", "Однією рукою тримайте в'язання натягнутим."),
            t(
              "Glide a fabric comb lightly in one direction.",
              "Легко ведіть гребінцем для тканини в одному напрямку.",
            ),
            t("Brush away the loose fibres.", "Змахніть зняті волокна."),
          ],
          pieceNotes: {},
          pieceSteps: {},
          pieceSkippedSteps: {},
          hiddenForPieces: [],
        },
      ],
      dos: [
        t("Hand wash in cool water", "Прати вручну в прохолодній воді"),
        t("Press the water out in a towel", "Відтискати воду в рушнику"),
        t("Dry it flat and reshape by hand", "Сушити розкладеною, поправивши форму руками"),
        t("Comb away pilling lightly", "Легко знімати ковтунці гребінцем"),
        t("Store it lying down", "Зберігати в лежачому положенні"),
      ],
      donts: [
        t("Machine wash or tumble dry", "Прати чи сушити в машині"),
        t("Wring or twist it", "Викручувати чи скручувати"),
        t("Use bleach or a hot iron", "Використовувати відбілювач чи гарячу праску"),
        t("Hang it by the handles", "Вішати за ручки"),
        t("Overload it with heavy things", "Перевантажувати важкими речами"),
      ],
      questions: [
        {
          q: t("It stretched a little.", "Сумка трохи розтягнулася."),
          a: t(
            "Wash it by hand and dry it flat, gently pushing it back to shape. Cotton recovers as it dries.",
            "Виперіть вручну й сушіть розкладеною, обережно повертаючи форму. Бавовна відновлюється, коли висихає.",
          ),
        },
        {
          q: t("A thread came loose.", "Вибилася нитка."),
          a: t(
            "Don't cut or pull it. Push it to the inside with a blunt needle, or send the bag to us.",
            "Не обрізайте й не тягніть її. Заправте всередину тупою голкою або надішліть сумку нам.",
          ),
        },
        {
          q: t("Can I dry clean it?", "Чи можна здавати в хімчистку?"),
          a: t(
            "We'd rather you didn't. Send it to us instead: we wash bags gently in our own workshop.",
            "Краще не варто. Надішліть сумку нам: ми дбайливо перемо сумки у власній майстерні.",
          ),
        },
      ],
    },
  ],
};
